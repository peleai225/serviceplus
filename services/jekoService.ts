/**
 * Frontend service for Jèko payments.
 * All API calls go through Vercel API routes — no Jèko keys in the browser.
 * Jèko is used ONLY for provider subscription payments and withdrawals.
 */

const API_BASE = '/api';

async function apiCall<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(res.ok ? text : `Erreur serveur (${res.status}). Vérifiez la configuration Vercel.`);
  }
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data as T;
}

export interface PaymentResult {
  checkoutUrl: string;
  paymentRequestId: string;
  reference: string;
}

/** Initiates a Jèko checkout for a provider subscription. */
export const initiateSubscriptionPayment = async (params: {
  subscriptionRef: string;
  amountXof: number;
  operator: string;
  payerPhone?: string;
}): Promise<PaymentResult> => {
  return apiCall<PaymentResult>('initiate-payment', params);
};

/** Opens the Jèko checkout URL in a new tab. */
export const openCheckout = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/** Polls Jèko to verify if a payment completed. */
export const pollPaymentStatus = async (paymentRequestId: string): Promise<'pending' | 'success' | 'error'> => {
  try {
    const data = await apiCall<{ status: string }>('check-payment', { paymentRequestId });
    return data.status as 'pending' | 'success' | 'error';
  } catch {
    return 'pending';
  }
};

export interface WithdrawalResult {
  transactionId: string;
  reference: string;
  status: string;
}

export interface ApiConfigParams {
  adminUserId: string;
  adminUserData?: Record<string, unknown>;
  jekoApiKey?: string;
  jekoApiKeyId?: string;
  jekoStoreId?: string;
  jekoEnv?: string;
}

export const saveApiConfig = async (params: ApiConfigParams): Promise<void> => {
  await apiCall('save-api-config', params);
};

/** Requests a provider wallet withdrawal via Jèko transfer (Mobile Money). */
export const requestProviderWithdrawal = async (params: {
  userId: string;
  amount: number;
  operator: string;
  phone: string;
}): Promise<WithdrawalResult> => {
  return apiCall<WithdrawalResult>('request-withdrawal', params);
};
