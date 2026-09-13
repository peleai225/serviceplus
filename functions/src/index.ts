import * as admin from 'firebase-admin';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions';
import {
  createPaymentRequest,
  createTransfer,
  upsertContact,
  getPaymentRequest,
  toJekoPayInMethod,
  toJekoPayOutMethod,
} from './jeko';

admin.initializeApp();
const db = admin.firestore();

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'https://serviplus-f1b8f.web.app';

// Cached Jèko config — read from Firestore platform/secrets (admin-only collection)
// Falls back to process.env for CLI-based deployments
let _jekoConfigCache: { apiKey: string; apiKeyId: string; storeId: string; env: string } | null = null;

async function getJekoConfig() {
  if (_jekoConfigCache) return _jekoConfigCache;
  try {
    const snap = await db.doc('platform/secrets').get();
    const d = snap.data() || {};
    _jekoConfigCache = {
      apiKey:   d.jekoApiKey    || process.env.JEKO_API_KEY    || '',
      apiKeyId: d.jekoApiKeyId  || process.env.JEKO_API_KEY_ID  || '',
      storeId:  d.jekoStoreId   || process.env.JEKO_STORE_ID   || '',
      env:      d.jekoEnv       || process.env.JEKO_ENV         || 'sandbox',
    };
  } catch {
    _jekoConfigCache = {
      apiKey:   process.env.JEKO_API_KEY    || '',
      apiKeyId: process.env.JEKO_API_KEY_ID  || '',
      storeId:  process.env.JEKO_STORE_ID   || '',
      env:      process.env.JEKO_ENV         || 'sandbox',
    };
  }
  return _jekoConfigCache;
}

// ─── 1. INITIATE SUBSCRIPTION PAYMENT ────────────────────────────────────────
export const initiateSubscriptionPayment = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');

  const { subscriptionRef, amountXof, operator, payerPhone } = request.data as {
    subscriptionRef: string;
    amountXof: number;
    operator: string;
    payerPhone?: string;
  };

  if (!subscriptionRef || !amountXof || !operator) {
    throw new HttpsError('invalid-argument', 'subscriptionRef, amountXof and operator are required.');
  }

  const reference     = subscriptionRef.startsWith('SUB-') ? subscriptionRef : `SUB-${subscriptionRef}`;
  const paymentMethod = toJekoPayInMethod(operator);

  try {
    const cfg = await getJekoConfig();
    const result = await createPaymentRequest({
      storeId: cfg.storeId,
      amountXof,
      paymentMethod,
      reference,
      successUrl: `${APP_BASE_URL}/?jekoStatus=success&ref=${reference}`,
      errorUrl:   `${APP_BASE_URL}/?jekoStatus=error&ref=${reference}`,
      payerPhone,
      apiKey: cfg.apiKey,
      apiKeyId: cfg.apiKeyId,
    });

    await db.collection('pending_payments').doc(reference).set({
      subscriptionRef: reference,
      paymentRequestId: result.id,
      reference,
      operator,
      amountXof,
      type: 'subscription',
      userId: request.auth.uid,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { checkoutUrl: result.redirectUrl, paymentRequestId: result.id, reference };
  } catch (err: any) {
    logger.error('initiateSubscriptionPayment error', err.message);
    throw new HttpsError('internal', err.message);
  }
});

// ─── 2. POLL PAYMENT STATUS ───────────────────────────────────────────────────
export const checkPaymentStatus = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');

  const { paymentRequestId } = request.data as { paymentRequestId: string };
  if (!paymentRequestId) throw new HttpsError('invalid-argument', 'paymentRequestId required.');

  try {
    const cfg = await getJekoConfig();
    const result = await getPaymentRequest(paymentRequestId, cfg.apiKey, cfg.apiKeyId);
    return { status: result.status };
  } catch (err: any) {
    throw new HttpsError('internal', err.message);
  }
});

// ─── 3. REQUEST PROVIDER WITHDRAWAL ──────────────────────────────────────────
export const requestProviderWithdrawal = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required.');

  const { providerId, providerName, amountXof, operator, phone } = request.data as {
    providerId: string;
    providerName: string;
    amountXof: number;
    operator: string;
    phone: string;
  };

  if (!providerId || !amountXof || !operator || !phone) {
    throw new HttpsError('invalid-argument', 'providerId, amountXof, operator and phone are required.');
  }

  const formattedPhone = phone.startsWith('+') ? phone : `+225${phone.replace(/^0/, '')}`;
  const paymentMethod  = toJekoPayOutMethod(operator);
  const reference      = `WITHDRAWAL-${providerId}-${Date.now()}`;

  try {
    const cfg = await getJekoConfig();
    const contactId = await upsertContact({ name: providerName, paymentMethod, phone: formattedPhone, apiKey: cfg.apiKey, apiKeyId: cfg.apiKeyId });

    const transfer = await createTransfer({
      storeId: cfg.storeId,
      contactId,
      amountXof,
      description: `Retrait Servi+ — ${providerName}`,
      reference,
      apiKey: cfg.apiKey,
      apiKeyId: cfg.apiKeyId,
    });

    await db.collection('transactions').doc(reference).set({
      id: reference,
      userId: providerId,
      userName: providerName,
      amount: amountXof,
      type: 'PAYOUT',
      date: new Date().toISOString(),
      method: 'Mobile Money',
      status: 'PENDING',
      jekoTransferId: transfer.id,
      jekoReference: reference,
      operator,
      phone: formattedPhone,
    });

    return { transferId: transfer.id, reference, status: 'pending' };
  } catch (err: any) {
    logger.error('requestProviderWithdrawal error', err.message);
    throw new HttpsError('internal', err.message);
  }
});

