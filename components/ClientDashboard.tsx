import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mission, MissionStatus, ServiceCategory, MarketItem } from '../types';
import { SERVICE_ICONS, CITIES } from '../constants';
import {
  MapPin, Send, Loader2, Star, CheckCircle, Check,
  DollarSign, User as UserIcon, Wand2, X,
  Briefcase, ChevronRight, ArrowRight, ArrowLeft,
  Trash2, Plus, Printer, ShoppingBag, Baby,
  Shirt, HeartHandshake, Compass, Navigation, Info, Clock, Home, Utensils, Flower2,
  MessageSquare, Eye, EyeOff, Search, SlidersHorizontal, Bell, Gift, Sparkles
} from 'lucide-react';
import { estimateMissionDetails } from '../services/geminiService';
import { initiateMarketPayment, openCheckout } from '../services/jekoService';
import { cn } from '../lib/utils';
import MapView from './MapView';

import { getAppConfig } from '../services/configService';

interface ClientDashboardProps {
  currentUser: User;
  missions: Mission[];
  onAddMission: (newMission: Mission, paymentMethod: string) => Promise<void>;
  onValidateMission: (missionId: string) => void;
  onDisputeMission: (missionId: string, reason: string) => void;
  onRateMission: (missionId: string, rating: number, comment: string) => void;
  baseRates: Record<ServiceCategory, number>;
  commissionRate: number;
  onUpdateUser: (data: Partial<User>) => void;
  onAddBonus: (missionId: string, bonusAmount: number) => Promise<void>;
  onExtendDuration?: (missionId: string, hours: number, price: number) => void;
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onDeleteAccount?: (userId: string) => Promise<void>;
}

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  [ServiceCategory.CLEANING]: "bg-green-500",
  [ServiceCategory.COOKING]: "bg-orange-500",
  [ServiceCategory.ELDERLY_CARE]: "bg-emerald-500",
  [ServiceCategory.GARDENING]: "bg-green-500",
  [ServiceCategory.LAUNDRY]: "bg-violet-500",
  [ServiceCategory.BABYSITTING]: "bg-pink-500",
  [ServiceCategory.MARKET]: "bg-amber-500",
};

// District coordinates mapping for simulation
const DISTRICTS_MOCK_COORDS = [
  { name: "Cocody", x: 60, y: 35, lat: 5.3484, lng: -3.9785 },
  { name: "Plateau", x: 45, y: 55, lat: 5.3188, lng: -4.0180 },
  { name: "Marcory", x: 55, y: 75, lat: 5.3036, lng: -3.9870 },
  { name: "Yopougon", x: 20, y: 40, lat: 5.3400, lng: -4.0811 },
  { name: "Treichville", x: 44, y: 65, lat: 5.3069, lng: -4.0156 },
  { name: "Riviera 3", x: 75, y: 30, lat: 5.3520, lng: -3.9510 },
  { name: "Angré", x: 65, y: 15, lat: 5.3850, lng: -3.9820 },
  { name: "Abobo", x: 48, y: 15, lat: 5.4200, lng: -4.0142 },
];

