import React, { useState, useMemo } from 'react';
import {
  Crown, Users, TrendingUp, AlertTriangle, Clock,
  CheckCircle, XCircle, Calendar, ChevronRight, X, DollarSign,
} from 'lucide-react';
import { User, Transaction, UserRole } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminSubscriptionsPanelProps {
  users: User[];
  transactions: Transaction[];
  onUpdateUser?: (userId: string, fields: Partial<User>) => Promise<void>;
}

type FilterType = 'all' | 'active' | 'expiring' | 'expired';

type PendingAction =
  | { kind: 'activate30'; user: User }
  | { kind: 'activate1y'; user: User }
  | { kind: 'deactivate'; user: User };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const now = () => new Date();

function isActive(user: User): boolean {
  return !!(
    user.isSubscribed &&
    user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) > now()
  );
}

function daysLeft(user: User): number | null {
  if (!user.subscriptionExpiresAt) return null;
  return Math.ceil(
    (new Date(user.subscriptionExpiresAt).getTime() - Date.now()) / 86_400_000
  );
}

function isExpiringSoon(user: User): boolean {
  const d = daysLeft(user);
  return isActive(user) && d !== null && d <= 7;
}

function isExpired(user: User): boolean {
  return !!(
    user.isSubscribed &&
    user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt) <= now()
  );
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function isSubTransaction(t: Transaction): boolean {
  // Subscription payments: INCOME with no associated mission
  return t.type === 'INCOME' && !t.missionId;
}

function isCurrentMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const n = now();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth();
}

function getUserById(users: User[], id?: string): User | undefined {
  if (!id) return undefined;
  return users.find(u => u.id === id);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ icon, label, value, iconBg, iconColor }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <span className={iconColor}>{icon}</span>
    </div>
    <div>
      <p className="text-sm text-gray-500 leading-tight">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  </div>
);

type BadgeVariant = 'active' | 'expiring' | 'expired' | 'inactive';

const STATUS_BADGE: Record<
  BadgeVariant,
  { label: string; classes: string }
> = {
  active:   { label: 'Actif',            classes: 'bg-green-100 text-green-700' },
  expiring: { label: 'Expire bientôt',   classes: 'bg-amber-100 text-amber-700' },
  expired:  { label: 'Expiré',           classes: 'bg-red-100 text-red-700' },
  inactive: { label: 'Inactif',          classes: 'bg-gray-100 text-gray-500' },
};

function getBadgeVariant(user: User): BadgeVariant {
  if (isExpiringSoon(user)) return 'expiring';
  if (isActive(user)) return 'active';
  if (isExpired(user)) return 'expired';
  return 'inactive';
}

// ---------------------------------------------------------------------------
// Confirmation Modal
// ---------------------------------------------------------------------------

