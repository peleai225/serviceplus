import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db, FieldValue } from './_lib/firebase-admin.js';
import { createPaymentRequest, toJekoPayInMethod, formatPhoneCI } from './_lib/jeko.js';
import { getJekoConfig, APP_BASE_URL, cors } from './_lib/config.js';

const PLAN_KEYS = ['STARTER', 'PRO', 'PREMIUM'] as const;
type PaidPlan = typeof PLAN_KEYS[number];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, plan, phone, operator } = req.body ?? {};
  if (!userId || !plan || !phone || !operator) {
    return res.status(400).json({ error: 'userId, plan, phone and operator are required.' });
  }
  if (!PLAN_KEYS.includes(plan as PaidPlan)) {
    return res.status(400).json({ error: `plan must be one of: ${PLAN_KEYS.join(', ')}` });
  }

  // Fetch plan prices from platform/config (admin can edit via backoffice)
  let planPrices: Record<string, number> = { STARTER: 2500, PRO: 5000, PREMIUM: 10000 };
  try {
    const configSnap = await db.doc('platform/config').get();
    const configData = configSnap.data();
    if (configData?.subscriptionPlans) {
      const sp = configData.subscriptionPlans as { starter?: number; pro?: number; premium?: number };
      planPrices = {
        STARTER: sp.starter ?? 2500,
        PRO: sp.pro ?? 5000,
        PREMIUM: sp.premium ?? 10000,
      };
    }
  } catch (e) {
    console.warn('Could not read subscriptionPlans from Firestore, using defaults', e);
  }

  const price = planPrices[plan as PaidPlan];
  const jekoFee = Math.ceil(price * 0.015);
  const total = price + jekoFee;

  const reference = `SUBPLAN-${userId}-${Date.now()}`;
  const paymentMethod = toJekoPayInMethod(operator);

  try {
    const cfg = await getJekoConfig();
    const result = await createPaymentRequest({
      storeId: cfg.storeId,
      amountXof: total,
      paymentMethod,
      reference,
      successUrl: `${APP_BASE_URL}/?jekoStatus=success&ref=${reference}`,
      errorUrl: `${APP_BASE_URL}/?jekoStatus=error&ref=${reference}`,
      payerPhone: formatPhoneCI(phone),
      apiKey: cfg.apiKey,
      apiKeyId: cfg.apiKeyId,
    });

    await db.collection('pending_subscriptions').doc(result.id).set({
      userId,
      plan,
      amount: total,
      price,
      jekoFee,
      phone,
      operator,
      reference,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      paymentRequestId: result.id,
      checkoutUrl: result.redirectUrl,
      total,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
