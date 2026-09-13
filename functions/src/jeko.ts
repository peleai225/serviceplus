/**
 * Jèko Partner API client — server-side only (Firebase Cloud Functions).
 * https://developer.jeko.africa
 */

const JEKO_BASE = 'https://api.jeko.africa';

export function jekoHeaders(apiKey: string, apiKeyId: string): Record<string, string> {
  if (!apiKey || !apiKeyId) {
    throw new Error('Jèko API keys not configured. Set them in the admin backoffice (Settings > API).');
  }
  return {
    'Content-Type': 'application/json',
    'X-API-KEY': apiKey,
    'X-API-KEY-ID': apiKeyId,
  };
}

// Maps UI operator label → Jèko pay-in payment method
export function toJekoPayInMethod(operator: string): string {
  const map: Record<string, string> = {
    'wave': 'wave',
    'Wave': 'wave',
    'orange': 'orange',
    'Orange Money': 'orange',
    'Orange': 'orange',
    'mtn': 'mtn',
    'MTN MoMo': 'mtn',
    'MTN': 'mtn',
    'moov': 'moov',
    'Moov Money': 'moov',
    'djamo': 'djamo',
  };
  return map[operator] ?? 'wave';
}

// Maps UI operator label → Jèko pay-out contact payment method
export function toJekoPayOutMethod(operator: string): string {
  const map: Record<string, string> = {
    'wave': 'wave',
    'Wave': 'wave',
    'orange': 'orange_money',
    'Orange Money': 'orange_money',
    'mtn': 'mtn',
    'MTN MoMo': 'mtn',
    'moov': 'moov',
    'Moov Money': 'moov',
    'djamo': 'djamo',
  };
  return map[operator] ?? 'wave';
}

/** Creates a Jèko payment request (checkout). Returns { id, redirectUrl, status }. */
export async function createPaymentRequest(params: {
  storeId: string;
  amountXof: number;     // in XOF — will be converted to centimes
  paymentMethod: string; // Jèko pay-in method (wave / orange / mtn / moov / djamo)
  reference: string;     // your unique reference e.g. "MISSION-m1234567890"
  successUrl: string;
  errorUrl: string;
  payerPhone?: string;   // required for API-direct (forceProviderDirect)
  apiKey: string;
  apiKeyId: string;
}) {
  const body: Record<string, unknown> = {
    storeId: params.storeId,
    amountCents: Math.round(params.amountXof * 100),
    currency: 'XOF',
    reference: params.reference,
    paymentDetails: {
      type: 'redirect',
      data: {
        paymentMethod: params.paymentMethod,
        successUrl: params.successUrl,
        errorUrl: params.errorUrl,
        ...(params.payerPhone ? { forceProviderDirect: true, payerPhone: params.payerPhone } : {}),
      },
    },
  };

  const res = await fetch(`${JEKO_BASE}/partner_api/payment_requests`, {
    method: 'POST',
    headers: jekoHeaders(params.apiKey, params.apiKeyId),
    body: JSON.stringify(body),
  });

  const data = await res.json() as any;
  if (!res.ok) {
    throw new Error(`Jèko payment request failed [${res.status}]: ${data.message ?? JSON.stringify(data)}`);
  }
  return data as { id: string; redirectUrl: string; status: string; reference: string };
}

/** Gets the current status of a payment request. */
export async function getPaymentRequest(paymentRequestId: string, apiKey: string, apiKeyId: string) {
  const res = await fetch(`${JEKO_BASE}/partner_api/payment_requests/${paymentRequestId}`, {
    method: 'GET',
    headers: jekoHeaders(apiKey, apiKeyId),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(`Jèko getPaymentRequest failed [${res.status}]: ${data.message}`);
  return data;
}

/** Creates or retrieves a Jèko beneficiary contact. Returns contactId. */
export async function upsertContact(params: {
  name: string;
  paymentMethod: string; // Jèko pay-out method
  phone: string;         // international format e.g. "+2250707070707"
  apiKey: string;
  apiKeyId: string;
}): Promise<string> {
  // Check existing contacts to avoid duplicates
  const listRes = await fetch(`${JEKO_BASE}/partner_api/contacts`, {
    headers: jekoHeaders(params.apiKey, params.apiKeyId),
  });
  if (listRes.ok) {
    const contacts = await listRes.json() as any[];
    const existing = contacts.find(
      c => c.identifier?.number === params.phone && c.paymentMethod === params.paymentMethod
    );
    if (existing) return existing.id as string;
  }

  const res = await fetch(`${JEKO_BASE}/partner_api/contacts`, {
    method: 'POST',
    headers: jekoHeaders(params.apiKey, params.apiKeyId),
    body: JSON.stringify({
      name: params.name,
      paymentMethod: params.paymentMethod,
      identifier: { number: params.phone },
    }),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(`Jèko create contact failed [${res.status}]: ${data.message}`);
  return data.id as string;
}

/** Initiates a transfer (pay-out) to a provider. Returns transfer object. */
export async function createTransfer(params: {
  storeId: string;
  contactId: string;
  amountXof: number;
  description?: string;
  reference?: string;
  apiKey: string;
  apiKeyId: string;
}) {
  const body: Record<string, unknown> = {
    storeId: params.storeId,
    contactId: params.contactId,
    amountCents: Math.round(params.amountXof * 100),
    currency: 'XOF',
    ...(params.description ? { description: params.description } : {}),
    ...(params.reference ? { reference: params.reference } : {}),
  };

  const res = await fetch(`${JEKO_BASE}/partner_api/transfers`, {
    method: 'POST',
    headers: jekoHeaders(params.apiKey, params.apiKeyId),
    body: JSON.stringify(body),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(`Jèko transfer failed [${res.status}]: ${data.message}`);
  return data;
}

/** Gets store balance. */
export async function getStoreBalance(storeId: string, apiKey: string, apiKeyId: string): Promise<number> {
  const res = await fetch(`${JEKO_BASE}/partner_api/stores/${storeId}/balance`, {
    headers: jekoHeaders(apiKey, apiKeyId),
  });
  const data = await res.json() as any;
  if (!res.ok) throw new Error(`Jèko balance failed [${res.status}]: ${data.message}`);
  return (data.balance?.amount ?? 0) / 100; // convert centimes → XOF
}
