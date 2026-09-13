import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mission, MissionStatus, ServiceCategory, Transaction } from '../types';
import { SERVICE_ICONS, CITIES } from '../constants';
import {
  MapPin,
  Clock,
  CheckCircle,
  Star,
  Phone,
  User as UserIcon,
  Wallet,
  DollarSign,
  Loader2,
  Briefcase,
  ChevronRight,
  TrendingUp,
  ArrowUpRight,
  Info,
  ExternalLink,
  Navigation,
  Compass,
  PhoneCall,
  Eye,
  EyeOff,
  X,
  Gift,
  Lock,
  Check,
  CreditCard,
  Trash2,
  Bell,
  Shield,
  Zap,
  MoreHorizontal,
  Send,
  XCircle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getAppConfig } from '../services/configService';
import { initiateSubscriptionPayment, openCheckout } from '../services/jekoService';
import { ABIDJAN_ZONES } from '../constants';

export interface ProviderDashboardProps {
  currentUser: User;
  missions: Mission[];
  users: User[];
  transactions: Transaction[];
  onUpdateMissionStatus: (missionId: string, status: MissionStatus, providerId?: string, refusalReason?: string) => void;
  onDisputeMission: (missionId: string, reason: string) => void;
  onRateClient: (missionId: string, rating: number, comment: string) => void;
  onUpdateUser: (data: Partial<User>) => void;
  onRequestWithdrawal: (amount: number, method: string, phone: string) => void;
  onAnswerExtension?: (missionId: string, accept: boolean) => void;
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onDeleteAccount?: (userId: string) => Promise<void>;
}

const CATEGORY_GRADIENTS: Record<ServiceCategory, string> = {
  [ServiceCategory.CLEANING]: "from-green-500 to-green-600",
  [ServiceCategory.COOKING]: "from-orange-500 to-orange-600",
  [ServiceCategory.ELDERLY_CARE]: "from-emerald-500 to-emerald-600",
  [ServiceCategory.GARDENING]: "from-green-500 to-green-600",
  [ServiceCategory.LAUNDRY]: "from-green-500 to-green-600",
  [ServiceCategory.BABYSITTING]: "from-pink-500 to-pink-600",
  [ServiceCategory.MARKET]: "from-amber-500 to-amber-600",
};

