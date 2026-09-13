import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase-admin.js';
import { upsertContact, createTransfer, toJekoPayOutMethod } from './_lib/jeko.js';
import { getJekoConfig, cors } from './_lib/config.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { providerId, providerName, amountXof, operator, phone } = req.body;
  if (!providerId || !amountXof || !operator || !phone) {
    return res.status(400).json({ error: 'providerId, amountXof, operator and phone are required.' });
  }

  const formattedPhone = phone.startsWith('+') ? phone : `+225${phone.replace(/^0/, '')}`;
  const paymentMethod = toJekoPayOutMethod(operator);
  const reference = `WITHDRAWAL-${providerId}-${Date.now()}`;

  try {
    const cfg = await getJekoConfig();
    const contactId = await upsertContact({
      name: providerName, paymentMethod, phone: formattedPhone,
      apiKey: cfg.apiKey, apiKeyId: cfg.apiKeyId,
    });

    const transfer = await createTransfer({
      storeId: cfg.storeId, contactId, amountXof,
      description: `Retrait Servi+ — ${providerName}`, reference,
      apiKey: cfg.apiKey, apiKeyId: cfg.apiKeyId,
    });

    await db.collection('transactions').doc(reference).set({
      id: reference, userId: providerId, userName: providerName,
      amount: amountXof, type: 'PAYOUT', date: new Date().toISOString(),
      method: 'Mobile Money', status: 'PENDING',
      jekoTransferId: transfer.id, jekoReference: reference, operator, phone: formattedPhone,
    });

    return res.status(200).json({ transferId: transfer.id, reference, status: 'pending' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
