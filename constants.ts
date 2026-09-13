import { ServiceCategory, User, UserRole, Mission, MissionStatus, Transaction } from './types';
import { Home, Utensils, HeartHandshake, Flower2, Shirt, Baby, ShoppingBasket, HelpCircle } from 'lucide-react';

export const SERVICE_ICONS: Record<ServiceCategory, any> = {
  [ServiceCategory.CLEANING]: Home,
  [ServiceCategory.COOKING]: Utensils,
  [ServiceCategory.ELDERLY_CARE]: HeartHandshake,
  [ServiceCategory.GARDENING]: Flower2,
  [ServiceCategory.LAUNDRY]: Shirt,
  [ServiceCategory.BABYSITTING]: Baby,
  [ServiceCategory.MARKET]: ShoppingBasket,
};

export const BASE_RATES: Record<ServiceCategory, number> = {
  [ServiceCategory.CLEANING]: 2500,
  [ServiceCategory.COOKING]: 3500,
  [ServiceCategory.ELDERLY_CARE]: 3500,
  [ServiceCategory.GARDENING]: 3000,
  [ServiceCategory.LAUNDRY]: 3000,
  [ServiceCategory.BABYSITTING]: 2000,
  [ServiceCategory.MARKET]: 0,
};

export const LAUNDRY_MIN_QTY = 20;
export const LAUNDRY_MIN_PRICE = 3000;
export const LAUNDRY_EXTRA_PRICE = 150;
export const MARKET_PACKAGING_FEE = 200;
export const MARKET_SERVICE_FEE = 500;
export const MARKET_DELIVERY_FEE = 1000;
export const COMMISSION_RATE = 0;

export const CITIES = [
  'Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro', 'Korhogo', 'Man', 'Gagnoa'
];

export const ABIDJAN_ZONES = [
  'Cocody', 'Yopougon', 'Abobo', 'Adjamé', 'Plateau',
  'Marcory', 'Koumassi', 'Port-Bouët', 'Treichville',
  'Attécoubé', 'Bingerville', 'Anyama',
];

export const MOCK_USERS: User[] = [
  {
    id: 'u1',
    name: 'Client Demo',
    email: 'client@serviplus.ci',
    phone: '0103030334',
    role: UserRole.CLIENT,
    avatarUrl: 'https://ui-avatars.com/api/?name=Client&background=16a34a&color=fff',
    address: 'Cocody, Abidjan',
    city: 'Abidjan',
    walletBalance: 0,
    password: '1234'
  },
  {
    id: 'u2',
    name: 'Prestataire Demo',
    email: 'presta@serviplus.ci',
    phone: '0554199359',
    role: UserRole.PROVIDER,
    avatarUrl: 'https://ui-avatars.com/api/?name=Presta&background=orange&color=fff',
    address: 'Yopougon, Abidjan',
    city: 'Abidjan',
    services: [ServiceCategory.CLEANING, ServiceCategory.COOKING],
    verified: true,
    rating: 4.8,
    walletBalance: 15000,
    password: '1234'
  },
  {
    id: 'u3',
    name: 'Admin Demo',
    email: 'admin@serviplus.ci',
    phone: '0749793516',
    role: UserRole.ADMIN,
    avatarUrl: 'https://ui-avatars.com/api/?name=Admin&background=purple&color=fff',
    password: '1234',
    isSuperAdmin: true
  }
];

export const MOCK_MISSIONS: Mission[] = [];
export const MOCK_TRANSACTIONS: Transaction[] = [];