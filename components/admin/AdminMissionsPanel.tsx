import React, { useState, useMemo } from 'react';
import { Mission, MissionStatus, User, ServiceCategory, UserRole } from '../../types';
import { cn } from '../../lib/utils';
import {
  Search,
  Filter,
  ChevronDown,
  User as UserIcon,
  MapPin,
  Phone,
  Check,
  X,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdminMissionsPanelProps {
  missions: Mission[];
  users: User[];
  onUpdateMissionStatus: (
    missionId: string,
    status: MissionStatus,
    providerId?: string,
  ) => void;
}

// ---------------------------------------------------------------------------
// Constants / helpers
// ---------------------------------------------------------------------------

const CATEGORY_EMOJI: Record<ServiceCategory, string> = {
  [ServiceCategory.CLEANING]: '🧹',
  [ServiceCategory.COOKING]: '🍳',
  [ServiceCategory.LAUNDRY]: '👕',
  [ServiceCategory.MARKET]: '🛒',
  [ServiceCategory.BABYSITTING]: '👶',
  [ServiceCategory.ELDERLY_CARE]: '👴',
  [ServiceCategory.GARDENING]: '🌿',
};

const STATUS_LABEL: Record<MissionStatus, string> = {
  [MissionStatus.PENDING]: 'En attente',
  [MissionStatus.ACCEPTED]: 'Acceptée',
  [MissionStatus.IN_PROGRESS]: 'En cours',
  [MissionStatus.PAYMENT_PENDING]: 'Paiement en attente',
  [MissionStatus.COMPLETED]: 'Terminée',
  [MissionStatus.DISPUTED]: 'En litige',
  [MissionStatus.CANCELLED]: 'Annulée',
  [MissionStatus.ARCHIVED]: 'Archivée',
};

const STATUS_BADGE_CLASS: Record<MissionStatus, string> = {
  [MissionStatus.PENDING]: 'bg-amber-100 text-amber-700',
  [MissionStatus.ACCEPTED]: 'bg-blue-100 text-blue-700',
  [MissionStatus.IN_PROGRESS]: 'bg-indigo-100 text-indigo-700',
  [MissionStatus.PAYMENT_PENDING]: 'bg-orange-100 text-orange-700',
  [MissionStatus.COMPLETED]: 'bg-green-100 text-green-700',
  [MissionStatus.DISPUTED]: 'bg-red-100 text-red-700',
  [MissionStatus.CANCELLED]: 'bg-gray-100 text-gray-500',
  [MissionStatus.ARCHIVED]: 'bg-zinc-100 text-zinc-500',
};

type FilterStatus = MissionStatus | 'ALL';

const FILTER_BUTTONS: { label: string; value: FilterStatus }[] = [
  { label: 'Toutes', value: 'ALL' },
  { label: 'En attente', value: MissionStatus.PENDING },
  { label: 'Acceptées', value: MissionStatus.ACCEPTED },
  { label: 'En cours', value: MissionStatus.IN_PROGRESS },
  { label: 'Terminées', value: MissionStatus.COMPLETED },
  { label: 'En litige', value: MissionStatus.DISPUTED },
  { label: 'Annulées', value: MissionStatus.CANCELLED },
];

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-CI', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-CI', { style: 'decimal', maximumFractionDigits: 0 }).format(amount) + ' FCFA';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: MissionStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'text-xs font-semibold px-2.5 py-1 rounded-full',
        STATUS_BADGE_CLASS[status] ?? 'bg-gray-100 text-gray-500',
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Assign Provider Modal
// ---------------------------------------------------------------------------

interface AssignProviderModalProps {
  mission: Mission;
  providers: User[];
  onAssign: (providerId: string) => void;
  onClose: () => void;
}

