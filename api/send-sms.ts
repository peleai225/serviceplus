import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from './_lib/config';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phoneNumber, message } = req.body;
  console.log(`[SMS stub — not delivered] To ${phoneNumber}: ${message}`);
  return res.status(200).json({ success: true, simulated: true });
}
