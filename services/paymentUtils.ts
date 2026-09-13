export const JEKO_FEE_RATE = 0.015; // 1.5%

export interface PaymentBreakdown {
  base: number;
  fee: number;
  total: number;
}

/** Calcule le montant total avec frais Jèko (à la charge du client) */
export function calculateWithJekoFee(baseAmount: number): PaymentBreakdown {
  const fee = Math.ceil(baseAmount * JEKO_FEE_RATE);
  return { base: baseAmount, fee, total: baseAmount + fee };
}

/** Formate un montant en FCFA */
export function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-CI').format(Math.round(amount)) + ' FCFA';
}
