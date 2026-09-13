
import React, { useState, useEffect } from 'react';
import { User, Mission, MissionStatus, UserRole, ServiceCategory, Transaction } from '../types';
import { MOCK_TRANSACTIONS, SERVICE_ICONS, MARKET_PACKAGING_FEE, MARKET_SERVICE_FEE, MARKET_DELIVERY_FEE, CITIES } from '../constants';
import { Users, TrendingUp, AlertTriangle, ShieldAlert, DollarSign, Settings, FileText, CheckCircle, XCircle, Search, Trash2, UserPlus, Shield, ShoppingBasket, Printer, List, Archive, Truck, PackageCheck, Wallet, ArrowDownLeft, ArrowUpRight, Clock, Briefcase, User as UserIcon, Check, Eye, EyeOff, Lock, Loader2, Menu, X as XIcon, ClipboardList, Tag, Briefcase as BriefcaseIcon, Crown, BookOpen, Zap, LogOut, Home, Key, Copy, ExternalLink, RefreshCw, Server, Globe, Bell as BellIcon, Database } from 'lucide-react';
import { getAppConfig, saveAppConfig, subscribeAppConfig, AppConfig, FlashAnnouncement, TrainingItem } from '../services/configService';
import AdminMissionsPanel from './admin/AdminMissionsPanel';
import AdminOffersPanel from './admin/AdminOffersPanel';
import AdminStatsPanel from './admin/AdminStatsPanel';
import AdminProvidersPanel from './admin/AdminProvidersPanel';
import AdminSubscriptionsPanel from './admin/AdminSubscriptionsPanel';
import AdminContentsPanel from './admin/AdminContentsPanel';
import AdminIntegrationsPanel from './admin/AdminIntegrationsPanel';

interface AdminDashboardProps {
  currentUser: User;
  missions: Mission[];
  users: User[];
  transactions: Transaction[]; // Added for financial tab
  baseRates: Record<ServiceCategory, number>;
  commissionRate: number;
  onResolveDispute: (missionId: string, resolution: 'REFUND' | 'PAY') => void;
  onVerifyUser: (userId: string, isVerified: boolean) => void;
  onUpdateSettings: (rates: Record<ServiceCategory, number>, commission: number) => void;
  onAddAdmin: (newUser: User) => void;
  onDeleteUser: (userId: string) => void;
  onUpdateMissionStatus: (missionId: string, status: MissionStatus, providerId?: string, estimation?: any) => void;
  onDeleteMission: (missionId: string) => void;
  onApproveWithdrawal: (transactionId: string) => void;
  onUpdateUser?: (userId: string, updatedFields: Partial<User>) => Promise<void>;
  onLogout?: () => void;
}


