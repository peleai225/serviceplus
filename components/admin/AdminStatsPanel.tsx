import React from 'react';
import { Mission, User, Transaction, MissionStatus, UserRole } from '../../types';
import { TrendingUp, Users, AlertTriangle, DollarSign, Activity, MapPin } from 'lucide-react';

interface AdminStatsPanelProps {
  missions: Mission[];
  users: User[];
  transactions: Transaction[];
}

interface StatusConfig {
  label: string;
  barColor: string;
}

const STATUS_CONFIG: Record<MissionStatus, StatusConfig> = {
  [MissionStatus.PENDING]: { label: 'En attente', barColor: 'bg-amber-400' },
  [MissionStatus.ACCEPTED]: { label: 'Acceptée', barColor: 'bg-sky-400' },
  [MissionStatus.IN_PROGRESS]: { label: 'En cours', barColor: 'bg-blue-500' },
  [MissionStatus.PAYMENT_PENDING]: { label: 'Paiement en attente', barColor: 'bg-yellow-400' },
  [MissionStatus.COMPLETED]: { label: 'Terminée', barColor: 'bg-green-500' },
  [MissionStatus.DISPUTED]: { label: 'En litige', barColor: 'bg-red-500' },
  [MissionStatus.CANCELLED]: { label: 'Annulée', barColor: 'bg-gray-400' },
  [MissionStatus.ARCHIVED]: { label: 'Archivée', barColor: 'bg-slate-400' },
};

const AdminStatsPanel: React.FC<AdminStatsPanelProps> = ({ missions, users, transactions }) => {
  // ---- KPI computations ----
  const totalRevenue = transactions
    .filter(t => t.type === 'INCOME')
    .reduce((sum, t) => sum + t.amount, 0);

  const activeSubscriptions = users.filter(
    u => u.isSubscribed && u.role === UserRole.PROVIDER
  ).length;

  const now = new Date();
  const missionsCesMois = missions.filter(m => {
    const d = new Date(m.createdAt);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const litigesOuverts = missions.filter(m => m.status === MissionStatus.DISPUTED).length;

  // ---- Missions par statut ----
  const statusCounts = (Object.values(MissionStatus) as MissionStatus[])
    .map(status => ({
      status,
      count: missions.filter(m => m.status === status).length,
    }))
    .filter(x => x.count > 0);

  const totalMissions = missions.length || 1;

  // ---- Activité par zone (top 5) ----
  const zoneCounts: Record<string, number> = {};
  missions.forEach(m => {
    const key = m.city ?? 'Inconnue';
    zoneCounts[key] = (zoneCounts[key] ?? 0) + 1;
  });
  const topZones = Object.entries(zoneCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxZoneCount = topZones[0]?.[1] ?? 1;

  // ---- Dernières 5 transactions ----
  const lastTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* ---- Row 1: KPI Cards (responsive grid) ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenus */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-xl text-green-600 shrink-0">
            <DollarSign size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-400 font-medium">Revenus</p>
            <p className="text-xl font-bold text-green-600 mt-0.5 truncate">
              {totalRevenue.toLocaleString()} F
            </p>
          </div>
        </div>

        {/* Abonnements actifs */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-xl text-blue-600 shrink-0">
            <Users size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Abonnements actifs</p>
            <p className="text-xl font-bold text-blue-600 mt-0.5">{activeSubscriptions}</p>
          </div>
        </div>

        {/* Missions ce mois */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-start gap-3">
          <div className="p-2 bg-purple-100 rounded-xl text-purple-600 shrink-0">
            <Activity size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Missions ce mois</p>
            <p className="text-xl font-bold text-purple-600 mt-0.5">{missionsCesMois}</p>
          </div>
        </div>

        {/* Litiges ouverts */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 flex items-start gap-3">
          <div className="p-2 bg-red-100 rounded-xl text-red-600 shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Litiges ouverts</p>
            <p className="text-xl font-bold text-red-600 mt-0.5">{litigesOuverts}</p>
          </div>
        </div>
      </div>

      {/* ---- Row 2: Missions par statut ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-green-600" />
          Missions par statut
        </h3>
        {statusCounts.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Aucune mission enregistrée</p>
        ) : (
          <div className="space-y-3">
            {statusCounts.map(({ status, count }) => {
              const cfg = STATUS_CONFIG[status];
              const pct = Math.round((count / totalMissions) * 100);
              return (
                <div key={status} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 font-medium w-28 sm:w-40 shrink-0 truncate">
                    {cfg.label}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${cfg.barColor}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-8 text-right shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Row 3: Activité par zone ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin size={16} className="text-green-600" />
          Activité par zone (Top 5)
        </h3>
        {topZones.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Aucune donnée de zone disponible</p>
        ) : (
          <div className="space-y-3">
            {topZones.map(([zone, count]) => {
              const pct = Math.round((count / maxZoneCount) * 100);
              return (
                <div key={zone} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 font-medium w-28 shrink-0 truncate">
                    {zone}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-green-500 transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-gray-700 w-8 text-right shrink-0">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Row 4: Dernières transactions ---- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Dernières transactions</h3>
        {lastTransactions.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Aucune transaction enregistrée</p>
        ) : (
          <>
            {/* Mobile cards — visible only below md */}
            <div className="flex flex-col space-y-2 md:hidden">
              {lastTransactions.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50"
                >
                  <div className="min-w-0">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        t.type === 'INCOME'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {t.type === 'INCOME' ? 'Entrée' : 'Retrait'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1 truncate">{t.userName ?? '—'}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-bold text-gray-900">
                      {t.amount.toLocaleString()} F
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(t.date).toLocaleDateString('fr-CI', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table — hidden below md */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs text-gray-400 font-semibold pb-2 pr-3">Date</th>
                    <th className="text-left text-xs text-gray-400 font-semibold pb-2 pr-3">Type</th>
                    <th className="text-right text-xs text-gray-400 font-semibold pb-2 pr-3">Montant</th>
                    <th className="text-left text-xs text-gray-400 font-semibold pb-2">Utilisateur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {lastTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-3 text-gray-500">
                        {new Date(t.date).toLocaleDateString('fr-CI', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full font-bold ${
                            t.type === 'INCOME'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-orange-100 text-orange-700'
                          }`}
                        >
                          {t.type === 'INCOME' ? 'Entrée' : 'Retrait'}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right font-bold text-gray-900">
                        {t.amount.toLocaleString()} F
                      </td>
                      <td className="py-2 text-gray-500">{t.userName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminStatsPanel;
