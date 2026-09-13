export enum UserRole {
  CLIENT = 'CLIENT',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
  GUEST = 'GUEST'
}

export enum ServiceCategory {
  CLEANING = 'Ménage',
  COOKING = 'Cuisine',
  ELDERLY_CARE = 'Garde de personnes âgées',
  GARDENING = 'Jardinage',
  LAUNDRY = 'Lessive',
  BABYSITTING = 'Garde d\'enfants',
  MARKET = 'Faire mon marché'
}

export enum MissionStatus {
  PENDING = 'En attente',
  ACCEPTED = 'Acceptée',
  IN_PROGRESS = 'En cours',
  PAYMENT_PENDING = 'En attente de paiement',
  COMPLETED = 'Terminée',
  DISPUTED = 'En litige',
  CANCELLED = 'Annulée',
  ARCHIVED = 'Archivée'
}

export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PRO' | 'PREMIUM';

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  startedAt: string;
  expiresAt: string;
  transactionId?: string;
}

export interface MarketItem {
  name: string;
  price: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: UserRole;
  avatarUrl: string;
  address?: string;
  city?: string;
  zone?: string;
  rating?: number;
  walletBalance?: number;
  verified?: boolean;
  services?: ServiceCategory[];
  createdAt?: string;
  idNumber?: string;
  idCardRecto?: string;
  idCardVerso?: string;
  avatarFileName?: string;
  avatarFileSize?: number;
  idRectoFileName?: string;
  idRectoFileSize?: number;
  idVersoFileName?: string;
  idVersoFileSize?: number;
  acceptTerms?: boolean;
  isSuperAdmin?: boolean;
  isSubscribed?: boolean;
  subscriptionExpiresAt?: string;
  subscription?: SubscriptionInfo;
  subscriptionPlan?: SubscriptionPlan;
  blockedUntil?: string;
  refusalsCountToday?: number;
  lastRefusalDate?: string;
  // Delegated permissions for sub-admins
  canManageUsers?: boolean;
  canManageFinance?: boolean;
  canManageDisputes?: boolean;
  canManageSettings?: boolean;
  canManageMarket?: boolean;
  assignedCity?: string; // Optional specific city assigned to sub-admin (e.g., 'Abidjan', 'Daloa', 'Bouaké')
}

export interface Mission {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  clientPhone?: string;
  clientAvatar?: string;
  providerId?: string;
  providerName?: string;
  category: ServiceCategory;
  description: string;
  location: string;
  city?: string;
  date: string;
  endTime?: string;
  durationHours: number;
  quantity?: number;
  marketItems?: MarketItem[];
  deliveryWindow?: string;
  totalPrice: number;
  commission: number;
  providerAmount: number;
  status: MissionStatus;
  createdAt: string;
  bonus?: number;
  latitude?: number;
  longitude?: number;
  estimatedArrivalTime?: string;
  estimatedDistance?: number;
  disputeReason?: string;
  refusalReason?: string;
  disputeInitiator?: 'CLIENT' | 'PROVIDER';
  completedAt?: string;
  clientRating?: number;
  clientComment?: string;
  providerRating?: number;
  providerComment?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentPhone?: string;
  paymentOperator?: string;
  paymentRef?: string;
  marketList?: string;
  marketBudget?: number;
  marketPaid?: boolean;
  extendedDurationHours?: number;
  extendedTotalPrice?: number;
  extensionStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'PAYOUT';
  userId: string;
  userName?: string;
  missionId?: string;
  date: string;
  method: 'Mobile Money' | 'Carte Bancaire' | 'Espèces' | 'Virement';
  status: 'SUCCESS' | 'PENDING_APPROVAL' | 'REJECTED';
}

export interface AiEstimation {
  estimatedDuration: number;
  suggestedPrice: number;
  descriptionImprovement: string;
}