type TabType = 'OVERVIEW' | 'USERS' | 'FINANCE' | 'DISPUTES' | 'SETTINGS' | 'TEAM' | 'MARKET' | 'PROFILE' | 'MISSIONS' | 'OFFRES' | 'PROVIDERS' | 'ABONNEMENTS' | 'CONTENUS' | 'INTEGRATIONS';

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  missions,
  users,
  transactions,
  baseRates,
  commissionRate,
  onResolveDispute,
  onVerifyUser,
  onUpdateSettings,
  onAddAdmin,
  onDeleteUser,
  onUpdateMissionStatus,
  onDeleteMission,
  onApproveWithdrawal,
  onUpdateUser,
  onLogout,
}) => {
  
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [platformConfig, setPlatformConfig] = useState<AppConfig>(getAppConfig());
  const [searchTerm, setSearchTerm] = useState('');

  // Subform states for Flash Announcements
  const [newAnnText, setNewAnnText] = useState('');
  const [newAnnTarget, setNewAnnTarget] = useState<'ALL' | 'CLIENT' | 'PROVIDER'>('ALL');
  const [newAnnType, setNewAnnType] = useState<'promo' | 'flash' | 'info'>('info');

  // Subform states for Training Video/Guides
  const [newTrainTitle, setNewTrainTitle] = useState('');
  const [newTrainType, setNewTrainType] = useState<'video' | 'test' | 'image'>('video');
  const [newTrainUrl, setNewTrainUrl] = useState('');
  const [newTrainCategory, setNewTrainCategory] = useState('Général');
  const [newTrainDesc, setNewTrainDesc] = useState('');
  const [newTrainTarget, setNewTrainTarget] = useState<'CLIENT' | 'PROVIDER'>('PROVIDER');

  // MCQ building elements
  const [newQuestions, setNewQuestions] = useState<{question: string, options: string[], answerIdx: number}[]>([]);
  const [newQText, setNewQText] = useState('');
  const [newQOpts, setNewQOpts] = useState<string[]>(['', '', '']);
  const [newQAns, setNewQAns] = useState<number>(0);
  
  // State for splitting Users view
  const [userViewMode, setUserViewMode] = useState<'CLIENT' | 'PROVIDER'>('CLIENT');
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<User | null>(null);
  const [bonusAmountInput, setBonusAmountInput] = useState('');
  const [isAwardingBonus, setIsAwardingBonus] = useState(false);

  const [showArchivedMarket, setShowArchivedMarket] = useState(false);
  const isSuperAdmin = currentUser.isSuperAdmin;

  // Auto-Delete Archives after 30 days
  useEffect(() => {
      const cleanupArchives = () => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          missions.forEach(m => {
              if (m.status === MissionStatus.ARCHIVED && m.category === ServiceCategory.MARKET) {
                  // Use completedAt if available, else createdAt
                  const dateRef = m.completedAt || m.createdAt;
                  const missionDate = new Date(dateRef);
                  
                  if (missionDate < thirtyDaysAgo) {
                      console.log(`Auto-deleting old archive: ${m.id}`);
                      onDeleteMission(m.id);
                  }
              }
          });
      }
      
      // Run cleanup when dashboard loads or missions change
      cleanupArchives();
  }, [missions, onDeleteMission]);

  // Redirect sub-admins away from unauthorized tabs
  useEffect(() => {
    if (activeTab === 'MARKET' && !isSuperAdmin && !currentUser.canManageMarket) setActiveTab('OVERVIEW');
    if (activeTab === 'USERS' && !isSuperAdmin && !currentUser.canManageUsers) setActiveTab('OVERVIEW');
    if (activeTab === 'FINANCE' && !isSuperAdmin && !currentUser.canManageFinance) setActiveTab('OVERVIEW');
    if (activeTab === 'DISPUTES' && !isSuperAdmin && !currentUser.canManageDisputes) setActiveTab('OVERVIEW');
    if (activeTab === 'SETTINGS' && !isSuperAdmin && !currentUser.canManageSettings) setActiveTab('OVERVIEW');
    if (activeTab === 'TEAM' && !isSuperAdmin) setActiveTab('OVERVIEW');
  }, [activeTab, isSuperAdmin, currentUser]);

  // New Admin Form State
  const [newAdminForm, setNewAdminForm] = useState({
      name: '',
      phone: '',
      password: '',
      canManageUsers: true,
      canManageFinance: false,
      canManageDisputes: false,
      canManageSettings: false,
      canManageMarket: true,
      assignedCity: 'Toutes les villes',
  });

  // City-scoped filtering for sub-administrators
  const assignedCityParam = currentUser.assignedCity;
  const isCityRestricted = !isSuperAdmin && assignedCityParam && assignedCityParam !== 'Toutes les villes' && assignedCityParam !== 'Toutes';

  const scopedMissions = isCityRestricted 
    ? missions.filter(m => m.city === assignedCityParam) 
    : missions;

  const scopedUsers = isCityRestricted 
    ? users.filter(u => u.city === assignedCityParam) 
    : users;

  const scopedTransactions = isCityRestricted 
    ? transactions.filter(t => {
        const transUser = users.find(u => u.id === t.userId);
        return transUser && transUser.city === assignedCityParam;
      })
    : transactions;

  // Derived Data
  const totalRevenue = scopedMissions.reduce((sum, m) => sum + (m.totalPrice || 0), 0);
  const platformCommission = scopedMissions.reduce((sum, m) => sum + (m.commission || 0), 0);
  const disputedMissions = scopedMissions.filter(m => m.status === MissionStatus.DISPUTED);
  const pendingProviders = scopedUsers.filter(u => u.role === UserRole.PROVIDER && !u.verified);
  const adminList = users.filter(u => u.role === UserRole.ADMIN);
  
  // Filter Market Missions
  const marketMissions = scopedMissions.filter(m => m.category === ServiceCategory.MARKET);
  const activeMarketMissions = marketMissions.filter(m => m.status !== MissionStatus.ARCHIVED);
  const archivedMarketMissions = marketMissions.filter(m => m.status === MissionStatus.ARCHIVED);
  const displayedMarketMissions = showArchivedMarket ? archivedMarketMissions : activeMarketMissions;

  // Settings Form State
  const [editableRates, setEditableRates] = useState(() => {
    const saved = getAppConfig().baseRates;
    return saved ? { ...baseRates, ...saved } as typeof baseRates : baseRates;
  });
  const [editableCommission, setEditableCommission] = useState(commissionRate * 100); // Display as %
  const [settingsTab, setSettingsTab] = useState<'TARIF'|'FONCT'|'GEO'|'COMMS'|'ACAD'|'API'>('TARIF');

  // Subscribe to Firestore config in real-time when admin panel mounts
  useEffect(() => {
    const unsub = subscribeAppConfig((cfg) => {
      setPlatformConfig(cfg);
      if (cfg.baseRates) {
        setEditableRates(prev => ({ ...prev, ...cfg.baseRates }));
      }
    });
    return unsub;
  }, []);

  // Admin Profile update states
  const [adminPhone, setAdminPhone] = useState(currentUser.phone || '');
  const [adminName, setAdminName] = useState(currentUser.name || '');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState('');
  const [showProfileSuccessModal, setShowProfileSuccessModal] = useState(false);
  const [isAdminSaving, setIsAdminSaving] = useState(false);
  const [adminPasswordError, setAdminPasswordError] = useState('');
  const [adminPhoneError, setAdminPhoneError] = useState('');

  useEffect(() => {
    setAdminPhone(currentUser.phone || '');
    setAdminName(currentUser.name || '');
  }, [currentUser]);

  // API Config state (stored in localStorage — no secret keys in frontend)
  const [jekoStoreId, setJekoStoreId] = useState(() => localStorage.getItem('api_jeko_store_id') || '');
  const [jekoEnv, setJekoEnv] = useState<'sandbox' | 'production'>(() => (localStorage.getItem('api_jeko_env') as any) || 'sandbox');
  const [smsProvider, setSmsProvider] = useState(() => localStorage.getItem('api_sms_provider') || 'orange');
  const [showApiSection, setShowApiSection] = useState<'jeko' | 'firebase' | 'sms' | null>(null);
  const [apiSaveFeedback, setApiSaveFeedback] = useState('');

  const saveApiConfig = async () => {
    // Keep localStorage for UI display
    localStorage.setItem('api_jeko_store_id', jekoStoreId);
    localStorage.setItem('api_jeko_env', jekoEnv);
    localStorage.setItem('api_sms_provider', smsProvider);

    // Save secrets to Firestore via Cloud Function (server-side only)
    if (jekoStoreId) {
      try {
        const { saveApiConfig: saveConfigFn } = await import('../services/jekoService');
        await saveConfigFn({
          adminUserId: currentUser.id,
          jekoStoreId,
          jekoEnv,
        });
      } catch (e: any) {
        console.warn('Could not save API config to Cloud Function:', e.message);
      }
    }

    setApiSaveFeedback('Configuration sauvegardée ✓');
    setTimeout(() => setApiSaveFeedback(''), 3000);
  };

  const handleCreateAdmin = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newAdminForm.name || !newAdminForm.phone || !newAdminForm.password) return;
      
      const newAdmin: User = {
          id: `admin_${Date.now()}`,
          name: newAdminForm.name,
          phone: newAdminForm.phone,
          password: newAdminForm.password,
          email: `${newAdminForm.phone}@admin.serviplus.com`, // Mock email
          role: UserRole.ADMIN,
          avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(newAdminForm.name)}&background=0D8ABC&color=fff`,
          isSuperAdmin: false,
          canManageUsers: newAdminForm.canManageUsers,
          canManageFinance: newAdminForm.canManageFinance,
          canManageDisputes: newAdminForm.canManageDisputes,
          canManageSettings: newAdminForm.canManageSettings,
          canManageMarket: newAdminForm.canManageMarket,
          assignedCity: newAdminForm.assignedCity === 'Toutes les villes' ? undefined : newAdminForm.assignedCity,
          verified: true,
          createdAt: new Date().toISOString()
      };

      onAddAdmin(newAdmin);
      setNewAdminForm({ 
          name: '', 
          phone: '', 
          password: '',
          canManageUsers: true,
          canManageFinance: false,
          canManageDisputes: false,
          canManageSettings: false,
          canManageMarket: true,
          assignedCity: 'Toutes les villes',
      });
  };

  // Print Handler
  const handlePrint = (missionId: string) => {
      const printContent = document.getElementById(`print-section-${missionId}`);
      if (!printContent) return;
      
      const windowUrl = 'about:blank';
      const uniqueName = new Date();
      const windowName = 'Print' + uniqueName.getTime();
      const printWindow = window.open(windowUrl, windowName, 'width=850,height=700,resizable=yes,scrollbars=yes');

      if (printWindow) {
          printWindow.document.write(`
            <html>
                <head>
                    <title>Commande Marché #${missionId}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 25px; background-color: #f8fafc; color: #0f172a; }
                        h1 { color: #d97706; border-bottom: 2px solid #d97706; padding-bottom: 10px; }
                        .header { margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                        th { background-color: #f1f5f9; font-weight: bold; }
                        .footer { margin-top: 35px; font-size: 11px; text-align: center; color: #64748b; border-t: 1px dashed #cbd5e1; pt: 15px; }
                        .total { font-size: 19px; font-weight: bold; text-align: right; margin-top: 15px; color: #1e293b; }
                        
                        /* Interactive bar styles */
                        .print-nav-bar {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            padding: 12px 18px;
                            background: #0f172a;
                            color: white;
                            border-radius: 12px;
                            margin-bottom: 20px;
                            font-family: system-ui, -apple-system, sans-serif;
                        }
                        .print-btn-back {
                            padding: 9px 15px;
                            background: #334155;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 13px;
                            font-weight: bold;
                            cursor: pointer;
                        }
                        .print-btn-action {
                            padding: 9px 15px;
                            background: #d97706;
                            color: white;
                            border: none;
                            border-radius: 8px;
                            font-size: 13px;
                            font-weight: bold;
                            cursor: pointer;
                        }

                        @media print {
                            .print-nav-bar { display: none !important; }
                            body { background-color: white; padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="print-nav-bar">
                        <button class="print-btn-back" onclick="window.close()">← Revenir à l'application (Fermer)</button>
                        <span style="font-size: 13px; font-weight: 500;">Bon de Commande de Marché</span>
                        <button class="print-btn-action" onclick="window.print()">🖨️ Imprimer / PDF</button>
                    </div>

                    <div style="background: white; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        ${printContent.innerHTML}
                    </div>
                </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          
          const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
          if (!isMobile) {
              printWindow.print();
          }
          return;
      }
  };

  // --- RENDER FUNCTIONS ---

  const renderOverview = () => {
    return <AdminStatsPanel missions={missions} users={users} transactions={transactions} />;
  };

  const renderUsers = () => {
    // Determine Role to filter based on view mode
    const targetRole = userViewMode === 'CLIENT' ? UserRole.CLIENT : UserRole.PROVIDER;

    // Filter Users
    const filteredUsers = users.filter(u => 
        u.role === targetRole &&
        (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
         u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
         u.phone.includes(searchTerm))
    ).sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA; // Descending (Newest first)
    });

    // History & Evaluation Logic for Selected User Modal
    const userMissions = selectedUserForHistory
      ? missions.filter(m => 
          selectedUserForHistory.role === UserRole.CLIENT 
            ? m.clientId === selectedUserForHistory.id 
            : m.providerId === selectedUserForHistory.id
        )
      : [];

    const completedMissions = userMissions.filter(m => m.status === MissionStatus.COMPLETED);
    const inProgressMissions = userMissions.filter(m => 
      m.status === MissionStatus.ACCEPTED || m.status === MissionStatus.IN_PROGRESS
    );
    const failedMissions = userMissions.filter(m => 
      m.status === MissionStatus.DISPUTED || m.status === MissionStatus.CANCELLED
    );
    
    const totalVolume = completedMissions.reduce((sum, m) => sum + (m.totalPrice || 0), 0);
    const completionRate = userMissions.length > 0
      ? Math.round((completedMissions.length / userMissions.length) * 100)
      : 100;

    let seriousnessBadge = { text: "Nouveau membre", color: "bg-gray-100 text-gray-700 border-gray-200" };
    let seriousnessStars = 5;
    
    if (selectedUserForHistory) {
      if (selectedUserForHistory.role === UserRole.PROVIDER) {
        seriousnessStars = selectedUserForHistory.rating || 5;
        if (completedMissions.length >= 3 && seriousnessStars >= 4.5) {
          seriousnessBadge = { text: "🏆 Prestataire Élite (Très Sérieux & Actif)", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
        } else if (completedMissions.length >= 1 && seriousnessStars >= 4.0) {
          seriousnessBadge = { text: "👍 Prestataire Recommandé & Sérieux", color: "bg-green-100 text-green-800 border-green-200" };
        } else if (userMissions.length > 0) {
          seriousnessBadge = { text: "🌱 En cours d'évaluation", color: "bg-amber-100 text-amber-800 border-amber-200" };
        } else {
          seriousnessBadge = { text: "🆕 Nouveau Prestataire", color: "bg-gray-100 text-gray-700 border-gray-200" };
        }
      } else {
        if (completedMissions.length >= 3 && completionRate >= 90) {
          seriousnessBadge = { text: "👑 Client Premium (Très Sérieux)", color: "bg-green-100 text-green-800 border-green-200" };
        } else if (completedMissions.length >= 1) {
          seriousnessBadge = { text: "✅ Client Sérieux & Actif", color: "bg-green-100 text-green-800 border-green-200" };
        } else {
          seriousnessBadge = { text: "🆕 Nouveau Client", color: "bg-gray-100 text-gray-700 border-gray-200" };
        }
      }
    }

    const handleAwardBonus = async () => {
      if (!selectedUserForHistory || !onUpdateUser) return;
      const bAmount = parseInt(bonusAmountInput);
      if (isNaN(bAmount) || bAmount <= 0) {
         alert("Veuillez saisir un montant de bonus valide supérieur à 0 F CFA.");
         return;
      }
      setIsAwardingBonus(true);
      try {
         const currentBalance = selectedUserForHistory.walletBalance || 0;
         await onUpdateUser(selectedUserForHistory.id, {
           walletBalance: currentBalance + bAmount
         });
         setSelectedUserForHistory(prev => prev ? { ...prev, walletBalance: currentBalance + bAmount } : null);
         alert(`🎉 Félicitations ! Un bonus de ${bAmount} F CFA a été attribué avec succès à ${selectedUserForHistory.name}.`);
         setBonusAmountInput('');
      } catch (err) {
         console.error("Error awarding bonus:", err);
         alert("Une erreur est survenue lors de l'attribution du bonus.");
      } finally {
         setIsAwardingBonus(false);
      }
    };

    const clientCount = users.filter(u => u.role === UserRole.CLIENT).length;
    const providerCount = users.filter(u => u.role === UserRole.PROVIDER).length;

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-gray-800">Gestion des Utilisateurs</h2>
                
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Rechercher..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-shadow focus:shadow-sm w-full md:w-64"
                    />
                </div>
             </div>

             {/* TABS FOR CLIENTS VS PROVIDERS */}
             <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setUserViewMode('CLIENT')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${userViewMode === 'CLIENT' ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                    <UserIcon size={16} className="mr-2"/> 
                    Clients <span className="ml-2 bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full text-[10px]">{clientCount}</span>
                </button>
                <button
                    onClick={() => setUserViewMode('PROVIDER')}
                    className={`px-4 py-2 rounded-md text-sm font-bold flex items-center transition-all ${userViewMode === 'PROVIDER' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                >
                    <Briefcase size={16} className="mr-2"/> 
                    Prestataires <span className="ml-2 bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full text-[10px]">{providerCount}</span>
                </button>
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase font-bold">
                        <tr>
                            <th className="px-6 py-3">Inscrit le</th>
                            <th className="px-6 py-3">Identité</th>
                            {/* Show Services only for Providers */}
                            {userViewMode === 'PROVIDER' && <th className="px-6 py-3">Compétences</th>}
                            <th className="px-6 py-3">Documents ID</th>
                            {userViewMode === 'PROVIDER' && <th className="px-6 py-3">Status</th>}
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    Aucun {userViewMode === 'CLIENT' ? 'client' : 'prestataire'} trouvé.
                                </td>
                            </tr>
                        ) : filteredUsers.map(u => (
                            <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-xs text-gray-500">
                                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center space-x-3">
                                        <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full bg-gray-200 object-cover" />
                                        <div>
                                            <div className="font-bold text-gray-900">{u.name}</div>
                                            <div className="text-xs text-gray-500">{u.phone}</div>
                                            <div className="text-[10px] text-gray-400">{u.city}</div>
                                        </div>
                                    </div>
                                </td>
                                
                                {userViewMode === 'PROVIDER' && (
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {u.services && u.services.map(s => (
                                                <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] border border-gray-200">
                                                    {s}
                                                </span>
                                            ))}
                                            {(!u.services || u.services.length === 0) && <span className="text-gray-400 text-xs italic">-</span>}
                                        </div>
                                    </td>
                                )}

                                {/* DOCUMENT COLUMN */}
                                <td className="px-6 py-4">
                                    {u.idNumber ? (
                                        <div>
                                            <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-600 block w-fit mb-1">{u.idNumber}</span>
                                            <div className="flex space-x-3">
                                                {u.idCardRecto && (
                                                    <a href={u.idCardRecto} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 text-xs font-bold flex items-center">
                                                        <FileText size={12} className="mr-1"/> Recto
                                                    </a>
                                                )}
                                                {u.idCardVerso && (
                                                    <a href={u.idCardVerso} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 text-xs font-bold flex items-center">
                                                        <FileText size={12} className="mr-1"/> Verso
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-gray-300 text-xs">Non fourni</span>
                                    )}
                                </td>

                                {userViewMode === 'PROVIDER' && (
                                    <td className="px-6 py-4">
                                        {u.verified ? 
                                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold flex w-fit items-center"><CheckCircle size={12} className="mr-1"/> Vérifié</span> : 
                                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold flex w-fit items-center"><AlertTriangle size={12} className="mr-1"/> En attente</span>
                                        }
                                    </td>
                                )}

                                <td className="px-6 py-4 flex flex-wrap items-center gap-2">
                                    <button 
                                        onClick={() => setSelectedUserForHistory(u)}
                                        className="text-white bg-green-600 hover:bg-green-700 text-xs font-bold px-2.5 py-1.5 rounded-lg flex items-center shadow-sm select-none transition-all active:scale-90"
                                        title="Voir l'historique complet et attribuer des bonus"
                                    >
                                        <Clock size={12} className="mr-1" /> Détails & Évaluation
                                    </button>
                                    {u.role === UserRole.PROVIDER && (
                                        u.verified ? (
                                            <button 
                                                onClick={() => onVerifyUser(u.id, false)}
                                                className="text-red-600 hover:text-red-800 text-xs font-bold border border-red-200 px-2 py-1 rounded hover:bg-red-50"
                                            >
                                                Bloquer
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => onVerifyUser(u.id, true)}
                                                className="text-green-600 hover:text-green-800 text-xs font-bold border border-green-200 px-2 py-1 rounded hover:bg-green-50"
                                            >
                                                Valider
                                            </button>
                                        )
                                    )}
                                    {/* Generic Delete for everyone except self and superadmin rules */}
                                    {u.id !== currentUser.id && !u.isSuperAdmin && (
                                         <button 
                                            onClick={() => onDeleteUser(u.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                            title="Supprimer l'utilisateur"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
             </div>

             {/* DETAILED USER HISTORY & EVALUATION MODAL */}
             {selectedUserForHistory && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                     <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100 flex flex-col animate-slide-up">
                         {/* Header */}
                         <div className="bg-gray-900 text-white p-6 rounded-t-3xl flex justify-between items-center shrink-0">
                             <div>
                                 <span className="text-[10px] uppercase font-black tracking-widest bg-green-500/20 text-green-300 px-3 py-1 rounded-full border border-green-500/30">
                                     {selectedUserForHistory.role === UserRole.CLIENT ? "Historique Client" : "Historique Prestataire"}
                                 </span>
                                 <h3 className="text-xl font-bold mt-1.5 flex items-center gap-2">
                                     {selectedUserForHistory.name}
                                 </h3>
                             </div>
                             <button
                                 onClick={() => setSelectedUserForHistory(null)}
                                 className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-all text-sm font-bold w-9 h-9 flex items-center justify-center uppercase"
                             >
                                 ✕
                             </button>
                         </div>

                         {/* Body */}
                         <div className="p-6 space-y-6 flex-1 overflow-y-auto font-sans">
                             {/* Evaluation & Seriousness Stats */}
                             <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 space-y-4 font-sans">
                                 <div className="flex flex-wrap items-center justify-between gap-2">
                                     <span className="text-xs font-black text-gray-500 uppercase tracking-wider">Évaluation d'activité & du sérieux</span>
                                     <span className={`px-3 py-1 text-xs font-black uppercase rounded-full border ${seriousnessBadge.color}`}>
                                         {seriousnessBadge.text}
                                     </span>
                                 </div>
                                 
                                 {/* Star rating info */}
                                 <div className="flex items-center gap-1.5">
                                     <span className="text-xs text-gray-500 font-semibold">Note moyenne :</span>
                                     <div className="flex text-amber-500">
                                         {Array.from({ length: 5 }).map((_, i) => (
                                              <span key={i} className="text-lg">
                                                  {i < Math.round(seriousnessStars) ? "★" : "☆"}
                                              </span>
                                         ))}
                                     </div>
                                     <span className="text-xs font-mono font-bold text-gray-700 bg-white border border-gray-200 px-1.5 py-0.5 rounded ml-1">
                                         {seriousnessStars.toFixed(1)} / 5
                                     </span>
                                 </div>

                                 {/* Stats Grid */}
                                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                     <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                                         <p className="text-[10px] text-gray-400 font-bold uppercase">Missions</p>
                                         <p className="text-lg font-black text-gray-800 mt-0.5">{userMissions.length}</p>
                                     </div>
                                     <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                                         <p className="text-[10px] text-emerald-500 font-bold uppercase">Réussies</p>
                                         <p className="text-lg font-black text-emerald-600 mt-0.5">{completedMissions.length}</p>
                                     </div>
                                     <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                                         <p className="text-[10px] text-gray-400 font-bold uppercase">Taux de succès</p>
                                         <p className="text-lg font-black text-green-600 mt-0.5">{completionRate}%</p>
                                     </div>
                                     <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                                         <p className="text-[10px] text-gray-400 font-bold uppercase">Volume</p>
                                         <p className="text-sm font-black text-orange-600 mt-1.5">{totalVolume.toLocaleString()} F</p>
                                     </div>
                                 </div>
                             </div>

                             {/* User Information Summary */}
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 <div>
                                     <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 font-mono">Détails Personnels</h4>
                                     <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 text-xs space-y-2">
                                         <p><strong className="text-gray-500">Téléphone:</strong> <span className="font-mono font-bold">{selectedUserForHistory.phone}</span></p>
                                         <p><strong className="text-gray-500">Ville:</strong> {selectedUserForHistory.city || 'Abidjan'}</p>
                                         <p><strong className="text-gray-500">Adresse:</strong> {selectedUserForHistory.address || 'Côte d\'Ivoire'}</p>
                                         <p><strong className="text-gray-500">Solde portefeuille:</strong> <span className="font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{(selectedUserForHistory.walletBalance || 0).toLocaleString()} F CFA</span></p>
                                     </div>
                                 </div>
                                 <div>
                                     <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 font-mono">Pièce d'Identité</h4>
                                     <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 text-xs space-y-2">
                                         <p><strong className="text-gray-500">Numéro CNI:</strong> <span className="font-mono font-bold bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-100">{selectedUserForHistory.idNumber || 'Non applicable'}</span></p>
                                         <div className="flex gap-2 pt-1.5">
                                             {selectedUserForHistory.idCardRecto && (
                                                 <a href={selectedUserForHistory.idCardRecto} target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-200 text-green-600 font-bold px-2 py-1.5 rounded transition hover:bg-gray-50 flex items-center gap-1 text-[10px] shadow-sm">
                                                     <FileText size={10} /> Recto
                                                 </a>
                                             )}
                                             {selectedUserForHistory.idCardVerso && (
                                                 <a href={selectedUserForHistory.idCardVerso} target="_blank" rel="noopener noreferrer" className="bg-white border border-gray-200 text-green-600 font-bold px-2 py-1.5 rounded transition hover:bg-gray-50 flex items-center gap-1 text-[10px] shadow-sm">
                                                     <FileText size={10} /> Verso
                                                 </a>
                                             )}
                                         </div>
                                     </div>
                                 </div>
                             </div>

                             {/* Dynamic Bonus Panel for Administrators */}
                             <div className="bg-gradient-to-r from-green-50 to-green-50/50 p-5 rounded-2xl border border-green-100 space-y-3.5">
                                 <div>
                                     <h4 className="text-xs font-black text-green-800 uppercase tracking-wide flex items-center gap-1.5">
                                         🎁 Programmer un Bonus de Fidélité
                                     </h4>
                                     <p className="text-[11px] text-gray-500 font-semibold mt-0.5 leading-relaxed">
                                         Récompensez ce membre sérieux en créditant directement son portefeuille électronique Servi+.
                                     </p>
                                 </div>
                                 <div className="flex items-center gap-2.5">
                                     <div className="relative flex-1">
                                         <input
                                             type="number"
                                             placeholder="Montant du bonus (F CFA)"
                                             value={bonusAmountInput}
                                             onChange={(e) => setBonusAmountInput(e.target.value)}
                                             className="w-full bg-white border border-green-200 rounded-xl px-4 py-2.5 font-bold outline-none text-xs focus:ring-1 focus:ring-green-500"
                                         />
                                         <span className="absolute right-3.5 top-2.5 text-[10px] text-gray-400 font-black uppercase">F CFA</span>
                                     </div>
                                     <button
                                         onClick={handleAwardBonus}
                                         disabled={isAwardingBonus || !bonusAmountInput}
                                         className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-black text-[11px] uppercase tracking-wider px-5 py-3 rounded-xl transition-all shadow-md cursor-pointer"
                                     >
                                         {isAwardingBonus ? 'Envoi...' : 'Attribuer'}
                                     </button>
                                 </div>
                             </div>

                             {/* Missions History Log Feed */}
                             <div className="space-y-3">
                                 <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest font-mono">Historique des interventions</h4>
                                 
                                 <div className="max-h-[220px] overflow-y-auto space-y-2.5 pr-1">
                                     {userMissions.length === 0 ? (
                                         <p className="text-xs text-gray-400 text-center py-6 font-semibold bg-gray-50 rounded-xl border border-gray-105">
                                             Aucune mission enregistrée pour ce compte.
                                         </p>
                                     ) : userMissions.map((m) => (
                                         <div key={m.id} className="bg-white border border-gray-100 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-gray-200 transition-all">
                                             <div>
                                                 <p className="font-bold text-xs text-gray-800">{m.title}</p>
                                                 <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400 font-semibold">
                                                     <span className="bg-gray-100 px-1.5 py-0.5 rounded">{m.category}</span>
                                                     <span>•</span>
                                                     <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                                                 </div>
                                             </div>
                                             <div className="text-right flex flex-col items-end gap-1 shrink-0">
                                                 <span className="font-black text-xs text-gray-800">{(m.totalPrice || 0).toLocaleString()} F</span>
                                                 <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                                     m.status === MissionStatus.COMPLETED ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                     m.status === MissionStatus.CANCELLED ? "bg-red-50 text-red-650 border-red-100" :
                                                     m.status === MissionStatus.DISPUTED ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                     "bg-green-50 text-green-700 border-green-100"
                                                 }`}>
                                                     {m.status}
                                                 </span>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
             )}
        </div>
    );
  };

  const renderMarketOrders = () => {
      return (
          <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center">
                          <ShoppingBasket className="mr-2 text-orange-600" />
                          Commandes Marché
                      </h2>
                      <div className="flex bg-gray-100 p-1 rounded-lg">
                          <button 
                            onClick={() => setShowArchivedMarket(false)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${!showArchivedMarket ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
                          >
                              En cours
                          </button>
                          <button 
                            onClick={() => setShowArchivedMarket(true)}
                            className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${showArchivedMarket ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500'}`}
                          >
                              Archives
                          </button>
                      </div>
                  </div>
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-bold">
                      {displayedMarketMissions.length} commandes
                  </span>
              </div>

              <div className="grid gap-6">
                  {displayedMarketMissions.map((mission, index) => (
                      <div key={mission.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up delay-${(index % 5) * 100}`}>
                          {/* Printable Section */}
                          <div id={`print-section-${mission.id}`} className="p-6">
                              <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                                  <div>
                                      <h3 className="font-bold text-xl text-gray-800">Commande #{mission.id.substring(mission.id.length - 4)}</h3>
                                      <div className="text-sm text-gray-500 mt-1">
                                          Client: <strong>{mission.clientName}</strong><br/>
                                          Lieu: {mission.location} ({mission.city})<br/>
                                          Tél: {users.find(u => u.id === mission.clientId)?.phone || 'N/A'}
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <span className="block font-bold text-orange-600 text-lg">{mission.deliveryWindow}</span>
                                      <span className="text-xs text-gray-400">Créé le {new Date(mission.createdAt).toLocaleDateString()}</span>
                                  </div>
                              </div>

                              <div className="mb-4">
                                  <h4 className="font-bold text-gray-700 mb-2 uppercase text-xs tracking-wider">Liste des courses</h4>
                                  <table className="w-full text-sm">
                                      <thead>
                                          <tr className="bg-gray-50 text-gray-500">
                                              <th className="p-2 text-left">Ingrédient</th>
                                              <th className="p-2 text-right">Prix Est.</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                          {mission.marketItems?.map((item, idx) => (
                                              <tr key={idx}>
                                                  <td className="p-2">{item.name}</td>
                                                  <td className="p-2 text-right">{item.price} F</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>

                              <div className="flex justify-end space-x-8 pt-4 border-t border-gray-100 text-sm">
                                  <div className="text-gray-500">
                                      <div>Sous-total: {mission.marketItems?.reduce((s, i) => s + i.price, 0)} F</div>
                                      <div>Emballage: {MARKET_PACKAGING_FEE} F</div>
                                      <div>Course: {MARKET_SERVICE_FEE} F</div>
                                      <div>Livraison: {MARKET_DELIVERY_FEE} F</div>
                                  </div>
                                  <div className="text-xl font-bold text-gray-900">
                                      Total: {mission.totalPrice} FCFA
                                  </div>
                              </div>
                          </div>

                          {/* Actions */}
                          <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
                              <div className="text-sm">
                                  Status: <span className={`font-bold ${
                                      mission.status === MissionStatus.COMPLETED ? 'text-green-600' : 
                                      mission.status === MissionStatus.ARCHIVED ? 'text-gray-500' :
                                      mission.status === MissionStatus.IN_PROGRESS ? 'text-green-600' :
                                      'text-orange-600'
                                  }`}>{mission.status}</span>
                              </div>
                              
                              <div className="flex space-x-2">
                                  <button 
                                    onClick={() => handlePrint(mission.id)}
                                    className="flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors text-xs font-bold"
                                  >
                                      <Printer size={14} className="mr-1"/> Imprimer
                                  </button>

                                  {!showArchivedMarket && (
                                      <>
                                          {mission.status === MissionStatus.PENDING && (
                                              <button 
                                                onClick={() => onUpdateMissionStatus(mission.id, MissionStatus.IN_PROGRESS)}
                                                className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-xs font-bold"
                                              >
                                                  <PackageCheck size={14} className="mr-1"/> Valider (En cours)
                                              </button>
                                          )}

                                          {(mission.status === MissionStatus.IN_PROGRESS || mission.status === MissionStatus.ACCEPTED) && (
                                              <button 
                                                onClick={() => onUpdateMissionStatus(mission.id, MissionStatus.COMPLETED)}
                                                className="flex items-center bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-xs font-bold"
                                              >
                                                  <Truck size={14} className="mr-1"/> Confirmer Livraison
                                              </button>
                                          )}

                                          {mission.status === MissionStatus.COMPLETED && (
                                              <button 
                                                onClick={() => onUpdateMissionStatus(mission.id, MissionStatus.ARCHIVED)}
                                                className="flex items-center bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-xs font-bold"
                                              >
                                                  <Archive size={14} className="mr-1"/> Archiver
                                              </button>
                                          )}
                                      </>
                                  )}
                              </div>
                          </div>
                      </div>
                  ))}
                  {displayedMarketMissions.length === 0 && (
                      <div className="p-12 text-center text-gray-400 bg-white rounded-xl border border-dashed animate-fade-in">
                          <ShoppingBasket size={48} className="mx-auto mb-4 opacity-20"/>
                          Aucune commande de marché {showArchivedMarket ? 'archivée' : 'en cours'}.
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const renderTeam = () => (
      <div className="space-y-8 animate-fade-in">
          <div className="bg-gradient-to-r from-green-600 to-green-600 rounded-2xl p-8 text-white shadow-lg">
              <h2 className="text-2xl font-bold mb-2 flex items-center">
                  <Shield size={28} className="mr-3"/> Gestion de l'équipe Admin
              </h2>
              <p className="text-green-100">Ajoutez des sous-administrateurs pour vous aider à gérer la plateforme.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Create New Admin */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-slide-up">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                      <UserPlus size={20} className="mr-2 text-green-700"/> Ajouter un Admin
                  </h3>
                  <form onSubmit={handleCreateAdmin} className="space-y-4">
                      <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Nom de l'administrateur</label>
                          <input 
                            type="text" 
                            required
                            value={newAdminForm.name}
                            onChange={(e) => setNewAdminForm({...newAdminForm, name: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Ex: Admin Support"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Téléphone (ID de connexion)</label>
                          <input 
                            type="tel" 
                            required
                            value={newAdminForm.phone}
                            onChange={(e) => setNewAdminForm({...newAdminForm, phone: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Ex: 01020304..."
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Code secret</label>
                          <input 
                            type="text" 
                            required
                            value={newAdminForm.password}
                            onChange={(e) => setNewAdminForm({...newAdminForm, password: e.target.value})}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="4 chiffres"
                            maxLength={4}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">Territoire Assigné (Gérer cette ville)</label>
                          <select 
                            value={newAdminForm.assignedCity}
                            onChange={(e) => setNewAdminForm({...newAdminForm, assignedCity: e.target.value})}
                            className="w-full p-2 border border-grat-300 rounded-lg text-sm bg-white font-bold text-gray-800"
                          >
                            <option value="Toutes les villes">🌐 Toutes les villes (Accès global)</option>
                            {CITIES.map(c => (
                              <option key={c} value={c}>🇨🇮 {c}</option>
                            ))}
                          </select>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-gray-100">
                          <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Autorisations & Tâches déléguées</p>
                          <div className="space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200/60">
                              <label className="flex items-center space-x-2.5 text-xs text-gray-700 font-bold cursor-pointer select-none">
                                  <input 
                                      type="checkbox" 
                                      checked={newAdminForm.canManageUsers}
                                      onChange={(e) => setNewAdminForm({...newAdminForm, canManageUsers: e.target.checked})}
                                      className="rounded border-gray-300 text-green-700 focus:ring-green-500 w-4 h-4"
                                  />
                                  <span>👤 Gérer les Utilisateurs</span>
                              </label>
                              <label className="flex items-center space-x-2.5 text-xs text-gray-700 font-bold cursor-pointer select-none">
                                  <input 
                                      type="checkbox" 
                                      checked={newAdminForm.canManageMarket}
                                      onChange={(e) => setNewAdminForm({...newAdminForm, canManageMarket: e.target.checked})}
                                      className="rounded border-gray-300 text-green-700 focus:ring-green-500 w-4 h-4"
                                  />
                                  <span>🛒 Gérer le Marché & Courses</span>
                              </label>
                              <label className="flex items-center space-x-2.5 text-xs text-gray-700 font-bold cursor-pointer select-none">
                                  <input 
                                      type="checkbox" 
                                      checked={newAdminForm.canManageFinance}
                                      onChange={(e) => setNewAdminForm({...newAdminForm, canManageFinance: e.target.checked})}
                                      className="rounded border-gray-300 text-green-700 focus:ring-green-500 w-4 h-4"
                                  />
                                  <span>💵 Comptabilité/Finance (Retraits)</span>
                              </label>
                              <label className="flex items-center space-x-2.5 text-xs text-gray-700 font-bold cursor-pointer select-none">
                                  <input 
                                      type="checkbox" 
                                      checked={newAdminForm.canManageDisputes}
                                      onChange={(e) => setNewAdminForm({...newAdminForm, canManageDisputes: e.target.checked})}
                                      className="rounded border-gray-300 text-green-700 focus:ring-green-500 w-4 h-4"
                                  />
                                  <span>⚖️ Résoudre les Litiges</span>
                              </label>
                              <label className="flex items-center space-x-2.5 text-xs text-gray-700 font-bold cursor-pointer select-none">
                                  <input 
                                      type="checkbox" 
                                      checked={newAdminForm.canManageSettings}
                                      onChange={(e) => setNewAdminForm({...newAdminForm, canManageSettings: e.target.checked})}
                                      className="rounded border-gray-300 text-green-700 focus:ring-green-500 w-4 h-4"
                                  />
                                  <span>⚙️ Paramétrage Plateforme</span>
                              </label>
                          </div>
                      </div>

                      <button type="submit" className="w-full bg-green-700 text-white py-2.5 rounded-lg font-bold text-sm hover:bg-green-700 transition duration-150 active:scale-95 shadow">
                          Créer l'accès
                      </button>
                  </form>
              </div>

              {/* List Admins */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up delay-200">
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="font-bold text-gray-800">Membres de l'équipe</h3>
                  </div>
                  <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 text-gray-500 uppercase font-bold">
                          <tr>
                              <th className="px-6 py-3">Nom</th>
                              <th className="px-6 py-3">Contact</th>
                              <th className="px-6 py-3">Rôle & Permissions (Activer / Désactiver)</th>
                              <th className="px-6 py-3">Territoire (Ville)</th>
                              <th className="px-6 py-3 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {adminList.map(admin => (
                              <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 font-medium flex items-center">
                                      <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center mr-3 font-bold">
                                          {admin.name.charAt(0)}
                                      </div>
                                      <div>
                                          <div className="font-bold text-gray-800">{admin.name}</div>
                                          <div className="text-[10px] text-gray-400">ID: {admin.id}</div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-4 text-gray-500 font-mono">{admin.phone}</td>
                                  <td className="px-6 py-4">
                                      {admin.isSuperAdmin ? (
                                          <div className="flex flex-col gap-0.5">
                                              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs font-bold border border-green-200 w-max">Super Admin</span>
                                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Accès total absolu</span>
                                          </div>
                                      ) : (
                                          <div className="flex flex-col gap-1.5">
                                              <div className="flex items-center space-x-2">
                                                  <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold border border-gray-200">Sous-Admin</span>
                                                  <button
                                                      onClick={() => {
                                                          if (onUpdateUser) {
                                                              onUpdateUser(admin.id, { verified: admin.verified === false });
                                                          }
                                                      }}
                                                      className={`px-2 py-0.5 rounded-full text-[10px] font-black border transition-all cursor-pointer ${admin.verified !== false ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'}`}
                                                      title="Cliquer pour Activer ou Suspendre l'accès"
                                                  >
                                                      {admin.verified !== false ? '🟢 ACTIF' : '🔴 SUSPENDU'}
                                                  </button>
                                              </div>
                                              <div className="flex flex-wrap gap-1.5 max-w-sm mt-1">
                                                  <button 
                                                    onClick={() => {
                                                        if (onUpdateUser) {
                                                            onUpdateUser(admin.id, { canManageUsers: !admin.canManageUsers });
                                                        }
                                                    }}
                                                    className={`text-[9px] font-black px-2 py-1 rounded border transition-all cursor-pointer ${admin.canManageUsers ? 'bg-green-50 text-green-600 border-green-400 shadow-sm' : 'bg-gray-100/60 text-gray-400 border-gray-200 line-through'}`}
                                                    title={`Cliquer pour ${admin.canManageUsers ? 'Désactiver' : 'Activer'} la gestion des utilisateurs`}
                                                  >
                                                      👤 Utilisateurs {admin.canManageUsers ? '✓' : '✗'}
                                                  </button>
                                                  <button 
                                                    onClick={() => {
                                                        if (onUpdateUser) {
                                                            onUpdateUser(admin.id, { canManageMarket: !admin.canManageMarket });
                                                        }
                                                    }}
                                                    className={`text-[9px] font-black px-2 py-1 rounded border transition-all cursor-pointer ${admin.canManageMarket ? 'bg-orange-50 text-orange-600 border-orange-400 shadow-sm' : 'bg-gray-100/60 text-gray-400 border-gray-200 line-through'}`}
                                                    title={`Cliquer pour ${admin.canManageMarket ? 'Désactiver' : 'Activer'} la gestion du Marché`}
                                                  >
                                                      🛒 Marché {admin.canManageMarket ? '✓' : '✗'}
                                                  </button>
                                                  <button 
                                                    onClick={() => {
                                                        if (onUpdateUser) {
                                                            onUpdateUser(admin.id, { canManageFinance: !admin.canManageFinance });
                                                        }
                                                    }}
                                                    className={`text-[9px] font-black px-2 py-1 rounded border transition-all cursor-pointer ${admin.canManageFinance ? 'bg-green-50 text-green-600 border-green-400 shadow-sm' : 'bg-gray-100/60 text-gray-400 border-gray-200 line-through'}`}
                                                    title={`Cliquer pour ${admin.canManageFinance ? 'Désactiver' : 'Activer'} la Comptabilité/Finance`}
                                                  >
                                                      💵 Finance {admin.canManageFinance ? '✓' : '✗'}
                                                  </button>
                                                  <button 
                                                    onClick={() => {
                                                        if (onUpdateUser) {
                                                            onUpdateUser(admin.id, { canManageDisputes: !admin.canManageDisputes });
                                                        }
                                                    }}
                                                    className={`text-[9px] font-black px-2 py-1 rounded border transition-all cursor-pointer ${admin.canManageDisputes ? 'bg-red-50 text-red-600 border-red-400 shadow-sm' : 'bg-gray-100/60 text-gray-400 border-gray-200 line-through'}`}
                                                    title={`Cliquer pour ${admin.canManageDisputes ? 'Désactiver' : 'Activer'} la résolution des litiges`}
                                                  >
                                                      ⚖️ Litiges {admin.canManageDisputes ? '✓' : '✗'}
                                                  </button>
                                                  <button 
                                                    onClick={() => {
                                                        if (onUpdateUser) {
                                                            onUpdateUser(admin.id, { canManageSettings: !admin.canManageSettings });
                                                        }
                                                    }}
                                                    className={`text-[9px] font-black px-2 py-1 rounded border transition-all cursor-pointer ${admin.canManageSettings ? 'bg-green-50 text-green-700 border-green-400 shadow-sm' : 'bg-gray-100/60 text-gray-400 border-gray-200 line-through'}`}
                                                    title={`Cliquer pour ${admin.canManageSettings ? 'Désactiver' : 'Activer'} le paramétrage`}
                                                  >
                                                      ⚙️ Paramètres {admin.canManageSettings ? '✓' : '✗'}
                                                  </button>
                                              </div>
                                          </div>
                                      )}
                                  </td>
                                  <td className="px-6 py-4">
                                      {admin.isSuperAdmin ? (
                                          <span className="text-xs font-bold text-green-800 bg-green-50 border border-green-200 px-2 py-1 rounded-full">🌐 Toutes les villes</span>
                                      ) : (
                                          <select
                                              value={admin.assignedCity || 'Toutes les villes'}
                                              onChange={(e) => {
                                                  if (onUpdateUser) {
                                                      const val = e.target.value === 'Toutes les villes' ? undefined : e.target.value;
                                                      onUpdateUser(admin.id, { assignedCity: val });
                                                  }
                                              }}
                                              className="border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                                          >
                                              <option value="Toutes les villes">🌐 Toutes les villes</option>
                                              {CITIES.map(c => (
                                                  <option key={c} value={c}>🇨🇮 {c}</option>
                                              ))}
                                          </select>
                                      )}
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                      {!admin.isSuperAdmin && admin.id !== currentUser.id && (
                                          <button 
                                            onClick={() => onDeleteUser(admin.id)}
                                            className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                                            title="Supprimer l'accès"
                                          >
                                              <Trash2 size={18} />
                                          </button>
                                      )}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>
  );

  const renderFinance = () => {
      // --- CALCULATION OF COMPANY BALANCE (COMPTE SPIRITUEL) ---
      
      // Total Inflows (Client Payments)
      const totalInflows = transactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + t.amount, 0);

      // Total Outflows (Provider Payouts - Completed)
      const totalOutflows = transactions
        .filter(t => t.type === 'PAYOUT' && t.status === 'SUCCESS')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const spiritualBalance = totalInflows - totalOutflows;

      // Pending Payout Requests
      const pendingPayouts = transactions
        .filter(t => t.type === 'PAYOUT' && t.status === 'PENDING_APPROVAL');

      return (
        <div className="space-y-6 animate-fade-in">
            {/* Spiritual Account Banner */}
            <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-xl font-medium text-green-200 mb-2 flex items-center">
                        <Wallet className="mr-2" size={24}/> Compte Spirituel (Entreprise)
                    </h2>
                    <div className="text-5xl font-extrabold mb-6 tracking-tight">
                        {spiritualBalance.toLocaleString()} FCFA
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center">
                            <span className="p-2 bg-green-500/20 rounded-lg mr-3"><ArrowDownLeft size={16} className="text-green-400"/></span>
                            <div>
                                <span className="block text-green-300 text-xs">Total Entrées</span>
                                <span className="font-bold text-lg">{totalInflows.toLocaleString()} F</span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <span className="p-2 bg-red-500/20 rounded-lg mr-3"><ArrowUpRight size={16} className="text-red-400"/></span>
                            <div>
                                <span className="block text-green-300 text-xs">Total Sorties</span>
                                <span className="font-bold text-lg">{totalOutflows.toLocaleString()} F</span>
                            </div>
                        </div>
                        <div className="flex items-center">
                            <span className="p-2 bg-yellow-500/20 rounded-lg mr-3"><Clock size={16} className="text-yellow-300"/></span>
                            <div>
                                <span className="block text-green-300 text-xs">En attente</span>
                                <span className="font-bold text-lg">{pendingPayouts.reduce((s,t)=>s+t.amount,0).toLocaleString()} F</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Background Decoration */}
                <DollarSign className="absolute -right-6 -bottom-6 text-white opacity-5 w-48 h-48 rotate-12" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Payouts */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up">
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            <Clock size={18} className="mr-2 text-yellow-500"/> Demandes de retrait en attente
                        </h3>
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">{pendingPayouts.length}</span>
                    </div>
                    
                    {pendingPayouts.length === 0 ? (
                         <div className="p-8 text-center text-gray-400 text-sm">Aucune demande en attente.</div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {pendingPayouts.map(t => (
                                <div key={t.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-gray-900">{t.userName}</p>
                                            <p className="text-xs text-gray-500">{t.method}</p>
                                        </div>
                                        <p className="text-red-600 font-bold text-lg">-{t.amount.toLocaleString()} F</p>
                                    </div>
                                    <div className="flex justify-end">
                                        <button 
                                            onClick={() => onApproveWithdrawal(t.id)}
                                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center transition-colors shadow-sm"
                                        >
                                            <CheckCircle size={14} className="mr-1"/> Valider le paiement
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Transactions List */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-slide-up delay-100">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                        <h3 className="font-bold text-gray-800">Historique global</h3>
                        <span className="text-xs text-gray-400 font-medium">{transactions.length} opération{transactions.length > 1 ? 's' : ''}</span>
                    </div>
                    {/* Mobile cards */}
                    <div className="block md:hidden max-h-[400px] overflow-y-auto divide-y divide-gray-50">
                        {transactions.map(t => (
                            <div key={t.id} className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${t.type === 'INCOME' ? 'bg-green-50' : 'bg-red-50'}`}>
                                        {t.type === 'INCOME'
                                            ? <ArrowDownLeft size={14} className="text-green-600" />
                                            : <ArrowUpRight size={14} className="text-red-500" />
                                        }
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-700">{t.userName || t.method}</p>
                                        <p className="text-[10px] text-gray-400">{new Date(t.date).toLocaleDateString('fr-FR')}</p>
                                    </div>
                                </div>
                                <p className={`font-black text-sm ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                                    {t.type === 'INCOME' ? '+' : '-'}{t.amount.toLocaleString()} F
                                </p>
                            </div>
                        ))}
                    </div>
                    {/* Desktop table */}
                    <div className="hidden md:block max-h-[400px] overflow-y-auto overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 uppercase font-bold sticky top-0 text-xs">
                                <tr>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Utilisateur</th>
                                    <th className="px-4 py-2">Type</th>
                                    <th className="px-4 py-2">Méthode</th>
                                    <th className="px-4 py-2 text-right">Montant</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {transactions.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(t.date).toLocaleDateString('fr-FR')}</td>
                                        <td className="px-4 py-3 text-xs text-gray-700 font-medium">{t.userName || '—'}</td>
                                        <td className="px-4 py-3">
                                            {t.type === 'INCOME'
                                                ? <span className="text-green-600 font-bold text-xs flex items-center gap-1"><ArrowDownLeft size={11}/> Entrée</span>
                                                : <span className="text-red-500 font-bold text-xs flex items-center gap-1"><ArrowUpRight size={11}/> Sortie</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-500">{t.method}</td>
                                        <td className={`px-4 py-3 font-black text-sm text-right ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                                            {t.type === 'INCOME' ? '+' : '-'}{t.amount.toLocaleString()} F
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      );
  };

  const renderDisputes = () => (
    <div className="space-y-6 animate-fade-in">
        {/* Header with stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
                <h2 className="text-xl font-bold text-gray-800">Gestion des Litiges</h2>
                <p className="text-sm text-gray-500 mt-0.5">{disputedMissions.length} litige{disputedMissions.length > 1 ? 's' : ''} en attente de résolution</p>
            </div>
            {disputedMissions.length > 0 && (
                <div className="flex gap-3">
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2 text-center">
                        <p className="text-lg font-black text-red-600">{disputedMissions.length}</p>
                        <p className="text-[10px] text-red-500 uppercase font-bold">En attente</p>
                    </div>
                    <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-2 text-center">
                        <p className="text-lg font-black text-green-600">{scopedMissions.filter(m => m.status === MissionStatus.COMPLETED).length}</p>
                        <p className="text-[10px] text-green-500 uppercase font-bold">Résolus</p>
                    </div>
                </div>
            )}
        </div>

        {disputedMissions.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl text-center text-gray-500 border border-dashed border-gray-200 animate-scale-in">
                <CheckCircle size={56} className="mx-auto text-green-200 mb-4"/>
                <p className="font-bold text-gray-700 text-lg">Aucun litige en cours !</p>
                <p className="text-sm text-gray-400 mt-1">Tous les litiges ont été résolus. La plateforme est saine.</p>
            </div>
        ) : (
            <div className="grid gap-4 grid-cols-1 xl:grid-cols-2">
                {disputedMissions.map(mission => (
                    <div key={mission.id} className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden animate-slide-up">
                        {/* Card header */}
                        <div className="bg-red-50 px-5 py-4 border-b border-red-100 flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-gray-900 truncate">{mission.title}</h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    <span className="font-mono">#{mission.id.slice(-6)}</span> · par <span className="font-semibold text-red-600">{mission.disputeInitiator}</span>
                                </p>
                            </div>
                            <span className="ml-3 shrink-0 bg-red-100 text-red-700 px-2.5 py-1 rounded-full text-[10px] font-black uppercase animate-pulse">
                                Action requise
                            </span>
                        </div>

                        {/* Dispute reason */}
                        <div className="px-5 py-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Motif du litige</p>
                            <div className="bg-gray-50 border-l-4 border-red-400 rounded-r-xl p-3">
                                <p className="text-sm text-gray-700 italic">"{mission.disputeReason || 'Aucun motif précisé.'}"</p>
                            </div>

                            {/* Mission details row */}
                            <div className="grid grid-cols-3 gap-2 mt-4">
                                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Montant</p>
                                    <p className="font-black text-gray-800 text-sm">{(mission.totalPrice || 0).toLocaleString()} F</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Client</p>
                                    <p className="font-bold text-gray-700 text-xs truncate">{mission.clientName}</p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                                    <p className="text-[9px] text-gray-400 uppercase font-bold">Prestataire</p>
                                    <p className="font-bold text-gray-700 text-xs truncate">{mission.providerName || '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="px-5 pb-5 flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={() => onResolveDispute(mission.id, 'PAY')}
                                className="flex-1 bg-green-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-wide hover:bg-green-700 shadow-sm flex items-center justify-center gap-2 transition-colors"
                            >
                                <CheckCircle size={14}/>
                                Valider & Payer le Prestataire
                            </button>
                            <button
                                onClick={() => onResolveDispute(mission.id, 'REFUND')}
                                className="flex-1 bg-white border-2 border-gray-200 text-gray-700 py-3 rounded-xl text-xs font-black uppercase tracking-wide hover:bg-gray-50 flex items-center justify-center gap-2 transition-colors"
                            >
                                <XCircle size={14}/>
                                Rembourser le Client
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </div>
  );

  const renderSettings = () => {
    const STABS: { id: typeof settingsTab; label: string; icon: any }[] = [
      { id: 'TARIF', label: 'Tarification', icon: DollarSign },
      { id: 'FONCT', label: 'Fonctionnalités', icon: Shield },
      { id: 'GEO', label: 'Géographie', icon: Globe },
      { id: 'COMMS', label: 'Communications', icon: BellIcon },
      { id: 'ACAD', label: 'Académie', icon: BookOpen },
      { id: 'API', label: 'APIs & Clés', icon: Key },
    ];

    return (
      <div className="space-y-5 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                  <h2 className="text-xl font-bold text-gray-800">Configuration de la Plateforme</h2>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <RefreshCw size={11} className="text-green-500"/> Synchronisé en temps réel avec Firestore
                  </p>
              </div>
          </div>

          {/* Tab navigation */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 flex flex-wrap gap-1">
              {STABS.map(tab => (
                  <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSettingsTab(tab.id)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          settingsTab === tab.id
                              ? 'bg-green-600 text-white shadow-sm'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                  >
                      <tab.icon size={13} />
                      {tab.label}
                  </button>
              ))}
          </div>
          
          {/* ====== TARIFICATION ====== */}
          {settingsTab === 'TARIF' && <div className="space-y-5 animate-fade-in">

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center">
                  <DollarSign size={18} className="mr-2 text-green-600"/> Modèle d'Abonnement Mensuel (Sans Commission)
              </h3>
              <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-8">
                  <div className="flex-1 max-w-xs">
                      <label className="block text-sm text-gray-500 mb-1">Abonnement Mensuel (FCFA)</label>
                      <input
                        type="text"
                        value="10 000"
                        disabled
                        className="w-full p-2 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg cursor-not-allowed font-bold"
                      />
                  </div>
                  <div className="text-sm text-gray-500 flex-1">
                      <p className="font-semibold text-gray-700 text-xs uppercase tracking-wider text-emerald-600 font-mono">⚡ Commission sur prestations : 0 %</p>
                      <p className="mt-1">Le modèle d'intermédiaire à commission a été de manière permanente retiré de la plateforme. Les prestataires s'acquittent désormais exclusivement de leur abonnement mensuel de 10 000 FCFA pour un accès intégral sans commission.</p>
                  </div>
              </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center">
                  <Settings size={18} className="mr-2 text-green-600"/> Tarifs de Base (FCFA / Heure)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(editableRates).map(([category, rate]) => {
                      const Icon = SERVICE_ICONS[category as ServiceCategory];
                      return (
                          <div key={category} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200 transition-all hover:border-green-300">
                              <div className="p-2 bg-white rounded-lg text-gray-500 mr-3 shadow-sm">
                                  <Icon size={20} />
                              </div>
                              <div className="flex-1">
                                  <label className="block text-xs font-bold text-gray-500 uppercase">{category}</label>
                                  <input 
                                    type="number"
                                    value={rate}
                                    onChange={(e) => setEditableRates({...editableRates, [category]: Number(e.target.value)})}
                                    className="w-full bg-transparent border-b border-gray-300 focus:border-green-500 outline-none py-1 font-bold text-gray-900"
                                  />
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>

          </div>} {/* end TARIF */}

          {/* ====== FONCTIONNALITÉS ====== */}
          {settingsTab === 'FONCT' && <div className="space-y-5 animate-fade-in">

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-bold text-gray-700 mb-3 flex items-center">
                  <Shield size={18} className="mr-2 text-green-600"/> Fonctionnalités & Sécurité Biométrique
              </h3>
              <p className="text-xs text-gray-500 mb-4">Activez ou désactivez les nouvelles fonctionnalités de sécurité avancées et d'extensions d'activité de la plateforme mobile d'un simple clic.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-start p-3.5 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100/50 transition">
                      <input 
                        type="checkbox"
                        checked={platformConfig.enableHourExtension}
                        onChange={(e) => setPlatformConfig({...platformConfig, enableHourExtension: e.target.checked})}
                        className="mt-1 mr-3 h-4 w-4 rounded text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <div>
                          <span className="block text-xs font-black uppercase text-gray-800">Prolongateur d'activité (+ Augmenter la durée)</span>
                          <span className="block text-[11px] text-gray-500 mt-0.5">Permet aux clients de solliciter 1h, 2h ou 3h d'activité supplémentaire une fois la mission commencée, validée par le prestataire.</span>
                      </div>
                  </label>

                  <label className="flex items-start p-3.5 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100/50 transition">
                      <input 
                        type="checkbox"
                        checked={platformConfig.enableFingerprint}
                        onChange={(e) => setPlatformConfig({...platformConfig, enableFingerprint: e.target.checked})}
                        className="mt-1 mr-3 h-4 w-4 rounded text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <div>
                          <span className="block text-xs font-black uppercase text-gray-800">Empreinte digitale (Biométrie)</span>
                          <span className="block text-[11px] text-gray-500 mt-0.5">Affiche et permet l'authentification sécurisée par empreinte digitale sur la page d'accueil d'authentification.</span>
                      </div>
                  </label>

                  <label className="flex items-start p-3.5 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100/50 transition">
                      <input 
                        type="checkbox"
                        checked={platformConfig.enable2FA}
                        onChange={(e) => setPlatformConfig({...platformConfig, enable2FA: e.target.checked})}
                        className="mt-1 mr-3 h-4 w-4 rounded text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <div>
                          <span className="block text-xs font-black uppercase text-gray-800">Double Authentification (SMS 2FA)</span>
                          <span className="block text-[11px] text-gray-500 mt-0.5">Exige un mot de passe à usage unique (OTP) pour les nouveaux inscrits et détections de connexions lointaines.</span>
                      </div>
                  </label>

                  <label className="flex items-start p-3.5 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100/50 transition">
                      <input 
                        type="checkbox"
                        checked={platformConfig.enableTrainingSection}
                        onChange={(e) => setPlatformConfig({...platformConfig, enableTrainingSection: e.target.checked})}
                        className="mt-1 mr-3 h-4 w-4 rounded text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <div>
                          <span className="block text-xs font-black uppercase text-gray-800">Section Académique (Formations & Tests MCQ)</span>
                          <span className="block text-[11px] text-gray-500 mt-0.5">Affiche la partie Formation administrative (Vidéos éducatives, chartes qualité, tests MCQ interactifs) chez les clients et prestataires.</span>
                      </div>
                  </label>
              </div>
          </div>

          </div>} {/* end FONCT */}

          {/* ====== GÉOGRAPHIE ====== */}
          {settingsTab === 'GEO' && <div className="space-y-5 animate-fade-in">

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-bold text-gray-700 mb-2 flex items-center">
                  <Globe size={18} className="mr-2 text-green-600"/> Couverture Géographique d'Activité
              </h3>
              <p className="text-xs text-gray-500">Activez ou désactivez la possibilité d'émettre des missions dans des villes spécifiques de Côte d'Ivoire.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  {Object.entries(platformConfig.cityAvailability || {}).map(([city, available]) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => {
                            const updated = { ...platformConfig.cityAvailability, [city]: !available };
                            setPlatformConfig({ ...platformConfig, cityAvailability: updated });
                        }}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all text-center uppercase tracking-wider ${
                            available 
                              ? "bg-emerald-50 border-emerald-200 text-emerald-850 hover:bg-emerald-100" 
                              : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                        }`}
                      >
                          {city} {available ? "✓ Ouverte" : "✗ Fermée"}
                      </button>
                  ))}
              </div>
          </div>

          {/* Service availability */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-bold text-gray-700 mb-2 flex items-center">
                  <List size={18} className="mr-2 text-green-600"/> Disponibilité des Services
              </h3>
              <p className="text-xs text-gray-500">Activez ou désactivez chaque catégorie de service sur la plateforme.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
                  {Object.entries(platformConfig.serviceAvailability || {}).map(([svc, available]) => {
                      const Icon = SERVICE_ICONS[svc as any] || Settings;
                      return (
                          <button
                            key={svc}
                            type="button"
                            onClick={() => {
                                const updated = { ...platformConfig.serviceAvailability, [svc]: !available };
                                setPlatformConfig({ ...platformConfig, serviceAvailability: updated });
                            }}
                            className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                                available
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                            }`}
                          >
                              <Icon size={16} />
                              <span className="uppercase tracking-wide text-center leading-tight">{svc}</span>
                              <span className="text-[9px]">{available ? '✓ Actif' : '✗ Inactif'}</span>
                          </button>
                      );
                  })}
              </div>
          </div>

          </div>} {/* end GEO */}

          {/* ====== COMMUNICATIONS ====== */}
          {settingsTab === 'COMMS' && <div className="space-y-5 animate-fade-in">

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
              <h3 className="font-bold text-gray-700 flex items-center">
                  <AlertTriangle size={18} className="mr-2 text-orange-500"/> Annonces Administratives & Messages Flash
              </h3>

              {/* Existing Announcements */}
              <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Annonces actives sur l'application :</p>
                  {(platformConfig.flashAnnouncements || []).length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Aucune annonce actuellement rédigée.</p>
                  ) : (
                      <div className="space-y-2">
                          {(platformConfig.flashAnnouncements || []).map((ann) => (
                              <div key={ann.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                                  <div className="flex items-start gap-2.5">
                                      <span className="text-sm">📢</span>
                                      <div className="text-left">
                                          <p className="font-black text-gray-800">{ann.text}</p>
                                          <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">
                                              Type: {ann.type} • Audience: {ann.target} • Statut: {ann.active ? "Activé" : "Désactivé"}
                                          </p>
                                      </div>
                                  </div>
                                  <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                            const updated = platformConfig.flashAnnouncements.map(a => a.id === ann.id ? { ...a, active: !a.active } : a);
                                            setPlatformConfig({ ...platformConfig, flashAnnouncements: updated });
                                        }}
                                        className={`px-3 py-1.5 rounded-lg font-black uppercase text-[10px] ${
                                            ann.active ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-600"
                                        }`}
                                      >
                                          {ann.active ? "Désactiver" : "Activer"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                            const updated = platformConfig.flashAnnouncements.filter(a => a.id !== ann.id);
                                            setPlatformConfig({ ...platformConfig, flashAnnouncements: updated });
                                        }}
                                        className="p-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-100 transition"
                                      >
                                          <Trash2 size={14} />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {/* Add New Announcement Form */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4 text-left">
                  <p className="text-xs font-black text-gray-800 uppercase tracking-widest leading-none">Rédiger un Nouveau Message Flash :</p>
                  
                  <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold text-gray-500">Texte du message flash</label>
                      <input
                        type="text"
                        placeholder="Ex: 🎉 PROMO EXTRA : Obtenez 500 F CFA de bonus sur les missions au nord d'Abidjan."
                        value={newAnnText}
                        onChange={(e) => setNewAnnText(e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                      />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase font-bold text-gray-500">Catégorie Visuelle</label>
                          <select
                            value={newAnnType}
                            onChange={(e: any) => setNewAnnType(e.target.value)}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                          >
                              <option value="info">Info (Bleu)</option>
                              <option value="promo">Promo (Or)</option>
                              <option value="flash">Urgent (Rose)</option>
                          </select>
                      </div>

                      <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase font-bold text-gray-500">Audience Cible</label>
                          <select
                            value={newAnnTarget}
                            onChange={(e: any) => setNewAnnTarget(e.target.value)}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                          >
                              <option value="ALL">Tout le monde (Tous)</option>
                              <option value="CLIENT">Clients Uniquement</option>
                              <option value="PROVIDER">Prestataires Uniquement</option>
                          </select>
                      </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                        if (!newAnnText.trim()) {
                            alert("Veuillez saisir le contenu textuel de votre annonce.");
                            return;
                        }
                        const newAnn: FlashAnnouncement = {
                            id: `flash_${Date.now()}`,
                            text: newAnnText.trim(),
                            type: newAnnType,
                            target: newAnnTarget,
                            active: true
                        };
                        setPlatformConfig({
                            ...platformConfig,
                            flashAnnouncements: [...platformConfig.flashAnnouncements, newAnn]
                        });
                        setNewAnnText('');
                        alert("⚡ Annonce ajoutée avec succès ! Pensez à enregistrer les modifications globales en bas.");
                    }}
                    className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition"
                  >
                      Ajouter aux annonces en cours
                  </button>
              </div>
          </div>

          </div>} {/* end COMMS */}

          {/* ====== ACADÉMIE ====== */}
          {settingsTab === 'ACAD' && <div className="space-y-5 animate-fade-in">

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
              <h3 className="font-bold text-gray-700 flex items-center">
                  <BookOpen size={18} className="mr-2 text-green-600"/> Académie de Formations, Vidéos & Évaluations MCQ
              </h3>

              {/* List existing modules */}
              <div className="space-y-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide text-left">Modules académiques disponibles :</p>
                  {(platformConfig.trainingContent || []).length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Aucun module académique édité.</p>
                  ) : (
                      <div className="space-y-2">
                          {(platformConfig.trainingContent || []).map((train) => (
                              <div key={train.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-left">
                                  <div>
                                      <p className="font-black text-gray-900 leading-tight">
                                          🎓 {train.title}
                                      </p>
                                      <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">
                                          Public: <span className="text-green-600 font-extrabold">{train.target}</span> • Format: {train.type} • Catégorie: {train.category}
                                      </p>
                                      {train.type === 'test' && train.questions && (
                                          <p className="text-[9px] text-amber-600 font-extrabold uppercase mt-0.5">✍ {train.questions.length} questions interactives MCQ</p>
                                      )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                        const updated = platformConfig.trainingContent.filter(t => t.id !== train.id);
                                        setPlatformConfig({ ...platformConfig, trainingContent: updated });
                                    }}
                                    className="p-1.5 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-100 transition shrink-0"
                                  >
                                      <Trash2 size={14} />
                                  </button>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

              {/* Create Dynamic Module Form */}
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-4 text-left">
                  <p className="text-xs font-black text-green-600 uppercase tracking-widest leading-none">Ajouter un nouveau Guide / Vidéo / Test d'évaluation :</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase font-bold text-gray-500">Titre de la Formation</label>
                          <input
                            type="text"
                            placeholder="Ex: Gestes barrières et service"
                            value={newTrainTitle}
                            onChange={(e) => setNewTrainTitle(e.target.value)}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                          />
                      </div>

                      <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase font-bold text-gray-500">Catégorie d'activité</label>
                          <input
                            type="text"
                            placeholder="Ex: Ménage, Cuisine, ou Général"
                            value={newTrainCategory}
                            onChange={(e) => setNewTrainCategory(e.target.value)}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                          />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase font-bold text-gray-500">Audience Destinataire</label>
                          <select
                            value={newTrainTarget}
                            onChange={(e: any) => setNewTrainTarget(e.target.value)}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                          >
                              <option value="PROVIDER">Prestataires Uniquement (Savoir-faire)</option>
                              <option value="CLIENT">Clients Uniquement (Bonnes pratiques)</option>
                          </select>
                      </div>

                      <div className="space-y-1.5">
                          <label className="block text-[10px] uppercase font-bold text-gray-500">Format d'apprentissage</label>
                          <select
                            value={newTrainType}
                            onChange={(e: any) => setNewTrainType(e.target.value)}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                          >
                              <option value="video">Vidéo Youtube (Lien Embed)</option>
                              <option value="image">Charte Graphique / Image explicative</option>
                              <option value="test">Test interactif / Évaluation MCQ (Quiz)</option>
                          </select>
                      </div>
                  </div>

                  <div className="space-y-1.5">
                     <label className="block text-[10px] uppercase font-bold text-gray-500">Description / Intitulé explicatif</label>
                     <textarea
                       rows={2}
                       placeholder="Décrivez brièvement le but pédagogique de cette formation et ce que l'élève apprendra."
                       value={newTrainDesc}
                       onChange={(e) => setNewTrainDesc(e.target.value)}
                       className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                     />
                  </div>

                  {newTrainType !== 'test' && (
                      <div className="space-y-1.5 animate-slide-up">
                          <label className="block text-[10px] uppercase font-bold text-gray-500">
                              {newTrainType === 'video' ? "Lien d'intégration Vidéo (YouTube Embed URL Only)" : "Lien Image (Unsplash / Hôte d'image)"}
                          </label>
                          <input
                            type="text"
                            placeholder={newTrainType === 'video' ? "Ex: https://www.youtube.com/embed/ysz5S6PUM-U" : "Ex: https://images.unsplash.com/... ou URL image"}
                            value={newTrainUrl}
                            onChange={(e) => setNewTrainUrl(e.target.value)}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none"
                          />
                          <p className="text-[9px] text-gray-400 italic">⚠️ Attention pour les vidéos : Veillez à copier l'url d'intégration "iframe" (/embed) de YouTube pour éviter le blocage de lecture.</p>
                      </div>
                  )}

                  {/* MCQ Interactive Quiz Builder */}
                  {newTrainType === 'test' && (
                      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 space-y-4 animate-slide-up">
                          <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">🛠️ Élaboration du questionnaire d'évaluation :</p>
                          
                          {/* List drafted questions */}
                          {newQuestions.length > 0 && (
                              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-[11px] font-bold text-gray-700 space-y-1.5">
                                  <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">Questions ajoutées au questionnaire actuel :</p>
                                  {newQuestions.map((qStr, qIdx) => (
                                      <div key={qIdx} className="flex justify-between items-center text-gray-800">
                                          <span>👉 Q{qIdx + 1}: {qStr.question}</span>
                                          <button
                                            type="button"
                                            onClick={() => setNewQuestions(prev => prev.filter((_, idx) => idx !== qIdx))}
                                            className="text-[9px] text-rose-500 hover:underline uppercase font-bold"
                                          >
                                              Supprimer
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          )}

                          <div className="space-y-2">
                              <label className="block text-[9px] uppercase font-black text-gray-400">Intitulé de la question</label>
                              <input
                                type="text"
                                placeholder="Ex: De quelle couleur est la poubelle à déchets plastiques ?"
                                value={newQText}
                                onChange={(e) => setNewQText(e.target.value)}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold outline-none"
                              />
                          </div>

                          <div className="space-y-2">
                              <label className="block text-[9px] uppercase font-black text-gray-400">Options de réponses MCQ (Renseignez-en au moins 2)</label>
                              {[0, 1, 2, 3].map((optIdx) => (
                                  <input
                                    key={optIdx}
                                    type="text"
                                    placeholder={`Option d'affichage ${optIdx + 1}`}
                                    value={newQOpts[optIdx] || ''}
                                    onChange={(e) => {
                                        const copy = [...newQOpts];
                                        copy[optIdx] = e.target.value;
                                        setNewQOpts(copy);
                                    }}
                                    className="w-full p-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-semibold outline-none"
                                  />
                              ))}
                          </div>

                          <div className="space-y-1.5">
                              <label className="block text-[9px] uppercase font-black text-gray-400">Numéro Index de la bonne réponse correspondante (1 à 4)</label>
                              <select
                                value={newQAns}
                                onChange={(e) => setNewQAns(Number(e.target.value))}
                                className="p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold outline-none"
                              >
                                  <option value={0}>Option 1 est la bonne réponse</option>
                                  <option value={1}>Option 2 est la bonne réponse</option>
                                  <option value={2}>Option 3 est la bonne réponse</option>
                                  <option value={3}>Option 4 est la bonne réponse</option>
                              </select>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                                if (!newQText.trim()) {
                                    alert("Veuillez saisir l'intitulé de la question.");
                                    return;
                                }
                                const cleanOptions = newQOpts.filter(o => o.trim() !== '');
                                if (cleanOptions.length < 2) {
                                    alert("Veuillez renseigner au moins 2 options de réponse.");
                                    return;
                                }
                                setNewQuestions([
                                    ...newQuestions,
                                    {
                                        question: newQText.trim(),
                                        options: cleanOptions,
                                        answerIdx: newQAns
                                    }
                                ]);
                                setNewQText('');
                                setNewQOpts(['', '', '']);
                                setNewQAns(0);
                                alert("✓ Question ajoutée au questionnaire temporaire !");
                            }}
                            className="py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-[9px] uppercase tracking-wider transition"
                          >
                              + Sauvegarder cette question dans le Quiz
                          </button>
                      </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                        if (!newTrainTitle.trim()) {
                            alert("Veuillez indiquer le titre du module.");
                            return;
                        }
                        if (newTrainType === 'test' && newQuestions.length === 0) {
                            alert("Veuillez formuler au moins une question MCQ pour ce module de test d'évaluation.");
                            return;
                        }

                        const newModule: TrainingItem = {
                            id: `train_${Date.now()}`,
                            title: newTrainTitle.trim(),
                            type: newTrainType,
                            url: newTrainType !== 'test' ? newTrainUrl.trim() : undefined,
                            target: newTrainTarget,
                            category: newTrainCategory.trim(),
                            description: newTrainDesc.trim(),
                            questions: newTrainType === 'test' ? newQuestions : undefined
                        };

                        setPlatformConfig({
                            ...platformConfig,
                            trainingContent: [...platformConfig.trainingContent, newModule]
                        });

                        // reset forms
                        setNewTrainTitle('');
                        setNewTrainUrl('');
                        setNewTrainDesc('');
                        setNewQuestions([]);
                        alert("🎉 Module académique créé avec succès ! Enregistrez la configuration globale pour valider sa publication de façon définitive.");
                    }}
                    className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-black text-[10px] uppercase tracking-widest transition"
                  >
                      Publier ce module dans l'Académie
                  </button>
              </div>
          </div>

          </div>} {/* end ACAD */}

          {/* ====== APIs ====== */}
          {settingsTab === 'API' && <div className="space-y-5 animate-fade-in">

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-700 flex items-center">
                      <Key size={18} className="mr-2 text-purple-600"/> APIs & Intégrations Externes
                  </h3>
                  <span className="bg-purple-50 text-purple-700 text-xs font-bold px-3 py-1 rounded-full border border-purple-100">Configuration</span>
              </div>

              {/* Security banner */}
              <div className="mx-5 mt-4 bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3">
                  <Lock size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                      <p className="text-xs font-black text-amber-800 uppercase tracking-wide">Sécurité : Clés secrètes dans Cloud Functions</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                          Les clés secrètes (API keys, tokens) ne sont jamais exposées dans le frontend. Elles sont injectées via les variables d'environnement de Firebase Cloud Functions. Seuls les identifiants non-sensibles (Store ID, paramètres publics) sont gérés ici.
                      </p>
                  </div>
              </div>

              {/* Service cards grid */}
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">

                  {/* Jèko Payment Card */}
                  <button
                      type="button"
                      onClick={() => setShowApiSection(showApiSection === 'jeko' ? null : 'jeko')}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${showApiSection === 'jeko' ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-gray-50 hover:border-purple-200'}`}
                  >
                      <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                  <DollarSign size={16} className="text-purple-600" />
                              </div>
                              <div>
                                  <p className="font-black text-gray-800 text-xs uppercase tracking-wide">Jèko Pay</p>
                                  <p className="text-[10px] text-gray-500">Paiement Mobile Money</p>
                              </div>
                          </div>
                          <span className={`w-2.5 h-2.5 rounded-full ${jekoStoreId ? 'bg-green-400' : 'bg-gray-300'}`} />
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">Store ID: {jekoStoreId || <span className="italic text-gray-400">Non configuré</span>}</p>
                      <p className="text-[10px] text-gray-500">Env: <span className={`font-bold ${jekoEnv === 'production' ? 'text-green-600' : 'text-orange-500'}`}>{jekoEnv === 'production' ? 'Production' : 'Sandbox'}</span></p>
                  </button>

                  {/* Firebase Card */}
                  <button
                      type="button"
                      onClick={() => setShowApiSection(showApiSection === 'firebase' ? null : 'firebase')}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${showApiSection === 'firebase' ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-gray-50 hover:border-orange-200'}`}
                  >
                      <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <Database size={16} className="text-orange-600" />
                              </div>
                              <div>
                                  <p className="font-black text-gray-800 text-xs uppercase tracking-wide">Firebase</p>
                                  <p className="text-[10px] text-gray-500">Auth + Firestore + Storage</p>
                              </div>
                          </div>
                          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium truncate">Projet: {import.meta.env.VITE_FIREBASE_PROJECT_ID || <span className="italic text-gray-400">via .env</span>}</p>
                      <p className="text-[10px] text-gray-500">Région: <span className="font-bold text-orange-600">europe-west1</span></p>
                  </button>

                  {/* SMS / OTP Card */}
                  <button
                      type="button"
                      onClick={() => setShowApiSection(showApiSection === 'sms' ? null : 'sms')}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${showApiSection === 'sms' ? 'border-blue-400 bg-blue-50' : 'border-gray-100 bg-gray-50 hover:border-blue-200'}`}
                  >
                      <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <BellIcon size={16} className="text-blue-600" />
                              </div>
                              <div>
                                  <p className="font-black text-gray-800 text-xs uppercase tracking-wide">SMS / OTP</p>
                                  <p className="text-[10px] text-gray-500">Double Authentification</p>
                              </div>
                          </div>
                          <span className={`w-2.5 h-2.5 rounded-full ${platformConfig.enable2FA ? 'bg-green-400' : 'bg-gray-300'}`} />
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium">Fournisseur: <span className="font-bold text-blue-600 uppercase">{smsProvider}</span></p>
                      <p className="text-[10px] text-gray-500">2FA: <span className={`font-bold ${platformConfig.enable2FA ? 'text-green-600' : 'text-gray-400'}`}>{platformConfig.enable2FA ? 'Activé' : 'Désactivé'}</span></p>
                  </button>
              </div>

              {/* Expanded Jèko config */}
              {showApiSection === 'jeko' && (
                  <div className="mx-5 mb-5 bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-4 animate-slide-up">
                      <p className="text-xs font-black text-purple-800 uppercase tracking-widest">Configuration Jèko Payment Gateway</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="block text-[10px] uppercase font-bold text-gray-500">Store ID (Identifiant Boutique)</label>
                              <input
                                  type="text"
                                  placeholder="Ex: SUB-XXXXXXXX"
                                  value={jekoStoreId}
                                  onChange={(e) => setJekoStoreId(e.target.value)}
                                  className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-bold outline-none focus:border-purple-400"
                              />
                              <p className="text-[9px] text-gray-400">Identifiant public de votre boutique Jèko (SUB- prefix)</p>
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-[10px] uppercase font-bold text-gray-500">Clé API Secrète</label>
                              <div className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-mono text-gray-500 flex items-center gap-2">
                                  <Lock size={12} className="text-gray-400 shrink-0" />
                                  <span>••••••••••••••••••••••••</span>
                              </div>
                              <p className="text-[9px] text-amber-600 font-semibold">Gérée via <code>JEKO_API_KEY</code> dans Cloud Functions</p>
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-[10px] uppercase font-bold text-gray-500">Environnement</label>
                              <div className="flex gap-2">
                                  <button
                                      type="button"
                                      onClick={() => setJekoEnv('sandbox')}
                                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition ${jekoEnv === 'sandbox' ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
                                  >
                                      Sandbox (Test)
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => setJekoEnv('production')}
                                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition ${jekoEnv === 'production' ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
                                  >
                                      Production
                                  </button>
                              </div>
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-[10px] uppercase font-bold text-gray-500">Déployer la clé dans Cloud Functions</label>
                              <div className="bg-gray-900 text-green-400 rounded-xl p-3 font-mono text-[10px] space-y-1">
                                  <p className="text-gray-500"># Dans votre terminal :</p>
                                  <p>firebase functions:secrets:set JEKO_API_KEY</p>
                                  <p>firebase functions:secrets:set JEKO_STORE_ID</p>
                                  <p>firebase deploy --only functions</p>
                              </div>
                          </div>
                      </div>
                  </div>
              )}

              {/* Expanded Firebase config */}
              {showApiSection === 'firebase' && (
                  <div className="mx-5 mb-5 bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3 animate-slide-up">
                      <p className="text-xs font-black text-orange-800 uppercase tracking-widest">Informations Firebase (lecture seule)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                              { label: 'Project ID', val: import.meta.env.VITE_FIREBASE_PROJECT_ID || '—' },
                              { label: 'Auth Domain', val: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '—' },
                              { label: 'Storage Bucket', val: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '—' },
                              { label: 'App ID', val: import.meta.env.VITE_FIREBASE_APP_ID ? '••••••' + import.meta.env.VITE_FIREBASE_APP_ID.slice(-6) : '—' },
                          ].map(item => (
                              <div key={item.label} className="bg-white rounded-xl p-3 border border-orange-100">
                                  <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">{item.label}</p>
                                  <p className="text-xs font-mono font-bold text-gray-700 mt-0.5 truncate">{item.val}</p>
                              </div>
                          ))}
                      </div>
                      <p className="text-[10px] text-gray-500">Ces valeurs sont injectées depuis le fichier <code className="bg-orange-100 px-1 rounded">.env</code> lors du build Vite.</p>
                  </div>
              )}

              {/* Expanded SMS config */}
              {showApiSection === 'sms' && (
                  <div className="mx-5 mb-5 bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4 animate-slide-up">
                      <p className="text-xs font-black text-blue-800 uppercase tracking-widest">Configuration SMS / OTP (Double Authentification)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                              <label className="block text-[10px] uppercase font-bold text-gray-500">Fournisseur SMS</label>
                              <select
                                  value={smsProvider}
                                  onChange={(e) => setSmsProvider(e.target.value)}
                                  className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-xs font-bold outline-none focus:border-blue-400"
                              >
                                  <option value="orange">Orange CI (Orange Money SMS)</option>
                                  <option value="mtn">MTN CI (Mobile Money SMS)</option>
                                  <option value="africasTalking">Africa's Talking</option>
                                  <option value="twilio">Twilio</option>
                              </select>
                          </div>
                          <div className="space-y-1.5">
                              <label className="block text-[10px] uppercase font-bold text-gray-500">Clé API SMS</label>
                              <div className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-mono text-gray-500 flex items-center gap-2">
                                  <Lock size={12} className="text-gray-400 shrink-0" />
                                  <span>••••••••••••••••••••••••</span>
                              </div>
                              <p className="text-[9px] text-amber-600 font-semibold">Gérée via <code>SMS_API_KEY</code> dans Cloud Functions</p>
                          </div>
                      </div>
                      <div className="bg-gray-900 text-green-400 rounded-xl p-3 font-mono text-[10px] space-y-1">
                          <p className="text-gray-500"># Déployer la clé SMS dans Cloud Functions :</p>
                          <p>firebase functions:secrets:set SMS_API_KEY</p>
                          <p>firebase functions:secrets:set SMS_SENDER_ID</p>
                          <p>firebase deploy --only functions</p>
                      </div>
                  </div>
              )}

              {/* Save API config button */}
              <div className="px-5 pb-5 flex items-center justify-between">
                  {apiSaveFeedback && (
                      <span className="text-xs text-green-600 font-bold">{apiSaveFeedback}</span>
                  )}
                  <button
                      type="button"
                      onClick={saveApiConfig}
                      className="ml-auto bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition"
                  >
                      <Check size={14} /> Sauvegarder config API
                  </button>
              </div>
          </div>

          </div>} {/* end API */}

          {/* Save button — always visible */}
          {settingsTab !== 'API' && (
              <div className="sticky bottom-4 flex justify-end pt-2">
                  <button
                    onClick={async () => {
                        await saveAppConfig({ ...platformConfig, baseRates: editableRates as any });
                        onUpdateSettings(editableRates, editableCommission / 100);
                        alert("✅ Configuration sauvegardée dans Firestore et synchronisée sur tous les appareils !");
                    }}
                    className="bg-green-600 text-white px-8 py-3.5 rounded-2xl font-semibold text-sm shadow-[0_4px_14px_rgba(22,163,74,0.3)] hover:bg-green-700 active:scale-[0.97] transition-all duration-150 flex items-center gap-2"
                  >
                      <Check size={16} /> Enregistrer la configuration
                  </button>
              </div>
          )}
      </div>
    );
  };

  const renderProfile = () => {
      const handleSaveProfile = async () => {
          setAdminPasswordError('');
          setAdminPhoneError('');

          if (!adminName.trim()) {
              alert("Veuillez saisir votre nom.");
              return;
          }
          if (!adminPhone.trim()) {
              alert("Veuillez saisir votre numéro de téléphone.");
              return;
          }

          const updateData: Partial<User> = {
              name: adminName,
              phone: adminPhone,
          };

          if (newAdminPassword) {
              if (newAdminPassword.length < 6) {
                  setAdminPasswordError("Le nouveau mot de passe doit comporter au moins 6 caractères.");
                  return;
              }
              if (newAdminPassword !== confirmAdminPassword) {
                  setAdminPasswordError("Le nouveau mot de passe et sa confirmation ne correspondent pas.");
                  return;
              }
              updateData.password = newAdminPassword;
          }

          setIsAdminSaving(true);
          try {
              if (onUpdateUser) {
                  await onUpdateUser(currentUser.id, updateData);
              }
              setShowProfileSuccessModal(true);
              setNewAdminPassword('');
              setConfirmAdminPassword('');
              
              // Auto redirect to Overview dashboard after 2.5s
              setTimeout(() => {
                  setShowProfileSuccessModal(false);
                  setActiveTab('OVERVIEW');
              }, 2500);
          } catch (e) {
              console.error(e);
          } finally {
              setIsAdminSaving(false);
          }
      };

      return (
          <div className="space-y-6 animate-fade-in max-w-2xl">
              <div className="flex items-center space-x-3">
                  <UserIcon className="text-green-600" size={24} />
                  <h2 className="text-xl font-bold text-gray-800">Mon Profil Administrateur</h2>
              </div>

              {/* Header card displaying administrator metadata */}
              <div className="bg-gradient-to-r from-gray-900 to-green-950 p-6 rounded-3xl text-white shadow-xl border border-gray-800 flex flex-col sm:flex-row items-center gap-4.5 relative overflow-hidden">
                  <img
                      src="/servi_logo.png"
                      alt="Servi+"
                      className="absolute top-4 right-4 h-8 w-auto object-contain opacity-70"
                      style={{ mixBlendMode: 'screen' }}
                  />
                  <img
                      src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=4f46e5&color=fff`}
                      alt={adminName}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-white/20 shadow-md"
                  />
                  <div className="text-center sm:text-left">
                      <h3 className="font-sans font-black text-lg tracking-tight">{adminName || 'Administrateur'}</h3>
                      <p className="text-xs text-green-200 mt-0.5 font-bold font-mono tracking-wider">{adminPhone}</p>
                      
                      <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                          {isSuperAdmin ? (
                              <span className="bg-green-600/20 text-green-300 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-green-400/20 font-mono">
                                 🌐 Super Administrateur
                              </span>
                          ) : (
                              <span className="bg-green-500/20 text-green-300 text-[10px] font-black uppercase px-3 py-1 rounded-full border border-green-400/20 font-mono">
                                 ⚙️ Sous-Administrateur
                              </span>
                          )}
                          {!isSuperAdmin && currentUser.assignedCity && (
                              <span className="bg-white/10 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full border border-white/10 font-mono">
                                 📍 Ville: {currentUser.assignedCity}
                              </span>
                          )}
                      </div>
                  </div>
              </div>

              {/* Form editing card */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm border border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name field */}
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nom complet</label>
                          <input 
                              type="text" 
                              value={adminName}
                              onChange={(e) => setAdminName(e.target.value)}
                              placeholder="Votre nom"
                              className="w-full p-4 bg-gray-50 border border-gray-100 focus:bg-white rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-green-500/10 transition-all text-sm"
                          />
                      </div>

                      {/* Phone field */}
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Numéro de téléphone</label>
                          <input 
                              type="tel" 
                              value={adminPhone}
                              onChange={(e) => setAdminPhone(e.target.value)}
                              placeholder="Votre numéro (Login ID)"
                              className="w-full p-4 bg-gray-50 border border-gray-100 focus:bg-white rounded-2xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-green-500/10 transition-all text-sm"
                          />
                          {adminPhoneError && <p className="text-xs text-red-500 font-semibold px-2">{adminPhoneError}</p>}
                      </div>
                  </div>

                  {/* Password & security card section */}
                  <div className="pt-6 border-t border-gray-100 mt-6 space-y-4">
                      <div className="flex items-center space-x-2 text-gray-900">
                          <Lock size={16} />
                          <h4 className="text-[10px] font-black uppercase tracking-wider">🔒 Modifier le mot de passe (Laisser vide pour ne pas modifier)</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* New Password input */}
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nouveau mot de passe</label>
                              <input 
                                  type="password" 
                                  value={newAdminPassword}
                                  onChange={(e) => setNewAdminPassword(e.target.value)}
                                  placeholder="Au moins 6 caractères"
                                  className="w-full p-4 bg-gray-50 border border-gray-100 focus:bg-white rounded-2xl font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-green-500/10 transition-all text-sm"
                              />
                          </div>

                          {/* Confirmation password input */}
                          <div className="space-y-1">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Confirmer le mot de passe</label>
                              <input 
                                  type="password" 
                                  value={confirmAdminPassword}
                                  onChange={(e) => setConfirmAdminPassword(e.target.value)}
                                  placeholder="Ré-entrer le mot de passe"
                                  className="w-full p-4 bg-gray-50 border border-gray-105 focus:bg-white rounded-2xl font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-green-500/10 transition-all text-sm"
                              />
                          </div>
                      </div>
                      {adminPasswordError && <p className="text-red-500 text-xs font-bold px-2">{adminPasswordError}</p>}
                  </div>

                  {/* Custom Action button */}
                  <div className="pt-4">
                      <button 
                          onClick={handleSaveProfile}
                          disabled={isAdminSaving}
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-2xl text-sm transition-all duration-150 flex items-center justify-center gap-2 active:scale-[0.97] shadow-[0_4px_14px_rgba(22,163,74,0.25)] cursor-pointer"
                      >
                          {isAdminSaving ? (
                              <>
                                  <Loader2 size={16} className="animate-spin" />
                                  <span>Enregistrement...</span>
                              </>
                          ) : (
                              <span>Sauvegarder les modifications du profil</span>
                          )}
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  // --- MAIN LAYOUT ---

  const TAB_LABELS: Record<TabType, string> = {
    OVERVIEW: "Vue d'ensemble",
    MISSIONS: 'Toutes les missions',
    MARKET: 'Marché & Courses',
    PROVIDERS: 'Prestataires',
    USERS: 'Clients',
    ABONNEMENTS: 'Abonnements',
    FINANCE: 'Finance & Retraits',
    DISPUTES: 'Litiges',
    OFFRES: 'Offres plateforme',
    CONTENUS: 'Contenus & Annonces',
    INTEGRATIONS: 'Intégrations & API',
    TEAM: 'Équipe Admin',
    SETTINGS: 'Paramètres',
    PROFILE: 'Mon Profil',
  };

  const navBtn = (tab: TabType): string =>
    activeTab === tab
      ? 'flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-sm w-full text-left bg-green-600 text-white'
      : 'flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-sm w-full text-left text-gray-600 hover:bg-gray-50 transition-colors';

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans">

      {/* ─── SIDEBAR FIXE ─── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100 flex-shrink-0">
          <img src="/servi_logo.png" alt="Servi+" className="h-7 w-auto object-contain" />
          <span className="font-bold text-gray-800 text-base">Admin</span>
        </div>

        {/* City restricted banner */}
        {isCityRestricted && (
          <div className="mx-3 mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-800 flex items-center gap-2 flex-shrink-0">
            <span>🇨🇮</span>
            <span>{assignedCityParam} uniquement</span>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">

          {/* Tableau de bord */}
          <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Tableau de bord</p>
          <button onClick={() => { setActiveTab('OVERVIEW'); setSidebarOpen(false); }} className={navBtn('OVERVIEW')}>
            <TrendingUp size={17} /><span>Vue d'ensemble</span>
          </button>
          {(isSuperAdmin || currentUser.canManageMarket) && (
            <button onClick={() => { setActiveTab('MISSIONS'); setSidebarOpen(false); }} className={navBtn('MISSIONS')}>
              <ClipboardList size={17} /><span>Toutes les missions</span>
            </button>
          )}
          {(isSuperAdmin || currentUser.canManageMarket) && (
            <button onClick={() => { setActiveTab('MARKET'); setSidebarOpen(false); }} className={`${navBtn('MARKET')} justify-between`}>
              <span className="flex items-center gap-3"><ShoppingBasket size={17} /><span>Marché & Courses</span></span>
              {activeMarketMissions.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeMarketMissions.length}</span>}
            </button>
          )}

          {/* Utilisateurs */}
          <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Utilisateurs</p>
          {(isSuperAdmin || currentUser.canManageUsers) && (
            <button onClick={() => { setActiveTab('PROVIDERS'); setSidebarOpen(false); }} className={`${navBtn('PROVIDERS')} justify-between`}>
              <span className="flex items-center gap-3"><Briefcase size={17} /><span>Prestataires</span></span>
              {pendingProviders.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingProviders.length}</span>}
            </button>
          )}
          {(isSuperAdmin || currentUser.canManageUsers) && (
            <button onClick={() => { setActiveTab('USERS'); setSidebarOpen(false); }} className={`${navBtn('USERS')} justify-between`}>
              <span className="flex items-center gap-3"><Users size={17} /><span>Clients</span></span>
              {pendingProviders.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingProviders.length}</span>}
            </button>
          )}
          {(isSuperAdmin || currentUser.canManageFinance) && (
            <button onClick={() => { setActiveTab('ABONNEMENTS'); setSidebarOpen(false); }} className={navBtn('ABONNEMENTS')}>
              <Crown size={17} /><span>Abonnements</span>
            </button>
          )}

          {/* Finance */}
          <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Finance</p>
          {(isSuperAdmin || currentUser.canManageFinance) && (
            <button onClick={() => { setActiveTab('FINANCE'); setSidebarOpen(false); }} className={navBtn('FINANCE')}>
              <DollarSign size={17} /><span>Finance & Retraits</span>
            </button>
          )}
          {(isSuperAdmin || currentUser.canManageDisputes) && (
            <button onClick={() => { setActiveTab('DISPUTES'); setSidebarOpen(false); }} className={`${navBtn('DISPUTES')} justify-between`}>
              <span className="flex items-center gap-3"><ShieldAlert size={17} /><span>Litiges</span></span>
              {disputedMissions.length > 0 && <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{disputedMissions.length}</span>}
            </button>
          )}

          {/* Contenu */}
          {isSuperAdmin && (
            <>
              <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Contenu</p>
              <button onClick={() => { setActiveTab('OFFRES'); setSidebarOpen(false); }} className={navBtn('OFFRES')}>
                <Tag size={17} /><span>Offres plateforme</span>
              </button>
              <button onClick={() => { setActiveTab('CONTENUS'); setSidebarOpen(false); }} className={navBtn('CONTENUS')}>
                <BookOpen size={17} /><span>Contenus & Annonces</span>
              </button>
            </>
          )}

          {/* Configuration */}
          <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">Configuration</p>
          <button onClick={() => { setActiveTab('INTEGRATIONS'); setSidebarOpen(false); }} className={navBtn('INTEGRATIONS')}>
            <Zap size={17} /><span>Intégrations & API</span>
          </button>
          {isSuperAdmin && (
            <button onClick={() => { setActiveTab('TEAM'); setSidebarOpen(false); }} className={navBtn('TEAM')}>
              <Shield size={17} /><span>Équipe Admin</span>
            </button>
          )}
          {(isSuperAdmin || currentUser.canManageSettings) && (
            <button onClick={() => { setActiveTab('SETTINGS'); setSidebarOpen(false); }} className={navBtn('SETTINGS')}>
              <Settings size={17} /><span>Paramètres</span>
            </button>
          )}
          <button onClick={() => { setActiveTab('PROFILE'); setSidebarOpen(false); }} className={navBtn('PROFILE')}>
            <UserIcon size={17} /><span>Mon Profil</span>
          </button>
        </nav>

        {/* Footer sidebar */}
        <div className="flex-shrink-0 border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 px-1">
            <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{currentUser.name}</p>
              <p className="text-[11px] text-gray-400 truncate">{isSuperAdmin ? 'Super Admin' : 'Administrateur'}</p>
            </div>
            {onLogout && (
              <button onClick={onLogout} title="Déconnexion" className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── ZONE PRINCIPALE ─── */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">

        {/* Top navbar fixe */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-3 shadow-sm flex-shrink-0">
          {/* Hamburger mobile */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="md:hidden p-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            {sidebarOpen ? <XIcon size={20} /> : <Menu size={20} />}
          </button>

          {/* Titre de la page active */}
          <h1 className="flex-1 font-bold text-gray-800 text-base truncate">{TAB_LABELS[activeTab]}</h1>

          {/* Badge litiges */}
          {disputedMissions.length > 0 && (
            <button
              onClick={() => setActiveTab('DISPUTES')}
              className="flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex-shrink-0"
            >
              <ShieldAlert size={14} />
              <span>{disputedMissions.length} litige{disputedMissions.length > 1 ? 's' : ''}</span>
            </button>
          )}

          {/* Badge prestataires en attente */}
          {pendingProviders.length > 0 && (
            <button
              onClick={() => setActiveTab('PROVIDERS')}
              className="flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors flex-shrink-0"
            >
              <Briefcase size={14} />
              <span>{pendingProviders.length} en attente</span>
            </button>
          )}

          {/* Séparateur + avatar + nom + rôle */}
          <div className="hidden md:flex items-center gap-2 border-l border-gray-200 pl-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-sm">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-900 leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-gray-400">{isSuperAdmin ? 'Super Admin' : 'Administrateur'}</p>
            </div>
          </div>

          {/* Bouton déconnexion */}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Déconnexion"
              className="hidden md:flex items-center gap-1.5 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
            >
              <LogOut size={16} />
            </button>
          )}
        </header>

        {/* Contenu scrollable */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-6">
          <div className="p-4 md:p-6">
            {activeTab === 'OVERVIEW' && renderOverview()}
            {activeTab === 'MISSIONS' && (
              <AdminMissionsPanel
                missions={missions}
                users={users}
                onUpdateMissionStatus={onUpdateMissionStatus}
              />
            )}
            {activeTab === 'PROVIDERS' && (
              <AdminProvidersPanel
                users={users}
                missions={missions}
                onVerifyUser={onVerifyUser}
                onUpdateUser={onUpdateUser}
              />
            )}
            {activeTab === 'USERS' && renderUsers()}
            {activeTab === 'ABONNEMENTS' && (
              <AdminSubscriptionsPanel
                users={users}
                transactions={transactions}
                onUpdateUser={onUpdateUser}
              />
            )}
            {activeTab === 'FINANCE' && renderFinance()}
            {activeTab === 'DISPUTES' && renderDisputes()}
            {activeTab === 'SETTINGS' && renderSettings()}
            {activeTab === 'TEAM' && isSuperAdmin && renderTeam()}
            {activeTab === 'MARKET' && renderMarketOrders()}
            {activeTab === 'OFFRES' && (
              <AdminOffersPanel
                config={platformConfig}
                onSaveConfig={(newConfig) => {
                  setPlatformConfig(newConfig);
                  saveAppConfig(newConfig);
                }}
              />
            )}
            {activeTab === 'CONTENUS' && (
              <AdminContentsPanel
                config={platformConfig}
                onSaveConfig={(newConfig) => {
                  setPlatformConfig(newConfig);
                  saveAppConfig(newConfig);
                }}
              />
            )}
            {activeTab === 'INTEGRATIONS' && <AdminIntegrationsPanel currentUser={currentUser} />}
            {activeTab === 'PROFILE' && renderProfile()}
          </div>
        </main>

        {/* Mobile bottom nav — 5 tabs fixes */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex items-center justify-around px-1 py-2 md:hidden shadow-lg">
          {[
            { tab: 'OVERVIEW' as TabType, icon: <TrendingUp size={20} />, label: 'Accueil' },
            { tab: 'MISSIONS' as TabType, icon: <ClipboardList size={20} />, label: 'Missions' },
            { tab: 'PROVIDERS' as TabType, icon: <Briefcase size={20} />, label: 'Presta' },
            { tab: 'DISPUTES' as TabType, icon: <ShieldAlert size={20} />, label: 'Litiges', badge: disputedMissions.length },
            { tab: 'PROFILE' as TabType, icon: <UserIcon size={20} />, label: 'Profil' },
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => setActiveTab(item.tab)}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${activeTab === item.tab ? 'text-green-600' : 'text-gray-400'}`}
            >
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
              {(item as any).badge > 0 && (
                <span className="absolute -top-0.5 right-1 bg-red-500 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {(item as any).badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* CUSTOMIZED ADMIN PROFILE SUCCESS MODAL */}
      {showProfileSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl border border-gray-100 animate-scale-in">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <Check className="stroke-[3px]" size={32} />
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-1 font-sans">Profil mis à jour !</h3>
            <p className="text-[10px] text-emerald-600 font-extrabold uppercase mb-4 tracking-wider">Modifications enregistrées</p>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/80 mb-6 text-left space-y-2.5 text-xs font-semibold leading-relaxed text-gray-600">
              <p>
                Vos informations d'administrateur ont été enregistrées avec succès et appliquées à votre compte Servi+.
              </p>
              <p className="text-[11px] text-gray-400">
                Vous allez être automatiquement redirigé vers la vue d'ensemble.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
