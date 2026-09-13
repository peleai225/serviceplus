import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase-admin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const payload = req.body as any;
  console.log('Jèko webhook received', JSON.stringify(payload));

  try {
    const event = payload.event;
    const transaction = event ? payload.payload : payload;

    if (!transaction?.id) return res.status(200).send('ok');

    const status = transaction.status as string;
    const reference = transaction.transactionDetails?.reference as string | undefined;

    if (!reference) return res.status(200).send('ok');

    // Pay-in: subscription payment
    if (reference.startsWith('SUB-')) {
      const parts = reference.split('-');
      const userId = parts[1] ?? '';

      if (status === 'success' && userId) {
        const durationDays = (transaction.amount?.amount ?? 0) >= 50_000 ? 365 : 30;
        const expirationDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

        await db.collection('users').doc(userId).update({
          isSubscribed: true,
          subscriptionExpiresAt: expirationDate.toISOString(),
        });
        await db.collection('pending_payments').doc(reference).update({ status: 'success' });
      } else if (status === 'error') {
        await db.collection('pending_payments').doc(reference).update({ status: 'error' });
      }
    }

    // Pay-out: provider withdrawal
    if (reference.startsWith('WITHDRAWAL-')) {
      const newStatus = status === 'success' ? 'SUCCESS' : 'REJECTED';
      await db.collection('transactions').doc(reference).update({
        status: newStatus,
        settledAt: transaction.executedAt ?? new Date().toISOString(),
      });
    }

  } catch (err: any) {
    console.error('jekoWebhook processing error', err.message);
  }

  return res.status(200).send('ok');
}
