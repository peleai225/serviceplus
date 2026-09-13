import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getPaymentRequest } from './_lib/jeko.js';
import { getJekoConfig, cors } from './_lib/config.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { paymentRequestId } = req.body;
  if (!paymentRequestId) return res.status(400).json({ error: 'paymentRequestId required.' });

  try {
    const cfg = await getJekoConfig();
    const result = await getPaymentRequest(paymentRequestId, cfg.apiKey, cfg.apiKeyId);
    return res.status(200).json({ status: result.status });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
