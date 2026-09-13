import React, { useState, useMemo } from 'react';
import {
  User,
  Mission,
  MissionStatus,
  ServiceCategory,
  UserRole,
} from '../../types';
import { SERVICE_ICONS } from '../../constants';
import { cn } from '../../lib/utils';
import {
  Shield,
  CheckCircle,
  XCircle,
  Star,
  Search,
  Filter,
  Eye,
  User as UserIcon,
  MapPin,
  Phone,
  Mail,
  Calendar,
  TrendingUp,
  Award,
  Wallet,
  X,
  ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AdminProvidersPanelProps {
  users: User[];
  missions: Mission[];
  onVerifyUser: (userId: string, isVerified: boolean) => void;
  onUpdateUser?: (userId: string, fields: Partial<User>) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProviderFilter =
  | 'ALL'
  | 'VERIFIED'
  | 'UNVERIFIED'
  | 'SUB_ACTIVE'
  | 'SUB_EXPIRED';

const FILTER_BUTTONS: { label: string; value: ProviderFilter }[] = [
  { label: 'Tous', value: 'ALL' },
  { label: 'Vérifiés', value: 'VERIFIED' },
  { label: 'Non vérifiés', value: 'UNVERIFIED' },
  { label: 'Abonnés actifs', value: 'SUB_ACTIVE' },
  { label: 'Abonnement expiré', value: 'SUB_EXPIRED' },
];

const MISSION_STATUS_LABEL: Record<MissionStatus, string> = {
  [MissionStatus.PENDING]: 'En attente',
  [MissionStatus.ACCEPTED]: 'Acceptée',
  [MissionStatus.IN_PROGRESS]: 'En cours',
  [MissionStatus.PAYMENT_PENDING]: 'Paiement en attente',
  [MissionStatus.COMPLETED]: 'Terminée',
  [MissionStatus.DISPUTED]: 'En litige',
  [MissionStatus.CANCELLED]: 'Annulée',
  [MissionStatus.ARCHIVED]: 'Archivée',
};

const MISSION_STATUS_CLASS: Record<MissionStatus, string> = {
  [MissionStatus.PENDING]: 'bg-amber-100 text-amber-700',
  [MissionStatus.ACCEPTED]: 'bg-blue-100 text-blue-700',
  [MissionStatus.IN_PROGRESS]: 'bg-indigo-100 text-indigo-700',
  [MissionStatus.PAYMENT_PENDING]: 'bg-orange-100 text-orange-700',
  [MissionStatus.COMPLETED]: 'bg-green-100 text-green-700',
  [MissionStatus.DISPUTED]: 'bg-red-100 text-red-700',
  [MissionStatus.CANCELLED]: 'bg-gray-100 text-gray-500',
  [MissionStatus.ARCHIVED]: 'bg-zinc-100 text-zinc-500',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-CI', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatPrice(amount: number): string {
  return (
    new Intl.NumberFormat('fr-CI', {
      style: 'decimal',
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA'
  );
}

function getDaysUntilExpiry(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function isSubscriptionActive(user: User): boolean {
  if (!user.isSubscribed) return false;
  if (!user.subscriptionExpiresAt) return true;
  const days = getDaysUntilExpiry(user.subscriptionExpiresAt);
  return days !== null && days > 0;
}

// ---------------------------------------------------------------------------
// Sub-components — Subscription badge
// ---------------------------------------------------------------------------

function SubscriptionBadge({ user }: { user: User }) {
  if (isSubscriptionActive(user)) {
    const days = getDaysUntilExpiry(user.subscriptionExpiresAt);
    const soonExpiring = days !== null && days <= 7;
    if (soonExpiring) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
          ⏰ Expire dans {days}j
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
        🚀 Pro Actif
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">
      ✗ Inactif
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sub-components — Verification badge
// ---------------------------------------------------------------------------

function VerificationBadge({ verified }: { verified?: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
        <CheckCircle size={11} />
        Vérifié
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-600">
      ⚠ Non vérifié
    </span>
  );
}

// ---------------------------------------------------------------------------
// Provider Card
// ---------------------------------------------------------------------------

interface ProviderCardProps {
  provider: User;
  completedMissions: number;
  totalEarnings: number;
  onVerify: () => void;
  onToggleSubscription: () => void;
  onViewDetails: () => void;
}

const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  completedMissions,
  totalEarnings,
  onVerify,
  onToggleSubscription,
  onViewDetails,
}) => {
  const active = isSubscriptionActive(provider);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      {/* Top row: avatar + identity */}
      <div className="flex items-start gap-3">
        <img
          src={provider.avatarUrl}
          alt={provider.name}
          className="w-12 h-12 rounded-full object-cover shrink-0 bg-gray-100"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{provider.name}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500 truncate mt-0.5">
            <Mail size={11} className="shrink-0 text-gray-400" />
            <span className="truncate">{provider.email}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <Phone size={11} className="shrink-0 text-gray-400" />
            <span>{provider.phone}</span>
          </div>
        </div>
      </div>

      {/* City / zone badges */}
      <div className="flex flex-wrap gap-1.5">
        {provider.city && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
            <MapPin size={10} />
            {provider.city}
          </span>
        )}
        {provider.zone && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
            {provider.zone}
          </span>
        )}
      </div>

      {/* Badges row — flex flex-wrap pour éviter l'overflow */}
      <div className="flex flex-wrap gap-1.5">
        <VerificationBadge verified={provider.verified} />
        <SubscriptionBadge user={provider} />
      </div>

      {/* Services pills — flex flex-wrap gap-1 */}
      {provider.services && provider.services.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {provider.services.map((svc) => {
            const Icon = SERVICE_ICONS[svc];
            return (
              <span
                key={svc}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
              >
                {Icon && <Icon size={10} />}
                {svc}
              </span>
            );
          })}
        </div>
      )}

      {/* Stats row — grid grid-cols-3 gap-2 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-amber-50 rounded-xl py-1.5 px-1">
          <p className="text-xs font-bold text-amber-600 flex items-center justify-center gap-0.5">
            <Star size={11} />
            {provider.rating !== undefined ? provider.rating.toFixed(1) : '—'}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">Note</p>
        </div>
        <div className="bg-green-50 rounded-xl py-1.5 px-1">
          <p className="text-xs font-bold text-green-700">{completedMissions}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Missions</p>
        </div>
        <div className="bg-blue-50 rounded-xl py-1.5 px-1">
          <p className="text-xs font-bold text-blue-700 truncate" title={formatPrice(totalEarnings)}>
            {totalEarnings >= 1000
              ? (totalEarnings / 1000).toFixed(0) + 'k'
              : totalEarnings}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">FCFA</p>
        </div>
      </div>

      {/* Action buttons — flex flex-wrap gap-2 pt-2 pour éviter l'overflow */}
      <div className="flex flex-wrap gap-2 pt-2">
        {/* Verify toggle */}
        <button
          onClick={onVerify}
          className={cn(
            'flex-1 min-w-[120px] flex items-center justify-center gap-1 text-xs font-semibold py-2 px-2 rounded-xl transition-colors',
            provider.verified
              ? 'border border-red-400 text-red-500 hover:bg-red-50'
              : 'bg-green-600 text-white hover:bg-green-700',
          )}
        >
          {provider.verified ? (
            <>
              <XCircle size={12} /> Retirer vérif.
            </>
          ) : (
            <>
              <CheckCircle size={12} /> Vérifier
            </>
          )}
        </button>

        {/* Subscription toggle */}
        <button
          onClick={onToggleSubscription}
          className={cn(
            'flex-1 min-w-[120px] flex items-center justify-center gap-1 text-xs font-semibold py-2 px-2 rounded-xl transition-colors',
            active
              ? 'border border-gray-300 text-gray-600 hover:bg-gray-50'
              : 'border border-green-500 text-green-600 hover:bg-green-50',
          )}
        >
          {active ? (
            <>
              <XCircle size={12} /> Désactiver abo.
            </>
          ) : (
            <>
              <Shield size={12} /> Activer abo.
            </>
          )}
        </button>

        {/* Details — full width */}
        <button
          onClick={onViewDetails}
          className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Eye size={13} />
          Voir détails
          <ChevronRight size={12} className="ml-auto" />
        </button>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Provider Detail Modal
// ---------------------------------------------------------------------------

interface ProviderDetailModalProps {
  provider: User;
  providerMissions: Mission[];
  onClose: () => void;
  onVerify: () => void;
  onToggleSubscription: () => void;
}

const ProviderDetailModal: React.FC<ProviderDetailModalProps> = ({
  provider,
  providerMissions,
  onClose,
  onVerify,
  onToggleSubscription,
}) => {
  const active = isSubscriptionActive(provider);
  const completedMissions = providerMissions.filter(
    (m) => m.status === MissionStatus.COMPLETED,
  );
  const totalEarnings = completedMissions.reduce(
    (sum, m) => sum + (m.totalPrice ?? 0),
    0,
  );
  const recentMissions = [...providerMissions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
  const daysLeft = getDaysUntilExpiry(provider.subscriptionExpiresAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal container — w-full max-w-lg mx-4 sm:mx-0, overflow-y-auto, max-h-[90vh] */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] mx-4 sm:mx-0 flex flex-col overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={provider.avatarUrl}
              alt={provider.name}
              className="w-10 h-10 rounded-full object-cover bg-gray-100 shrink-0"
            />
            <div className="min-w-0">
              <h3 className="font-bold text-gray-900 text-base truncate">{provider.name}</h3>
              <p className="text-xs text-gray-500 truncate">{provider.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors shrink-0 ml-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body — overflow-y-auto */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Section: Info complète */}
          <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              Informations
            </h4>
            {/* grid-cols-2 max sur mobile */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Phone size={13} className="text-gray-400 shrink-0" />
                <span className="truncate">{provider.phone}</span>
              </div>
              {provider.city && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate">{provider.city}</span>
                </div>
              )}
              {provider.zone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate">{provider.zone}</span>
                </div>
              )}
              {provider.address && (
                <div className="flex items-center gap-2 text-gray-700 col-span-2">
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate">{provider.address}</span>
                </div>
              )}
              {provider.createdAt && (
                <div className="flex items-center gap-2 text-gray-700 col-span-2">
                  <Calendar size={13} className="text-gray-400 shrink-0" />
                  <span>Inscrit le {formatDate(provider.createdAt)}</span>
                </div>
              )}
            </div>
          </section>

          {/* Section: Finances */}
          <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              Finances
            </h4>
            {/* grid-cols-2 sur mobile, grid-cols-3 sur sm+ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <Wallet size={14} className="text-green-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-green-700 truncate">
                  {formatPrice(provider.walletBalance ?? 0)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Solde wallet</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <TrendingUp size={14} className="text-blue-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-blue-700 truncate">
                  {formatPrice(totalEarnings)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Gains totaux</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                <Award size={14} className="text-amber-600 mx-auto mb-1" />
                <p className="text-sm font-bold text-amber-700">
                  {completedMissions.length}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Terminées</p>
              </div>
            </div>
          </section>

          {/* Section: Abonnement */}
          <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              Abonnement
            </h4>
            {/* flex flex-wrap gap-2 pour éviter l'overflow sur petits écrans */}
            <div className="bg-gray-50 rounded-xl p-3 flex flex-wrap gap-2 items-center justify-between">
              <div>
                <SubscriptionBadge user={provider} />
                {provider.subscriptionExpiresAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    {daysLeft !== null && daysLeft > 0
                      ? `Expire le ${formatDate(provider.subscriptionExpiresAt)} (${daysLeft}j restants)`
                      : `Expiré le ${formatDate(provider.subscriptionExpiresAt)}`}
                  </p>
                )}
              </div>
              <button
                onClick={onToggleSubscription}
                className={cn(
                  'shrink-0 text-xs font-semibold py-2 px-3 rounded-xl transition-colors',
                  active
                    ? 'border border-gray-300 text-gray-600 hover:bg-gray-100'
                    : 'bg-green-600 text-white hover:bg-green-700',
                )}
              >
                {active ? 'Désactiver' : 'Activer (30j)'}
              </button>
            </div>
          </section>

          {/* Section: Vérification */}
          <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              Vérification
            </h4>
            {/* flex flex-wrap gap-2 pour éviter l'overflow sur petits écrans */}
            <div className="bg-gray-50 rounded-xl p-3 flex flex-wrap gap-2 items-center justify-between">
              <VerificationBadge verified={provider.verified} />
              <button
                onClick={onVerify}
                className={cn(
                  'shrink-0 text-xs font-semibold py-2 px-3 rounded-xl transition-colors',
                  provider.verified
                    ? 'border border-red-400 text-red-500 hover:bg-red-50'
                    : 'bg-green-600 text-white hover:bg-green-700',
                )}
              >
                {provider.verified ? 'Retirer vérification' : 'Vérifier'}
              </button>
            </div>
          </section>

          {/* Section: Missions récentes */}
          <section>
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
              5 dernières missions
            </h4>
            {recentMissions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Aucune mission
              </p>
            ) : (
              <ul className="space-y-2">
                {recentMissions.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 bg-gray-50 rounded-xl px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">
                        {m.title}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatDate(m.createdAt)} · {formatPrice(m.totalPrice ?? 0)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                        MISSION_STATUS_CLASS[m.status] ?? 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {MISSION_STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
      <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
        <UserIcon size={24} className="text-gray-400" />
      </div>
      <p className="font-bold text-gray-700 text-base">Aucun prestataire trouvé</p>
      <p className="text-sm text-gray-400 mt-1">
        Aucun prestataire ne correspond aux critères sélectionnés.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

const AdminProvidersPanel: React.FC<AdminProvidersPanelProps> = ({
  users,
  missions,
  onVerifyUser,
  onUpdateUser,
}) => {
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [selectedProvider, setSelectedProvider] = useState<User | null>(null);

  // Keep only PROVIDER role
  const providers = useMemo(
    () => users.filter((u) => u.role === UserRole.PROVIDER),
    [users],
  );

  // Unique cities
  const cities = useMemo(() => {
    const set = new Set<string>();
    providers.forEach((p) => {
      if (p.city) set.add(p.city);
    });
    return Array.from(set).sort();
  }, [providers]);

  // Missions per provider (memoised map)
  const missionsByProvider = useMemo(() => {
    const map = new Map<string, Mission[]>();
    missions.forEach((m) => {
      if (!m.providerId) return;
      const existing = map.get(m.providerId) ?? [];
      existing.push(m);
      map.set(m.providerId, existing);
    });
    return map;
  }, [missions]);

  const getCompletedCount = (providerId: string): number =>
    (missionsByProvider.get(providerId) ?? []).filter(
      (m) => m.status === MissionStatus.COMPLETED,
    ).length;

  const getTotalEarnings = (providerId: string): number =>
    (missionsByProvider.get(providerId) ?? [])
      .filter((m) => m.status === MissionStatus.COMPLETED)
      .reduce((sum, m) => sum + (m.totalPrice ?? 0), 0);

  // Filtered providers
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return providers.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.includes(q);

      const matchesCity = cityFilter === 'ALL' || p.city === cityFilter;

      const subActive = isSubscriptionActive(p);
      const subExpired =
        p.isSubscribed === true &&
        p.subscriptionExpiresAt !== undefined &&
        (getDaysUntilExpiry(p.subscriptionExpiresAt) ?? 1) <= 0;

      let matchesFilter = true;
      switch (providerFilter) {
        case 'VERIFIED':
          matchesFilter = p.verified === true;
          break;
        case 'UNVERIFIED':
          matchesFilter = !p.verified;
          break;
        case 'SUB_ACTIVE':
          matchesFilter = subActive;
          break;
        case 'SUB_EXPIRED':
          matchesFilter = subExpired;
          break;
        default:
          matchesFilter = true;
      }

      return matchesSearch && matchesCity && matchesFilter;
    });
  }, [providers, search, cityFilter, providerFilter]);

  const handleToggleSubscription = (provider: User) => {
    if (!onUpdateUser) return;
    const nowActive = isSubscriptionActive(provider);
    onUpdateUser(provider.id, {
      isSubscribed: !nowActive,
      subscriptionExpiresAt: !nowActive
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        : provider.subscriptionExpiresAt,
    });
  };

  // Keep modal in sync when provider data changes
  const modalProvider = selectedProvider
    ? users.find((u) => u.id === selectedProvider.id) ?? selectedProvider
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------------------------ */}
      {/* Filter bar – sticky                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-10 bg-gray-50 pb-2 -mx-4 px-4 pt-1">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">

          {/* Header: filter chips + counter
              flex flex-col sm:flex-row — chips wrap sur mobile, counter passe à la ligne */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Filter chips — flex flex-wrap gap-2 pour passer à la ligne sur mobile */}
            <div className="flex flex-wrap gap-2 flex-1">
              {FILTER_BUTTONS.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => setProviderFilter(value)}
                  className={cn(
                    'text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors',
                    providerFilter === value
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {/* Counter */}
            <span className="shrink-0 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-xl whitespace-nowrap">
              {filtered.length} prestataire{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Search + city dropdown — flex flex-col sm:flex-row gap-3 */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Rechercher par nom, email, téléphone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* City dropdown */}
            <div className="flex items-center gap-2">
              <Filter size={13} className="text-gray-400 shrink-0" />
              <div className="relative flex-1 sm:w-44">
                <select
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full appearance-none text-xs font-semibold border border-gray-200 rounded-xl py-2 pl-3 pr-8 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                >
                  <option value="ALL">Toutes les villes</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <ChevronRight
                  size={12}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Provider grid — grid-cols-1 md:grid-cols-2 xl:grid-cols-3           */}
      {/* ------------------------------------------------------------------ */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              completedMissions={getCompletedCount(provider.id)}
              totalEarnings={getTotalEarnings(provider.id)}
              onVerify={() => onVerifyUser(provider.id, !provider.verified)}
              onToggleSubscription={() => handleToggleSubscription(provider)}
              onViewDetails={() => setSelectedProvider(provider)}
            />
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Detail modal                                                         */}
      {/* ------------------------------------------------------------------ */}
      {modalProvider && (
        <ProviderDetailModal
          provider={modalProvider}
          providerMissions={missionsByProvider.get(modalProvider.id) ?? []}
          onClose={() => setSelectedProvider(null)}
          onVerify={() => {
            onVerifyUser(modalProvider.id, !modalProvider.verified);
          }}
          onToggleSubscription={() => handleToggleSubscription(modalProvider)}
        />
      )}
    </div>
  );
};

export default AdminProvidersPanel;