function AssignProviderModal({ mission, providers, onAssign, onClose }: AssignProviderModalProps) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return providers.filter((p) => {
      const matchesCity =
        !mission.city || !p.city || p.city === mission.city;
      const matchesCategory =
        !p.services || p.services.length === 0 || p.services.includes(mission.category);
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || (p.city ?? '').toLowerCase().includes(q);
      return matchesCity && matchesCategory && matchesSearch;
    });
  }, [providers, mission, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Assigner un prestataire</h3>
            <p className="text-xs text-gray-500 mt-0.5">{mission.title}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-50">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un prestataire…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Provider list */}
        <div className="overflow-y-auto flex-1 px-3 py-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              Aucun prestataire disponible
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {filtered.map((provider) => (
                <li key={provider.id} className="flex items-center gap-3 py-3 px-2">
                  <img
                    src={provider.avatarUrl}
                    alt={provider.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0 bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{provider.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {provider.rating !== undefined && (
                        <span className="text-xs text-amber-500 font-semibold">
                          ★ {provider.rating.toFixed(1)}
                        </span>
                      )}
                      {provider.city && (
                        <span className="text-xs text-gray-400">{provider.city}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => onAssign(provider.id)}
                    className="shrink-0 text-xs font-semibold py-2 px-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    Assigner
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mission Card
// ---------------------------------------------------------------------------

interface MissionCardProps {
  key?: string | number | null;
  mission: Mission;
  providers: User[];
  onUpdateStatus: (status: MissionStatus, providerId?: string) => void;
}

const MissionCard: React.FC<MissionCardProps> = ({ mission, providers, onUpdateStatus }) => {
  const [showAssign, setShowAssign] = useState(false);

  const handleAssign = (providerId: string) => {
    onUpdateStatus(MissionStatus.ACCEPTED, providerId);
    setShowAssign(false);
  };

  const categoryEmoji = CATEGORY_EMOJI[mission.category] ?? '📋';

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl" aria-hidden="true">{categoryEmoji}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{mission.title}</p>
              <p className="text-xs text-gray-400 truncate">{mission.category}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1 shrink-0">
            <StatusBadge status={mission.status} />
          </div>
        </div>

        {/* Details grid — client, phone, location */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-2 text-xs">
          {/* Client */}
          <div className="flex items-center gap-1.5 text-gray-600">
            <UserIcon size={12} className="text-gray-400 shrink-0" />
            <span className="truncate font-semibold">{mission.clientName}</span>
          </div>
          {/* Phone */}
          {mission.clientPhone && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Phone size={12} className="text-gray-400 shrink-0" />
              <span className="truncate">{mission.clientPhone}</span>
            </div>
          )}
          {/* Location */}
          <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
            <MapPin size={12} className="text-gray-400 shrink-0" />
            <span className="truncate">
              {mission.location}
              {mission.city ? ` — ${mission.city}` : ''}
            </span>
          </div>
        </div>

        {/* Price + Date row */}
        <div className="flex justify-between flex-wrap gap-1 mb-3 text-xs">
          <div className="flex items-center gap-1.5 text-gray-500">
            <span>{formatDate(mission.date)}</span>
            {mission.endTime && <span className="text-gray-400">→ {mission.endTime}</span>}
          </div>
          <span className="font-bold text-green-600">{formatPrice(mission.totalPrice)}</span>
        </div>

        {/* Provider row */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-400 font-semibold">Prestataire :</span>
            {mission.providerName ? (
              <span className="font-semibold text-gray-700">{mission.providerName}</span>
            ) : (
              <span className="font-semibold text-orange-500">Non assigné</span>
            )}
          </div>
          {!mission.providerId && (
            <button
              onClick={() => setShowAssign(true)}
              className="text-xs font-semibold py-1.5 px-3 rounded-xl border border-green-600 text-green-600 hover:bg-green-50 transition-colors"
            >
              Assigner
            </button>
          )}
        </div>

        {/* Action buttons */}
        <ActionButtons status={mission.status} onUpdateStatus={onUpdateStatus} />
      </div>

      {/* Assign modal */}
      {showAssign && (
        <AssignProviderModal
          mission={mission}
          providers={providers}
          onAssign={handleAssign}
          onClose={() => setShowAssign(false)}
        />
      )}
    </>
  );
};

// ---------------------------------------------------------------------------
// Action Buttons
// ---------------------------------------------------------------------------

interface ActionButtonsProps {
  status: MissionStatus;
  onUpdateStatus: (status: MissionStatus) => void;
}

function ActionButtons({ status, onUpdateStatus }: ActionButtonsProps) {
  switch (status) {
    case MissionStatus.PENDING:
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          <button
            onClick={() => onUpdateStatus(MissionStatus.ACCEPTED)}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <Check size={13} />
            Accepter
          </button>
          <button
            onClick={() => onUpdateStatus(MissionStatus.CANCELLED)}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-xl border border-red-400 text-red-500 hover:bg-red-50 transition-colors"
          >
            <X size={13} />
            Annuler
          </button>
        </div>
      );

    case MissionStatus.ACCEPTED:
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          <button
            onClick={() => onUpdateStatus(MissionStatus.IN_PROGRESS)}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <Loader2 size={13} />
            Démarrer
          </button>
          <button
            onClick={() => onUpdateStatus(MissionStatus.CANCELLED)}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-xl border border-red-400 text-red-500 hover:bg-red-50 transition-colors"
          >
            <X size={13} />
            Annuler
          </button>
        </div>
      );

    case MissionStatus.IN_PROGRESS:
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          <button
            onClick={() => onUpdateStatus(MissionStatus.COMPLETED)}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <Check size={13} />
            Terminer
          </button>
          <button
            onClick={() => onUpdateStatus(MissionStatus.DISPUTED)}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-xl border border-orange-400 text-orange-500 hover:bg-orange-50 transition-colors"
          >
            Litige
          </button>
        </div>
      );

    case MissionStatus.DISPUTED:
      return (
        <div className="flex flex-wrap gap-2 mt-1">
          <button
            onClick={() => onUpdateStatus(MissionStatus.COMPLETED)}
            className="flex-1 text-xs font-semibold py-2 px-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            Payer prestataire
          </button>
          <button
            onClick={() => onUpdateStatus(MissionStatus.CANCELLED)}
            className="flex-1 text-xs font-semibold py-2 px-3 rounded-xl border border-red-400 text-red-500 hover:bg-red-50 transition-colors"
          >
            Rembourser client
          </button>
        </div>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
        <Filter size={22} className="text-gray-400" />
      </div>
      <p className="font-bold text-gray-700">Aucune mission</p>
      <p className="text-sm text-gray-400 mt-1">
        Aucune mission ne correspond aux filtres sélectionnés.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

const AdminMissionsPanel: React.FC<AdminMissionsPanelProps> = ({
  missions,
  users,
  onUpdateMissionStatus,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'ALL'>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');

  // Derive unique cities from missions
  const cities = useMemo(() => {
    const set = new Set<string>();
    missions.forEach((m) => {
      if (m.city) set.add(m.city);
    });
    return Array.from(set).sort();
  }, [missions]);

  // Filter providers for modal (role = PROVIDER)
  const providers = useMemo(
    () => users.filter((u) => u.role === UserRole.PROVIDER),
    [users],
  );

  // Filtered missions
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return missions.filter((m) => {
      const matchesSearch =
        !q ||
        m.clientName.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;
      const matchesCity = cityFilter === 'ALL' || m.city === cityFilter;
      return matchesSearch && matchesStatus && matchesCategory && matchesCity;
    });
  }, [missions, search, statusFilter, categoryFilter, cityFilter]);

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------------------------ */}
      {/* Filter bar – sticky                                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-10 bg-gray-50 pb-2 -mx-4 px-4 pt-1">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
          {/* Header: Search + count */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
            <div className="relative flex-1">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Rechercher par client, lieu, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <span className="shrink-0 text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-xl whitespace-nowrap self-start sm:self-auto">
              {filtered.length} mission{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Status chips */}
          <div className="flex flex-wrap gap-2">
            {FILTER_BUTTONS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors',
                  statusFilter === value
                    ? 'bg-green-600 border-green-600 text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Category + City dropdowns */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Category */}
            <div className="relative flex-1">
              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(e.target.value as ServiceCategory | 'ALL')
                }
                className="w-full appearance-none text-xs font-semibold border border-gray-200 rounded-xl py-2 pl-3 pr-8 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              >
                <option value="ALL">Toutes catégories</option>
                {Object.entries(CATEGORY_EMOJI).map(([cat, emoji]) => (
                  <option key={cat} value={cat}>
                    {emoji} {cat as string}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>

            {/* City */}
            <div className="relative flex-1">
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
              <ChevronDown
                size={13}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Mission list                                                         */}
      {/* ------------------------------------------------------------------ */}
      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              providers={providers}
              onUpdateStatus={(status, providerId) =>
                onUpdateMissionStatus(mission.id, status, providerId)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminMissionsPanel;