export default function ProviderDashboard({ 
  currentUser, 
  missions = [], 
  users = [], 
  transactions = [], 
  onUpdateMissionStatus, 
  onDisputeMission,
  onRateClient,
  onUpdateUser, 
  onRequestWithdrawal,
  onAnswerExtension,
  activeTab,
  setActiveTab,
  onDeleteAccount
}: ProviderDashboardProps) {
  const config = getAppConfig();
  const [quizResponses, setQuizResponses] = useState<Record<string, Record<number, number>>>({});
  const [quizDone, setQuizDone] = useState<Record<string, boolean>>({});
  const [collapsedVideos, setCollapsedVideos] = useState<Record<string, boolean>>({});
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(0);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawalPhone, setWithdrawalPhone] = useState(currentUser.phone || '');
  const [withdrawalOperator, setWithdrawalOperator] = useState<'orange' | 'mtn' | 'wave'>('wave');
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalFeedback, setWithdrawalFeedback] = useState('');
  
  // Rating states for client
  const [ratingClientMission, setRatingClientMission] = useState<Mission | null>(null);
  const [clientRatingValue, setClientRatingValue] = useState<number>(5);
  const [clientRatingComment, setClientRatingComment] = useState('');

  const handleSubmitRatingClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingClientMission || !onRateClient) return;
    onRateClient(ratingClientMission.id, clientRatingValue, clientRatingComment);
    setRatingClientMission(null);
  };
  
  // Selected mission for detail viewing / map lookup
  const [viewingMission, setViewingMission] = useState<Mission | null>(null);

  // Subscription states
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [selectedOM, setSelectedOM] = useState<'orange' | 'mtn' | 'wave'>('orange');
  const [phoneForMoMo, setPhoneForMoMo] = useState(currentUser.phone || '');
  const [showSuccessSubscription, setShowSuccessSubscription] = useState(false);

  // Refusal states
  const [refusalTargetMissionId, setRefusalTargetMissionId] = useState<string | null>(null);
  const [refusalReasonInput, setRefusalReasonInput] = useState('');
  const [isSubmittingRefusal, setIsSubmittingRefusal] = useState(false);

  // Profile editing states
  const [profileForm, setProfileForm] = useState({
    name: currentUser.name,
    phone: currentUser.phone,
    city: currentUser.city || 'Abidjan',
  });
  const [editedServices, setEditedServices] = useState<ServiceCategory[]>(currentUser.services || []);

  // Keep profile inputs synchronized when currentUser details load/change
  React.useEffect(() => {
    setProfileForm({
      name: currentUser.name,
      phone: currentUser.phone,
      city: currentUser.city || 'Abidjan',
    });
    setEditedServices(currentUser.services || []);
  }, [currentUser]);

  const [showProfileSuccessModal, setShowProfileSuccessModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);

  // Subscription configuration in portfolio tab
  const [selectedSubPeriod, setSelectedSubPeriod] = useState<'monthly' | 'annual'>('monthly');

  // Platform offers carousel
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showAllOffers, setShowAllOffers] = useState(false);

  const providerZone = currentUser.zone || '';

  const ALL_PLATFORM_OFFERS = useMemo(() => [
    {
      id: 'sub_promo',
      emoji: '🚀',
      title: 'Passez à Servi+ Pro',
      subtitle: '0% de commission sur toutes vos missions',
      badge: 'ABONNEMENT',
      badgeColor: 'bg-amber-400 text-amber-900',
      gradient: 'from-green-700/80 to-emerald-600/80',
      bgImage: '/offer_pro.jpg',
      zones: ['ALL'],
      cta: "S'abonner",
      onPress: () => setShowSubscriptionModal(true),
    },
    {
      id: 'bonus_yop_abobo',
      emoji: '🎁',
      title: 'Bonus Yopougon & Abobo',
      subtitle: '+1 000 F CFA sur chaque mission acceptée dans votre zone cette semaine',
      badge: 'OFFRE ZONE',
      badgeColor: 'bg-red-400 text-white',
      gradient: 'from-orange-600/80 to-amber-500/80',
      bgImage: '/offer_bonus.jpg',
      zones: ['Yopougon', 'Abobo', 'Attécoubé'],
      cta: 'En profiter',
      onPress: () => {},
    },
    {
      id: 'bonus_cocody',
      emoji: '💫',
      title: 'Priorité Cocody ce weekend',
      subtitle: 'Vos missions Cocody remontées en tête des résultats',
      badge: 'OFFRE ZONE',
      badgeColor: 'bg-sky-400 text-white',
      gradient: 'from-sky-600/80 to-blue-500/80',
      bgImage: '/offer_cocody.jpg',
      zones: ['Cocody', 'Bingerville'],
      cta: 'Voir mes missions',
      onPress: () => setActiveTab?.('missions'),
    },
    {
      id: 'visibility',
      emoji: '👁️',
      title: 'Soyez visible en premier',
      subtitle: 'Complétez votre profil pour apparaître en tête de liste',
      badge: 'CONSEIL',
      badgeColor: 'bg-blue-400 text-white',
      gradient: 'from-blue-700/80 to-sky-500/80',
      bgImage: '/offer_visibility.jpg',
      zones: ['ALL'],
      cta: 'Mon profil',
      onPress: () => setActiveTab?.('profile'),
    },
    {
      id: 'bonus_marcory',
      emoji: '⚡',
      title: 'Zone Sud en feu !',
      subtitle: 'Demande forte ce weekend à Marcory, Koumassi et Treichville',
      badge: 'FORTE DEMANDE',
      badgeColor: 'bg-green-400 text-white',
      gradient: 'from-teal-600/80 to-green-500/80',
      bgImage: '/offer_sud.jpg',
      zones: ['Marcory', 'Koumassi', 'Treichville', 'Port-Bouët'],
      cta: 'Voir les missions',
      onPress: () => setActiveTab?.('missions'),
    },
    {
      id: 'referral',
      emoji: '🤝',
      title: 'Parrainez un prestataire',
      subtitle: "Gagnez 2 000 F CFA pour chaque ami qui s'inscrit",
      badge: 'PARRAINAGE',
      badgeColor: 'bg-purple-400 text-white',
      gradient: 'from-purple-700/80 to-violet-500/80',
      bgImage: '/offer_referral.jpg',
      zones: ['ALL'],
      cta: 'Partager',
      onPress: () => {},
    },
  ], []);

  const PLATFORM_OFFERS = useMemo(() =>
    ALL_PLATFORM_OFFERS.filter(o =>
      o.zones.includes('ALL') ||
      (providerZone && o.zones.includes(providerZone)) ||
      (!providerZone)
    ),
    [ALL_PLATFORM_OFFERS, providerZone]
  );

  useEffect(() => {
    setCarouselIndex(0);
    if (carouselTimer.current) clearInterval(carouselTimer.current);
    carouselTimer.current = setInterval(() => {
      setCarouselIndex(i => (i + 1) % Math.max(1, PLATFORM_OFFERS.length));
    }, 5000);
    return () => { if (carouselTimer.current) clearInterval(carouselTimer.current); };
  }, [PLATFORM_OFFERS.length]);

  const userServices = useMemo(() => currentUser.services || [], [currentUser.services]);
  const userCity = useMemo(() => currentUser.city || 'Abidjan', [currentUser.city]);

  const myMissions = useMemo(() => 
    (missions || []).filter(m => m && m.providerId === currentUser.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [missions, currentUser.id]
  );
  
  const availableMissions = useMemo(() => 
    (missions || []).filter(m => 
      m && 
      m.status === MissionStatus.PENDING && 
      !m.providerId && 
      (m.city === userCity) && 
      (userServices.length === 0 || userServices.includes(m.category))
    ),
    [missions, userCity, userServices]
  );

  const isSubscribed = useMemo(() => {
    if (currentUser.isSubscribed) return true;
    if (currentUser.subscriptionExpiresAt) {
      return new Date(currentUser.subscriptionExpiresAt) > new Date();
    }
    return false;
  }, [currentUser]);

  const acceptedMissionsCount = useMemo(() => myMissions.length, [myMissions]);
  const freeOffersLeft = Math.max(0, 3 - acceptedMissionsCount);
  const subscriptionRequired = acceptedMissionsCount >= 3 && !isSubscribed;

  const finances = useMemo(() => {
    const totalEarnings = myMissions
      .filter(m => m.status === MissionStatus.COMPLETED)
      .reduce((sum, m) => sum + (Number(m.providerAmount) || 0), 0);
      
    const withdrawn = (transactions || [])
      .filter(t => t && t.type === 'PAYOUT' && t.userId === currentUser.id && t.status === 'SUCCESS')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      
    return {
      balance: Math.max(0, totalEarnings - withdrawn),
      totalEarnings
    };
  }, [myMissions, transactions, currentUser.id]);

  const hasActiveMission = useMemo(() => {
    return myMissions.some(m => m.status === MissionStatus.ACCEPTED || m.status === MissionStatus.IN_PROGRESS);
  }, [myMissions]);

  const refusedMissions = useMemo(() =>
    myMissions.filter(m => m.status === MissionStatus.CANCELLED),
    [myMissions]
  );

  const isBlocked = useMemo(() => {
    if (currentUser.blockedUntil) {
      return new Date(currentUser.blockedUntil) > new Date();
    }
    return false;
  }, [currentUser.blockedUntil]);

  const handleAcceptMission = (missionId: string) => {
    if (subscriptionRequired) {
      setShowSubscriptionModal(true);
      return;
    }
    if (hasActiveMission) {
      alert("Vous avez déjà une mission en cours. Terminez-la avant d'en accepter une autre.");
      return;
    }
    const arrival = new Date(); 
    arrival.setMinutes(arrival.getMinutes() + 30);
    onUpdateMissionStatus(missionId, MissionStatus.ACCEPTED, currentUser.id, undefined);
  };

  const handleRefuseMissionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refusalTargetMissionId) return;
    if (!refusalReasonInput.trim()) {
      alert("Veuillez saisir un motif de refus.");
      return;
    }
    setIsSubmittingRefusal(true);

    try {
      const todayStr = new Date().toDateString();
      let refusalsCountToday = currentUser.refusalsCountToday || 0;
      let blockedUntilVal = currentUser.blockedUntil || undefined;

      if (currentUser.lastRefusalDate === todayStr) {
        refusalsCountToday += 1;
      } else {
        refusalsCountToday = 1;
      }

      if (refusalsCountToday >= 2) {
        blockedUntilVal = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      }

      onUpdateUser({
        refusalsCountToday,
        lastRefusalDate: todayStr,
        blockedUntil: blockedUntilVal
      });

      // Status PENDING reverts mission so other providers can claim it, with the refusal reason saved!
      onUpdateMissionStatus(refusalTargetMissionId, MissionStatus.PENDING, undefined, refusalReasonInput);

      if (refusalsCountToday >= 2) {
        alert("⚠️ Vous avez refusé 2 offres aujourd'hui. Votre compte est suspendu temporairement pour 72 heures.");
      } else {
        alert("Offre refusée avec succès. Elle a été remise en ligne pour les autres prestataires.");
      }

      setRefusalTargetMissionId(null);
      setRefusalReasonInput('');
    } catch (err) {
      console.warn(err);
    } finally {
      setIsSubmittingRefusal(false);
    }
  };

  if (isBlocked) {
    const blockEnd = new Date(currentUser.blockedUntil!);
    return (
      <div className="pb-20 max-w-lg mx-auto w-full px-4 pt-10 font-sans">
        <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white text-center shadow-2xl border border-red-500/30 relative overflow-hidden space-y-6">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.15),transparent)]"></div>
          
          <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
            <Lock size={36} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold italic uppercase">Accès Suspendu (72h)</h3>
            <p className="text-[10px] text-red-400 font-bold tracking-widest uppercase font-mono">⚠️ Règle de Fiabilité Érodée</p>
          </div>
          
          <p className="text-xs text-gray-300 font-bold leading-relaxed px-2">
            Votre espace prestataire a été temporairement suspendu pour une durée de <span className="font-bold text-white">72 heures</span> suite au refus successif de <span className="text-red-400 font-bold">2 missions acceptées</span> dans la même journée.
          </p>
          
          <div className="bg-gray-900 border border-gray-800/80 p-4 rounded-xl text-left text-[11px] font-bold text-gray-400 space-y-2 font-mono">
            <p className="text-gray-300 font-bold uppercase text-[9px] tracking-wider mb-1">Détails de la suspension :</p>
            <p>• Statut : <span className="text-red-500 uppercase font-bold font-sans">Bloqué</span></p>
            <p>• Déblocage le : <span className="text-white font-bold font-sans">{blockEnd.toLocaleDateString('fr-FR')} à {blockEnd.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}</span></p>
            <p>• Motif : Annulations répétées le même jour</p>
          </div>
          
          <p className="text-[10px] text-gray-500 leading-normal font-sans">
            Pour maintenir la qualité de service d'Abidjan, un prestataire ne peut pas annuler plusieurs interventions acceptées le même jour. Merci de votre fidélité.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 max-w-lg mx-auto w-full">
      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* ══ ZONE VERTE (greeting + carte KPI + actions) ══ */}
            <div className="-mx-4 bg-gradient-to-b from-green-600 to-green-500 pt-[calc(env(safe-area-inset-top)+16px)] pb-6 px-5 relative overflow-hidden">
              {/* Cercles déco */}
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/8 rounded-full" />
              <div className="absolute -left-6 bottom-0 w-32 h-32 bg-black/5 rounded-full" />

              {/* Top bar */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div>
                  <img
                    src="/servi_logo.png"
                    alt="Servi+"
                    className="h-7 w-auto object-contain"
                    style={{ mixBlendMode: 'multiply' }}
                  />
                  <div className="flex items-center gap-1.5 mt-1">
                    <MapPin size={11} className="text-green-200" />
                    <span className="text-white/70 text-xs">{currentUser.city || 'Abidjan'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center text-white relative">
                    <Bell size={17} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full border-2 border-green-500" />
                  </button>
                  <img
                    src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=15803d&color=fff`}
                    className="w-9 h-9 rounded-full border-2 border-white/40 object-cover"
                    alt=""
                  />
                </div>
              </div>

              {/* Salutation */}
              <div className="relative z-10 mb-3">
                <p className="text-green-100 text-sm">Bonjour,</p>
                <h1 className="text-white text-[22px] font-bold leading-tight">{currentUser.name} 👋</h1>
              </div>

              {/* ── CARTE GAINS ── */}
              <div className="relative z-10 bg-white/10 border border-white/20 rounded-2xl p-3.5 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-green-200 text-[10px] font-semibold uppercase tracking-wider">Mes gains</p>
                  <button
                    onClick={() => setActiveTab?.('wallet')}
                    className="text-white/60 text-[10px] font-semibold flex items-center gap-0.5"
                  >
                    Détails <ChevronRight size={11} />
                  </button>
                </div>
                <p className="text-white text-2xl font-bold tracking-tight">
                  {finances.totalEarnings.toLocaleString()}
                  <span className="text-sm text-green-200 font-medium ml-1.5">F CFA</span>
                </p>
                <div className="grid grid-cols-3 gap-2 mt-2.5 pt-2.5 border-t border-white/10">
                  {[
                    { label: 'Terminées', value: myMissions.filter(m => m.status === MissionStatus.COMPLETED).length },
                    { label: 'En cours', value: myMissions.filter(m => m.status === MissionStatus.IN_PROGRESS).length },
                    { label: 'Note', value: currentUser.rating ? `${currentUser.rating.toFixed(1)} ★` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-white font-bold text-sm leading-none">{value}</p>
                      <p className="text-green-200/70 text-[9px] mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── ACTIONS RAPIDES ── */}
              <div className="relative z-10 grid grid-cols-4 gap-2">
                {[
                  { icon: <Briefcase size={19} />, label: 'Missions', onClick: () => setActiveTab?.('missions') },
                  { icon: <Wallet size={19} />, label: 'Gains',    onClick: () => setActiveTab?.('wallet') },
                  { icon: <Send size={19} />,     label: 'Contacter', onClick: () => {} },
                  { icon: <MoreHorizontal size={19} />, label: 'Plus', onClick: () => {} },
                ].map(({ icon, label, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="flex flex-col items-center gap-1.5 active:scale-95 transition"
                  >
                    <div className="w-12 h-12 bg-white/15 rounded-2xl flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition">
                      {icon}
                    </div>
                    <span className="text-white/80 text-[10px] font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ══ CAROUSEL OFFRES PLATEFORME ══ */}
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-sm font-bold text-gray-900">
                Offres pour vous{providerZone ? <span className="text-gray-400 font-normal"> · {providerZone}</span> : null}
              </p>
              <button
                onClick={() => setShowAllOffers(true)}
                className="border border-green-500 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 active:opacity-70"
              >
                Voir tout <ChevronRight size={13} />
              </button>
            </div>
            <div className="px-1 overflow-hidden">
              <div className="relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={carouselIndex}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.3 }}
                    className="rounded-2xl overflow-hidden relative text-white"
                    style={{ minHeight: 140 }}
                  >
                    {/* Image de fond */}
                    <img
                      src={PLATFORM_OFFERS[carouselIndex].bgImage}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />

                    {/* Overlay dégradé pour lisibilité */}
                    <div className={`absolute inset-0 bg-gradient-to-r ${PLATFORM_OFFERS[carouselIndex].gradient}`} />

                    {/* Contenu */}
                    <div className="relative z-10 p-4">
                      {/* Badge */}
                      <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mb-3 ${PLATFORM_OFFERS[carouselIndex].badgeColor}`}>
                        {PLATFORM_OFFERS[carouselIndex].badge}
                      </span>

                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-2xl drop-shadow">{PLATFORM_OFFERS[carouselIndex].emoji}</span>
                        <p className="text-white font-bold text-base leading-tight drop-shadow">{PLATFORM_OFFERS[carouselIndex].title}</p>
                      </div>
                      <p className="text-white/90 text-xs leading-relaxed mb-4 drop-shadow">{PLATFORM_OFFERS[carouselIndex].subtitle}</p>
                      <button
                        onClick={PLATFORM_OFFERS[carouselIndex].onPress}
                        className="bg-white/25 hover:bg-white/35 active:scale-95 backdrop-blur-sm border border-white/40 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow"
                      >
                        {PLATFORM_OFFERS[carouselIndex].cta} →
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>

                {/* Dots pagination */}
                <div className="flex items-center justify-center gap-1.5 mt-3">
                  {PLATFORM_OFFERS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCarouselIndex(i);
                        if (carouselTimer.current) clearInterval(carouselTimer.current);
                        carouselTimer.current = setInterval(() => setCarouselIndex(idx => (idx + 1) % PLATFORM_OFFERS.length), 4000);
                      }}
                      className={`rounded-full transition-all ${i === carouselIndex ? 'w-5 h-2 bg-green-600' : 'w-2 h-2 bg-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* ══ FLASH ANNONCES ══ */}
            {config.flashAnnouncements && config.flashAnnouncements
              .filter(ann => ann.active && (ann.target === 'ALL' || ann.target === 'PROVIDER'))
              .map(ann => (
                <div
                  key={ann.id}
                  className={cn(
                    "px-4 py-3.5 rounded-2xl border text-xs font-semibold flex items-start gap-3",
                    ann.type === 'promo' ? "bg-amber-50 border-amber-200 text-amber-800" :
                    ann.type === 'flash' ? "bg-red-50 border-red-200 text-red-700" :
                    "bg-green-50 border-green-200 text-green-700"
                  )}
                >
                  <span className="text-base shrink-0">📢</span>
                  <p className="leading-relaxed">{ann.text}</p>
                </div>
              ))}

            {/* ══ ALERTE ABONNEMENT ══ */}
            {!isSubscribed && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl p-4 border flex items-center justify-between gap-3",
                  subscriptionRequired ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    subscriptionRequired ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  )}>
                    {subscriptionRequired ? <Lock size={16} /> : <Gift size={16} />}
                  </div>
                  <div>
                    <p className={cn("font-bold text-sm leading-none mb-1",
                      subscriptionRequired ? "text-red-700" : "text-amber-700"
                    )}>
                      {subscriptionRequired ? "Abonnement requis" : "Accès gratuit de départ"}
                    </p>
                    <p className={cn("text-xs", subscriptionRequired ? "text-red-600" : "text-amber-600")}>
                      {subscriptionRequired
                        ? `3 accès épuisés — souscrivez pour continuer.`
                        : `${freeOffersLeft} offre(s) gratuite(s) restante(s).`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSubscriptionModal(true)}
                  className={cn(
                    "shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition active:scale-95",
                    subscriptionRequired ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                  )}
                >
                  {subscriptionRequired ? "Activer" : "Voir"}
                </button>
              </motion.div>
            )}

            {/* ══ MISSIONS DISPONIBLES ══ */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900 text-base">Missions disponibles</p>
                <span className={cn(
                  "text-[11px] font-bold px-3 py-1 rounded-full",
                  availableMissions.length > 0 ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400"
                )}>
                  {availableMissions.length}
                </span>
              </div>

              {availableMissions.length > 0 ? (
                <div className="-mx-4 px-4 overflow-x-auto no-scrollbar">
                  <div className="flex gap-3 w-max pb-1">
                    {availableMissions.map((m) => {
                      const Icon = SERVICE_ICONS[m.category];
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="w-60 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden shrink-0"
                        >
                          <div className={cn("h-24 flex items-center justify-center relative bg-gradient-to-br", CATEGORY_GRADIENTS[m.category])}>
                            <Icon size={36} className="text-white/80" />
                            {m.bonus && m.bonus > 0 && (
                              <span className="absolute top-2 right-2 bg-amber-400 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                +{m.bonus.toLocaleString()} F bonus
                              </span>
                            )}
                            <span className="absolute bottom-2 left-2 bg-black/35 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
                              {m.durationHours ? `${m.durationHours}h` : 'Variable'}
                            </span>
                          </div>
                          <div className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 text-sm truncate">{m.category}</p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <MapPin size={10} className="text-green-500 shrink-0" />
                                  <p className="text-[10px] text-gray-400 truncate">{m.location}</p>
                                </div>
                              </div>
                              <p className="font-bold text-green-600 text-sm shrink-0">{m.providerAmount.toLocaleString()} F</p>
                            </div>
                            <p className="text-[10px] text-gray-500 line-clamp-2">{m.description}</p>
                            <button
                              disabled={hasActiveMission}
                              onClick={() => handleAcceptMission(m.id)}
                              className={cn(
                                "w-full py-2.5 rounded-xl font-semibold text-xs transition active:scale-[0.98]",
                                hasActiveMission
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-green-600 text-white shadow-[0_3px_10px_rgba(22,163,74,0.25)]"
                              )}
                            >
                              {hasActiveMission ? "Mission en cours…" : "Accepter"}
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 py-12 text-center">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Zap size={24} className="text-gray-200" />
                  </div>
                  <p className="text-gray-400 font-medium text-sm">Aucune mission disponible</p>
                  <p className="text-gray-300 text-xs mt-1">Les nouvelles missions apparaissent ici en temps réel</p>
                </div>
              )}
            </section>

            {/* ══ TEASER FORMATION ══ */}
            {config.enableTrainingSection && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full text-left overflow-hidden rounded-2xl relative shadow-sm"
                style={{ background: 'linear-gradient(135deg, #14532d 0%, #15803d 50%, #16a34a 100%)' }}
              >
                {/* Pattern déco */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full" />
                  <div className="absolute right-8 bottom-2 w-20 h-20 bg-white/5 rounded-full" />
                  <div className="absolute left-1/2 top-0 w-px h-full bg-white/5" />
                </div>
                <div className="relative z-10 p-4 h-28 flex flex-col justify-between">
                  <div className="flex gap-2">
                    <span className="bg-white/15 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full">🎓 Formations</span>
                    <span className="bg-amber-400/20 text-amber-200 text-[10px] font-semibold px-2.5 py-1 rounded-full">Certifications</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <h4 className="text-white font-bold text-sm">Académie Servi+</h4>
                      <p className="text-white/60 text-xs mt-0.5">Vidéos & tests dans l'app</p>
                    </div>
                    <div className="bg-white text-green-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                      Voir <ChevronRight size={12} />
                    </div>
                  </div>
                </div>
              </motion.button>
            )}

            {/* ACADÉMIE & FORMATIONS */}
            {config.enableTrainingSection && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-base font-bold text-gray-900">🎓 Académie Servi+</p>
                    <p className="text-xs text-gray-400 mt-0.5">Formations et certifications — vidéos dans l'app</p>
                  </div>
                  <span className="bg-green-50 text-green-700 text-[10px] font-semibold px-2.5 py-1 rounded-full border border-green-100">
                    Gratuit
                  </span>
                </div>

                {config.trainingContent && config.trainingContent.filter(item => item.target === 'PROVIDER').map((item) => {
                  const isDone = quizDone[item.id];
                  return (
                    <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      <div className={cn("h-1 w-full", isDone ? "bg-emerald-500" : "bg-green-400")} />
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2.5 py-1 rounded-full">
                            {item.category || "Général"}
                          </span>
                          {item.type === 'test' && (
                            <span className={cn(
                              "text-[10px] font-bold px-2.5 py-1 rounded-full",
                              isDone ? "bg-emerald-50 text-emerald-600" : "bg-green-50 text-green-700"
                            )}>
                              {isDone ? "✓ Certifié" : "Test d'Aptitude"}
                            </span>
                          )}
                        </div>

                        <div>
                          <h5 className="font-bold text-sm text-gray-900 leading-tight">{item.title}</h5>
                          <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">{item.description}</p>
                        </div>

                        {item.type === 'video' && item.url && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Vidéo</span>
                              <button
                                type="button"
                                onClick={() => setCollapsedVideos(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 flex items-center gap-1 active:opacity-70"
                              >
                                {collapsedVideos[item.id] ? <>Afficher <ChevronRight size={12} className="rotate-90" /></> : <>Réduire <ChevronRight size={12} className="-rotate-90" /></>}
                              </button>
                            </div>
                            {!collapsedVideos[item.id] && (
                              <div className="rounded-2xl overflow-hidden bg-gray-900" style={{ aspectRatio: '16/9' }}>
                                {/youtube\.com|youtu\.be/i.test(item.url) ? (
                                  <iframe
                                    src={item.url}
                                    title={item.title}
                                    className="w-full h-full border-none"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <video
                                    src={item.url}
                                    controls
                                    className="w-full h-full object-cover"
                                    preload="metadata"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {item.type === 'image' && item.url && (
                          <div className="relative h-40 rounded-xl overflow-hidden">
                            <img src={item.url} className="w-full h-full object-cover" alt={item.title} referrerPolicy="no-referrer" />
                          </div>
                        )}

                        {item.type === 'test' && item.questions && item.questions.length > 0 && (
                          <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 space-y-3">
                            {isDone ? (
                              <div className="text-center py-3 space-y-1.5">
                                <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                                  <CheckCircle size={20} className="text-emerald-600" />
                                </div>
                                <p className="text-sm font-bold text-gray-900">Évaluation réussie !</p>
                                <p className="text-[11px] text-emerald-600 font-medium">Badge d'Aptitude acquis sur votre profil</p>
                                <button
                                  type="button"
                                  onClick={() => setQuizDone(prev => ({ ...prev, [item.id]: false }))}
                                  className="text-[11px] text-red-500 font-semibold mt-1"
                                >
                                  Recommencer
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {item.questions.map((q, qIdx) => {
                                  const currentSelect = quizResponses[item.id]?.[qIdx];
                                  const isCorrect = currentSelect === q.answerIdx;
                                  return (
                                    <div key={qIdx} className="space-y-2">
                                      <p className="text-xs font-bold text-gray-800">Q{qIdx + 1}: {q.question}</p>
                                      <div className="space-y-1.5">
                                        {q.options.map((opt, optIdx) => {
                                          const isChosen = currentSelect === optIdx;
                                          return (
                                            <button
                                              key={optIdx}
                                              type="button"
                                              onClick={() => setQuizResponses(prev => ({
                                                ...prev,
                                                [item.id]: { ...(prev[item.id] || {}), [qIdx]: optIdx }
                                              }))}
                                              className={cn(
                                                "w-full text-left p-3 rounded-xl text-[11px] font-medium border transition-all",
                                                isChosen
                                                  ? "bg-green-600 border-green-600 text-white"
                                                  : "bg-white border-gray-200 text-gray-600"
                                              )}
                                            >
                                              {optIdx + 1}. {opt}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      {currentSelect !== undefined && (
                                        <p className={cn("text-[10px] font-bold ml-1", isCorrect ? "text-emerald-600" : "text-red-500")}>
                                          {isCorrect ? "✓ Correct" : "✗ Incorrect"}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const resp = quizResponses[item.id] || {};
                                    const allCorrect = item.questions!.every((q, idx) => resp[idx] === q.answerIdx);
                                    if (allCorrect) {
                                      setQuizDone(prev => ({ ...prev, [item.id]: true }));
                                    } else {
                                      alert("Certaines réponses sont incorrectes ou manquantes.");
                                    }
                                  }}
                                  className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold text-sm active:scale-95 transition hover:bg-green-700"
                                >
                                  Soumettre mes réponses
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'missions' && (
          <motion.div
            key="missions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between pt-1">
              <h2 className="font-bold text-gray-900 text-lg">Mes missions <span className="text-gray-400 font-medium">({myMissions.length})</span></h2>
              <span className={cn(
                "text-[11px] font-semibold px-3 py-1 rounded-full",
                myMissions.some(m => m.status === MissionStatus.IN_PROGRESS)
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-400"
              )}>
                {myMissions.some(m => m.status === MissionStatus.IN_PROGRESS) ? "En cours" : "Historique"}
              </span>
            </div>

            <div className="space-y-3">
              {myMissions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Briefcase size={24} className="text-gray-200" />
                  </div>
                  <p className="text-gray-400 font-medium text-sm">Aucune mission acceptée</p>
                  <p className="text-gray-300 text-xs mt-1">Acceptez des missions depuis l'onglet Accueil</p>
                </div>
              ) : (
                myMissions.map(m => (
                  <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Status strip */}
                    <div className={cn(
                      "h-1 w-full",
                      m.status === MissionStatus.COMPLETED ? "bg-emerald-500" :
                      m.status === MissionStatus.IN_PROGRESS ? "bg-green-500" :
                      "bg-amber-400"
                    )} />

                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br", CATEGORY_GRADIENTS[m.category])}>
                            {React.createElement(SERVICE_ICONS[m.category] || Briefcase, { size: 18 })}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm leading-none">{m.category}</p>
                            <span className={cn(
                              "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1",
                              m.status === MissionStatus.COMPLETED ? "bg-emerald-100 text-emerald-700" :
                              m.status === MissionStatus.IN_PROGRESS ? "bg-green-100 text-green-700" :
                              "bg-amber-100 text-amber-700"
                            )}>
                              {m.status === MissionStatus.COMPLETED ? "Terminée" :
                               m.status === MissionStatus.IN_PROGRESS ? "En cours" : "Acceptée"}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-gray-900 text-base">{m.providerAmount.toLocaleString()} F</p>
                          <p className="text-[10px] text-gray-400">💵 Espèces</p>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-[11px] text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100 leading-relaxed line-clamp-3">
                        {m.description}
                      </p>

                      {/* Meta: location + durée */}
                      <div className="flex items-center gap-4 text-[11px] text-gray-400 font-medium">
                        <div className="flex items-center gap-1"><MapPin size={11} className="text-green-500 shrink-0"/><span className="truncate">{m.location}</span></div>
                        {m.durationHours && <div className="flex items-center gap-1 shrink-0"><Clock size={11} className="text-green-500"/>{m.durationHours}h</div>}
                      </div>

                      {/* Contact client */}
                      <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm text-green-700 border border-green-100 font-bold text-xs shrink-0">
                            {m.clientName ? m.clientName.charAt(0).toUpperCase() : "C"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-green-600 font-medium leading-none">Client commanditaire</p>
                            <p className="font-bold text-gray-800 text-xs truncate mt-0.5">{m.clientName}</p>
                            {m.clientPhone && <p className="text-green-700 text-xs font-semibold mt-0.5 select-all">{m.clientPhone}</p>}
                          </div>
                        </div>
                        {m.clientPhone && (
                          <a
                            href={`tel:${m.clientPhone}`}
                            className="bg-green-600 hover:bg-green-700 text-white w-9 h-9 rounded-xl flex items-center justify-center transition shadow-sm active:scale-95 shrink-0"
                          >
                            <PhoneCall size={15} />
                          </a>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        {/* Extension heures */}
                        {config.enableHourExtension && m.status === MissionStatus.IN_PROGRESS && m.extensionStatus === 'PENDING' && (
                          <div className="bg-green-600 rounded-2xl p-4 text-white space-y-3">
                            <div className="flex items-start gap-2">
                              <span className="text-lg">⚡</span>
                              <div>
                                <p className="text-xs font-semibold text-green-200">Demande de prolongation</p>
                                <p className="text-sm font-bold mt-0.5">+{m.extendedDurationHours}h · <span className="text-amber-300">+{m.extendedTotalPrice?.toLocaleString()} F</span></p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button type="button" onClick={(e) => { e.stopPropagation(); onAnswerExtension?.(m.id, true); }}
                                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition active:scale-95">
                                Accepter
                              </button>
                              <button type="button" onClick={(e) => { e.stopPropagation(); onAnswerExtension?.(m.id, false); }}
                                className="flex-1 py-2.5 bg-green-800 text-green-200 font-bold text-xs rounded-xl transition active:scale-95">
                                Refuser
                              </button>
                            </div>
                          </div>
                        )}

                        {(m.status === MissionStatus.ACCEPTED || m.status === MissionStatus.IN_PROGRESS) && (
                          <div className="flex gap-2">
                            {m.status === MissionStatus.ACCEPTED && (
                              <button
                                onClick={() => onUpdateMissionStatus(m.id, MissionStatus.IN_PROGRESS)}
                                className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm transition active:scale-[0.98] hover:bg-gray-800"
                              >
                                Démarrer
                              </button>
                            )}
                            <button
                              onClick={() => {
                                onUpdateMissionStatus(m.id, MissionStatus.COMPLETED);
                                setRatingClientMission(m);
                                setClientRatingValue(5);
                                setClientRatingComment('');
                              }}
                              className="flex-1 bg-emerald-600 text-white py-3 rounded-xl font-semibold text-sm transition active:scale-[0.98] hover:bg-emerald-700 flex items-center justify-center gap-1.5"
                            >
                              💵 Payer & noter
                            </button>
                          </div>
                        )}

                        {(m.status === MissionStatus.ACCEPTED || m.status === MissionStatus.IN_PROGRESS) && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRefusalTargetMissionId(m.id)}
                              className="flex-1 bg-red-50 text-red-600 py-2.5 rounded-xl font-medium text-sm border border-red-100 hover:bg-red-100 transition active:scale-[0.98] flex items-center justify-center gap-1.5"
                            >
                              ✕ Refuser
                            </button>
                            <button
                              onClick={() => setViewingMission(m)}
                              className="w-11 bg-green-50 text-green-600 rounded-xl border border-green-100 hover:bg-green-100 transition flex items-center justify-center"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        )}

                      {m.status === MissionStatus.COMPLETED && (
                        <div className="space-y-3 mt-1">
                          {/* Rating details left by the provider for the client */}
                          {!m.providerRating ? (
                            <div className="bg-amber-50/60 border border-amber-200/60 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in text-left">
                              <div>
                                <p className="text-[9px] font-bold uppercase text-amber-900 leading-none">⭐ Évaluation du client en attente</p>
                                <p className="text-[10px] text-gray-600 font-bold mt-1">Prenez un instant pour évaluer {m.clientName || 'le client'} après son paiement d'espèces.</p>
                              </div>
                              <button 
                                onClick={() => {
                                  setRatingClientMission(m);
                                  setClientRatingValue(5);
                                  setClientRatingComment('');
                                }}
                                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 py-2.5 text-[9px] uppercase tracking-wider rounded-xl transition active:scale-95 shrink-0"
                              >
                                Noter le client
                              </button>
                            </div>
                          ) : (
                            <div className="bg-gray-50 border border-gray-100/60 p-4 rounded-2xl text-left">
                              <p className="text-[9px] font-bold uppercase text-gray-400">✨ Votre évaluation pour le client {m.clientName}</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="flex text-amber-400">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} size={12} className={cn("fill-current", s <= (m.providerRating || 0) ? "text-amber-400" : "text-gray-200 fill-none")} />
                                  ))}
                                </div>
                                <span className="text-[10px] font-bold text-gray-700">{m.providerRating}/5</span>
                              </div>
                              {m.providerComment && (
                                <p className="text-xs text-gray-500 font-medium italic mt-1 bg-white p-2 border border-gray-100 rounded-lg">
                                  "{m.providerComment}"
                                </p>
                              )}
                            </div>
                          )}

                          {/* Mutual rating left by the client for this provider */}
                          {m.clientRating && (
                            <div className="bg-green-50/50 border border-green-100 p-4 rounded-2xl text-left animate-fade-in">
                              <p className="text-[9px] font-bold uppercase text-green-600">💬 Évaluation laissée par {m.clientName || "le client"} à votre égard</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="flex text-amber-400">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Star key={s} size={12} className={cn("fill-current", s <= (m.clientRating || 0) ? "text-amber-500" : "text-gray-200 fill-none")} />
                                  ))}
                                </div>
                                <span className="text-[10px] font-bold text-green-800">{m.clientRating}/5</span>
                              </div>
                              {m.clientComment && (
                                <p className="text-xs text-gray-600 font-medium italic mt-1 p-2 bg-white rounded-lg border border-green-100/40">
                                  "{m.clientComment}"
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex justify-end">
                            <button 
                              onClick={() => setViewingMission(m)}
                              className="bg-gray-50 border border-gray-200 text-gray-500 py-3 px-5 rounded-xl active:scale-90 transition inline-flex items-center gap-2 text-xs font-bold uppercase font-sans"
                            >
                              <Eye size={16} /> Voir les coordonnées
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                ))
              )}
            </div>

            {/* ══ OFFRES REFUSÉES ══ */}
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-red-400 shrink-0" />
                <p className="font-bold text-gray-900 text-base">Offres refusées</p>
                {refusedMissions.length > 0 && (
                  <span className="ml-auto text-[11px] font-semibold px-3 py-1 rounded-full bg-red-50 text-red-500">
                    {refusedMissions.length}
                  </span>
                )}
              </div>

              {refusedMissions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center">
                  <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <Check size={22} className="text-green-500" />
                  </div>
                  <p className="text-base font-bold text-gray-900 mb-1">Aucune offre refusée</p>
                  <p className="text-sm text-gray-600 leading-relaxed px-6">Toutes vos offres ont été honorées.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {refusedMissions.map(m => (
                    <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 bg-gradient-to-br", CATEGORY_GRADIENTS[m.category])}>
                          {React.createElement(SERVICE_ICONS[m.category] || Briefcase, { size: 18 })}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm leading-none truncate">{m.category}</p>
                          <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{m.clientName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-green-600">{m.providerAmount.toLocaleString()} F</p>
                          <p className="text-xs text-gray-400">{new Date(m.date).toLocaleDateString('fr-FR')}</p>
                        </div>
                      </div>
                      {m.refusalReason && (
                        <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                          <p className="text-xs text-gray-400 leading-relaxed">
                            <span className="font-bold text-red-500">Motif : </span>
                            {m.refusalReason}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </motion.div>
        )}

        {activeTab === 'wallet' && (
          <motion.div
            key="wallet"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* ── ZONE VERTE (titre + carte compte) ── */}
            <div className="-mx-4 bg-gradient-to-b from-green-600 to-green-500 pt-[calc(env(safe-area-inset-top)+16px)] pb-6 px-5 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/8 rounded-full" />

              {/* Top bar */}
              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <img src="/servi_logo.png" alt="Servi+" className="h-6 w-auto object-contain" style={{ mixBlendMode: 'multiply' }} />
                  <span className="text-white/70 text-xs font-medium">Portefeuille</span>
                </div>
                <TrendingUp size={20} className="text-white/60" />
              </div>

              {/* Carte compte style bancaire */}
              <div className="relative z-10 bg-green-700/50 backdrop-blur-sm border border-white/15 rounded-3xl p-4">
                <div className="flex items-start justify-between mb-1">
                  <p className="text-green-200 text-[10px] font-semibold uppercase tracking-wider">Compte prestataire</p>
                  <div className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold",
                    isSubscribed ? "bg-emerald-400/20 text-emerald-200" : "bg-red-400/20 text-red-200"
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isSubscribed ? "bg-emerald-400" : "bg-red-400")} />
                    {isSubscribed ? "Abonnement actif" : "Non abonné"}
                  </div>
                </div>

                <p className="text-white text-3xl font-bold mt-2 tracking-tight">
                  {finances.totalEarnings.toLocaleString()}
                  <span className="text-base text-green-200 font-medium ml-1.5">F CFA</span>
                </p>
                <p className="text-green-200/70 text-xs mt-0.5">Gains totaux</p>

                {/* 3 stats */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
                  {[
                    { label: 'Revenus', value: finances.totalEarnings.toLocaleString() + ' F' },
                    { label: 'Missions', value: String(myMissions.filter(m => m.status === MissionStatus.COMPLETED).length) },
                    { label: 'Commission', value: '0%' },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-white font-bold text-xs leading-none">{value}</p>
                      <p className="text-green-200/70 text-[9px] mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions rapides portefeuille */}
              <div className="relative z-10 grid grid-cols-4 gap-2 mt-4">
                {[
                  { icon: <DollarSign size={18} />, label: 'Recevoir', onClick: () => {} },
                  { icon: <Send size={18} />,        label: 'Retirer',  onClick: () => setShowWithdrawalModal(true) },
                  { icon: <CreditCard size={18} />,  label: 'Payer',    onClick: () => {} },
                  { icon: <MoreHorizontal size={18} />, label: 'Plus',  onClick: () => {} },
                ].map(({ icon, label, onClick }) => (
                  <button key={label} onClick={onClick} className="flex flex-col items-center gap-1.5 active:scale-95 transition">
                    <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center text-white border border-white/10">
                      {icon}
                    </div>
                    <span className="text-white/80 text-[9px] font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── HISTORIQUE DES TRANSACTIONS ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-900 text-base">Historique</p>
                <button className="text-xs text-green-600 font-semibold flex items-center gap-0.5">
                  Tout voir <ChevronRight size={13} />
                </button>
              </div>

              {transactions && transactions.length > 0 ? (
                <div className="space-y-1">
                  {transactions.filter(t => t.userId === currentUser.id).slice(0, 6).map((tx: Transaction) => (
                    <div key={tx.id} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                      <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center shrink-0">
                        <DollarSign size={16} className="text-green-600" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{tx.type === 'INCOME' ? 'Paiement reçu' : 'Retrait'}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{tx.date}</p>
                      </div>
                      <p className="font-bold text-green-600 text-sm shrink-0">+{tx.amount.toLocaleString()} F</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                    <Wallet size={20} className="text-gray-300" />
                  </div>
                  <p className="text-gray-400 text-sm font-medium">Aucune transaction</p>
                  <p className="text-gray-300 text-xs mt-0.5">Vos gains apparaissent ici</p>
                </div>
              )}
            </div>

            {/* ── ABONNEMENT SERVI+ PRO ── */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">

              {/* Header dégradé */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-4 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-2xl">🚀</span>
                      <p className="text-white font-bold text-base">Servi+ Pro</p>
                    </div>
                    <p className="text-green-100 text-xs">Plus de missions, zéro commission</p>
                  </div>
                  {isSubscribed ? (
                    <span className="bg-white text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Check size={10} /> Actif
                    </span>
                  ) : (
                    <span className="bg-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full border border-white/30">
                      Inactif
                    </span>
                  )}
                </div>

                {/* Avantages */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/15">
                  {[
                    { icon: '💰', label: '0% commission' },
                    { icon: '⭐', label: 'Badge Pro' },
                    { icon: '📈', label: 'Priorité' },
                  ].map(b => (
                    <div key={b.label} className="text-center">
                      <span className="text-base">{b.icon}</span>
                      <p className="text-white/80 text-[9px] mt-0.5 font-medium">{b.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="bg-white p-4 space-y-4">

                {isSubscribed && currentUser.subscriptionExpiresAt && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 flex items-center gap-2">
                    <Check size={14} className="text-green-600 shrink-0" />
                    <p className="text-green-700 text-xs font-semibold">
                      Abonnement actif jusqu'au {new Date(currentUser.subscriptionExpiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                )}

                {/* Choix formule */}
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">Choisissez votre formule</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'monthly', label: 'Mensuel', price: '10 000', period: '/mois', badge: null },
                      { id: 'annual',  label: 'Annuel',  price: '80 000', period: '/an',   badge: '−33%' },
                    ].map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedSubPeriod(p.id as 'monthly' | 'annual')}
                        className={cn(
                          "relative rounded-2xl border-2 p-3 text-left transition-all",
                          selectedSubPeriod === p.id ? "border-green-500 bg-green-50" : "border-gray-100 bg-gray-50"
                        )}
                      >
                        {p.badge && (
                          <span className="absolute -top-2 right-2 bg-amber-400 text-amber-900 text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            {p.badge}
                          </span>
                        )}
                        <p className={cn("text-xs font-bold", selectedSubPeriod === p.id ? "text-green-700" : "text-gray-500")}>
                          {p.label}
                        </p>
                        <p className={cn("text-lg font-bold leading-tight mt-0.5", selectedSubPeriod === p.id ? "text-green-600" : "text-gray-800")}>
                          {p.price} <span className="text-xs font-normal text-gray-400">F{p.period}</span>
                        </p>
                        {selectedSubPeriod === p.id && (
                          <Check size={12} className="text-green-500 absolute bottom-2 right-2" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opérateur */}
                <div>
                  <p className="text-xs font-bold text-gray-500 mb-2">Moyen de paiement</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'orange', label: 'Orange', emoji: '🍊', active: 'bg-orange-500 border-orange-500 text-white' },
                      { id: 'mtn',    label: 'MTN',    emoji: '⚡', active: 'bg-yellow-500 border-yellow-500 text-white' },
                      { id: 'wave',   label: 'Wave',   emoji: '🌊', active: 'bg-blue-400 border-blue-400 text-white' },
                    ].map(op => (
                      <button
                        key={op.id}
                        type="button"
                        onClick={() => setSelectedOM(op.id as 'orange' | 'mtn' | 'wave')}
                        className={cn(
                          "py-2.5 rounded-xl text-xs font-semibold border transition-all text-center",
                          selectedOM === op.id ? op.active : "bg-gray-50 border-gray-200 text-gray-500"
                        )}
                      >
                        <span className="block text-base">{op.emoji}</span>
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Numéro */}
                <input
                  type="tel"
                  placeholder="Numéro Mobile Money (ex: 07 07 07 07 07)"
                  value={phoneForMoMo}
                  onChange={(e) => setPhoneForMoMo(e.target.value)}
                  className="input"
                />

                {/* CTA */}
                <button
                  type="button"
                  disabled={isSubscribing}
                  onClick={async () => {
                    if (!phoneForMoMo.trim()) { alert("Veuillez saisir votre numéro Mobile Money."); return; }
                    setIsSubscribing(true);
                    try {
                      const amount = selectedSubPeriod === 'monthly' ? 10000 : 80000;
                      const operatorMap: Record<string, string> = { orange: 'Orange Money', mtn: 'MTN MoMo', wave: 'Wave' };
                      const jekoResult = await initiateSubscriptionPayment({
                        subscriptionRef: `SUB-${currentUser.id}-${Date.now()}`,
                        amountXof: amount,
                        operator: operatorMap[selectedOM] ?? 'Wave',
                        payerPhone: phoneForMoMo,
                      });
                      openCheckout(jekoResult.checkoutUrl);
                      const durationDays = selectedSubPeriod === 'monthly' ? 30 : 365;
                      const expirationDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
                      onUpdateUser({ isSubscribed: true, subscriptionExpiresAt: expirationDate.toISOString() });
                    } catch (err: any) {
                      alert(`Erreur de paiement : ${err.message}`);
                    } finally {
                      setIsSubscribing(false);
                    }
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 rounded-xl text-sm transition flex items-center justify-center gap-2 active:scale-[0.98] shadow-[0_4px_14px_rgba(22,163,74,0.25)] disabled:opacity-60"
                >
                  {isSubscribing ? (
                    <><Loader2 className="animate-spin" size={16} /> Ouverture du paiement…</>
                  ) : (
                    <><CreditCard size={16} />{selectedSubPeriod === 'monthly' ? "S'abonner — 10 000 F / mois" : "S'abonner — 80 000 F / an"}</>
                  )}
                </button>

                <p className="text-center text-[10px] text-gray-400">
                  Paiement via Jèko · Sans engagement
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 pb-6"
          >
            {/* EN-TÊTE PROFIL — hero vert avec avatar */}
            <div className="-mx-4 bg-gradient-to-br from-green-600 to-green-700 pt-6 pb-14 px-5 relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-36 h-36 bg-white/10 rounded-full" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=15803d&color=fff`}
                    alt="Avatar"
                    className="w-16 h-16 rounded-2xl border-2 border-white/30 object-cover shadow-lg"
                  />
                  {currentUser.verified && (
                    <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white w-5 h-5 rounded-full flex items-center justify-center border-2 border-green-600">
                      <CheckCircle size={10} />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-white text-xl font-bold leading-tight">{currentUser.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="bg-white/20 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">Prestataire</span>
                    <span className="text-white/60 text-xs">{currentUser.city || 'Abidjan'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STATS — overlap */}
            <div className="-mt-7 mx-1 bg-white rounded-2xl shadow-lg shadow-green-900/10 border border-gray-100 grid grid-cols-3 divide-x divide-gray-100 overflow-hidden relative z-10">
              {[
                { label: "Missions", value: String(myMissions.length) },
                { label: "Note", value: currentUser.rating ? currentUser.rating.toFixed(1) + " ★" : "—" },
                { label: "Gains F", value: (finances.totalEarnings / 1000).toFixed(0) + "K" },
              ].map(({ label, value }) => (
                <div key={label} className="py-3.5 px-2 text-center">
                  <p className="font-bold text-gray-900 text-sm leading-none">{value}</p>
                  <p className="text-gray-400 text-[10px] font-medium mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* FORMULAIRE */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Informations personnelles</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Nom complet</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                    className="input"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Numéro de téléphone</label>
                  <input
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    className="input"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1.5">Ville</label>
                  <div className="relative">
                    <select
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                      className="input appearance-none"
                    >
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</span>
                  </div>
                </div>

                {profileForm.city === 'Abidjan' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1.5">
                      Commune <span className="text-green-600 font-bold">📍</span>
                    </label>
                    <div className="relative">
                      <select
                        value={currentUser.zone || ''}
                        onChange={(e) => onUpdateUser({ zone: e.target.value })}
                        className="input appearance-none"
                      >
                        <option value="">— Choisir votre commune —</option>
                        {ABIDJAN_ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                      </select>
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">Permet d'afficher les offres et missions de votre zone</p>
                  </div>
                )}
              </div>
            </div>

            {/* MOT DE PASSE */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sécurité</p>
                {!isChangingPassword && (
                  <button
                    type="button"
                    onClick={() => setIsChangingPassword(true)}
                    className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-full border border-green-100"
                  >
                    Modifier
                  </button>
                )}
              </div>

              {!isChangingPassword ? (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-3 border border-gray-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Mot de passe</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">••••••••••• masqué</p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100">Sécurisé</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showProfilePassword ? "text" : "password"}
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="Mot de passe actuel"
                      className="input pr-11"
                    />
                    <button type="button" onClick={() => setShowProfilePassword(!showProfilePassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showProfilePassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Nouveau mot de passe (min. 6 car.)"
                    className="input"
                  />
                  <input
                    type="password"
                    value={confirmNewPasswordInput}
                    onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                    placeholder="Confirmer le nouveau mot de passe"
                    className="input"
                  />
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => { setIsChangingPassword(false); setCurrentPasswordInput(''); setNewPasswordInput(''); setConfirmNewPasswordInput(''); }}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-semibold text-sm">
                      Annuler
                    </button>
                    <button type="button"
                      onClick={() => {
                        if (!currentPasswordInput || !newPasswordInput || !confirmNewPasswordInput) { alert("Veuillez remplir tous les champs."); return; }
                        if (currentPasswordInput !== currentUser.password) { alert("Mot de passe actuel incorrect."); return; }
                        if (newPasswordInput.length < 6) { alert("Minimum 6 caractères."); return; }
                        if (newPasswordInput !== confirmNewPasswordInput) { alert("Les mots de passe ne correspondent pas."); return; }
                        onUpdateUser({ password: newPasswordInput });
                        setIsChangingPassword(false);
                        setCurrentPasswordInput(''); setNewPasswordInput(''); setConfirmNewPasswordInput('');
                        alert("Mot de passe mis à jour !");
                      }}
                      className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm">
                      Valider
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* COMPÉTENCES */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Compétences de service</p>
              <div className="flex flex-wrap gap-2">
                {Object.values(ServiceCategory).filter(s => s !== ServiceCategory.MARKET).map(s => {
                  const active = editedServices.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => active ? setEditedServices(editedServices.filter(i => i !== s)) : setEditedServices([...editedServices, s])}
                      className={cn(
                        "px-3 py-2 rounded-xl text-[11px] font-semibold border transition-all",
                        active ? "bg-green-600 text-white border-green-600 shadow-sm" : "bg-gray-50 text-gray-500 border-gray-200"
                      )}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SAUVEGARDER */}
            <button
              onClick={() => {
                if (editedServices.length === 0) { alert("Choisissez au moins une compétence."); return; }
                onUpdateUser({ name: profileForm.name, phone: profileForm.phone, city: profileForm.city, zone: currentUser.zone, services: editedServices });
                setShowProfileSuccessModal(true);
                setTimeout(() => { setShowProfileSuccessModal(false); if (setActiveTab) setActiveTab('home'); }, 2500);
              }}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3.5 rounded-xl text-sm transition active:scale-[0.98] shadow-[0_4px_14px_rgba(22,163,74,0.25)] flex items-center justify-center gap-2"
            >
              <CheckCircle size={16} /> Sauvegarder les modifications
            </button>

            {/* SUPPRESSION DE COMPTE */}
            {onDeleteAccount && (
              <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center space-y-3">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Pour supprimer définitivement votre compte prestataire et toutes vos données.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirmModal(true)}
                  className="px-5 py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold text-xs border border-red-100 transition hover:bg-red-100"
                >
                  Se désinscrire de la plateforme
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILED INFORMATION MODAL INCLUDING GPS LINK & ACTIVE CLIENT DETAILS */}
      <AnimatePresence>
        {viewingMission && (
          <div className="fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] p-8 w-full max-w-sm shadow-2xl relative space-y-6"
            >
              <button 
                onClick={() => setViewingMission(null)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>

              <div className="flex gap-4 items-center border-b border-gray-100 pb-4">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg bg-gradient-to-br", CATEGORY_GRADIENTS[viewingMission.category])}>
                  {React.createElement(SERVICE_ICONS[viewingMission.category] || Briefcase, { size: 22 })}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 uppercase text-sm leading-tight">{viewingMission.category}</h4>
                  <p className="text-[8.5px] font-bold text-green-500 uppercase tracking-widest mt-0.5">Détails de localisation & contact</p>
                </div>
              </div>

              {/* GPS Coordinates & Address Information */}
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-150">
                <h5 className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">🏠 Adresse du domicile à Abidjan</h5>
                <p className="text-xs font-bold text-gray-800">{viewingMission.location}</p>
                
                {viewingMission.latitude && viewingMission.longitude ? (
                  <div className="pt-2 space-y-2">
                    <p className="text-[9px] text-gray-500 font-mono">
                      GPS : Lat {viewingMission.latitude.toFixed(6)} / Lng {viewingMission.longitude.toFixed(6)}
                    </p>
                    
                    {/* Real Open in external Google Maps routing button */}
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${viewingMission.latitude},${viewingMission.longitude}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-[9px] uppercase tracking-widest p-2 rounded-lg flex items-center justify-center gap-1.5 transition shadow"
                    >
                      <ExternalLink size={11} /> Ouvrir Google Maps d'Abidjan
                    </a>
                  </div>
                ) : (
                  <p className="text-[9px] text-amber-600 font-bold uppercase">Aucune coordonnée GPS enregistrée</p>
                )}
              </div>

              {viewingMission.bonus && viewingMission.bonus > 0 && (
                <div className="space-y-1 bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <h5 className="text-[9px] font-bold uppercase text-amber-800 tracking-wider">🎁 Bonus Spécial (Intégré)</h5>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-amber-900">Incentive trajet/accès :</span>
                    <span className="bg-amber-600 text-white font-bold py-1 px-2.5 rounded-full text-[10px] leading-none shrink-0 animate-pulse">+{viewingMission.bonus.toLocaleString()} F CFA</span>
                  </div>
                </div>
              )}

              {/* Client Info inside modal */}
              {viewingMission.providerId === currentUser.id ? (
                <div className="space-y-2 bg-green-50/50 p-4 rounded-xl border border-green-100">
                  <h5 className="text-[9px] font-bold uppercase text-green-500 tracking-wider">📞 Coordonnées Directes du Client</h5>
                  <div className="flex justify-between items-center text-xs font-sans">
                    <div>
                      <p className="font-bold text-gray-800">{viewingMission.clientName}</p>
                      <p className="font-bold text-green-600 text-[10px] select-all mt-1">{viewingMission.clientPhone || "Non renseigné"}</p>
                    </div>
                    {viewingMission.clientPhone && (
                      <a 
                        href={`tel:${viewingMission.clientPhone}`}
                        className="bg-green-600 text-white p-2.5 rounded-lg transition hover:bg-green-700 shadow"
                      >
                        <PhoneCall size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <h5 className="text-[9px] font-bold uppercase text-gray-400 tracking-wider">👤 Commanditaire de la commande</h5>
                  <div className="flex justify-between items-center text-xs font-sans">
                    <div>
                      <p className="font-bold text-gray-800">{viewingMission.clientName}</p>
                      <p className="font-bold text-gray-400 text-[8.5px] uppercase tracking-wide mt-1">📞 Contact privé (Masqué avant acceptation)</p>
                    </div>
                  </div>
                </div>
              )}

              {viewingMission.providerId === currentUser.id ? (
                <div className="text-[10px] text-gray-400 font-medium leading-normal text-center bg-green-50/50 px-4 py-3 rounded-lg border border-green-100">
                  Vous avez accepté cette offre. Vous pouvez appeler le client directement au <strong>{viewingMission.clientPhone || 'numéro indiqué'}</strong> ou naviguer avec l'itinéraire.
                </div>
              ) : (
                <div className="text-[10px] text-gray-400 font-medium leading-normal text-center bg-green-50/50 px-4 py-3 rounded-lg border border-green-100">
                  Vous pouvez guider votre itinéraire vers l'adresse indiquée. Le numéro de téléphone direct du client vous sera transmis dès que vous aurez accepté l'offre.
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROVIDER MONTHLY SUBSCRIPTION MODAL (10,000 F CFA) */}
      <AnimatePresence>
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white rounded-[3rem] p-8 w-full max-w-sm shadow-2xl relative space-y-6 text-center"
            >
              <button 
                onClick={() => {
                  setShowSubscriptionModal(false);
                  setShowSuccessSubscription(false);
                }}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>

              {showSuccessSubscription ? (
                <div className="space-y-4 py-4 flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2 shadow-inner">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Accès Activé !</h3>
                  <p className="text-gray-500 text-xs font-bold leading-relaxed px-2">
                    Félicitations ! Votre abonnement mensuel Servi+ a été activé avec succès pour <span className="text-emerald-600 font-extrabold">30 jours</span>.
                  </p>
                  <p className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 p-3 rounded-xl uppercase font-bold">
                    Vous avez désormais un accès illimité à 100% des missions d'Abidjan !
                  </p>
                  <button
                    onClick={() => {
                      setShowSubscriptionModal(false);
                      setShowSuccessSubscription(false);
                    }}
                    className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-gray-800 transition active:scale-95 duration-150"
                  >
                    Découvrir les missions d'Abidjan
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 bg-gradient-to-tr from-green-600 to-green-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-green-500/20">
                    <CreditCard size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Abonnement Mensuel</h3>
                    <p className="text-xs text-gray-400 font-bold mt-1">Plateforme Servi+ Abidjan</p>
                  </div>

                  <div className="bg-gray-50 border border-gray-100/60 p-4 rounded-2xl text-left text-xs text-gray-600 space-y-2 font-bold">
                    <p className="text-gray-400 uppercase text-[9px] font-bold tracking-widest leading-none mb-1">Avantages exclusifs :</p>
                    <p className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Accès à TOUTES les missions d'Abidjan</p>
                    <p className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> 0% commissions d'intermédiaire sur vos gains</p>
                    <p className="flex items-center gap-2"><Check size={14} className="text-emerald-500" /> Les clients vous payent à 100% en espèces</p>
                  </div>

                  {/* Operator Choice */}
                  <div className="space-y-2">
                    <p className="text-[9px] text-gray-400 font-bold text-left uppercase tracking-wider pl-1 font-mono">Choisissez votre opérateur :</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOM('orange')}
                        className={cn(
                          "py-2 px-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all text-center",
                          selectedOM === 'orange' ? "bg-orange-500 border-orange-500 text-white font-extrabold shadow" : "bg-gray-50 border-gray-250 text-gray-500"
                        )}
                      >
                        Orange Money 🍊
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOM('mtn')}
                        className={cn(
                          "py-2 px-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all text-center",
                          selectedOM === 'mtn' ? "bg-yellow-500 border-yellow-500 text-white font-extrabold shadow" : "bg-gray-50 border-gray-250 text-gray-500"
                        )}
                      >
                        MTN MoMo ⚡
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOM('wave')}
                        className={cn(
                          "py-2 px-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all text-center",
                          selectedOM === 'wave' ? "bg-blue-400 border-green-400 text-white font-extrabold shadow" : "bg-gray-50 border-gray-250 text-gray-500"
                        )}
                      >
                        Wave 🌊
                      </button>
                    </div>
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-1 text-left font-sans">
                    <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider pl-1 font-mono">Numéro Mobile Money :</label>
                    <input 
                      type="tel"
                      placeholder="Ex: 0707070707"
                      value={phoneForMoMo}
                      onChange={(e) => setPhoneForMoMo(e.target.value)}
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-green-500 transition-all font-mono"
                    />
                  </div>

                  {/* Submit Subscription Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isSubscribing}
                      onClick={async () => {
                        if (!phoneForMoMo.trim()) {
                          alert("Veuillez saisir votre numéro Mobile Money.");
                          return;
                        }
                        setIsSubscribing(true);
                        
                        // Fake loader simulation
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        
                        // Apply the subscription details
                        onUpdateUser({
                          isSubscribed: true,
                          subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                        });
                        
                        setIsSubscribing(false);
                        setShowSuccessSubscription(true);
                      }}
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest transition flex items-center justify-center gap-2 active:scale-95 duration-100 shadow-xl font-sans"
                    >
                      {isSubscribing ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          <span>Validation en cours...</span>
                        </>
                      ) : (
                        <>
                          <span>Activer pour 10 000 F CFA</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PROVIDER REFUSAL JUSTIFICATION MODAL */}
      <AnimatePresence>
        {refusalTargetMissionId && (
          <div className="fixed inset-0 z-50 bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white rounded-[3rem] p-8 w-full max-w-sm shadow-2xl relative space-y-6 text-center"
            >
              <button 
                onClick={() => {
                  setRefusalTargetMissionId(null);
                  setRefusalReasonInput('');
                }}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                <X size={28} />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 uppercase tracking-tight">Justifier le Refus</h3>
                <p className="text-xs text-gray-400 font-bold mt-1">Pourquoi refusez-vous cette offre de mission ?</p>
              </div>

              <form onSubmit={handleRefuseMissionSubmit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-400 font-bold uppercase tracking-wider pl-1 font-mono">Motif précis du refus :</label>
                  <textarea 
                    placeholder="Ex: Le client demande des tâches non prévues, ou trajet trop éloigné..."
                    value={refusalReasonInput}
                    onChange={(e) => setRefusalReasonInput(e.target.value)}
                    rows={4}
                    className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:border-red-500 transition-all resize-none leading-relaxed font-sans"
                  />
                  <p className="text-[9.5px] text-amber-600 font-bold leading-normal pt-1 flex items-start gap-1 font-sans">
                    <span>⚠️</span>
                    <span>Attention : Se rétracter d'une mission acceptée 2 fois le même jour suspend votre accès pendant 72 heures.</span>
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRefusalTargetMissionId(null);
                      setRefusalReasonInput('');
                    }}
                    className="w-1/2 bg-gray-50 border border-gray-200 text-gray-500 font-bold py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-gray-100 transition active:scale-95 duration-100 font-sans"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRefusal}
                    className="w-1/2 bg-red-600 text-white font-bold py-4 rounded-xl text-xs uppercase tracking-widest hover:bg-red-700 transition flex items-center justify-center gap-2 active:scale-95 duration-100 shadow-lg font-sans"
                  >
                    {isSubmittingRefusal ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      "Confirmer"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EVALUATION DU CLIENT PAR LE PRESTATAIRE */}
      <AnimatePresence>
        {ratingClientMission && (
          <div className="fixed inset-0 z-[60] bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4 font-sans">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white rounded-[3rem] p-8 w-full max-w-md text-center shadow-2xl relative overflow-hidden border border-gray-100 font-sans"
            >
              <button 
                type="button"
                onClick={() => setRatingClientMission(null)}
                className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50 transition-colors animate-fade-in"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-green-200">
                <Star size={32} className="fill-current animate-bounce" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1">Évaluer le Client</h3>
              <p className="text-xs text-gray-400 font-bold uppercase mb-6">Mission : {ratingClientMission.category}</p>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/80 mb-6 text-left space-y-1.5 uppercase text-[10px] text-gray-500 font-bold font-mono">
                <p>👤 Client : {ratingClientMission.clientName || "Client commanditaire"}</p>
                <p>📍 Adresse : {ratingClientMission.location.split('(')[0]}</p>
                <p>💵 Paiement reçu : {ratingClientMission.totalPrice.toLocaleString()} FCFA</p>
              </div>

              <form onSubmit={handleSubmitRatingClient} className="space-y-6 text-left">
                <div>
                  <label className="block text-center text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">Note attribuée au client</label>
                  <div className="flex justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setClientRatingValue(star)}
                        className="transition-transform active:scale-90 p-1 hover:scale-110"
                      >
                        <Star 
                          size={36} 
                          className={cn(
                            "transition-colors duration-100", 
                            star <= clientRatingValue ? "text-amber-400 fill-amber-400" : "text-gray-200"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[11px] font-bold text-green-600 mt-2 uppercase tracking-wide">
                    {clientRatingValue === 5 ? "⭐️ Excellent Client" : 
                     clientRatingValue === 4 ? "⭐️ Très bon" : 
                     clientRatingValue === 3 ? "⭐️ Respectueux" : 
                     clientRatingValue === 2 ? "⭐️ Moyen" : "⭐️ Difficile"}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold pl-1">Commentaire sur la relation client</label>
                  <textarea
                    placeholder="L'adresse était-elle correcte ? Le client vous a-t-il bien accueilli et réglé la somme convenue ?"
                    value={clientRatingComment}
                    onChange={(e) => setClientRatingComment(e.target.value)}
                    rows={3}
                    className="w-full text-xs font-bold p-4 bg-gray-50 hover:bg-white border border-gray-200 outline-none rounded-2xl focus:border-green-500 transition-all resize-none text-gray-700 font-sans"
                    maxLength={200}
                  />
                  <div className="flex justify-end pr-1">
                    <span className="text-[9px] font-bold text-gray-400">{clientRatingComment.length}/200 caractères</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gray-900 text-white hover:bg-gray-800 py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all font-sans"
                >
                  <Check size={16} /> Enregistrer mon évaluation du client
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOMIZED PROFILE SUCCESS MODAL */}
      <AnimatePresence>
        {showProfileSuccessModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-900/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] p-8 w-full max-w-sm text-center shadow-2xl border border-gray-100"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <Check className="stroke-[3px]" size={32} />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1 font-sans">Mise à jour Réussie !</h3>
              <p className="text-[10px] text-emerald-600 font-extrabold uppercase mb-4 tracking-wider">Modifications enregistrées</p>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/80 mb-6 text-left space-y-2.5 text-xs font-semibold leading-relaxed text-gray-600">
                <p>
                  Vos informations de profil ont été enregistrées avec succès et appliquées à votre compte de Prestataire Servi+.
                </p>
                <p className="text-[11px] text-gray-400">
                  Vous allez être automatiquement redirigé vers votre tableau de bord.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowProfileSuccessModal(false);
                  if (setActiveTab) {
                    setActiveTab('home');
                  }
                }}
                className="w-full bg-gray-900 hover:bg-gray-900 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                Retourner à l'accueil
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOMIZED DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteConfirmModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[3rem] p-8 w-full max-w-sm text-center shadow-2xl border border-rose-100"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
                <Trash2 className="stroke-[2.5px]" size={30} />
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1 font-sans">Désinscription définitive ?</h3>
              <p className="text-[10px] text-rose-600 font-mono font-bold uppercase mb-4 tracking-widest">⚠️ ACTION IRREVOCABLE</p>

              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/60 mb-6 text-left space-y-2.5 text-xs font-semibold leading-relaxed text-rose-800">
                <p>
                  Êtes-vous sûr de vouloir supprimer définitivement votre application et vous désinscrire de la plateforme ?
                </p>
                <p className="text-[11px] text-rose-600 font-bold">
                  Toutes vos informations de Prestataire de service, vos portefeuilles et vos historiques de missions seront définitivement et automatiquement supprimés de la base de données.
                </p>
              </div>

              <div className="flex flex-col gap-2 font-sans">
                <button
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={async () => {
                    if (!onDeleteAccount) return;
                    setIsDeletingAccount(true);
                    try {
                      await onDeleteAccount(currentUser.id);
                    } catch (e) {
                      console.error("Account deletion error", e);
                    } finally {
                      setIsDeletingAccount(false);
                      setShowDeleteConfirmModal(false);
                    }
                  }}
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                >
                  {isDeletingAccount ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Suppression...</span>
                    </>
                  ) : (
                    "Oui, Supprimer définitivement"
                  )}
                </button>
                <button
                  type="button"
                  disabled={isDeletingAccount}
                  onClick={() => setShowDeleteConfirmModal(false)}
                  className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold py-3 rounded-xl border border-gray-200/60 uppercase tracking-wider text-[10px] transition-all cursor-pointer"
                >
                  Non, Conserver mon compte
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MODAL TOUTES LES OFFRES ══ */}
      <AnimatePresence>
        {showAllOffers && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-end"
            onClick={() => setShowAllOffers(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full bg-white rounded-t-3xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-gray-200 rounded-full" />
              </div>

              <div className="px-4 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between py-4">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Toutes les offres</h2>
                    {providerZone ? (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Offres nationales + offres pour <span className="font-semibold text-green-600">{providerZone}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 mt-0.5">Définissez votre zone pour voir les offres locales</p>
                    )}
                  </div>
                  <button onClick={() => setShowAllOffers(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={22} />
                  </button>
                </div>

                {/* Zone selector */}
                {!providerZone && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 flex items-start gap-2">
                    <span className="text-lg">📍</span>
                    <div>
                      <p className="text-amber-800 text-xs font-bold">Votre zone n'est pas définie</p>
                      <p className="text-amber-600 text-xs mt-0.5">Ajoutez votre commune dans votre profil pour voir les offres de votre zone.</p>
                      <button
                        onClick={() => { setShowAllOffers(false); setActiveTab?.('profile'); }}
                        className="mt-2 text-xs font-semibold text-amber-800 underline"
                      >
                        Définir ma zone →
                      </button>
                    </div>
                  </div>
                )}

                {/* Liste de toutes les offres filtrées */}
                <div className="space-y-3">
                  {PLATFORM_OFFERS.map(offer => (
                    <div
                      key={offer.id}
                      className="rounded-2xl overflow-hidden relative text-white"
                      style={{ minHeight: 130 }}
                    >
                      <img
                        src={offer.bgImage}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover"
                        onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                      />
                      <div className={`absolute inset-0 bg-gradient-to-r ${offer.gradient}`} />
                      <div className="relative z-10 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full mb-2 ${offer.badgeColor}`}>
                              {offer.badge}
                            </span>
                            {offer.zones[0] !== 'ALL' && (
                              <span className="inline-block ml-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full mb-2 bg-white/20 text-white">
                                📍 {offer.zones.join(', ')}
                              </span>
                            )}
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{offer.emoji}</span>
                              <p className="text-white font-bold text-sm leading-tight">{offer.title}</p>
                            </div>
                            <p className="text-white/85 text-xs leading-relaxed mb-3">{offer.subtitle}</p>
                            <button
                              onClick={() => { offer.onPress(); setShowAllOffers(false); }}
                              className="bg-white/25 hover:bg-white/35 backdrop-blur-sm border border-white/40 text-white text-xs font-semibold px-4 py-2 rounded-xl transition active:scale-95 shadow"
                            >
                              {offer.cta} →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Toutes les offres (même hors zone) */}
                {providerZone && ALL_PLATFORM_OFFERS.filter(o => !o.zones.includes('ALL') && !o.zones.includes(providerZone)).length > 0 && (
                  <div className="mt-6">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Offres autres zones</p>
                    <div className="space-y-3 opacity-50">
                      {ALL_PLATFORM_OFFERS
                        .filter(o => !o.zones.includes('ALL') && !o.zones.includes(providerZone))
                        .map(offer => (
                          <div key={offer.id} className={`bg-gradient-to-r ${offer.gradient} rounded-2xl p-3 flex items-center gap-3`}>
                            <span className="text-2xl">{offer.emoji}</span>
                            <div>
                              <p className="text-white font-bold text-xs">{offer.title}</p>
                              <p className="text-white/70 text-[10px]">📍 {offer.zones.join(', ')}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL RETRAIT ── */}
      <AnimatePresence>
        {showWithdrawalModal && (
          <div className="fixed inset-0 z-[60] bg-gray-900/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4 font-sans">
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => { setShowWithdrawalModal(false); setWithdrawalFeedback(''); }}
                className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 bg-green-50 rounded-2xl flex items-center justify-center">
                  <Send size={20} className="text-green-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Demander un retrait</p>
                  <p className="text-xs text-gray-400">Solde : {(currentUser.walletBalance || 0).toLocaleString()} F CFA</p>
                </div>
              </div>

              {withdrawalFeedback ? (
                <div className="text-center py-6">
                  <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle size={28} className="text-green-500" />
                  </div>
                  <p className="font-semibold text-gray-800">{withdrawalFeedback}</p>
                  <button
                    type="button"
                    onClick={() => { setShowWithdrawalModal(false); setWithdrawalFeedback(''); }}
                    className="mt-4 px-6 py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm"
                  >
                    Fermer
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Montant */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Montant (F CFA)</label>
                    <input
                      type="number"
                      value={withdrawalAmount || ''}
                      onChange={e => setWithdrawalAmount(Number(e.target.value))}
                      min={1000}
                      max={currentUser.walletBalance || 0}
                      placeholder="Ex: 5000"
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>

                  {/* Opérateur */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Opérateur Mobile Money</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'orange', label: 'Orange', emoji: '🍊', active: 'bg-orange-500 border-orange-500 text-white' },
                        { id: 'mtn',    label: 'MTN',    emoji: '⚡', active: 'bg-yellow-500 border-yellow-500 text-white' },
                        { id: 'wave',   label: 'Wave',   emoji: '🌊', active: 'bg-blue-400 border-blue-400 text-white'   },
                      ].map(op => (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setWithdrawalOperator(op.id as 'orange' | 'mtn' | 'wave')}
                          className={cn(
                            "py-2.5 rounded-xl text-xs font-semibold border transition-all text-center",
                            withdrawalOperator === op.id ? op.active : "bg-gray-50 border-gray-200 text-gray-500"
                          )}
                        >
                          <span className="block text-base">{op.emoji}</span>
                          {op.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Numéro */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Numéro Mobile Money</label>
                    <input
                      type="tel"
                      value={withdrawalPhone}
                      onChange={e => setWithdrawalPhone(e.target.value)}
                      placeholder="Ex: 07 07 07 07 07"
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={withdrawalLoading || !withdrawalAmount || withdrawalAmount < 1000 || !withdrawalPhone.trim()}
                    onClick={async () => {
                      if (!withdrawalAmount || withdrawalAmount < 1000) { alert("Montant minimum : 1 000 F CFA"); return; }
                      if (!withdrawalPhone.trim()) { alert("Veuillez saisir votre numéro Mobile Money"); return; }
                      if (withdrawalAmount > (currentUser.walletBalance || 0)) { alert("Solde insuffisant"); return; }
                      setWithdrawalLoading(true);
                      try {
                        await onRequestWithdrawal(withdrawalAmount, withdrawalOperator, withdrawalPhone);
                        setWithdrawalFeedback("Demande de retrait envoyée avec succès !");
                        setWithdrawalAmount(0);
                      } catch (err: any) {
                        alert(`Erreur : ${err.message}`);
                      } finally {
                        setWithdrawalLoading(false);
                      }
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-4 rounded-xl text-sm transition flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {withdrawalLoading ? (
                      <><Loader2 className="animate-spin" size={16} /> Traitement…</>
                    ) : (
                      <><Send size={15} /> Confirmer le retrait</>
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