export default function ClientDashboard({
  currentUser,
  missions,
  onAddMission,
  onValidateMission,
  onRateMission,
  baseRates,
  commissionRate,
  onUpdateUser,
  onAddBonus,
  onExtendDuration,
  activeTab,
  setActiveTab,
  onDeleteAccount
}: ClientDashboardProps) {
  const config = getAppConfig();
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [quizResponses, setQuizResponses] = useState<Record<string, Record<number, number>>>({});
  const [quizDone, setQuizDone] = useState<Record<string, boolean>>({});
  
  // Helper to get today's date string in YYYY-MM-DD
  const getTodayDateString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Date and Time selection defaults (immediate pre-calculation to dynamic future local time)
  const [date, setDate] = useState(() => {
    const today = new Date();
    // If late at night (past 9 PM), default to tomorrow!
    if (today.getHours() >= 21) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const yyyy = tomorrow.getFullYear();
      const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
      const dd = String(tomorrow.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [time, setTime] = useState(() => {
    const today = new Date();
    const currentHour = today.getHours();
    const currentMinutes = today.getMinutes();
    
    // If late night or very early, pre-schedule for 08:30 morning
    if (currentHour >= 21 || currentHour < 7) {
      return '08:30';
    }
    
    // Default to 1 hour ahead, aligned to 30 min intervals
    let destHour = currentHour + 1;
    let destMinute = currentMinutes > 30 ? '00' : '30';
    if (currentMinutes > 30) {
      destHour += 1;
    }
    if (destHour >= 24) {
      destHour = 8;
    }
    return `${String(destHour).padStart(2, '0')}:${destMinute}`;
  });

  const [endTime, setEndTime] = useState(() => {
    const today = new Date();
    const currentHour = today.getHours();
    const currentMinutes = today.getMinutes();
    
    // Default to tomorrow 12:30 if late night
    if (currentHour >= 21 || currentHour < 7) {
      return '12:30';
    }
    
    // Otherwise 3 hours after current hour
    let destHour = currentHour + 3;
    let destMinute = currentMinutes > 30 ? '00' : '30';
    if (currentMinutes > 30) {
      destHour += 1;
    }
    if (destHour >= 24) {
      destHour = 12;
    }
    return `${String(destHour).padStart(2, '0')}:${destMinute}`;
  });

  // Client-side rule validation for scheduled date and time
  const getScheduleValidationError = () => {
    if (!date) return "Veuillez choisir une date d'intervention.";
    if (!time) return "Veuillez choisir une heure de début.";
    
    const now = new Date();
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const selected = new Date(year, month - 1, day, hours, minutes);
    
    // Grace period of 1 minute to prevent immediate jitter failure
    if (selected.getTime() <= now.getTime() - 60000) {
      return "La date et l'heure ne peuvent pas se situer dans le passé. Veuillez choisir un créneau futur.";
    }
    return null;
  };
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<string>(currentUser.address || 'Cocody, Abidjan');
  const [city, setCity] = useState(currentUser.city || 'Abidjan');

  // Geolocation state
  const [latitude, setLatitude] = useState<number>(5.3484);
  const [longitude, setLongitude] = useState<number>(-3.9785);
  const [isLocating, setIsLocating] = useState(false);

  // Service specific states
  const [specificTasks, setSpecificTasks] = useState('');
  const [cookingDish, setCookingDish] = useState('');
  const [childrenCount, setChildrenCount] = useState<number>(1);
  const [childrenAges, setChildrenAges] = useState('');
  const [gardenArea, setGardenArea] = useState('');
  const [elderlyCount, setElderlyCount] = useState<number>(1);
  const [elderlyNeeds, setElderlyNeeds] = useState('');
  
  // Laundry quantity custom state
  const [laundryQuantity, setLaundryQuantity] = useState<number>(10); // Minimum 10

  // Market basket order states
  const [marketItems, setMarketItems] = useState<MarketItem[]>([]);
  const [newMarketName, setNewMarketName] = useState('');
  const [newMarketPrice, setNewMarketPrice] = useState('');
  const [marketListDescription, setMarketListDescription] = useState('');
  const [marketBudget, setMarketBudget] = useState<number>(0);

  // Modals / active actions
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<'Wave' | 'Orange Money' | 'MTN MoMo'>('Wave');
  const [paymentPhoneNumber, setPaymentPhoneNumber] = useState(currentUser.phone || '');
  
  // Receipt printable preview modal
  const [receiptModel, setReceiptModel] = useState<Mission | null>(null);
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false);
  const [lastCreatedCategory, setLastCreatedCategory] = useState<ServiceCategory | null>(null);

  // Incentive bonus for the current order being created
  const [creationBonus, setCreationBonus] = useState<number>(0);

  // Disputes, claims, and suggestions state
  const [claimType, setClaimType] = useState<'dispute' | 'claim' | 'suggestion'>('claim');
  const [claimSubject, setClaimSubject] = useState('');
  const [claimMessage, setClaimMessage] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [claimSubmitted, setClaimSubmitted] = useState(false);

  // Profile states
  const [profileForm, setProfileForm] = useState({
    name: currentUser.name,
    phone: currentUser.phone,
    city: currentUser.city || 'Abidjan',
    address: currentUser.address || '',
  });

  // Keep profile inputs synchronized when currentUser details load/change
  React.useEffect(() => {
    setProfileForm({
      name: currentUser.name,
      phone: currentUser.phone,
      city: currentUser.city || 'Abidjan',
      address: currentUser.address || '',
    });
  }, [currentUser]);

  const [showProfileSuccessModal, setShowProfileSuccessModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [showProfilePassword, setShowProfilePassword] = useState(false);

  // Rating states
  const [ratingMission, setRatingMission] = useState<Mission | null>(null);
  const [ratingValue, setRatingValue] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState('');
  const [showTrainingPanel, setShowTrainingPanel] = useState(false);
  const [showClaimPanel, setShowClaimPanel] = useState(false);

  const handleSubmitRating = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ratingMission) return;
    onRateMission(ratingMission.id, ratingValue, ratingComment);
    setRatingMission(null);
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimMessage.trim()) {
      alert("Veuillez saisir votre message.");
      return;
    }
    setIsSubmittingClaim(true);
    
    const claimData = {
      id: `claim_${Date.now()}`,
      clientId: currentUser.id,
      clientName: currentUser.name,
      clientPhone: currentUser.phone,
      type: claimType,
      subject: claimSubject || "Sans objet",
      message: claimMessage,
      createdAt: new Date().toISOString(),
      status: 'Reçu (Traitement en cours)'
    };

    try {
      // Lazy imports for safety
      const { db } = await import('../services/firebase');
      const { collection, doc, setDoc } = await import('firebase/firestore');
      if (db) {
        await setDoc(doc(collection(db, "claims"), claimData.id), claimData);
      }
    } catch (err) {
      console.warn("Could not save claim to Firestore", err);
    }

    try {
      const existing = localStorage.getItem('serviplus_claims_local');
      const currentClaims = existing ? JSON.parse(existing) : [];
      localStorage.setItem('serviplus_claims_local', JSON.stringify([claimData, ...currentClaims]));
    } catch {}

    setIsSubmittingClaim(false);
    setClaimSubmitted(true);
    setClaimSubject('');
    setClaimMessage('');
  };

  // Calculate duration between start and end time
  const getCalculatedDuration = () => {
    if (!time || !endTime) return 2; // Default to 2 hours minimum
    const [sh, sm] = time.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let startMinutes = sh * 60 + sm;
    let endMinutes = eh * 60 + em;
    if (endMinutes <= startMinutes) {
      endMinutes += 24 * 60; // Next-day wrap
    }
    const diffMinutes = endMinutes - startMinutes;
    // Set a minimum of 2 hours for all hourly services
    return Math.max(2, Math.round((diffMinutes / 60) * 10) / 10);
  };

  // Pricing engine matching exactly user rules
  const getMissionPriceAndHours = () => {
    if (!selectedCategory) return { price: 0, hours: 2 };
    
    let basePrice = 0;
    let hours = 0;

    if (selectedCategory === ServiceCategory.LAUNDRY) {
      const qty = Math.max(10, laundryQuantity);
      basePrice = qty * 300;
    } else if (selectedCategory === ServiceCategory.MARKET) {
      const budget = marketBudget > 0 ? marketBudget : 0;
      const serviceFee = 500;
      const deliveryFee = 1000;
      const mktJekoFee = Math.ceil((budget + serviceFee + deliveryFee) * 0.015);
      basePrice = budget + serviceFee + deliveryFee + mktJekoFee;
    } else {
      hours = getCalculatedDuration();
      // Pricing rule: 2 hours is 3,500 F CFA base. Each additional hour is 1,500 F CFA.
      let price = 3500;
      if (hours > 2) {
        price += (hours - 2) * 1500;
      }
      basePrice = Math.round(price);
    }
    return { price: basePrice + creationBonus, hours };
  };

  const { price: totalPrice, hours: durationHours } = getMissionPriceAndHours();
  const myMissions = missions.filter(m => m.clientId === currentUser.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // GPS Tracking simulation
  const handleGetLiveLocation = () => {
    setIsLocating(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocation(`Position GPS Actuelle (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`);
          setIsLocating(false);
        },
        (error) => {
          setTimeout(() => {
            // Safe realistic Cocody mock coordinates
            setLatitude(5.3484);
            setLongitude(-3.9785);
            setLocation("Cocody, Abidjan (Automatique GPS)");
            setIsLocating(false);
          }, 800);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  // Map clicking simulation logic
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Convert percentage to realistic Abidjan coordinates
    const lat = 5.4200 - (y / 100) * 0.1200;
    const lng = -4.0811 + (x / 100) * 0.1301;

    setLatitude(lat);
    setLongitude(lng);

    // Dynamic district name suggestion based on coordinate proximity
    let closestDistrict = "Cocody, Abidjan";
    let minDist = 9999;
    DISTRICTS_MOCK_COORDS.forEach(d => {
      const dX = d.x - x;
      const dY = d.y - y;
      const dist = Math.sqrt(dX * dX + dY * dY);
      if (dist < minDist) {
        minDist = dist;
        closestDistrict = `${d.name}, Abidjan`;
      }
    });

    setLocation(closestDistrict);
  };

  // Handle adding custom items to the shopping basket
  const handleAddMarketItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMarketName.trim() || !newMarketPrice.trim()) return;
    const priceVal = parseInt(newMarketPrice) || 0;
    if (priceVal <= 0) return;

    setMarketItems([...marketItems, { name: newMarketName.trim(), price: priceVal }]);
    setNewMarketName('');
    setNewMarketPrice('');
  };

  const handleRemoveMarketItem = (index: number) => {
    setMarketItems(marketItems.filter((_, i) => i !== index));
  };

  const confirmPayment = async () => {
    if (!selectedCategory) return;
    setIsProcessingPayment(true);
    
    try {
      // Construct refined custom description carrying full details
      let finalDescription = description || "";
      if (selectedCategory === ServiceCategory.CLEANING) {
        const extraHours = Math.max(0, durationHours - 2);
        const extraCost = extraHours * 1500;
        finalDescription = `Ménage à domicile\n• Consignes: ${specificTasks || 'Aucune spécifique'}\n• Horaires: de ${time} à ${endTime}\n\n• Détails des frais :\n  - Forfait de base (2 heures d'intervention) : 3 500 F\n  - Heure(s) supplémentaire(s) (${extraHours.toFixed(1)} h à 1 500 F/h) : ${extraCost.toLocaleString()} F\n  - Tarif total : ${totalPrice.toLocaleString()} F CFA`;
      } else if (selectedCategory === ServiceCategory.COOKING) {
        const extraHours = Math.max(0, durationHours - 2);
        const extraCost = extraHours * 1500;
        finalDescription = `🍳 Cuisine & Repas\n• Plat souhaité: ${cookingDish || 'Non spécifié'}\n• Consignes: ${specificTasks || 'Aucune spécifique'}\n• Horaires: de ${time} à ${endTime}\n\n• Détails des frais :\n  - Forfait de base (2 heures d'intervention) : 3 500 F\n  - Heure(s) supplémentaire(s) (${extraHours.toFixed(1)} h à 1 500 F/h) : ${extraCost.toLocaleString()} F\n  - Tarif total : ${totalPrice.toLocaleString()} F CFA`;
      } else if (selectedCategory === ServiceCategory.BABYSITTING) {
        const extraHours = Math.max(0, durationHours - 2);
        const extraCost = extraHours * 1500;
        finalDescription = `👶 Garde d'enfants (Nounou)\n• Nombre d'enfants: ${childrenCount}\n• Âges: ${childrenAges || 'Non renseigné'}\n• Consignes: ${specificTasks || 'Aucune spécifique'}\n• Horaires: de ${time} à ${endTime}\n\n• Détails des frais :\n  - Forfait de base (2 heures d'intervention) : 3 500 F\n  - Heure(s) supplémentaire(s) (${extraHours.toFixed(1)} h à 1 500 F/h) : ${extraCost.toLocaleString()} F\n  - Tarif total : ${totalPrice.toLocaleString()} F CFA`;
      } else if (selectedCategory === ServiceCategory.ELDERLY_CARE) {
        const extraHours = Math.max(0, durationHours - 2);
        const extraCost = extraHours * 1500;
        finalDescription = `👵 Assistance Personnes Âgées\n• Nombre de séniors: ${elderlyCount}\n• Besoins santé: ${elderlyNeeds || 'Aucun mentionné'}\n• Consignes: ${specificTasks || 'Aucune spécifique'}\n• Horaires: de ${time} à ${endTime}\n\n• Détails des frais :\n  - Forfait de base (2 heures d'intervention) : 3 500 F\n  - Heure(s) supplémentaire(s) (${extraHours.toFixed(1)} h à 1 500 F/h) : ${extraCost.toLocaleString()} F\n  - Tarif total : ${totalPrice.toLocaleString()} F CFA`;
      } else if (selectedCategory === ServiceCategory.GARDENING) {
        const extraHours = Math.max(0, durationHours - 2);
        const extraCost = extraHours * 1500;
        finalDescription = `🌱 Jardinage & Entretien\n• Superficie cible: ${gardenArea || 'Non précisée'}\n• Travaux: ${specificTasks || 'Aucun spécifique'}\n• Horaires: de ${time} à ${endTime}\n\n• Détails des frais :\n  - Forfait de base (2 heures d'intervention) : 3 500 F\n  - Heure(s) supplémentaire(s) (${extraHours.toFixed(1)} h à 1 500 F/h) : ${extraCost.toLocaleString()} F\n  - Tarif total : ${totalPrice.toLocaleString()} F CFA`;
      } else if (selectedCategory === ServiceCategory.LAUNDRY) {
        finalDescription = `🧺 Lessive & Repassage\n• Nombre de vêtements: ${laundryQuantity} pièces (Min. 10)\n• Consignes: ${specificTasks || 'Aucune spécifique'}`;
      } else if (selectedCategory === ServiceCategory.MARKET) {
        const mktJekoFee = Math.ceil((marketBudget + 1500) * 0.015);
        finalDescription = `🛒 Faire mon Marché\n• Liste de courses :\n${marketListDescription || 'Non précisée'}\n\n• Détails des frais :\n  - Budget courses : ${marketBudget.toLocaleString()} F\n  - Frais service : 500 F\n  - Frais livraison : 1 000 F\n  - Frais Jèko (1.5%) : ${mktJekoFee.toLocaleString()} F\n  - Total : ${totalPrice.toLocaleString()} F CFA\n• Notes : ${specificTasks || 'Aucune consigne'}`;
      }

      let descriptionWithBonus = finalDescription;
      if (creationBonus > 0) {
        descriptionWithBonus += `\n🎁 Bonus d'incitation temporaire / accès difficile : +${creationBonus.toLocaleString()} F CFA`;
      }

      const isMarket = selectedCategory === ServiceCategory.MARKET;
      let paymentRefText = isMarket ? `TX-${Math.floor(Math.random() * 90000000 + 10000000)}` : "";

      const isoDate = `${date}T${time}`;
      const newMisionId = `m${Date.now()}`;

      let descriptionFinal = descriptionWithBonus;
      if (isMarket) {
        descriptionFinal += `\n\n💳 PAIEMENT MOBILE MONEY :\n• Opérateur : ${selectedOperator}\n• Numéro : ${paymentPhoneNumber}\n• Référence : ${paymentRefText}\n• Statut : En attente de confirmation`;
      }

      const newMission: Mission = {
        id: newMisionId,
        title: `${selectedCategory}`,
        clientId: currentUser.id,
        clientName: currentUser.name,
        clientPhone: currentUser.phone,
        clientAvatar: currentUser.avatarUrl,
        category: selectedCategory,
        description: descriptionFinal,
        location: location || "Cocody, Abidjan",
        city,
        date: isoDate,
        endTime: endTime ? `${date}T${endTime}` : undefined,
        durationHours: durationHours,
        quantity: selectedCategory === ServiceCategory.LAUNDRY ? laundryQuantity : undefined,
        marketItems: selectedCategory === ServiceCategory.MARKET ? marketItems : undefined,
        marketList: selectedCategory === ServiceCategory.MARKET ? marketListDescription : undefined,
        marketBudget: selectedCategory === ServiceCategory.MARKET ? marketBudget : undefined,
        marketPaid: false,
        totalPrice,
        commission: 0,
        providerAmount: totalPrice,
        bonus: creationBonus > 0 ? creationBonus : undefined,
        status: MissionStatus.PENDING,
        createdAt: new Date().toISOString(),
        latitude,
        longitude,
        paymentMethod: isMarket ? selectedOperator : 'Espèces',
        paymentStatus: isMarket ? 'PENDING' : 'PENDING_COD',
        paymentPhone: isMarket ? paymentPhoneNumber : undefined,
        paymentOperator: isMarket ? selectedOperator : undefined,
        paymentRef: isMarket ? paymentRefText : undefined,
      };

      // For market orders: initiate Jèko payment, open checkout
      if (isMarket && totalPrice > 0) {
        try {
          const operatorMap: Record<string, string> = { Wave: 'wave', 'Orange Money': 'orange', 'MTN MoMo': 'mtn' };
          const jekoResult = await initiateMarketPayment({
            subscriptionRef: `MKT-${currentUser.id}-${Date.now()}`,
            amountXof: totalPrice,
            operator: operatorMap[selectedOperator] ?? 'wave',
            payerPhone: paymentPhoneNumber,
          });
          openCheckout(jekoResult.checkoutUrl);
          paymentRefText = jekoResult.reference;
          newMission.marketPaid = true;
          newMission.paymentRef = paymentRefText;
        } catch (jekoErr: any) {
          console.warn('Jèko market payment failed:', jekoErr.message);
          newMission.marketPaid = false;
        }
      }

      onAddMission(newMission, isMarket ? selectedOperator : 'Espèces');

      setIsProcessingPayment(false);
      setShowPaymentModal(false);
      
      setLastCreatedCategory(selectedCategory);
      setShowOrderSuccessModal(true);
      
      // If it's a grocery shopping mission, set receipt modal preview up for the customer
      if (selectedCategory === ServiceCategory.MARKET) {
        setReceiptModel(newMission);
      }
      
      setSelectedCategory(null);
      setCreationBonus(0);
    } catch (e) {
      console.warn("Error during payment confirmation callback", e);
      // Fallback is already handled gracefully by the local state wrapper in App.tsx!
      setIsProcessingPayment(false);
      setShowPaymentModal(false);
      setSelectedCategory(null);
    }
  };

  // Helper to open real print workflow
  const triggerReceiptPrint = () => {
    window.print();
  };

  return (
    <div className="pb-20 max-w-lg mx-auto w-full">
      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="animate-fade-in"
          >
            {/* ── GREEN HERO HEADER ── */}
            <div className="-mx-4 bg-gradient-to-br from-green-600 to-green-700 pt-[calc(env(safe-area-inset-top)+20px)] pb-16 px-5 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute left-0 bottom-0 w-32 h-32 bg-green-500/30 rounded-full blur-2xl pointer-events-none" />

              {/* Location + Bell */}
              <div className="relative z-10 flex items-center justify-between mb-5">
                <div>
                  <p className="text-green-200 text-[10px] font-medium tracking-wider uppercase">Localisation</p>
                  <button className="flex items-center gap-1.5 mt-0.5">
                    <MapPin size={14} className="text-white" />
                    <span className="text-white font-bold text-sm">{currentUser.city || 'Abidjan'}</span>
                    <ChevronRight size={14} className="text-green-200 rotate-90" />
                  </button>
                </div>
                <button className="relative w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                  <Bell size={18} className="text-white" />
                  <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-amber-400 rounded-full border border-green-600" />
                </button>
              </div>

              {/* Greeting */}
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <h2 className="text-white text-xl font-bold">Bonjour, {currentUser.name.split(' ')[0]} 👋</h2>
                  <p className="text-green-200 text-xs font-medium mt-0.5">Quel service recherchez-vous ?</p>
                </div>
                <div className="w-11 h-11 rounded-full border-2 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center shrink-0">
                  {currentUser.avatarUrl
                    ? <img src={currentUser.avatarUrl} className="w-full h-full object-cover" alt="avatar" />
                    : <span className="text-white font-bold">{currentUser.name[0]}</span>}
                </div>
              </div>
            </div>

            {/* ── SEARCH BAR (overlap hero) ── */}
            <div className="-mx-4 px-4 -mt-7 mb-6 relative z-10">
              <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] flex items-center gap-3 px-4 py-3.5 border border-gray-100">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Rechercher un service..."
                  className="flex-1 text-sm font-medium text-gray-900 outline-none placeholder:text-gray-400 bg-transparent"
                  onFocus={() => {}}
                />
                <button className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <SlidersHorizontal size={15} className="text-white" />
                </button>
              </div>
            </div>

            <div className="space-y-7">

              {/* ── FLASH ANNOUNCEMENTS ── */}
              {config.flashAnnouncements && config.flashAnnouncements.filter(ann => ann.active && (ann.target === 'ALL' || ann.target === 'CLIENT')).length > 0 && (
                <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
                  {config.flashAnnouncements.filter(ann => ann.active && (ann.target === 'ALL' || ann.target === 'CLIENT')).map(ann => (
                    <div key={ann.id} className={cn(
                      "shrink-0 w-72 rounded-2xl p-4 flex items-start gap-3",
                      ann.type === 'promo' ? "bg-amber-50 border border-amber-200" :
                      ann.type === 'flash' ? "bg-rose-50 border border-rose-200" :
                      "bg-green-50 border border-green-200"
                    )}>
                      <span className="text-xl shrink-0">📢</span>
                      <p className="text-xs font-semibold text-gray-700 leading-relaxed">{ann.text}</p>
                    </div>
                  ))}
                </div>
              )}


              {/* ── CATEGORIES (visual grid) ── */}
              <section>
                <h3 className="font-bold text-gray-900 text-base mb-4">Choisir un service</h3>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { cat: ServiceCategory.CLEANING,    emoji: '🧹', label: 'Ménage',     bg: 'bg-blue-50',   border: 'border-blue-200',   accent: 'bg-blue-500'   },
                    { cat: ServiceCategory.COOKING,     emoji: '🍳', label: 'Cuisine',    bg: 'bg-orange-50', border: 'border-orange-200', accent: 'bg-orange-500' },
                    { cat: ServiceCategory.LAUNDRY,     emoji: '👕', label: 'Lessive',    bg: 'bg-purple-50', border: 'border-purple-200', accent: 'bg-purple-500' },
                    { cat: ServiceCategory.MARKET,      emoji: '🛒', label: 'Courses',    bg: 'bg-green-50',  border: 'border-green-200',  accent: 'bg-green-500'  },
                    { cat: ServiceCategory.BABYSITTING, emoji: '👶', label: 'Nounou',     bg: 'bg-yellow-50', border: 'border-yellow-200', accent: 'bg-yellow-500' },
                    { cat: ServiceCategory.ELDERLY_CARE,emoji: '👴', label: 'Séniors',   bg: 'bg-teal-50',   border: 'border-teal-200',   accent: 'bg-teal-500'   },
                    { cat: ServiceCategory.GARDENING,   emoji: '🌿', label: 'Jardinage',  bg: 'bg-lime-50',   border: 'border-lime-200',   accent: 'bg-lime-600'   },
                  ] as { cat: ServiceCategory; emoji: string; label: string; bg: string; border: string; accent: string }[]).map(({ cat, emoji, label, bg, border }) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setLaundryQuantity(10);
                          setSpecificTasks('');
                          setCookingDish('');
                          setChildrenCount(1);
                          setChildrenAges('');
                          setGardenArea('');
                          setElderlyCount(1);
                          setElderlyNeeds('');
                        }}
                        className={cn(
                          "relative flex flex-col items-center justify-center gap-1.5 min-h-[88px] rounded-2xl border-2 shadow-sm transition-all active:scale-95",
                          isSelected
                            ? "bg-green-50 border-green-500 shadow-green-100"
                            : cn(bg, border)
                        )}
                      >
                        {/* Selected checkmark */}
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <Check size={12} className="text-white" strokeWidth={3} />
                          </span>
                        )}
                        <span className="text-4xl leading-none select-none">{emoji}</span>
                        <span className={cn(
                          "text-sm font-bold leading-tight text-center px-1",
                          isSelected ? "text-green-700" : "text-gray-700"
                        )}>{label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </section>

              {/* ── POPULAR SERVICES (provider cards) ── */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900 text-base">Services populaires</h3>
                  <button className="text-green-600 text-xs font-semibold">Voir tout</button>
                </div>

                {/* Horizontal scroll — cards style référence */}
                <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                  {[
                    {
                      cat: ServiceCategory.CLEANING,
                      label: "Ménage à domicile",
                      provider: "Aminata K.",
                      price: "3 500",
                      rating: 4.8,
                      reviews: 214,
                      tag: "Populaire",
                      photo: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&q=80",
                      avatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=80&q=80",
                    },
                    {
                      cat: ServiceCategory.COOKING,
                      label: "Cuisine & Repas",
                      provider: "Fatou D.",
                      price: "3 500",
                      rating: 4.9,
                      reviews: 187,
                      tag: "Top noté",
                      photo: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80",
                      avatar: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=80&q=80",
                    },
                    {
                      cat: ServiceCategory.BABYSITTING,
                      label: "Garde d'enfants",
                      provider: "Marie-C. B.",
                      price: "3 500",
                      rating: 4.7,
                      reviews: 98,
                      tag: "Fiable",
                      photo: "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&q=80",
                      avatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=80&q=80",
                    },
                    {
                      cat: ServiceCategory.GARDENING,
                      label: "Jardinage",
                      provider: "Kouamé A.",
                      price: "3 000",
                      rating: 4.6,
                      reviews: 73,
                      tag: "",
                      photo: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80",
                      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80",
                    },
                    {
                      cat: ServiceCategory.ELDERLY_CARE,
                      label: "Aide aux aînés",
                      provider: "Ysabelle M.",
                      price: "3 500",
                      rating: 4.9,
                      reviews: 56,
                      tag: "Recommandé",
                      photo: "https://images.unsplash.com/photo-1576765608866-5b51046452be?w=400&q=80",
                      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&q=80",
                    },
                  ].map(({ cat, label, provider, price, rating, reviews, tag, photo, avatar }) => (
                    <motion.button
                      key={cat}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setLaundryQuantity(10);
                        setSpecificTasks('');
                        setCookingDish('');
                        setChildrenCount(1);
                        setChildrenAges('');
                        setGardenArea('');
                        setElderlyCount(1);
                        setElderlyNeeds('');
                      }}
                      className="shrink-0 w-44 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden text-left hover:shadow-md hover:border-green-100 transition-all"
                    >
                      {/* Photo header */}
                      <div className="relative h-28 overflow-hidden bg-gray-100">
                        <img src={photo} alt={label} className="w-full h-full object-cover" />
                        {tag && (
                          <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-sm text-gray-800 text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            ⭐ {tag}
                          </span>
                        )}
                        <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm rounded-full px-1.5 py-0.5 flex items-center gap-0.5 shadow-sm">
                          <Star size={9} className="text-amber-400 fill-amber-400" />
                          <span className="text-[9px] font-bold text-gray-800">{rating}</span>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="p-3">
                        <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">{label}</p>
                        <h4 className="font-bold text-gray-900 text-sm mt-0.5 leading-tight">{provider}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">({reviews} avis)</p>

                        {/* Prestataire avatar + prix */}
                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <img src={avatar} alt={provider} className="w-6 h-6 rounded-full object-cover border border-gray-100" />
                            <span className="text-[10px] text-gray-500 font-medium">Prestataire</span>
                          </div>
                          <span className="text-green-600 font-bold text-xs">{price} F</span>
                        </div>
                      </div>

                      {/* Book CTA */}
                      <div className="px-3 pb-3">
                        <div className="w-full bg-green-600 text-white text-[10px] font-bold py-2 rounded-xl text-center">
                          Réserver maintenant
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </section>

              {/* ── SUPPORT / RÉCLAMATION — Teaser compact ── */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowClaimPanel(true)}
                className="w-full text-left overflow-hidden rounded-2xl relative shadow-sm"
              >
                <img
                  src="https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=600&q=80"
                  alt="Support"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-800/70 to-transparent" />
                <div className="relative z-10 p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
                      <MessageSquare size={22} className="text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm leading-tight">Réclamation<br/>& Suggestions</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        {(['⚠️ Litige', '💸 Réclamation', '💡 Suggestion'] as const).map(label => (
                          <span key={label} className="bg-white/15 text-white/80 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-white/20">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white text-gray-800 text-[10px] font-bold px-3 py-2 rounded-xl shrink-0 flex items-center gap-1">
                    Écrire <ChevronRight size={12} />
                  </div>
                </div>
              </motion.button>

              {/* ── FORMATION — Teaser compact ── */}
              {config.enableTrainingSection && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowTrainingPanel(true)}
                  className="w-full text-left overflow-hidden rounded-2xl relative shadow-sm"
                >
                  {/* fond photo */}
                  <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80"
                    alt="Formation"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-green-900/90 via-green-800/75 to-transparent" />
                  <div className="relative z-10 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-2xl border border-white/20 shrink-0">
                        🎓
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm leading-tight">Espace Conseils<br/>& Formation</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          {config.trainingContent && config.trainingContent.filter(i => i.target === 'CLIENT').slice(0, 3).map(item => (
                            <span key={item.id} className={cn(
                              "text-[9px] font-semibold px-2 py-0.5 rounded-full",
                              quizDone[item.id]
                                ? "bg-emerald-500/30 text-emerald-200 border border-emerald-400/30"
                                : "bg-white/15 text-white/80 border border-white/20"
                            )}>
                              {quizDone[item.id] ? "✓" : "•"} {item.category || "Conseils"}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white text-green-700 text-[10px] font-bold px-3 py-2 rounded-xl shrink-0 flex items-center gap-1">
                      Commencer <ChevronRight size={12} />
                    </div>
                  </div>
                </motion.button>
              )}

            </div>{/* end space-y-7 */}
            <div className="h-4" />{/* bottom spacing */}
          </motion.div>
        )}

        {activeTab === 'missions' && (
          <motion.div 
            key="missions"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Mes Commandes</h2>
              <span className="px-3 py-1.5 bg-green-50 text-green-700 text-[10px] font-semibold rounded-full border border-green-100">Suivi en direct</span>
            </div>

            <div className="space-y-4">
              {myMissions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
                  <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-5 text-gray-300">
                    <Briefcase size={36} />
                  </div>
                  <p className="text-gray-400 font-semibold text-sm">Aucune commande en cours</p>
                  <p className="text-gray-300 text-xs mt-1">Réservez votre premier service depuis l'accueil</p>
                </div>
              ) : (
                myMissions.map(m => (
                  <motion.div
                    layoutId={m.id}
                    key={m.id}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4 active:scale-[0.99] transition-all"
                  >
                    {/* Mission Header */}
                    <div className="flex gap-3.5 items-start">
                      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm", CATEGORY_COLORS[m.category])}>
                        {React.createElement(SERVICE_ICONS[m.category] || Briefcase, { size: 22 })}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-gray-900 text-sm">{m.category}</h4>
                          <span className={cn(
                            "text-[10px] font-semibold px-2.5 py-0.5 rounded-full shrink-0",
                            m.status === MissionStatus.COMPLETED ? "bg-emerald-50 text-emerald-700" :
                            m.status === MissionStatus.ACCEPTED ? "bg-green-50 text-green-700" :
                            m.status === MissionStatus.IN_PROGRESS ? "bg-orange-50 text-orange-700" : "bg-amber-50 text-amber-800"
                          )}>
                            {m.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                          {new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} à {new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-bold text-gray-900">{m.totalPrice.toLocaleString()} F</p>
                        {m.bonus && m.bonus > 0 ? (
                          <p className="text-[10px] font-semibold text-amber-600">+{m.bonus.toLocaleString()} F 🎁</p>
                        ) : (
                          <p className="text-[10px] text-gray-400">Total payé</p>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-gray-600 bg-gray-50 px-3.5 py-3 rounded-xl border border-gray-100 whitespace-pre-wrap leading-relaxed">
                      {m.description}
                    </div>

                    {m.status === MissionStatus.PENDING && (
                      <div className="bg-amber-50/40 rounded-2xl p-4 border border-amber-100/60 space-y-2.5">
                        <div className="flex justify-between items-center">
                          <div className="space-y-0.5">
                            <p className="font-black text-[9px] uppercase tracking-wider text-amber-900 flex items-center gap-1">⏱️ Pas encore de prestataire ?</p>
                            <p className="text-[10px] text-gray-500 font-bold">Incentivez les prestataires de votre zone en ajoutant un bonus d’accès difficile / éloignement :</p>
                          </div>
                          {m.bonus && m.bonus > 0 && (
                            <span className="bg-amber-600/90 text-white text-[10px] font-black py-1 px-2.5 rounded-full shrink-0">Bonus Actuel: +{m.bonus.toLocaleString()} F</span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {[500, 1000, 2000].map((bonusVal) => (
                            <button
                              key={bonusVal}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddBonus(m.id, bonusVal);
                              }}
                              className="flex-1 bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 hover:border-amber-300 py-2 rounded-lg text-[10px] font-black uppercase transition-all"
                            >
                              +{bonusVal.toLocaleString()} F
                            </button>
                          ))}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const val = prompt("Entrez le montant supplémentaire de votre bonus d'incitation (en francs CFA) :");
                              if (val) {
                                const amount = parseInt(val, 10);
                                if (!isNaN(amount) && amount > 0) {
                                  onAddBonus(m.id, amount);
                                } else {
                                  alert("Veuillez entrer un montant valide supérieur à 0.");
                                }
                              }
                            }}
                            className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-2 rounded-lg text-xs font-semibold transition-colors shrink-0"
                          >
                            Autre
                          </button>
                        </div>
                      </div>
                    )}

                    {m.providerId && m.status !== MissionStatus.COMPLETED && (
                      <div className="space-y-3">
                        <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow text-green-700 border border-green-100 uppercase font-black text-xs shrink-0">
                              {m.providerName ? m.providerName.charAt(0) : "P"}
                            </div>
                            <div>
                              <p className="text-[9px] font-black uppercase text-green-600 leading-none">Prestataire assigné</p>
                              <p className="font-black text-gray-800 text-xs mt-0.5">{m.providerName || 'Prestataire local'}</p>
                              {m.clientPhone && <p className="text-[10px] font-bold text-gray-400">Tél : {m.clientPhone}</p>}
                            </div>
                          </div>
                          
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              onValidateMission(m.id);
                              // Open rating modal at the same time
                              setRatingMission(m);
                              setRatingValue(5);
                              setRatingComment('');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl transition shadow text-[10px] uppercase tracking-wider active:scale-95 duration-100 flex items-center gap-1.5 shrink-0"
                          >
                            <Check size={12} /> Marquer comme terminée & Evaluer
                          </button>
                        </div>

                        {/* Live map when mission is in progress */}
                        {m.status === MissionStatus.IN_PROGRESS && (
                          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border-b border-green-100">
                              <Navigation size={13} className="text-green-600" />
                              <span className="text-[11px] font-semibold text-green-700">Localisation de la mission</span>
                            </div>
                            <MapView
                              clientLat={m.latitude}
                              clientLng={m.longitude}
                              locationLabel={m.location}
                              providerName={m.providerName}
                              className="h-44 w-full"
                            />
                          </div>
                        )}

                        {/* Duration extension request widget */}
                        {config.enableHourExtension && m.status === MissionStatus.IN_PROGRESS && (
                          <div className="p-4 bg-green-50/50 border border-green-100/45 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center">
                              <div className="text-left">
                                <p className="text-[9px] font-black uppercase text-green-600">⚡ Durée additionnelle</p>
                                <p className="text-[10px] text-gray-500 font-bold leading-normal">Besoin de prolonger l'activité ? Demandez au prestataire d'augmenter la durée de la mission.</p>
                              </div>
                              {m.extensionStatus === 'PENDING' && (
                                <span className="bg-amber-500 text-white font-black text-[8px] uppercase tracking-wider py-1 px-2.5 rounded-full animate-pulse shrink-0">En attente</span>
                              )}
                              {m.extensionStatus === 'ACCEPTED' && (
                                <span className="bg-emerald-600 text-white font-black text-[8px] uppercase tracking-wider py-1 px-2.5 rounded-full shrink-0">✓ Extension Validée</span>
                              )}
                              {m.extensionStatus === 'REJECTED' && (
                                <span className="bg-rose-500 text-white font-black text-[8px] uppercase tracking-wider py-1 px-2.5 rounded-full shrink-0">Refusée</span>
                              )}
                            </div>

                            {m.extensionStatus !== 'PENDING' && (
                              <div className="flex gap-2">
                                {[1, 2, 3].map((val) => {
                                  const extraCost = val * (baseRates[m.category] || 3500);
                                  return (
                                    <button
                                      key={val}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onExtendDuration) {
                                          onExtendDuration(m.id, val, extraCost);
                                        }
                                      }}
                                      className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm"
                                    >
                                      +{val} H (+{extraCost.toLocaleString()} F)
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {m.extensionStatus === 'PENDING' && (
                              <div className="p-3 bg-white border border-amber-200/50 rounded-xl text-[10px] text-gray-500 text-center font-bold">
                                ⏳ Demande d'extension de <span className="font-extrabold text-gray-800">+{m.extendedDurationHours} Heure(s)</span> pour (+{m.extendedTotalPrice?.toLocaleString()} F CPA) envoyée. En attente de l'acceptation de {m.providerName || "votre prestataire"}.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {m.status === MissionStatus.COMPLETED && (
                      <div className="space-y-3">
                        {/* Rating for the provider */}
                        {!m.clientRating ? (
                          <div className="bg-amber-50/60 border border-amber-200/60 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                            <div>
                              <p className="text-[9px] font-black uppercase text-amber-700">⭐ Évaluation en attente</p>
                              <p className="text-[10px] text-gray-600 font-bold">L'intervention de {m.providerName || "votre prestataire"} est terminée ! Notez-la afin d’améliorer notre service.</p>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setRatingMission(m);
                                setRatingValue(5);
                                setRatingComment('');
                              }}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-black px-4 py-2.5 rounded-xl transition shadow text-[10px] uppercase tracking-wider active:scale-95 shrink-0"
                            >
                              Noter le prestataire
                            </button>
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-100 p-4 rounded-2xl">
                            <p className="text-[9px] font-black uppercase text-gray-400">✨ Votre évaluation pour {m.providerName || "le prestataire"}</p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <div className="flex text-amber-400">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} size={14} className={cn("fill-current", s <= (m.clientRating || 0) ? "text-amber-400" : "text-gray-300 fill-none")} />
                                ))}
                              </div>
                              <span className="text-xs font-black text-gray-600">{m.clientRating}/5</span>
                            </div>
                            {m.clientComment && (
                              <p className="text-xs text-gray-600 font-medium italic mt-1.5 p-2 bg-white rounded-lg border border-gray-100">
                                "{m.clientComment}"
                              </p>
                            )}
                          </div>
                        )}

                        {/* Mutual rating left by the provider for the client */}
                        {m.providerRating && (
                          <div className="bg-green-50 border border-green-100 p-4 rounded-2xl animate-fade-in text-left">
                            <p className="text-[9px] font-black uppercase text-green-700 tracking-wider">💬 Note & commentaire laissés par le prestataire de service</p>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <div className="flex text-amber-400">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} size={12} className={cn("fill-current", s <= (m.providerRating || 0) ? "text-amber-500" : "text-gray-300 fill-none")} />
                                ))}
                              </div>
                              <span className="text-[10px] font-black text-gray-700">{m.providerRating}/5</span>
                            </div>
                            {m.providerComment && (
                              <p className="text-xs text-gray-600 font-medium italic mt-1 p-2 bg-white rounded-lg border border-green-100">
                                "{m.providerComment}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 pt-2 border-t border-gray-100">
                      <p className="flex items-center gap-1"><MapPin size={12} className="text-green-500" /> {m.location}</p>
                      
                      {/* Printable receipt trigger for Grocery missions */}
                      {m.category === ServiceCategory.MARKET && (
                        <button 
                          onClick={() => setReceiptModel(m)}
                          className="flex items-center gap-1 bg-amber-50 text-amber-700 p-2 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors uppercase font-black text-[8px]"
                        >
                          <Printer size={10} /> Facture/Reçu
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'profile' && (
          <motion.div 
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Profile Hero */}
            <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-2xl p-6 text-white relative overflow-hidden">
              <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex items-center gap-5">
                <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden bg-white/20 flex items-center justify-center shrink-0 shadow-lg">
                  {currentUser.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt={currentUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={36} className="text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{currentUser.name}</h2>
                  <p className="text-green-200 text-sm font-medium mt-0.5">{currentUser.phone}</p>
                  <span className="mt-2 inline-block bg-white/20 text-white text-[10px] font-semibold px-3 py-1 rounded-full border border-white/20">
                    Client Servi+
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 space-y-5 shadow-sm border border-gray-100 animate-fade-in">
              <div className="space-y-5">
                {/* NOM COMPLET */}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Nom Complet</label>
                  <input 
                    type="text" 
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-4 py-3.5 font-medium text-sm outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all"
                  />
                </div>

                {/* CONTACT TELEPHONE */}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Numéro de Téléphone</label>
                  <input 
                    type="tel" 
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-4 py-3.5 font-medium text-sm outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all"
                  />
                </div>

                {/* COMMUNE / LOCALITE */}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Commune / Ville</label>
                  <div className="relative">
                    <select
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({...profileForm, city: e.target.value})}
                      className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-4 py-3.5 font-medium text-sm outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all appearance-none"
                    >
                      {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      ▼
                    </div>
                  </div>
                </div>

                {/* ADRESSE COMPLETE / QUARTIER */}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Quartier & Adresse précise</label>
                  <input 
                    type="text" 
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                    className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl px-4 py-3.5 font-medium text-sm outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all"
                    placeholder="Ex: Cocody Angré, Rue des banques"
                  />
                </div>

                {/* MOT DE PASSE SÉCURISÉ */}
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      🔒 Sécurité & Mot de passe
                    </h4>
                    {!isChangingPassword && (
                      <button
                        type="button"
                        onClick={() => setIsChangingPassword(true)}
                        className="text-xs font-black text-green-600 hover:text-green-700 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200/50 transition-all uppercase tracking-wider"
                      >
                        Modifier
                      </button>
                    )}
                  </div>

                  {!isChangingPassword ? (
                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100/60">
                      <div>
                        <p className="font-bold text-xs text-gray-800">Mot de passe de session</p>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">•••••••••••• (Masqué pour votre sécurité)</p>
                      </div>
                      <div className="text-emerald-500 font-black text-[10px] uppercase tracking-wider bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/50">
                        Sécurisé
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pt-1">
                      {/* OLD PASSWORD */}
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Mot de passe actuel *</label>
                        <div className="relative">
                          <input 
                            type={showProfilePassword ? "text" : "password"} 
                            value={currentPasswordInput}
                            onChange={(e) => setCurrentPasswordInput(e.target.value)}
                            className="w-full p-4.5 pr-14 bg-white border border-gray-200/60 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-green-500/10 transition-all text-xs tracking-widest"
                            placeholder="Ancien mot de passe"
                          />
                          <button 
                            type="button" 
                            onClick={() => setShowProfilePassword(!showProfilePassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                          >
                            {showProfilePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* NEW PASSWORD */}
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Nouveau mot de passe *</label>
                        <input 
                          type="password" 
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          className="w-full p-4.5 bg-white border border-gray-200/60 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-green-500/10 transition-all text-xs tracking-widest"
                          placeholder="Minimum 6 caractères"
                        />
                      </div>

                      {/* CONFIRM NEW PASSWORD */}
                      <div className="space-y-1">
                        <label className="text-sm font-semibold text-gray-700">Confirmer le nouveau mot de passe *</label>
                        <input 
                          type="password" 
                          value={confirmNewPasswordInput}
                          onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                          className="w-full p-4.5 bg-white border border-gray-200/60 rounded-xl font-bold text-gray-700 outline-none focus:ring-2 focus:ring-green-500/10 transition-all text-xs tracking-widest"
                          placeholder="Re-saisir le nouveau mot de passe"
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingPassword(false);
                            setCurrentPasswordInput('');
                            setNewPasswordInput('');
                            setConfirmNewPasswordInput('');
                          }}
                          className="w-1/2 bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!currentPasswordInput || !newPasswordInput || !confirmNewPasswordInput) {
                              alert("Veuillez remplir tous les champs du mot de passe.");
                              return;
                            }
                            if (currentPasswordInput !== currentUser.password) {
                              alert("Le mot de passe actuel saisi est incorrect.");
                              return;
                            }
                            if (newPasswordInput.length < 6) {
                              alert("Le nouveau mot de passe doit comporter au moins 6 caractères pour plus de sécurité.");
                              return;
                            }
                            if (newPasswordInput !== confirmNewPasswordInput) {
                              alert("Le nouveau mot de passe et sa confirmation ne correspondent pas.");
                              return;
                            }
                            // Call update API
                            onUpdateUser({ password: newPasswordInput });
                            setIsChangingPassword(false);
                            setCurrentPasswordInput('');
                            setNewPasswordInput('');
                            setConfirmNewPasswordInput('');
                            alert("Votre mot de passe a été mis à jour avec une sécurité renforcée !");
                          }}
                          className="w-1/2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-wider shadow-md transition-all"
                        >
                          Valider
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button 
                onClick={() => {
                  onUpdateUser(profileForm);
                  setShowProfileSuccessModal(true);
                  setTimeout(() => {
                    setShowProfileSuccessModal(false);
                    if (setActiveTab) {
                      setActiveTab('home');
                    }
                  }, 2500);
                }}
                className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-base shadow-[0_4px_20px_rgba(22,163,74,0.28)] hover:bg-green-700 active:scale-95 transition-all text-center flex items-center justify-center cursor-pointer"
              >
                Sauvegarder les modifications
              </button>

              {/* DESINSCRIPTION / SUPPRESSION DE COMPTE */}
              {onDeleteAccount && (
                <div className="pt-8 border-t border-gray-100 mt-8 text-center">
                  <p className="text-xs text-gray-400 font-semibold mb-3 leading-relaxed">
                    Si vous ne souhaitez plus utiliser nos services, vous pouvez vous désinscrire de la plateforme définitivement.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirmModal(true);
                    }}
                    className="px-6 py-3 bg-red-50 hover:bg-red-100/80 text-red-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-red-200/50 transition-all duration-150 cursor-pointer"
                  >
                    🔴 Se désinscrire de la plateforme
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOMIZED FORM MODAL BY SERVICE CATEGORY */}
      <AnimatePresence>
        {selectedCategory && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end"
          >
            <div className="w-full bg-white rounded-t-[28px] pb-12 max-h-[95vh] overflow-y-auto shadow-2xl">
              {/* Drag handle + header */}
              <div className="sticky top-0 bg-white z-10 px-6 pt-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors shrink-0"
                  >
                    <ArrowLeft size={17} />
                  </button>
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0", CATEGORY_COLORS[selectedCategory])}>
                    {React.createElement(SERVICE_ICONS[selectedCategory], { size: 20 })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-gray-900 truncate">{selectedCategory}</h3>
                    <p className="text-[11px] text-green-600 font-medium">Formulaire de réservation</p>
                  </div>
                </div>
              </div>

              <div className="px-6 pt-5">

              <div className="space-y-6">
                
                {/* 1. DYNAMIC CATEGORY PERSONALIZATION FIELDS */}
                
                {/* MENAGE */}
                {selectedCategory === ServiceCategory.CLEANING && (
                  <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100/60 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-700">🛠️ Options de Ménage</h4>
                    <textarea 
                      value={specificTasks}
                      onChange={(e) => setSpecificTasks(e.target.value)}
                      placeholder="Indiquez ici ce que le prestataire doit effectuer spécifiquement. Ex: Nettoyer le salon, faire la vaisselle, ranger les placards..."
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-medium text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all h-20 leading-relaxed"
                    />
                  </div>
                )}

                {/* CUISINE */}
                {selectedCategory === ServiceCategory.COOKING && (
                  <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100/60 space-y-4">
                    <h4 className="text-xs font-semibold text-orange-700">🍳 Options de Cuisine & Repas</h4>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-700">Quel plat le prestataire doit-il cuisiner de préférence ? *</label>
                      <input 
                        type="text"
                        value={cookingDish}
                        onChange={(e) => setCookingDish(e.target.value)}
                        placeholder="Ex: Garba chic, Attiéké Poisson, Sauce Graine, Kabato..."
                        className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-orange-850 uppercase ml-1">Consignes ou courses préalables</label>
                      <textarea 
                        value={specificTasks}
                        onChange={(e) => setSpecificTasks(e.target.value)}
                        placeholder="Ex: Les ingrédients sont déjà achetés et se trouvent dans le frigo..."
                        className="w-full p-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none h-16 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* NOUNOU / GARDE D'ENFANTS */}
                {selectedCategory === ServiceCategory.BABYSITTING && (
                  <div className="bg-pink-50/50 p-5 rounded-2xl border border-pink-100/60 space-y-4">
                    <h4 className="text-xs font-semibold text-pink-700">👶 Options de Garde d'enfants</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-pink-850 uppercase ml-1">Nombre d'enfants *</label>
                        <input 
                          type="number"
                          value={childrenCount}
                          min={1}
                          onChange={(e) => setChildrenCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-800 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-pink-850 uppercase ml-1">Âge(s) des enfants *</label>
                        <input 
                          type="text"
                          value={childrenAges}
                          onChange={(e) => setChildrenAges(e.target.value)}
                          placeholder="Ex: 2 ans et 5 ans"
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-pink-850 uppercase ml-1">Consignes particulières d'urgence</label>
                      <textarea 
                        value={specificTasks}
                        onChange={(e) => setSpecificTasks(e.target.value)}
                        placeholder="Ex: Allergies, heures des biberons, médicaments..."
                        className="w-full p-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none h-16 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* GARDE DE PERSONNES AGEES */}
                {selectedCategory === ServiceCategory.ELDERLY_CARE && (
                  <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100/60 space-y-4">
                    <h4 className="text-xs font-semibold text-emerald-700">👵 Options Garde de personnes âgées</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-emerald-850 uppercase ml-1">Nombre de séniors d'Abidjan à assister *</label>
                        <input 
                          type="number"
                          value={elderlyCount}
                          min={1}
                          onChange={(e) => setElderlyCount(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-black text-gray-800 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-emerald-850 uppercase ml-1">Besoins de santé spécifiques</label>
                        <input 
                          type="text"
                          value={elderlyNeeds}
                          onChange={(e) => setElderlyNeeds(e.target.value)}
                          placeholder="Ex: Rappel insuline, fauteuil roulant..."
                          className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-emerald-850 uppercase ml-1">Consignes de garde complémentaires</label>
                      <textarea 
                        value={specificTasks}
                        onChange={(e) => setSpecificTasks(e.target.value)}
                        placeholder="Ex: Heures de promenade, numéros d'urgence docteur..."
                        className="w-full p-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none h-16 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* JARDINAGE */}
                {selectedCategory === ServiceCategory.GARDENING && (
                  <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100/60 space-y-4">
                    <h4 className="text-xs font-semibold text-green-700">🌱 Options de Jardinage</h4>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-green-850 uppercase ml-1">Superficie ou type de jardin *</label>
                      <input 
                        type="text"
                        value={gardenArea}
                        onChange={(e) => setGardenArea(e.target.value)}
                        placeholder="Ex: Cour arrière d'environ 150m², ou jardinet de balcon..."
                        className="w-full p-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-green-850 uppercase ml-1">Tâches requises</label>
                      <textarea 
                        value={specificTasks}
                        onChange={(e) => setSpecificTasks(e.target.value)}
                        placeholder="Ex: Tondre la pelouse, arroser, tailler la clôture de fleurs..."
                        className="w-full p-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none h-16 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* LESSIVE */}
                {selectedCategory === ServiceCategory.LAUNDRY && (
                  <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100/60 space-y-4">
                    <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-wider flex items-center justify-between">
                      <span>🧺 Options de Lessive</span>
                      <span className="text-[9px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-black">Min: 10 vêtements</span>
                    </h4>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-700 uppercase ml-1">Nombre estimé de vêtements à laver *</label>
                      <div className="flex items-center gap-3">
                        <button 
                          type="button" 
                          onClick={() => setLaundryQuantity(Math.max(10, laundryQuantity - 1))}
                          className="w-10 h-10 rounded-lg bg-green-600 text-white font-black hover:bg-green-700 transition"
                        >
                          -
                        </button>
                        <input 
                          type="number"
                          value={laundryQuantity}
                          min={10}
                          onChange={(e) => setLaundryQuantity(Math.max(10, parseInt(e.target.value) || 10))}
                          className="w-20 p-2.5 text-center bg-white border border-gray-200 rounded-xl text-sm font-black text-gray-900 outline-none"
                        />
                        <button 
                          type="button" 
                          onClick={() => setLaundryQuantity(laundryQuantity + 1)}
                          className="w-10 h-10 rounded-lg bg-green-600 text-white font-black hover:bg-green-700 transition"
                        >
                          +
                        </button>
                        <span className="text-xs font-bold text-gray-500">vêtements (Total: {(Math.max(10, laundryQuantity) * 300).toLocaleString()} F)</span>
                      </div>
                      <p className="text-[8.5px] text-gray-400 font-bold uppercase mt-1">Le minimum pour déplacer un prestataire est fixé à 10 vêtements (3 000 F).</p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-600 uppercase ml-1">Précisions supplémentaires sur le linge</label>
                      <textarea 
                        value={specificTasks}
                        onChange={(e) => setSpecificTasks(e.target.value)}
                        placeholder="Ex: Repassage de 5 chemises inclus, linge fragile..."
                        className="w-full p-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none h-16 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* CHERCHER AU MARCHE (GROCERY SHOPPING) */}
                {selectedCategory === ServiceCategory.MARKET && (
                  <div className="bg-amber-50/50 p-5 rounded-[2rem] border border-amber-100/60 space-y-4">
                    <h4 className="text-xs font-semibold text-amber-700">🛒 Votre Panier d'Achats du Marché</h4>

                    {/* Market description + budget */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                          Liste de courses <span className="text-gray-400 font-normal">(décrivez librement ce que vous voulez)</span>
                        </label>
                        <textarea
                          value={marketListDescription}
                          onChange={e => setMarketListDescription(e.target.value)}
                          placeholder="Ex: 1 kg de tomates bien mûres, 500g d'oignons, poisson frais au marché de Cocody..."
                          rows={3}
                          className="w-full bg-white border border-gray-200 focus:border-amber-400 rounded-xl px-4 py-3 text-xs text-gray-800 focus:outline-none resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1.5">
                          Budget marché estimé (FCFA)
                        </label>
                        <input
                          type="number"
                          value={marketBudget || ''}
                          onChange={e => setMarketBudget(Number(e.target.value) || 0)}
                          placeholder="Ex: 5000"
                          className="w-full bg-white border border-gray-200 focus:border-amber-400 rounded-xl px-4 py-3 text-xs text-gray-800 focus:outline-none"
                        />
                      </div>
                      {marketBudget > 0 && (
                        <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs space-y-1">
                          <div className="flex justify-between text-gray-600">
                            <span>Budget courses</span>
                            <span>{marketBudget.toLocaleString()} F</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Frais service</span>
                            <span>500 F</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Frais livraison</span>
                            <span>1 000 F</span>
                          </div>
                          <div className="flex justify-between text-gray-600">
                            <span>Frais Jèko (1.5%)</span>
                            <span>{Math.ceil((marketBudget + 1500) * 0.015).toLocaleString()} F</span>
                          </div>
                          <div className="flex justify-between font-bold text-green-700 border-t border-green-200 pt-1 mt-1">
                            <span>Total à payer</span>
                            <span>{(marketBudget + 1500 + Math.ceil((marketBudget + 1500) * 0.015)).toLocaleString()} F CFA</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Add Item Row */}
                    <form onSubmit={handleAddMarketItem} className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white rounded-xl border border-gray-100">
                      <input 
                        type="text" 
                        placeholder="Désignation (Ex : Aubergines)" 
                        value={newMarketName}
                        onChange={(e) => setNewMarketName(e.target.value)}
                        className="p-2.5 bg-gray-50 rounded-lg text-xs font-bold text-gray-700 outline-none border border-gray-200/50 col-span-1"
                      />
                      <div className="relative">
                        <input 
                          type="number" 
                          placeholder="Prix estimé (Ex : 200)" 
                          value={newMarketPrice}
                          onChange={(e) => setNewMarketPrice(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 rounded-lg text-xs font-black text-gray-700 outline-none border border-gray-200/50 pr-8"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 font-black text-[9px] text-gray-400">FCFA</span>
                      </div>
                      <button 
                        type="submit"
                        className="bg-amber-500 text-white font-black text-[10px] uppercase rounded-lg p-2.5 hover:bg-amber-600 transition flex items-center justify-center gap-1.5"
                      >
                        <Plus size={14} /> Ajouter
                      </button>
                    </form>

                    {/* Basket items table preview */}
                    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 flex justify-between border-b border-gray-100 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                        <span>Désignation</span>
                        <span>Estimation Prix</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                        {marketItems.map((item, idx) => (
                          <div key={idx} className="px-4 py-2.5 flex items-center justify-between text-xs text-gray-700 font-bold">
                            <span className="flex items-center gap-1.5">
                              <span className="text-[8px] bg-amber-100 text-amber-800 w-4 h-4 rounded-full flex items-center justify-center font-black">{idx + 1}</span>
                              {item.name}
                            </span>
                            <div className="flex items-center gap-2 font-black text-gray-900">
                              <span>{item.price.toLocaleString()} F</span>
                              <button 
                                type="button" 
                                onClick={() => handleRemoveMarketItem(idx)}
                                className="text-red-500 hover:text-red-700 transition"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {marketItems.length === 0 && (
                          <div className="p-6 text-center text-xs text-gray-400 italic">Votre panier est vide. Veuillez y ajouter des provisions du marché.</div>
                        )}
                      </div>
                      <div className="p-4 bg-amber-50/40 border-t border-gray-100/80 space-y-2 text-xs font-bold text-gray-700">
                        <div className="flex justify-between items-center">
                          <span>Total Articles :</span>
                          <span>{marketItems.reduce((acc, item) => acc + item.price, 0).toLocaleString()} F</span>
                        </div>
                        <div className="flex justify-between items-center text-amber-800">
                          <span>L'Emballage :</span>
                          <span>300 F</span>
                        </div>
                        <div className="flex justify-between items-center text-amber-800">
                          <span>Prestation de course marché :</span>
                          <span>500 F</span>
                        </div>
                        <div className="flex justify-between items-center text-amber-800">
                          <span>La Livraison :</span>
                          <span>1 000 F</span>
                        </div>
                        <div className="border-t border-dashed border-amber-200/80 pt-2 flex justify-between items-center text-sm font-black text-gray-900">
                          <span>TOTAL PANIER (AVEC FRAIS) :</span>
                          <span className="text-lg text-amber-600 font-black underline">{totalPrice.toLocaleString()} F CFA</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-amber-805 uppercase ml-1">Consignes particulières pour la livraison</label>
                      <textarea 
                        value={specificTasks}
                        onChange={(e) => setSpecificTasks(e.target.value)}
                        placeholder="Ex: Passer au marché de Cocody Riviera, fruits bien mûrs s.v.p..."
                        className="w-full p-4 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none h-16 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* 2. DURATION / TIMING PICKERS (FOR SERVICES) */}
                {selectedCategory && (
                  <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 space-y-4">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} /> Plages horaires et dates d'intervention
                    </h4>
                    
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-1">
                        {selectedCategory === ServiceCategory.MARKET ? "Date souhaitée pour la livraison *" : "Date d'intervention *"}
                      </label>
                      <input 
                        type="date" 
                        value={date}
                        min={getTodayDateString()}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full p-4 bg-white border border-gray-200/60 rounded-xl font-black text-gray-700 outline-none text-xs"
                      />
                    </div>

                    <div className={selectedCategory === ServiceCategory.LAUNDRY || selectedCategory === ServiceCategory.MARKET ? "space-y-1" : "grid grid-cols-2 gap-4"}>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">
                          {selectedCategory === ServiceCategory.MARKET 
                            ? "Heure souhaitée de livraison (ex: entre 10h et 12h) *" 
                            : selectedCategory === ServiceCategory.LAUNDRY 
                              ? "Heure de ramassage de la lessive *" 
                              : "Heure de début *"}
                        </label>
                        <input 
                          type="time" 
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                          className="w-full p-4 bg-white border border-gray-200/60 rounded-xl font-black text-gray-700 outline-none text-xs"
                        />
                      </div>
                      {selectedCategory !== ServiceCategory.LAUNDRY && selectedCategory !== ServiceCategory.MARKET && (
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Heure de fin *</label>
                          <input 
                            type="time" 
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="w-full p-4 bg-white border border-gray-200/60 rounded-xl font-black text-gray-700 outline-none text-xs"
                          />
                        </div>
                      )}
                    </div>

                    {selectedCategory === ServiceCategory.MARKET && (
                      <div className="p-3.5 bg-amber-50 text-amber-800 rounded-xl border border-amber-200/50 text-[10px] font-medium leading-relaxed">
                        💡 <strong>Note de livraison :</strong> Vos courses seront faites et livrées sur une plage idéale de 2 heures démarrant à l'heure indiquée (ex: entre 10h et Midi s'il est programmé à 10:00).
                      </div>
                    )}

                    {selectedCategory !== ServiceCategory.LAUNDRY && selectedCategory !== ServiceCategory.MARKET && (
                      <div className="flex items-center justify-between p-3.5 bg-green-50 text-blue-800 rounded-xl border border-green-100 text-[11px] font-bold uppercase tracking-wider">
                        <span>🕒 Durée calculée :</span>
                        <span className="font-black text-sm">{durationHours} Heure{durationHours > 1 ? 's' : ''}</span>
                      </div>
                    )}

                    {/* Dynamic Error Message Block */}
                    {getScheduleValidationError() && (
                      <div className="p-3.5 bg-red-50 text-red-600 rounded-xl border border-red-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                        <Info size={12} className="shrink-0 text-red-500" />
                        <span>{getScheduleValidationError()}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. COOP / GEOLOCATION INTERACTIVE MAP PICKER */}
                <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Compass size={12} /> Géolocalisation de votre maison 🗺️
                    </h4>
                    <button 
                      type="button" 
                      onClick={handleGetLiveLocation}
                      disabled={isLocating}
                      className="px-3 py-1.5 bg-green-100 text-green-700 text-[8.5px] font-black uppercase rounded-lg hover:bg-green-200 transition flex items-center gap-1"
                    >
                      {isLocating ? <Loader2 size={10} className="animate-spin" /> : <Navigation size={10} />}
                      GPS Auto
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Adresse Textuelle ou Quartier *</label>
                    <input 
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ex: Cocody Angré, Cité Star 5A..."
                      className="w-full p-4 bg-white border border-gray-200 rounded-xl outline-none text-xs font-bold text-gray-700"
                    />
                  </div>

                  {/* HIGH FIDELITY SIMULATED MAP */}
                  <div className="relative">
                    <div 
                      onClick={handleMapClick}
                      className="w-full h-44 bg-gray-100 rounded-xl border-2 border-gray-200/80 overflow-hidden relative cursor-crosshair group shadow-inner"
                      style={{
                        backgroundImage: "radial-gradient(#cbd5e1 1.2px, #f1f5f9 1.2px)",
                        backgroundSize: "20px 20px"
                      }}
                    >
                      {/* Grid representation */}
                      <div className="absolute inset-x-0 top-1/2 border-t border-gray-300 border-dashed" />
                      <div className="absolute inset-y-0 left-1/2 border-l border-gray-300 border-dashed" />

                      {/* Fake lagunes of Abidjan representation */}
                      <div className="absolute bottom-6 left-12 right-12 h-6 bg-green-200/60 rounded-full blur-md" />
                      
                      {/* Abidjan mock label districts on grid */}
                      {DISTRICTS_MOCK_COORDS.map((district) => (
                        <div 
                          key={district.name}
                          className="absolute text-[8px] font-black text-gray-400 select-none pointer-events-none group-hover:text-gray-500 transition-colors bg-white/40 px-1 py-0.5 rounded"
                          style={{ left: `${district.x}%`, top: `${district.y}%` }}
                        >
                          {district.name}
                        </div>
                      ))}

                      {/* Current User Dropped Marker Pin */}
                      {latitude && longitude && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center pointer-events-none z-10"
                          style={{
                            left: `${((longitude - (-4.0811)) / 0.1301) * 100}%`,
                            top: `${((5.4200 - latitude) / 0.1200) * 100}%`
                          }}
                        >
                          <div className="bg-red-500 text-[7px] text-white font-black px-1.5 py-0.5 rounded shadow-lg animate-bounce pointer-events-none uppercase whitespace-nowrap">
                            Maison 📍
                          </div>
                          <div className="w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white shadow shadow-red-500/50" />
                        </motion.div>
                      )}
                    </div>
                    <div className="absolute bottom-2.5 right-2.5 bg-black/60 text-white text-[7.5px] font-black uppercase tracking-widest px-2 py-1 rounded-md backdrop-blur-sm pointer-events-none">
                      Abidjan Interactive Grid click 🎯
                    </div>
                  </div>

                  {/* Coordinates Badge */}
                  <div className="bg-white p-3 rounded-lg border border-gray-100 flex justify-between items-center text-[9px] font-black text-gray-500 uppercase tracking-widest">
                    <span>Latitude GPS : {latitude.toFixed(6)}</span>
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span>Longitude GPS : {longitude.toFixed(6)}</span>
                  </div>

                  {/* Optional Incentive Bonus Section (Client wants to motivate provider right away) */}
                  <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200/60 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-semibold text-amber-700">🎁 Bonus d'Accès Difficile / Éloignement (Optionnel)</h4>
                        <p className="text-[9px] text-amber-850 mt-0.5">Encouragez un prestataire à accepter rapidement votre mission si votre zone d'intervention est difficile d'accès.</p>
                      </div>
                      {creationBonus > 0 && (
                        <span className="bg-amber-600 text-white text-[10px] font-black py-1 px-3 rounded-full shrink-0">+{creationBonus.toLocaleString()} F CFA</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {[0, 500, 1000, 2000].map((bValue) => (
                        <button
                          key={bValue}
                          type="button"
                          onClick={() => setCreationBonus(bValue)}
                          className={cn(
                            "flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase transition-all duration-200",
                            creationBonus === bValue 
                              ? "bg-amber-600 text-white shadow-md shadow-amber-600/30" 
                              : "bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 hover:border-amber-300"
                          )}
                        >
                          {bValue === 0 ? "Aucun" : `+${bValue.toLocaleString()} F`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const val = prompt("Entrez un montant personnalisé pour le bonus de départ en francs CFA (ex: 1500) :");
                          if (val) {
                            const amount = parseInt(val, 10);
                            if (!isNaN(amount) && amount >= 0) {
                              setCreationBonus(amount);
                            } else {
                              alert("Veuillez entrer un montant de bonus valide supérieur ou égal à 0.");
                            }
                          }
                        }}
                        className={cn(
                          "py-2.5 px-3 rounded-xl text-[10px] font-black uppercase transition-all duration-200 border",
                          ![0, 500, 1000, 2000].includes(creationBonus)
                            ? "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-600/30"
                            : "bg-white hover:bg-amber-100 text-amber-805 border-amber-200 hover:border-amber-300"
                        )}
                      >
                        {![0, 500, 1000, 2000].includes(creationBonus) ? `${creationBonus.toLocaleString()} F` : "Autre"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. TOTAL AUTOMATED ESTIMATION AND VALIDATION ROW */}
                <div className="p-5 bg-green-600 rounded-2xl shadow-[0_4px_20px_rgba(22,163,74,0.30)] flex justify-between items-center relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
                  <div className="relative z-10">
                    <p className="text-[10px] font-semibold text-green-100 uppercase tracking-wide">Total estimé</p>
                    <p className="text-2xl font-bold text-white mt-0.5">{totalPrice.toLocaleString()} F CFA</p>
                    <p className="text-[10px] text-green-200 font-medium mt-1">🔒 0% commission</p>
                  </div>
                  <motion.button 
                    whileHover={{ scale: (getScheduleValidationError() || (selectedCategory === ServiceCategory.MARKET && marketItems.length === 0)) ? 1 : 1.05 }}
                    whileTap={{ scale: (getScheduleValidationError() || (selectedCategory === ServiceCategory.MARKET && marketItems.length === 0)) ? 1 : 0.95 }}
                    disabled={!!getScheduleValidationError() || (selectedCategory === ServiceCategory.MARKET && marketItems.length === 0)}
                    onClick={() => {
                      setShowPaymentModal(true);
                    }}
                    className={cn(
                      "relative z-10 px-5 py-3.5 rounded-xl shadow-lg font-semibold text-sm flex items-center gap-2",
                      (getScheduleValidationError() || (selectedCategory === ServiceCategory.MARKET && marketItems.length === 0))
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed opacity-70 shadow-none" 
                        : "bg-white text-green-700 font-bold active:scale-95 transition-all"
                    )}
                  >
                    {(selectedCategory === ServiceCategory.MARKET && marketItems.length === 0)
                      ? "Panier vide !" 
                      : getScheduleValidationError() 
                        ? "Ajuster l'horaire" 
                        : "Valider l'ordre"}
                    <ArrowRight size={16} />
                  </motion.button>
                </div>

              </div>
              </div>{/* end px-6 pt-5 */}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PAYMENT WINDOW CASH CONFIRMATION */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white rounded-[24px] p-6 w-full max-w-sm text-center shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              {selectedCategory === ServiceCategory.MARKET ? (
                <>
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
                    <ShoppingBag size={36} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Payer mes Courses</h3>
                  
                  <p className="text-gray-500 text-xs mb-6 leading-relaxed font-bold px-2">
                    Prépaiement requis pour le marché. Pour lancer vos courses, transférez le montant de <span className="text-green-600 font-black text-sm">{totalPrice.toLocaleString()} F CFA</span> directement au compte des administrateurs.
                  </p>

                  <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-500 mb-2 text-left">SÉLECTIONNEZ VOTRE OPÉRATEUR :</p>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedOperator('Wave')}
                        className={cn(
                          "py-3 rounded-xl text-xs font-black transition-all",
                          selectedOperator === 'Wave' 
                            ? "bg-[#1C93E3] text-white shadow-lg shadow-green-500/20 scale-105" 
                            : "bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200"
                        )}
                      >
                        Wave
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOperator('Orange Money')}
                        className={cn(
                          "py-3 rounded-xl text-xs font-black transition-all",
                          selectedOperator === 'Orange Money' 
                            ? "bg-[#FF6600] text-white shadow-lg shadow-orange-500/20 scale-105" 
                            : "bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200"
                        )}
                      >
                        Orange
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedOperator('MTN MoMo')}
                        className={cn(
                          "py-3 rounded-xl text-xs font-black transition-all",
                          selectedOperator === 'MTN MoMo' 
                            ? "bg-[#FFCC00] text-gray-900 shadow-lg shadow-yellow-500/20 scale-105" 
                            : "bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200"
                        )}
                      >
                        MTN MoMo
                      </button>
                    </div>
                  </div>

                  <div className="mb-6 text-left">
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">NUMÉRO MOBILE MONEY :</label>
                    <input
                      type="tel"
                      value={paymentPhoneNumber}
                      onChange={(e) => setPaymentPhoneNumber(e.target.value)}
                      placeholder="Ex: 0707070707"
                      className="w-full bg-gray-50 border border-gray-200 focus:border-green-500 rounded-xl px-4 py-3 text-xs font-bold text-gray-800 focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
                    <DollarSign size={36} />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Confirmer la Commande</h3>
                  
                  <p className="text-gray-500 text-xs mb-8 leading-relaxed font-bold px-4">
                    Pas de prépaiement requis. Vous réglerez le montant de <span className="text-green-600 font-black text-sm">{totalPrice.toLocaleString()} F CFA</span> directement <span className="text-amber-600 underline">en espèces</span> au prestataire de service après exécution de sa tâche.
                  </p>
                </>
              )}

              <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl text-left text-[10px] font-black text-gray-500 mb-6 space-y-2 uppercase">
                <p>🙋 Commanditaire : {currentUser.name}</p>
                <p>📞 Contact : {currentUser.phone}</p>
                <p>📍 Lieu de l'intervention : {location.split('(')[0]}</p>
                {selectedCategory === ServiceCategory.MARKET ? (
                  <p className="text-green-600">💳 Règlement : Mobile Money ({selectedOperator} - {paymentPhoneNumber})</p>
                ) : (
                  <p className="text-amber-600">💵 Règlement : Espèces (Main à main)</p>
                )}
              </div>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmPayment}
                  disabled={isProcessingPayment}
                  className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-semibold text-base hover:bg-gray-200 flex items-center justify-center active:scale-95 transition-all"
                >
                  {isProcessingPayment ? <Loader2 className="animate-spin" size={20} /> : (selectedCategory === ServiceCategory.MARKET ? "Payer & Envoyer l'ordre" : "Confirmer & Commander")}
                </button>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full py-3 text-gray-400 font-black uppercase tracking-[0.2em] text-[8.5px] border border-gray-200 bg-white rounded-lg hover:text-gray-600"
                >
                  Revenir en arrière
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PRINTABLE RECEIPT POP-UP FOR DELIVERY ORDERS (RECEIPT TEMPLATE) */}
      <AnimatePresence>
        {receiptModel && (
          <div className="fixed inset-0 z-[100] bg-gray-50/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col justify-between max-h-[90vh] overflow-y-auto shadow-2xl relative">
              <button 
                type="button" 
                onClick={() => setReceiptModel(null)}
                className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>

              {/* Printable Block Wrapper */}
              <div id="printable-receipt" className="p-4 bg-gray-50 border border-gray-200/50 rounded-2xl font-mono text-xs text-gray-800 space-y-4">
                
                {/* Receipt Header */}
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black tracking-tighter text-green-600">*** SERVI+ SERVICES ***</h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Abidjan, Côte d'Ivoire</p>
                  <p className="text-[8px] font-medium">Date: {new Date(receiptModel.createdAt).toLocaleString('fr-FR')}</p>
                  <p className="text-[8px] font-bold">N° Facture: {receiptModel.id.toUpperCase()}</p>
                  <div className="border-b border-dashed border-gray-300 my-2" />
                </div>

                {/* Customer Info */}
                <div className="space-y-1 text-[9px] uppercase">
                  <p className="font-bold text-gray-900">Client: {receiptModel.clientName}</p>
                  <p>Contact Direct: {receiptModel.clientPhone || "Non renseigné"}</p>
                  <p>Lieu de Livraison: {receiptModel.location}</p>
                  <p className="text-[8px] italic lowercase text-gray-400">Position: Lat {receiptModel.latitude?.toFixed(4)}, Lng {receiptModel.longitude?.toFixed(4)}</p>
                  <div className="border-b border-dashed border-gray-300 my-2" />
                </div>

                {/* Items Block or Hourly details */}
                {receiptModel.category === ServiceCategory.MARKET ? (
                  <>
                    <div className="space-y-1.5">
                      <p className="font-black text-[9px] uppercase text-blue-950 tracking-wider">PROVISIONS DU MARCHÉ :</p>
                      {receiptModel.marketItems && receiptModel.marketItems.length > 0 ? (
                        <div className="space-y-1">
                          {receiptModel.marketItems.map((item, index) => (
                            <div key={index} className="flex justify-between text-[10px]">
                              <span>{index + 1}. {item.name}</span>
                              <span className="font-black">{item.price.toLocaleString()} F</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[9px] text-gray-400 italic">Aucun article enregistré</p>
                      )}
                      <div className="border-b border-dashed border-gray-300 my-2" />
                    </div>

                    {/* Receipt Footer Calculations */}
                    <div className="text-[10px] space-y-1 font-black uppercase text-gray-800">
                      <div className="flex justify-between">
                        <span>Articles Marché</span>
                        <span>{(receiptModel.marketItems?.reduce((acc, idx) => acc + idx.price, 0) || 0).toLocaleString()} F CFA</span>
                      </div>
                      <div className="flex justify-between text-gray-600 text-[9px]">
                        <span>Emballage</span>
                        <span>300 F CFA</span>
                      </div>
                      <div className="flex justify-between text-gray-600 text-[9px]">
                        <span>Prestation de course</span>
                        <span>500 F CFA</span>
                      </div>
                      <div className="flex justify-between text-gray-600 text-[9px]">
                        <span>Livraison</span>
                        <span>1 000 F CFA</span>
                      </div>
                      {receiptModel.bonus && receiptModel.bonus > 0 && (
                        <div className="flex justify-between text-amber-600 text-[9px] font-black">
                          <span>Bonus d'incitation 🎁</span>
                          <span>{receiptModel.bonus.toLocaleString()} F CFA</span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-1 flex justify-between text-sm text-green-600 font-black">
                        <span>MONTANT TOTAL :</span>
                        <span>{receiptModel.totalPrice.toLocaleString()} F CFA</span>
                      </div>
                    </div>
                  </>
                ) : receiptModel.category === ServiceCategory.LAUNDRY ? (
                  <>
                    <div className="space-y-1.5 text-[10px]">
                      <p className="font-black text-[9px] uppercase text-blue-950 tracking-wider">LESSIVE & REPASSAGE :</p>
                      <div className="flex justify-between">
                        <span>Quantité d'habits</span>
                        <span className="font-black">{receiptModel.quantity || 10} vêtement(s)</span>
                      </div>
                      <div className="flex justify-between text-gray-600 text-[9px]">
                        <span>Tarif unitaire</span>
                        <span>300 F CFA / habit</span>
                      </div>
                      <div className="border-b border-dashed border-gray-300 my-2" />
                    </div>

                    <div className="text-[10px] space-y-1 font-black uppercase text-gray-800">
                      {receiptModel.bonus && receiptModel.bonus > 0 && (
                        <div className="flex justify-between text-amber-600 text-[9px] font-black pb-1">
                          <span>Bonus d'incitation 🎁</span>
                          <span>{receiptModel.bonus.toLocaleString()} F CFA</span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-1 flex justify-between text-sm text-green-600 font-black">
                        <span>MONTANT TOTAL :</span>
                        <span>{receiptModel.totalPrice.toLocaleString()} F CFA</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5 text-[10px]">
                      <p className="font-black text-[9px] uppercase text-blue-950 tracking-wider">SERVICES DE {receiptModel.category.toUpperCase()} :</p>
                      <div className="flex justify-between">
                        <span>Durée calculée</span>
                        <span className="font-black">{receiptModel.durationHours} Heure(s)</span>
                      </div>
                      <div className="flex justify-between text-gray-600 text-[9px]">
                        <span>Durée minimale exigée</span>
                        <span>2 Heures</span>
                      </div>
                      <div className="border-b border-dashed border-gray-300 my-2" />
                    </div>

                    <div className="text-[10px] space-y-1 font-black uppercase text-gray-800">
                      <div className="flex justify-between">
                        <span>Forfait Base de 2h</span>
                        <span>3 500 F CFA</span>
                      </div>
                      <div className="flex justify-between text-gray-600 text-[9px]">
                        <span>Heure(s) sup ({Math.max(0, (receiptModel.durationHours || 2) - 2).toFixed(1)}h × 1500 F)</span>
                        <span>{(Math.max(0, (receiptModel.durationHours || 2) - 2) * 1500).toLocaleString()} F CFA</span>
                      </div>
                      {receiptModel.bonus && receiptModel.bonus > 0 && (
                        <div className="flex justify-between text-amber-600 text-[9px] font-black">
                          <span>Bonus d'incitation 🎁</span>
                          <span>{receiptModel.bonus.toLocaleString()} F CFA</span>
                        </div>
                      )}
                      <div className="border-t border-gray-200 pt-1 flex justify-between text-sm text-green-600 font-black">
                        <span>MONTANT TOTAL :</span>
                        <span>{receiptModel.totalPrice.toLocaleString()} F CFA</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="text-center pt-3 italic text-[8px] text-gray-400">
                  Merci de faire confiance à Servi+ !<br />
                  Le reçu est à joindre à votre carton de livraison d'Abidjan.
                </div>
              </div>

              {/* Action Rows */}
              <div className="flex flex-col gap-2 mt-6">
                <button 
                  onClick={triggerReceiptPrint}
                  className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition"
                >
                  <Printer size={16} /> Imprimer mon Reçu Officiel
                </button>
                <p className="text-[7.5px] text-center text-gray-400 font-bold uppercase">L'impression formatera le reçu pour l'imprimante thermique de livraison.</p>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* EVALUATION / RATING MODAL */}
      <AnimatePresence>
        {ratingMission && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md text-center shadow-2xl relative overflow-hidden border border-gray-100"
            >
              <button 
                onClick={() => setRatingMission(null)}
                className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-50 transition-colors animate-fade-in"
              >
                <X size={20} />
              </button>

              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
                <Star size={32} className="fill-current animate-bounce" />
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-1">Évaluer le Prestataire</h3>
              <p className="text-xs text-gray-400 font-bold uppercase mb-6">Mission : {ratingMission.category}</p>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/80 mb-6 text-left space-y-1.5 uppercase text-[10px] text-gray-500 font-black font-mono">
                <p>👤 Prestataire : {ratingMission.providerName || "Prestataire assigné"}</p>
                <p>📍 Adresse de la mission : {ratingMission.location.split('(')[0]}</p>
                <p>💵 Montant total : {ratingMission.totalPrice.toLocaleString()} FCFA</p>
              </div>

              <form onSubmit={handleSubmitRating} className="space-y-6">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase tracking-widest font-black mb-3">Note de satisfaction</label>
                  <div className="flex justify-center gap-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRatingValue(star)}
                        className="transition-transform active:scale-90 p-1 hover:scale-110"
                      >
                        <Star 
                          size={36} 
                          className={cn(
                            "transition-colors duration-100", 
                            star <= ratingValue ? "text-amber-400 fill-amber-400" : "text-gray-300"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] font-black text-amber-600 mt-2 uppercase tracking-wide">
                    {ratingValue === 5 ? "⭐️ Excellent" : 
                     ratingValue === 4 ? "⭐️ Très bon" : 
                     ratingValue === 3 ? "⭐️ Satisfaisant" : 
                     ratingValue === 2 ? "⭐️ Moyen" : "⭐️ Insatisfaisant"}
                  </p>
                </div>

                <div className="space-y-1 text-left font-sans">
                  <label className="block text-[10px] text-gray-400 uppercase tracking-widest font-black pl-1">Vos commentaires ou remarques</label>
                  <textarea
                    placeholder="Saisissez des détails sur la ponctualité, l'amabilité ou le travail accompli par le prestataire..."
                    value={ratingComment}
                    onChange={(e) => setRatingComment(e.target.value)}
                    rows={3}
                    className="w-full text-xs font-bold p-4 bg-gray-50 border border-gray-200 outline-none rounded-2xl focus:border-amber-400 focus:bg-white transition-all resize-none text-gray-700 font-sans"
                    maxLength={200}
                  />
                  <div className="flex justify-end pr-1">
                    <span className="text-[9px] font-bold text-gray-400">{ratingComment.length}/200 caractères</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Check size={16} /> Enregistrer mon évaluation
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ORDER SUCCESS NOTIFICATION MODAL */}
      <AnimatePresence>
        {showOrderSuccessModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-gray-50/80 backdrop-blur-md flex items-center justify-center p-4 font-sans select-none"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl relative overflow-hidden border border-gray-100"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <Check className="stroke-[3px]" size={32} />
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-1">Transmission Réussie !</h3>
              <p className="text-[10px] text-emerald-600 font-black uppercase mb-4 tracking-wider">Formulaire bien envoyé</p>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/80 mb-6 text-left space-y-2.5 text-xs font-semibold leading-relaxed text-gray-600">
                <p>
                  Votre demande pour la catégorie <strong className="text-green-600">{lastCreatedCategory || "Missions"}</strong> a été transmise avec succès aux administrateurs.
                </p>
                <div className="flex gap-2 items-start mt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-600 shrink-0 mt-1.5" />
                  <p className="font-semibold text-gray-800">
                    S'affiche directement dans votre liste de missions pour le suivi en temps réel.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2 font-sans">
                <button
                  onClick={() => {
                    setShowOrderSuccessModal(false);
                    if (setActiveTab) {
                      setActiveTab('missions');
                    }
                  }}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Briefcase size={14} /> Voir mes missions
                </button>
                <button
                  onClick={() => setShowOrderSuccessModal(false)}
                  className="w-full bg-white text-gray-400 font-bold uppercase tracking-wider text-[10px] py-2 hover:text-gray-600 transition-all"
                >
                  Retour
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CUSTOMIZED PROFILE SUCCESS MODAL */}
      <AnimatePresence>
        {showProfileSuccessModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-50/70 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl border border-gray-100"
            >
              <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <Check className="stroke-[3px]" size={32} />
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-1 font-sans">Mise à jour Réussie !</h3>
              <p className="text-[10px] text-emerald-600 font-extrabold uppercase mb-4 tracking-wider">Modifications enregistrées</p>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100/80 mb-6 text-left space-y-2.5 text-xs font-semibold leading-relaxed text-gray-600">
                <p>
                  Vos informations de profil ont été enregistrées avec succès et appliquées à votre compte Servi+.
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
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
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
            className="fixed inset-0 z-50 bg-gray-50/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-2xl border border-rose-100"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-200">
                <Trash2 className="stroke-[2.5px]" size={30} />
              </div>

              <h3 className="text-xl font-black text-gray-900 mb-1 font-sans">Désinscription définitive ?</h3>
              <p className="text-[10px] text-rose-600 font-mono font-black uppercase mb-4 tracking-widest">⚠️ ACTION IRREVOCABLE</p>

              <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100/60 mb-6 text-left space-y-2.5 text-xs font-semibold leading-relaxed text-rose-800">
                <p>
                  Êtes-vous sûr de vouloir supprimer définitivement votre application et vous désinscrire de la plateforme ?
                </p>
                <p className="text-[11px] text-rose-600 font-bold">
                  Toutes vos informations personnelles et historiques de missions seront définitivement et automatiquement détruits de la base de données.
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
                  className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
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

      {/* ══════════════════════════════════════
          PANNEAU RÉCLAMATION (Bottom Sheet)
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showClaimPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end"
            onClick={(e) => { if (e.target === e.currentTarget) setShowClaimPanel(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 300 }}
              className="w-full bg-white rounded-t-[28px] max-h-[88vh] flex flex-col"
            >
              {/* Header */}
              <div className="px-5 pt-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-600 p-2.5 rounded-xl text-white shrink-0">
                      <MessageSquare size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">Réclamation & Suggestions</h3>
                      <p className="text-xs text-gray-500 mt-0.5">Litige, réclamation ou suggestion — on vous écoute.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowClaimPanel(false)}
                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Contenu */}
              <div className="overflow-y-auto flex-1 px-5 py-5 pb-8">
                {claimSubmitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center text-center py-10 gap-4"
                  >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle size={36} className="text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg">Message envoyé !</h4>
                      <p className="text-sm text-gray-500 mt-1 leading-relaxed max-w-xs">
                        Votre message a été transmis à l'équipe Servi+.<br/>
                        Nous vous répondrons rapidement par appel ou SMS.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setClaimSubmitted(false); setClaimSubject(''); setClaimMessage(''); }}
                      className="mt-2 bg-green-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition"
                    >
                      Envoyer un autre message
                    </button>
                    <button
                      type="button"
                      onClick={() => { setClaimSubmitted(false); setShowClaimPanel(false); }}
                      className="text-gray-400 text-xs font-medium hover:underline"
                    >
                      Fermer
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={(e) => { handleClaimSubmit(e); }} className="space-y-5">

                    {/* Type de demande */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-gray-700">Type de demande</p>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { key: 'dispute', icon: '⚠️', label: 'Litige' },
                          { key: 'claim',   icon: '💸', label: 'Réclamation' },
                          { key: 'suggestion', icon: '💡', label: 'Suggestion' },
                        ] as const).map(({ key, icon, label }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setClaimType(key)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all",
                              claimType === key
                                ? "border-green-500 bg-green-50"
                                : "border-gray-200 bg-white hover:border-green-200"
                            )}
                          >
                            <span className="text-xl">{icon}</span>
                            <span className={cn(
                              "text-[10px] font-semibold",
                              claimType === key ? "text-green-700" : "text-gray-500"
                            )}>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sujet */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Sujet</label>
                      <input
                        type="text"
                        placeholder="Ex: Retard d'intervention, remboursement..."
                        value={claimSubject}
                        onChange={(e) => setClaimSubject(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all"
                      />
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Votre message</label>
                      <textarea
                        placeholder="Décrivez votre situation en détails. Plus c'est précis, plus nous pourrons vous aider rapidement..."
                        value={claimMessage}
                        onChange={(e) => setClaimMessage(e.target.value)}
                        rows={5}
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100 transition-all resize-none leading-relaxed"
                      />
                      <p className="text-[10px] text-gray-400 text-right">{claimMessage.length}/500</p>
                    </div>

                    {/* Info */}
                    <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
                      <Info size={14} className="text-green-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-green-700 leading-relaxed">
                        Votre demande sera traitée par notre équipe dans les <strong>24 à 48 heures</strong>. Nous vous répondrons par appel ou SMS au <strong>{currentUser.phone}</strong>.
                      </p>
                    </div>

                    {/* Bouton */}
                    <button
                      type="submit"
                      disabled={isSubmittingClaim}
                      className="w-full bg-green-600 text-white py-4 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-700 active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(22,163,74,0.25)] disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmittingClaim
                        ? <><Loader2 className="animate-spin" size={16} /> Envoi en cours...</>
                        : <><Send size={15} /> Soumettre ma demande</>
                      }
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════
          PANNEAU FORMATION (Bottom Sheet)
      ══════════════════════════════════════ */}
      <AnimatePresence>
        {showTrainingPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end"
            onClick={(e) => { if (e.target === e.currentTarget) setShowTrainingPanel(false); }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 300 }}
              className="w-full bg-white rounded-t-[28px] max-h-[92vh] flex flex-col"
            >
              {/* Header sticky */}
              <div className="sticky top-0 bg-white z-10 px-5 pt-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-xl">🎓</div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">Conseils & Formation</h3>
                      <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wide">Tutoriels & Aptitudes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowTrainingPanel(false)}
                    className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              {/* Contenu scrollable */}
              <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4 pb-8">
                {config.trainingContent && config.trainingContent.filter(item => item.target === 'CLIENT').length === 0 ? (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">📚</div>
                    <p className="text-gray-400 font-semibold text-sm">Aucun contenu disponible pour le moment</p>
                    <p className="text-gray-300 text-xs mt-1">Revenez bientôt pour de nouvelles formations !</p>
                  </div>
                ) : (
                  config.trainingContent && config.trainingContent.filter(item => item.target === 'CLIENT').map((item) => {
                    const isDone = quizDone[item.id];
                    return (
                      <div key={item.id} className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                        {/* Item header */}
                        <div className="p-4 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="bg-white border border-gray-200 text-gray-600 text-[9px] font-semibold px-2 py-0.5 rounded-full">
                                💡 {item.category || "Général"}
                              </span>
                              {item.type === 'test' && (
                                <span className={cn(
                                  "text-[9px] font-semibold px-2 py-0.5 rounded-full",
                                  isDone ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-green-50 text-green-600 border border-green-200"
                                )}>
                                  {isDone ? "✓ Certifié" : "Test"}
                                </span>
                              )}
                              {item.type === 'video' && (
                                <span className="bg-rose-50 text-rose-600 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-rose-200">▶ Vidéo</span>
                              )}
                              {item.type === 'image' && (
                                <span className="bg-sky-50 text-sky-600 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-sky-200">🖼 Guide</span>
                              )}
                            </div>
                            <h5 className="font-bold text-sm text-gray-900 leading-tight">{item.title}</h5>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                          </div>
                          {isDone && (
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                              <CheckCircle size={16} className="text-emerald-600" />
                            </div>
                          )}
                        </div>

                        {/* Vidéo */}
                        {item.type === 'video' && item.url && (
                          <div className="relative aspect-video overflow-hidden bg-gray-900 border-t border-gray-100">
                            <iframe src={item.url} title={item.title} className="absolute inset-0 w-full h-full border-none" allowFullScreen referrerPolicy="no-referrer" />
                          </div>
                        )}

                        {/* Image */}
                        {item.type === 'image' && item.url && (
                          <div className="relative h-44 overflow-hidden border-t border-gray-100">
                            <img src={item.url} className="w-full h-full object-cover" alt={item.title} referrerPolicy="no-referrer" />
                          </div>
                        )}

                        {/* Quiz */}
                        {item.type === 'test' && item.questions && item.questions.length > 0 && (
                          <div className="p-4 border-t border-gray-100 space-y-4">
                            {isDone ? (
                              <div className="flex flex-col items-center py-4 gap-2">
                                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                                  <span className="text-2xl">🔥</span>
                                </div>
                                <p className="font-bold text-sm text-gray-900 text-center">Test réussi !</p>
                                <p className="text-xs text-emerald-600 font-medium text-center">Badge d'Aptitude acquis</p>
                                <button
                                  type="button"
                                  onClick={() => setQuizDone(prev => ({ ...prev, [item.id]: false }))}
                                  className="text-xs text-rose-500 hover:underline font-semibold mt-1"
                                >
                                  Recommencer
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {item.questions.map((q, qIdx) => {
                                  const currentSelect = quizResponses[item.id]?.[qIdx];
                                  const isCorrect = currentSelect === q.answerIdx;
                                  return (
                                    <div key={qIdx} className="space-y-2">
                                      <p className="text-xs font-bold text-gray-800 leading-snug">
                                        <span className="text-green-600 font-bold mr-1">Q{qIdx + 1}.</span>
                                        {q.question}
                                      </p>
                                      <div className="space-y-1.5">
                                        {q.options.map((opt, optIdx) => {
                                          const isChosen = currentSelect === optIdx;
                                          const isCorrectOption = optIdx === q.answerIdx;
                                          return (
                                            <button
                                              key={optIdx}
                                              type="button"
                                              onClick={() => setQuizResponses(prev => ({
                                                ...prev,
                                                [item.id]: { ...(prev[item.id] || {}), [qIdx]: optIdx }
                                              }))}
                                              className={cn(
                                                "w-full text-left px-4 py-3 rounded-xl text-xs font-medium border transition-all flex items-center gap-2",
                                                isChosen && isCorrectOption ? "bg-emerald-50 border-emerald-500 text-emerald-800" :
                                                isChosen && !isCorrectOption ? "bg-rose-50 border-rose-400 text-rose-800" :
                                                "bg-white border-gray-200 text-gray-700 hover:border-green-300"
                                              )}
                                            >
                                              <span className={cn(
                                                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 border",
                                                isChosen && isCorrectOption ? "bg-emerald-500 border-emerald-500 text-white" :
                                                isChosen && !isCorrectOption ? "bg-rose-400 border-rose-400 text-white" :
                                                "bg-gray-100 border-gray-200 text-gray-500"
                                              )}>
                                                {String.fromCharCode(65 + optIdx)}
                                              </span>
                                              {opt}
                                            </button>
                                          );
                                        })}
                                      </div>
                                      {currentSelect !== undefined && (
                                        <p className={cn("text-[10px] font-semibold ml-1", isCorrect ? "text-emerald-600" : "text-rose-500")}>
                                          {isCorrect ? "✓ Bonne réponse ! +15 pts" : "✗ Incorrect, modifiez votre choix"}
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
                                    if (allCorrect) { setQuizDone(prev => ({ ...prev, [item.id]: true })); }
                                    else { alert("⚠️ Certaines réponses sont incorrectes ou manquantes."); }
                                  }}
                                  className="w-full py-3.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 active:scale-95 transition shadow-sm"
                                >
                                  Valider mes réponses
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