// ─── 4. JÈKO WEBHOOK ─────────────────────────────────────────────────────────
// URL: https://us-central1-serviplus-f1b8f.cloudfunctions.net/jekoWebhook
// Configure in: Jèko Business Dashboard → Paramètres > API & Webhooks
export const jekoWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('Method Not Allowed'); return; }

  const payload = req.body as any;
  logger.info('Jèko webhook received', { payload });

  try {
    const event       = payload.event;
    const transaction = event ? payload.payload : payload;

    if (!transaction?.id) { res.status(200).send('ok'); return; }

    const status    = transaction.status as string;
    const reference = transaction.transactionDetails?.reference as string | undefined;

    if (!reference) { res.status(200).send('ok'); return; }

    // ── Pay-in: subscription payment ────────────────────────────────────────
    if (reference.startsWith('SUB-')) {
      const parts  = reference.split('-'); // SUB-{userId}-{timestamp}
      const userId = parts[1] ?? '';

      if (status === 'success' && userId) {
        // Monthly = 10 000 XOF, Annual = 80 000 XOF — threshold at 50 000
        const durationDays    = (transaction.amount?.amount ?? 0) >= 50_000 ? 365 : 30;
        const expirationDate  = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

        await db.collection('users').doc(userId).update({
          isSubscribed: true,
          subscriptionExpiresAt: expirationDate.toISOString(),
        });
        await db.collection('pending_payments').doc(reference).update({ status: 'success' });
        logger.info(`Subscription confirmed for user ${userId} until ${expirationDate.toISOString()}.`);
      } else if (status === 'error') {
        await db.collection('pending_payments').doc(reference).update({ status: 'error' });
      }
    }

    // ── Pay-out: provider withdrawal ─────────────────────────────────────────
    if (reference.startsWith('WITHDRAWAL-')) {
      const newStatus = status === 'success' ? 'SUCCESS' : 'REJECTED';
      await db.collection('transactions').doc(reference).update({
        status: newStatus,
        settledAt: transaction.executedAt ?? new Date().toISOString(),
      });
      logger.info(`Withdrawal ${reference} → ${newStatus}`);
    }

  } catch (err: any) {
    logger.error('jekoWebhook processing error', err.message);
  }

  res.status(200).send('ok');
});

// ─── 5. SAVE API CONFIG ───────────────────────────────────────────────────────
export const saveApiConfig = onCall(async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login required');

  const { adminUserId, jekoApiKey, jekoApiKeyId, jekoStoreId, jekoEnv } = request.data as {
    adminUserId: string;
    jekoApiKey?: string;
    jekoApiKeyId?: string;
    jekoStoreId?: string;
    jekoEnv?: string;
  };

  // Verify admin role in Firestore
  const userSnap = await db.doc(`users/${adminUserId}`).get();
  const userData = userSnap.data();
  if (!userData || userData.role !== 'ADMIN') {
    throw new HttpsError('permission-denied', 'Admin access required');
  }

  // Build update object — only update fields that were provided
  const update: Record<string, string> = { updatedAt: new Date().toISOString(), updatedBy: adminUserId };
  if (jekoApiKey)    update.jekoApiKey    = jekoApiKey;
  if (jekoApiKeyId)  update.jekoApiKeyId  = jekoApiKeyId;
  if (jekoStoreId)   update.jekoStoreId   = jekoStoreId;
  if (jekoEnv)       update.jekoEnv       = jekoEnv;

  await db.doc('platform/secrets').set(update, { merge: true });

  // Invalidate the in-memory cache so next call to getJekoConfig() re-reads Firestore
  _jekoConfigCache = null;

  return { success: true };
});

// ─── 6. SEND SMS ──────────────────────────────────────────────────────────────
// STATUS: STUB — no SMS provider is wired up yet.
// To enable real SMS:
//   Option A – Twilio: set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
//              in Firebase Functions env, then install "twilio" package and call
//              client.messages.create({ to: phoneNumber, from, body: message }).
//   Option B – Orange SMS API: set ORANGE_SMS_CLIENT_ID, ORANGE_SMS_CLIENT_SECRET
//              and POST to https://api.orange.com/smsmessaging/v1/outbound/{sender}/requests.
//   Until a provider is configured this function logs the message and returns simulated:true.
export const sendSms = onCall(async (request) => {
  const { phoneNumber, message } = request.data as { phoneNumber: string; message: string };
  logger.info(`[SMS stub — not delivered] To ${phoneNumber}: ${message}`);
  return { success: true, simulated: true };
});
