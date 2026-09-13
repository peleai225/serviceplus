import { ServiceCategory } from '../types';
import { db } from './firebase';
import * as firestoreModule from 'firebase/firestore';
const { doc, getDoc, setDoc, onSnapshot } = firestoreModule as any;

export interface FlashAnnouncement {
  id: string;
  text: string;
  type: 'promo' | 'flash' | 'info';
  target: 'ALL' | 'CLIENT' | 'PROVIDER';
  active: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIdx: number;
}

export interface TrainingItem {
  id: string;
  title: string;
  type: 'video' | 'test' | 'image';
  url?: string;
  target: 'CLIENT' | 'PROVIDER';
  category: string;
  description: string;
  questions?: QuizQuestion[];
}

export interface PlatformOffer {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string; // tailwind class string e.g. 'bg-amber-400 text-amber-900'
  gradient: string;   // e.g. 'from-green-700/80 to-emerald-600/80'
  bgImage: string;    // filename in /public e.g. '/offer_pro.jpg'
  zones: string[];    // ['ALL'] or ['Cocody', 'Yopougon'] etc.
  cta: string;
}

export interface AppConfig {
  enableHourExtension: boolean;
  enableFingerprint: boolean;
  enable2FA: boolean;
  enableTrainingSection: boolean;
  cityAvailability: Record<string, boolean>;
  serviceAvailability: Record<string, boolean>;
  flashAnnouncements: FlashAnnouncement[];
  trainingContent: TrainingItem[];
  platformOffers?: PlatformOffer[];
  baseRates?: Record<string, number>;
}

const DEFAULT_CONFIG: AppConfig = {
  enableHourExtension: true,
  enableFingerprint: true,
  enable2FA: true,
  enableTrainingSection: true,
  cityAvailability: {
    'Abidjan': true,
    'Bouaké': true,
    'Daloa': true,
    'Yamoussoukro': true,
    'San-Pédro': false,
    'Korhogo': false,
    'Man': true,
    'Gagnoa': true
  },
  serviceAvailability: {
    [ServiceCategory.CLEANING]: true,
    [ServiceCategory.COOKING]: true,
    [ServiceCategory.ELDERLY_CARE]: true,
    [ServiceCategory.GARDENING]: true,
    [ServiceCategory.LAUNDRY]: true,
    [ServiceCategory.BABYSITTING]: true,
    [ServiceCategory.MARKET]: true,
  },
  flashAnnouncements: [
    {
      id: 'flash_1',
      text: '🎉 OFFRE EXCEPTIONNELLE : Profitez de mise en relation 100% Gratuite sans aucun frais intermédiaire !',
      type: 'promo',
      target: 'ALL',
      active: true
    }
  ],
  trainingContent: [
    {
      id: 'train_1',
      title: 'Guide de Politesse et Respect chez le Client',
      type: 'video',
      url: 'https://www.youtube.com/embed/ysz5S6PUM-U',
      target: 'PROVIDER',
      category: 'Général',
      description: "Visionnez cette courte vidéo de formation essentielle sur la déontologie, le respect du domicile d'Abidjan et les consignes de professionnalisme."
    },
    {
      id: 'train_2',
      title: 'Nettoyage professionnel des sols & vitres',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600',
      target: 'PROVIDER',
      category: ServiceCategory.CLEANING,
      description: 'Découvrez en image les méthodes recommandées pour un nettoyage optimal sans altérer les surfaces du client.'
    },
    {
      id: 'train_3',
      title: "Test d'aptitude : Hygiène Alimentaire",
      type: 'test',
      target: 'PROVIDER',
      category: ServiceCategory.COOKING,
      description: "Répondez correctement à ces questions pour obtenir la certification d'Hygiène Alimentaire sur votre profil de prestataire.",
      questions: [
        {
          question: "À quelle fréquence faut-il nettoyer les planches à découper pendant la préparation des repas ?",
          options: [
            "Une seule fois à la fin de la journée",
            "Immédiatement après chaque aliment différent, particulièrement après les viandes crues",
            "Uniquement quand elle paraît sale",
            "Toutes les deux heures de travail"
          ],
          answerIdx: 1
        },
        {
          question: "Quel est le meilleur moyen de décongeler une daurade ou de la viande en toute sécurité ?",
          options: [
            "Laisser reposer à l'air ambiant dans la cuisine toute l'après-midi",
            "La plonger dans de l'eau tiède pendant deux heures",
            "Placer au réfrigérateur entre 0°C et 4°C de manière progressive",
            "Chauffer directement au four à haute température"
          ],
          answerIdx: 2
        }
      ]
    },
    {
      id: 'train_4',
      title: 'Conseils pour bien spécifier vos besoins de courses',
      type: 'video',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      target: 'CLIENT',
      category: ServiceCategory.MARKET,
      description: 'Une démonstration en vidéo pour vous montrer comment saisir et estimer au mieux les ingrédients du marché.'
    },
    {
      id: 'train_5',
      title: 'Test de sécurité : Sécurité domestique des enfants',
      type: 'test',
      target: 'CLIENT',
      category: ServiceCategory.BABYSITTING,
      description: "Prenez 2 minutes pour tester vos consignes de sécurité indispensables pour nos babysitters d'Abidjan.",
      questions: [
        {
          question: "Quel est le premier geste à faire pour protéger les prises électriques ?",
          options: [
            "Interdire l'accès de la pièce aux enfants",
            "Installer des cache-prises homologués",
            "Masquer la prise derrière un meuble lourd",
            "Débrancher le disjoncteur général"
          ],
          answerIdx: 1
        }
      ]
    }
  ]
};

const FIRESTORE_CONFIG_DOC = 'platform/config';
const LS_KEY = 'serviplus_app_config';

// Synchronous read — returns cached localStorage value (fast, used on first render)
export const getAppConfig = (): AppConfig => {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch {}
  return DEFAULT_CONFIG;
};

// Async read from Firestore — call once on admin panel mount
export const loadAppConfigFromFirestore = async (): Promise<AppConfig> => {
  try {
    const snap = await getDoc(doc(db, FIRESTORE_CONFIG_DOC));
    if (snap.exists()) {
      const data = { ...DEFAULT_CONFIG, ...snap.data() } as AppConfig;
      localStorage.setItem(LS_KEY, JSON.stringify(data));
      return data;
    }
  } catch (e) {
    console.warn("Could not load config from Firestore, using cache:", e);
  }
  return getAppConfig();
};

// Subscribe to real-time config changes (call in admin panel)
export const subscribeAppConfig = (callback: (cfg: AppConfig) => void): (() => void) => {
  try {
    return onSnapshot(doc(db, FIRESTORE_CONFIG_DOC), (snap: any) => {
      if (snap.exists()) {
        const data = { ...DEFAULT_CONFIG, ...snap.data() } as AppConfig;
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        callback(data);
      }
    });
  } catch {
    return () => {};
  }
};

// Save to both Firestore and localStorage
export const saveAppConfig = async (config: AppConfig): Promise<void> => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(config));
    await setDoc(doc(db, FIRESTORE_CONFIG_DOC), JSON.parse(JSON.stringify(config)));
  } catch (e) {
    console.error("Failed to persist app config to Firestore:", e);
    // localStorage already saved above, so the admin won't lose their changes
  }
};
