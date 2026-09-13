import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, FieldValue } from './_lib/firebase-admin.js';
import { createPaymentRequest, toJekoPayInMethod } from './_lib/jeko.js';
import { getJekoConfig, APP_BASE_URL, cors } from './_lib/config.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subscriptionRef, amountXof, operator, payerPhone } = req.body;
  if (!subscriptionRef || !amountXof || !operator) {
    return res.status(400).json({ error: 'subscriptionRef, amountXof and operator are required.' });
  }

  const reference = subscriptionRef.startsWith('SUB-') ? subscriptionRef : `SUB-${subscriptionRef}`;
  const paymentMethod = toJekoPayInMethod(operator);

  try {
    const cfg = await getJekoConfig();
    const result = await createPaymentRequest({
      storeId: cfg.storeId, amountXof, paymentMethod, reference,
      successUrl: `${APP_BASE_URL}/?jekoStatus=success&ref=${reference}`,
      errorUrl:   `${APP_BASE_URL}/?jekoStatus=error&ref=${reference}`,
      payerPhone,
      apiKey: cfg.apiKey, apiKeyId: cfg.apiKeyId,
    });

    await db.collection('pending_payments').doc(reference).set({
      subscriptionRef: reference, paymentRequestId: result.id, reference, operator, amountXof,
      type: 'subscription', status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ checkoutUrl: result.redirectUrl, paymentRequestId: result.id, reference });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
