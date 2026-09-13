import React, { useState, useEffect, useRef } from 'react';
import { User, UserRole } from '../types';
import { LogOut, Home, Briefcase, User as UserIcon, Wallet, Bell, WifiOff, CheckCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { subscribeNotifications, markAllAsRead, markAsRead, AppNotification } from '../services/notificationService';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: User;
  onLogout: () => void;
  isOfflineMode?: boolean;
  onRetryConnection?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const notifColors: Record<string, string> = {
  mission_new: 'bg-green-50 text-green-700',
  mission_accepted: 'bg-green-50 text-green-700',
  mission_completed: 'bg-emerald-50 text-emerald-700',
  mission_disputed: 'bg-red-50 text-red-700',
  mission_cancelled: 'bg-gray-100 text-gray-600',
  payment_received: 'bg-blue-50 text-blue-700',
  withdrawal_approved: 'bg-blue-50 text-blue-700',
  system: 'bg-gray-100 text-gray-600',
};

const Layout: React.FC<LayoutProps> = ({
  children,
  currentUser,
  onLogout,
  isOfflineMode = false,
  onRetryConnection,
  activeTab,
  setActiveTab
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const unsub = subscribeNotifications(currentUser.id, setNotifications);
    return unsub;
  }, [currentUser.id]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    if (showNotifPanel) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNotifPanel]);

  const handleBellClick = () => {
    setShowNotifPanel(v => !v);
  };

  const handleMarkAll = async () => {
    await markAllAsRead(currentUser.id);
  };

  const isAdmin = currentUser.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-green-100 touch-pan-y">
      <div className={cn(
        "mx-auto w-full min-h-screen flex flex-col bg-white relative",
        isAdmin
          ? "max-w-[1600px] shadow-sm"
          : "max-w-md shadow-xl shadow-gray-200/60"
      )}>

        {/* Header — masqué sur Home */}
        <header className={cn(
          "glass-header px-4 h-[60px] flex items-center justify-between transition-all duration-200",
          activeTab === 'home' && "hidden"
        )}>
          <img src="/servi_logo.png" alt="Servi+" className="h-9 w-auto object-contain" />

          <div className="flex items-center gap-1">
            {isOfflineMode && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={onRetryConnection}
                className="p-2 bg-amber-50 text-amber-600 rounded-full"
              >
                <WifiOff size={18} />
              </motion.button>
            )}

            {/* Bell with badge */}
            <div className="relative" ref={panelRef}>
              <button
                onClick={handleBellClick}
                className="p-2 text-gray-400 hover:text-gray-600 relative transition-colors"
              >
                <Bell size={20} />
                <AnimatePresence>
                  {unreadCount > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-white"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Notification Panel */}
              <AnimatePresence>
                {showNotifPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                  >
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                      <span className="font-semibold text-sm text-gray-800">Notifications</span>
                      <div className="flex items-center gap-2">
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAll}
                            className="flex items-center gap-1 text-[11px] text-green-600 font-semibold hover:text-green-700"
                          >
                            <CheckCheck size={13} /> Tout lire
                          </button>
                        )}
                        <button onClick={() => setShowNotifPanel(false)} className="p-1 text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Notification list */}
                    <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-gray-400 text-sm">
                          Aucune notification
                        </div>
                      ) : (
                        notifications.slice(0, 20).map(n => (
                          <button
                            key={n.id}
                            onClick={() => markAsRead(n.id)}
                            className={cn(
                              "w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-gray-50",
                              !n.read && "bg-green-50/50"
                            )}
                          >
                            <span className={cn(
                              "mt-0.5 w-2 h-2 rounded-full flex-shrink-0",
                              !n.read ? "bg-green-500" : "bg-gray-200"
                            )} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-gray-800 leading-snug">{n.title}</p>
                              <p className="text-[11px] text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                              <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(n.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {!n.read && (
                              <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", notifColors[n.type] || notifColors.system)}>
                                Nouveau
                              </span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
              title="Se déconnecter"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* Contenu principal */}
        <main className={cn(
          "flex-grow overflow-y-auto",
          isAdmin ? "px-4 lg:px-6 pb-4" : "px-4 pb-24",
          activeTab === 'home' ? "pt-0" : "pt-4"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentUser.id + activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Barre de navigation basse — masquée pour admin */}
        <nav className={cn("bottom-nav h-[68px] flex items-center justify-around px-2", isAdmin && "hidden")}>
          <TabItem
            icon={<Home size={21} />}
            label="Accueil"
            isActive={activeTab === 'home'}
            onClick={() => setActiveTab('home')}
          />
          <TabItem
            icon={<Briefcase size={21} />}
            label="Missions"
            isActive={activeTab === 'missions'}
            onClick={() => setActiveTab('missions')}
          />
          {currentUser.role === UserRole.PROVIDER && (
            <TabItem
              icon={<Wallet size={21} />}
              label="Portefeuille"
              isActive={activeTab === 'wallet'}
              onClick={() => setActiveTab('wallet')}
            />
          )}
          <TabItem
            icon={<UserIcon size={21} />}
            label="Profil"
            isActive={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
          />
        </nav>
      </div>
    </div>
  );
};

interface TabItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ icon, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center w-16 h-full transition-all duration-200 relative"
    >
      <motion.div
        animate={isActive ? { scale: 1.1, y: -1 } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 450, damping: 28 }}
        className={cn(
          'p-1.5 rounded-xl transition-colors duration-200',
          isActive ? 'text-green-600 bg-green-50' : 'text-gray-400'
        )}
      >
        {icon}
      </motion.div>
      <span className={cn(
        'text-[10px] font-semibold mt-0.5 tracking-wide',
        isActive ? 'text-green-600' : 'text-gray-400'
      )}>
        {label}
      </span>
      {isActive && (
        <motion.div
          layoutId="activeTabIndicator"
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[3px] bg-green-600 rounded-full"
        />
      )}
    </button>
  );
};

export default Layout;