interface ConfirmModalProps {
  action: PendingAction;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ACTION_LABELS: Record<PendingAction['kind'], string> = {
  activate30: 'Activer 30 jours',
  activate1y: 'Activer 1 an',
  deactivate: 'Désactiver',
};

const ACTION_COLORS: Record<PendingAction['kind'], string> = {
  activate30: 'bg-emerald-600 hover:bg-emerald-700',
  activate1y: 'bg-blue-600 hover:bg-blue-700',
  deactivate: 'bg-red-600 hover:bg-red-700',
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  action, loading, onConfirm, onCancel,
}) => {
  const { user, kind } = action;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Confirmer l'action
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Details */}
        <div className="bg-gray-50 rounded-xl p-4 mb-5 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Prestataire</span>
            <span className="font-medium text-gray-900">{user.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-700">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Action</span>
            <span className="font-semibold text-gray-900">{ACTION_LABELS[kind]}</span>
          </div>
          {user.subscriptionExpiresAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Expiration actuelle</span>
              <span className="text-gray-700">{formatDate(user.subscriptionExpiresAt)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700
                       hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium
                        transition-colors disabled:opacity-50 ${ACTION_COLORS[kind]}`}
          >
            {loading ? 'En cours…' : ACTION_LABELS[kind]}
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AdminSubscriptionsPanel: React.FC<AdminSubscriptionsPanelProps> = ({
  users,
  transactions,
  onUpdateUser,
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ---- providers only ----
  const providers = useMemo(
    () => users.filter(u => u.role === UserRole.PROVIDER),
    [users]
  );

  // ---- KPIs ----
  const kpiActive   = useMemo(() => providers.filter(isActive).length, [providers]);
  const kpiExpiring = useMemo(() => providers.filter(isExpiringSoon).length, [providers]);
  const kpiExpired  = useMemo(() => providers.filter(isExpired).length, [providers]);
  const kpiRevenue  = useMemo(() => {
    return transactions
      .filter(t => isSubTransaction(t) && isCurrentMonth(t.date))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  // ---- Filtered list ----
  const filteredProviders = useMemo(() => {
    let list: User[];
    switch (filter) {
      case 'active':
        list = providers.filter(u => isActive(u) && !isExpiringSoon(u));
        break;
      case 'expiring':
        list = providers.filter(isExpiringSoon);
        break;
      case 'expired':
        list = providers.filter(u => isExpired(u) || !u.isSubscribed);
        break;
      default:
        list = providers;
    }
    // Sort: expiring → active → expired → inactive
    const order: BadgeVariant[] = ['expiring', 'active', 'expired', 'inactive'];
    return [...list].sort(
      (a, b) => order.indexOf(getBadgeVariant(a)) - order.indexOf(getBadgeVariant(b))
    );
  }, [providers, filter]);

  // ---- Recent sub transactions ----
  const recentSubTx = useMemo(() => {
    return [...transactions]
      .filter(isSubTransaction)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [transactions]);

  // ---- Action handlers ----
  function requestAction(action: PendingAction) {
    setPendingAction(action);
  }

  async function confirmAction() {
    if (!pendingAction || !onUpdateUser) return;
    setActionLoading(true);
    try {
      const { user, kind } = pendingAction;
      if (kind === 'activate30') {
        await onUpdateUser(user.id, {
          isSubscribed: true,
          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        });
      } else if (kind === 'activate1y') {
        await onUpdateUser(user.id, {
          isSubscribed: true,
          subscriptionExpiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        });
      } else {
        await onUpdateUser(user.id, { isSubscribed: false });
      }
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const FILTER_PILLS: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all',      label: 'Tous',             count: providers.length },
    { key: 'active',   label: 'Actifs',            count: kpiActive },
    { key: 'expiring', label: 'Expirent bientôt',  count: kpiExpiring },
    { key: 'expired',  label: 'Expirés / Inactifs' },
  ];

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* KPI Cards                                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon={<Crown size={22} />}
          label="Abonnements actifs"
          value={kpiActive}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <KpiCard
          icon={<AlertTriangle size={22} />}
          label="Expirent dans 7 jours"
          value={kpiExpiring}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <KpiCard
          icon={<XCircle size={22} />}
          label="Abonnements expirés"
          value={kpiExpired}
          iconBg="bg-red-50"
          iconColor="text-red-600"
        />
        <KpiCard
          icon={<DollarSign size={22} />}
          label="Revenus abonnements (mois)"
          value={`${kpiRevenue.toLocaleString('fr-FR')} F CFA`}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter pills                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap gap-2">
        {FILTER_PILLS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border
              ${filter === key
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
          >
            {label}
            {count !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold
                  ${filter === key ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Providers panel (header + content)                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Panel header */}
        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-2">
          <Users size={18} className="text-gray-400" />
          <h2 className="text-base font-semibold text-gray-800">
            Prestataires — abonnements
          </h2>
          <span className="ml-auto text-sm text-gray-400">{filteredProviders.length} résultat(s)</span>
        </div>

        {filteredProviders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
            <Crown size={36} strokeWidth={1.5} />
            <p className="text-sm">Aucun prestataire pour ce filtre.</p>
          </div>
        ) : (
          <>
            {/* ------------------------------------------------------------ */}
            {/* Mobile cards (< md)                                          */}
            {/* ------------------------------------------------------------ */}
            <div className="block md:hidden space-y-3 p-4">
              {filteredProviders.map(user => {
                const variant = getBadgeVariant(user);
                const badge   = STATUS_BADGE[variant];
                const days    = daysLeft(user);
                const active  = isActive(user);

                let daysColor = 'text-gray-400';
                if (days !== null) {
                  if (days <= 3)       daysColor = 'text-red-600 font-semibold';
                  else if (days <= 7)  daysColor = 'text-amber-600 font-medium';
                  else if (days > 7)   daysColor = 'text-green-600';
                }

                return (
                  <div
                    key={user.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3"
                  >
                    {/* Row 1 — Avatar + nom + email */}
                    <div className="flex items-center gap-3">
                      {user.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center
                                        justify-center flex-shrink-0 text-indigo-700 font-bold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 leading-tight truncate">{user.name}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                    </div>

                    {/* Row 2 — Badge statut + badge ville */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.classes}`}>
                        {badge.label}
                      </span>
                      {user.city && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          {user.city}
                        </span>
                      )}
                    </div>

                    {/* Row 3 — Date expiration + jours restants */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-gray-400 flex-shrink-0" />
                        Expire le&nbsp;: {formatDate(user.subscriptionExpiresAt)}
                      </span>
                      {days !== null && active ? (
                        <span className={`font-medium ${daysColor}`}>
                          Jours restants&nbsp;: {days}j
                        </span>
                      ) : (
                        <span className="text-gray-300">Jours restants&nbsp;: —</span>
                      )}
                    </div>

                    {/* Row 4 — Actions */}
                    <div className="flex flex-wrap gap-2">
                      {!active && (
                        <>
                          <button
                            onClick={() => requestAction({ kind: 'activate30', user })}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs
                                       font-medium hover:bg-emerald-100 transition-colors whitespace-nowrap"
                          >
                            Activer 30j
                          </button>
                          <button
                            onClick={() => requestAction({ kind: 'activate1y', user })}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs
                                       font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                          >
                            Activer 1 an
                          </button>
                        </>
                      )}
                      {active && (
                        <>
                          <button
                            onClick={() => requestAction({ kind: 'activate1y', user })}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs
                                       font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                          >
                            +1 an
                          </button>
                          <button
                            onClick={() => requestAction({ kind: 'deactivate', user })}
                            className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs
                                       font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
                          >
                            Désactiver
                          </button>
                        </>
                      )}
                      {!onUpdateUser && (
                        <span className="text-xs text-gray-300 italic self-center">lecture seule</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ------------------------------------------------------------ */}
            {/* Desktop table (>= md)                                        */}
            {/* ------------------------------------------------------------ */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">Prestataire</th>
                      <th className="px-4 py-3 text-left">Ville</th>
                      <th className="px-4 py-3 text-left">Statut</th>
                      <th className="px-4 py-3 text-left">Expiration</th>
                      <th className="px-4 py-3 text-left">Jours restants</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredProviders.map(user => {
                      const variant = getBadgeVariant(user);
                      const badge   = STATUS_BADGE[variant];
                      const days    = daysLeft(user);
                      const active  = isActive(user);

                      let daysColor = 'text-gray-400';
                      if (days !== null) {
                        if (days <= 3)       daysColor = 'text-red-600 font-semibold';
                        else if (days <= 7)  daysColor = 'text-amber-600 font-medium';
                        else if (days > 7)   daysColor = 'text-green-600';
                      }

                      return (
                        <tr key={user.id} className="hover:bg-gray-50/70 transition-colors">
                          {/* Prestataire */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.name}
                                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center
                                                justify-center flex-shrink-0 text-indigo-700 font-bold text-sm">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-gray-900 leading-tight">{user.name}</p>
                                <p className="text-xs text-gray-400">{user.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Ville */}
                          <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                            {user.city ?? '—'}
                          </td>

                          {/* Statut */}
                          <td className="px-4 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.classes}`}>
                              {badge.label}
                            </span>
                          </td>

                          {/* Date expiration */}
                          <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-gray-400 flex-shrink-0" />
                              {formatDate(user.subscriptionExpiresAt)}
                            </span>
                          </td>

                          {/* Jours restants */}
                          <td className="px-4 py-4 whitespace-nowrap">
                            {days !== null && active ? (
                              <span className={daysColor}>{days}j</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {!active && (
                                <>
                                  <button
                                    onClick={() => requestAction({ kind: 'activate30', user })}
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs
                                               font-medium hover:bg-emerald-100 transition-colors whitespace-nowrap"
                                  >
                                    Activer 30j
                                  </button>
                                  <button
                                    onClick={() => requestAction({ kind: 'activate1y', user })}
                                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs
                                               font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                                  >
                                    Activer 1 an
                                  </button>
                                </>
                              )}
                              {active && (
                                <>
                                  <button
                                    onClick={() => requestAction({ kind: 'activate1y', user })}
                                    className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs
                                               font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                                  >
                                    +1 an
                                  </button>
                                  <button
                                    onClick={() => requestAction({ kind: 'deactivate', user })}
                                    className="px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs
                                               font-medium hover:bg-red-100 transition-colors whitespace-nowrap"
                                  >
                                    Désactiver
                                  </button>
                                </>
                              )}
                              {!onUpdateUser && (
                                <span className="text-xs text-gray-300 italic">lecture seule</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Recent subscription transactions                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp size={18} className="text-gray-400" />
          <h2 className="text-base font-semibold text-gray-800">
            Historique des abonnements récents
          </h2>
          <span className="ml-auto text-xs text-gray-400">10 dernières</span>
        </div>

        {recentSubTx.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
            <Clock size={30} strokeWidth={1.5} />
            <p className="text-sm">Aucune transaction d'abonnement.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {recentSubTx.map(tx => {
              const provider = getUserById(users, tx.userId);
              return (
                <li key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/60 transition-colors">
                  {/* Icon */}
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Crown size={16} className="text-indigo-600" />
                  </div>

                  {/* Description + provider */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm truncate">
                      {provider ? provider.name : tx.userName ?? 'Prestataire'} — Abonnement
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tx.method} · {formatDate(tx.date)}
                    </p>
                  </div>

                  {/* Amount */}
                  <span
                    className={`text-sm font-semibold whitespace-nowrap ${
                      tx.amount >= 0 ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {tx.amount >= 0 ? '+' : ''}
                    {tx.amount.toLocaleString('fr-FR')} F CFA
                  </span>

                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Confirmation modal                                                  */}
      {/* ------------------------------------------------------------------ */}
      {pendingAction && (
        <ConfirmModal
          action={pendingAction}
          loading={actionLoading}
          onConfirm={confirmAction}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
};

export default AdminSubscriptionsPanel;
