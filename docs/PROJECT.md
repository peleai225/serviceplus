# Servi+ — Documentation Projet

> Dernière mise à jour : septembre 2026

---

## 1. Présentation

**Servi+** est une marketplace de services à domicile destinée au marché ivoirien (Côte d'Ivoire). Elle met en relation des **clients** ayant besoin de services (ménage, cuisine, garde d'enfants, jardinage, etc.) avec des **prestataires** qualifiés disponibles dans leur zone géographique.

### Périmètre fonctionnel

- Réservation en ligne de services à domicile dans plusieurs villes de Côte d'Ivoire (Abidjan et ses communes, Daloa, Bouaké, etc.)
- Paiement des abonnements prestataire via Mobile Money (Jèko Pay)
- Retrait des gains prestataire vers Mobile Money (Jèko Pay)
- Tableau de bord administrateur complet avec gestion des utilisateurs, finances, litiges et paramètres
- Application mobile Android via Capacitor (wrapper natif de la PWA)
- Assistance IA (Gemini) pour l'estimation de durée et de prix des missions

---

## 2. Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Framework frontend | React | 19.x |
| Langage | TypeScript | ~5.8 |
| Build | Vite | 6.x |
| CSS | Tailwind CSS (v4, plugin Vite) | 4.x |
| Animations | Motion (Framer Motion) | 12.x |
| Icônes | Lucide React | 0.555+ |
| Graphiques | Recharts | 3.x |
| Cartes | Leaflet + React-Leaflet | 1.9 / 5.x |
| Base de données | Firebase Firestore (temps réel) | SDK 12.x |
| Authentification | Firebase Auth (anonyme) + couche custom téléphone/mot de passe | 12.x |
| Fichiers | Firebase Storage | 12.x |
| Backend | Firebase Cloud Functions v2 | — |
| Hébergement | Firebase Hosting | — |
| Paiement | Jèko Pay API (Mobile Money CI) | — |
| IA | Google Gemini 2.5 Pro (`@google/genai`) | 1.x |
| Mobile | Capacitor (Android) | 8.x |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Navigateur / App Android           │
│  React 19 SPA (Vite build → dist/)                  │
│                                                      │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────┐ │
│  │   Client   │  │   Prestataire   │  │  Admin   │ │
│  │ Dashboard  │  │   Dashboard     │  │ Dashboard│ │
│  └────────────┘  └─────────────────┘  └──────────┘ │
│         │                │                  │        │
│         └────────────────┴──────────────────┘        │
│                          │                           │
│               services/ (Firebase SDK)               │
└──────────────────────────┬──────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
  Firebase Hosting   Firestore (onSnapshot)  Firebase Storage
  (CDN statique)     (sync temps réel)       (avatars, pièces
                                              d'identité)
                           │
                           ▼
               Firebase Auth (Anonymous)
               (signInAnonymously pour
                satisfaire les règles
                Firestore — auth custom
                téléphone+mdp gérée en
                couche applicative)
                           │
                           ▼
               Cloud Functions v2
               (Node.js, region eu-west1)
                  │             │
                  ▼             ▼
            Jèko Pay API    Firestore Admin
            (paiements,     (lecture/écriture
             transferts)     sécurisée)
```

### Points clés de l'architecture

- **Firestore temps réel** : le frontend utilise `onSnapshot` pour maintenir l'état local synchronisé sans polling.
- **Auth hybride** : Firebase Auth anonyme est utilisé uniquement pour satisfaire les règles de sécurité Firestore. L'identification réelle des utilisateurs (téléphone + mot de passe) est gérée dans la collection `users` par la couche applicative.
- **Isolation des clés API** : les clés Jèko Pay ne sont jamais exposées au navigateur ; toutes les interactions avec l'API Jèko transitent par les Cloud Functions.
- **IA Gemini** : utilisée côté client pour suggérer une durée et un prix lors de la création d'une mission (appel direct depuis le navigateur avec la clé `VITE_GEMINI_API_KEY`).

---

## 4. Rôles utilisateurs

### CLIENT (`UserRole.CLIENT`)

Onglets disponibles : **Accueil**, **Missions**, **Profil**

| Fonctionnalité | Description |
|---|---|
| Création de mission | Sélection de catégorie, description, lieu (carte Leaflet), date, durée |
| Estimation IA | Suggestion de durée et de prix via Gemini 2.5 Pro |
| Suivi en temps réel | Statut de la mission, estimation d'arrivée du prestataire |
| Validation / litige | Valider la fin de mission ou ouvrir un litige avec motif |
| Notation | Évaluation du prestataire après mission |
| Bonus | Ajout d'un pourboire au prestataire |
| Extension | Demande d'extension de durée de mission en cours |
| Service marché | Liste d'articles à acheter avec tarification automatique |
| Suppression de compte | Auto-suppression du compte client |

### PRESTATAIRE (`UserRole.PROVIDER`)

Onglets disponibles : **Accueil**, **Missions**, **Gains**, **Profil**

| Fonctionnalité | Description |
|---|---|
| Offres de missions | Réception et acceptation/refus des missions disponibles |
| Gestion des missions | Suivi du statut, navigation GPS (Leaflet), appel client |
| Litige | Ouverture d'un litige depuis la mission |
| Notation clients | Évaluation du client après mission |
| Portefeuille | Solde disponible, historique des transactions |
| Abonnement | Paiement de l'abonnement mensuel/annuel via Jèko Pay |
| Retrait | Demande de retrait des gains vers Mobile Money |
| Formation | Accès aux contenus de formation et quiz publiés par l'admin |
| Profil | Mise à jour des informations, photo, documents d'identité |

### ADMIN (`UserRole.ADMIN`)

Onglets disponibles : **Tableau de bord**, **Utilisateurs**, **Finance**, **Litiges**, **Paramètres**, **Équipe**, **Marché**, **Missions**, **Offres**, **Prestataires**, **Abonnements**, **Contenus**, **Intégrations**, **Profil**

| Fonctionnalité | Description |
|---|---|
| Vue d'ensemble | Statistiques globales (missions, revenus, utilisateurs) |
| Gestion utilisateurs | Vérification, blocage, suppression des comptes |
| Finance | Approbation des retraits, historique des transactions |
| Litiges | Résolution (remboursement client ou paiement prestataire) |
| Paramètres | Tarifs de base par catégorie, taux de commission |
| Équipe | Création de sous-admins avec permissions déléguées par ville |
| Missions | Supervision et modification des missions |
| Offres | Gestion des offres promotionnelles affichées |
| Abonnements | Suivi des abonnements prestataires |
| Contenus | Annonces flash, vidéos de formation, quiz |
| Intégrations | Configuration des clés API Jèko Pay via l'interface |
| Super-admin | Flag `isSuperAdmin` pour les droits complets sans restriction |

---

## 5. Modèles de données

### `User`

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password?: string;        // Jamais persisté en Firestore (règle de sécurité)
  role: UserRole;           // CLIENT | PROVIDER | ADMIN | GUEST
  avatarUrl: string;
  address?: string;
  city?: string;
  zone?: string;
  rating?: number;
  walletBalance?: number;
  verified?: boolean;
  services?: ServiceCategory[];
  isSubscribed?: boolean;
  subscriptionExpiresAt?: string;
  blockedUntil?: string;
  isSuperAdmin?: boolean;
  // Permissions déléguées (sous-admins)
  canManageUsers?: boolean;
  canManageFinance?: boolean;
  canManageDisputes?: boolean;
  canManageSettings?: boolean;
  canManageMarket?: boolean;
  assignedCity?: string;    // Ex : 'Abidjan', 'Daloa', 'Bouaké'
  // Documents d'identité
  idNumber?: string;
  idCardRecto?: string;     // URL Firebase Storage
  idCardVerso?: string;     // URL Firebase Storage
}
```

### `Mission`

```typescript
interface Mission {
  id: string;
  title: string;
  clientId: string;
  providerId?: string;
  category: ServiceCategory;   // Ménage | Cuisine | Jardinage | ...
  description: string;
  location: string;
  city?: string;
  date: string;
  durationHours: number;
  totalPrice: number;
  commission: number;          // Part prélevée par la plateforme
  providerAmount: number;      // Net reversé au prestataire
  status: MissionStatus;       // En attente | Acceptée | En cours | Terminée | ...
  latitude?: number;           // Pour géolocalisation sur carte
  longitude?: number;
  estimatedArrivalTime?: string;
  marketItems?: MarketItem[];  // Pour la catégorie "Faire mon marché"
  disputeReason?: string;
  disputeInitiator?: 'CLIENT' | 'PROVIDER';
  clientRating?: number;
  providerRating?: number;
  paymentMethod?: string;
  extensionStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}
```

Cycle de vie du statut : `En attente` → `Acceptée` → `En cours` → `En attente de paiement` → `Terminée` (ou `En litige` / `Annulée` / `Archivée`)

### `Transaction`

```typescript
interface Transaction {
  id: string;
  amount: number;
  type: 'INCOME' | 'PAYOUT';
  userId: string;
  missionId?: string;
  date: string;
  method: 'Mobile Money' | 'Carte Bancaire' | 'Espèces' | 'Virement';
  status: 'SUCCESS' | 'PENDING_APPROVAL' | 'REJECTED';
}
```

### `AppConfig` (collection `platform/config`)

Configuration dynamique lue depuis Firestore : tarifs de base par catégorie, taux de commission, annonces flash, offres promotionnelles, contenus de formation.

### `AiEstimation`

```typescript
interface AiEstimation {
  estimatedDuration: number;       // Heures estimées
  suggestedPrice: number;          // Prix suggéré en FCFA
  descriptionImprovement: string;  // Suggestion d'amélioration de la description
}
```

---

## 6. Services Firebase

| Service | Utilisation dans Servi+ |
|---|---|
| **Firestore** | Stockage principal : collections `users`, `missions`, `transactions`, `notifications`, `pending_payments`, `platform/config`, `platform/secrets` |
| **Firebase Auth** | `signInAnonymously()` pour satisfaire les règles Firestore. L'auth réelle (téléphone + mot de passe) est gérée en couche applicative dans la collection `users` |
| **Firebase Storage** | Upload des avatars et pièces d'identité des utilisateurs (`avatarUrl`, `idCardRecto`, `idCardVerso`) |
| **Cloud Functions v2** | Toutes les interactions avec l'API Jèko Pay (pas de clés dans le navigateur) |
| **Firebase Hosting** | Hébergement de la SPA React (dossier `dist/`) avec rewrite SPA vers `index.html` |

### Collections Firestore principales

| Collection | Accès client | Description |
|---|---|---|
| `users` | Lecture/écriture (auth anonyme) | Profils utilisateurs |
| `missions` | Lecture/écriture (auth anonyme) | Missions de service |
| `transactions` | Lecture/création (auth anonyme) | Transactions financières |
| `notifications` | Lecture/écriture (auth anonyme) | Notifications in-app |
| `pending_payments` | **Bloqué** (`allow read, write: if false`) | Suivi interne paiements Jèko (Cloud Functions seulement) |
| `platform/config` | Lecture/écriture (auth anonyme) | Configuration dynamique de la plateforme |
| `platform/secrets` | **Bloqué** (`allow read, write: if false`) | Clés API Jèko (Admin SDK seulement) |

---

## 7. Intégration Jèko Pay

Jèko Pay est la passerelle de paiement Mobile Money utilisée en Côte d'Ivoire.

### Flux abonnement prestataire

```
Prestataire        Frontend           Cloud Function        Jèko Pay API
    │                  │                    │                    │
    │ Clique "Souscrire"│                    │                    │
    │─────────────────►│                    │                    │
    │                  │ initiateSubscription│                    │
    │                  │ Payment(ref, amount)│                    │
    │                  │───────────────────►│                    │
    │                  │                    │ createPaymentRequest│
    │                  │                    │───────────────────►│
    │                  │                    │◄─────────────────── │
    │                  │                    │ {redirectUrl, id}  │
    │                  │◄───────────────────│                    │
    │                  │ {checkoutUrl, ref} │                    │
    │ Redirigé vers    │                    │                    │
    │ checkout Jèko   │                    │                    │
    │◄─────────────────│ openCheckout(url)  │                    │
    │ Paye sur Jèko   │                    │                    │
    │                  │                    │  Webhook POST      │
    │                  │                    │◄────────────────── │
    │                  │                    │ jekoWebhook(event) │
    │                  │                    │                    │
    │                  │                    │ Si SUB- + success: │
    │                  │                    │ update users/{id}  │
    │                  │                    │ isSubscribed=true  │
```

### Flux retrait prestataire

1. L'admin approuve une demande de retrait depuis le tableau de bord Finance.
2. Le frontend appelle la Cloud Function `requestProviderWithdrawal`.
3. La fonction crée/met à jour un contact Jèko (`upsertContact`), puis initie un transfert (`createTransfer`).
4. Un document est créé dans `transactions` avec `status: 'PENDING'`.
5. Le webhook Jèko (`WITHDRAWAL-` prefix) met à jour le statut en `SUCCESS` ou `REJECTED`.

### Webhook Jèko

- **URL** : `https://us-central1-serviplus-f1b8f.cloudfunctions.net/jekoWebhook`
- **Méthode** : POST (HTTP Function, pas callable)
- **Configuration** : Jèko Business Dashboard → Paramètres > API & Webhooks
- La function discrimine le type d'événement par le préfixe de la référence : `SUB-` pour les abonnements, `WITHDRAWAL-` pour les retraits.

### Sécurité des clés Jèko

Les variables `JEKO_API_KEY`, `JEKO_API_KEY_ID` et `JEKO_STORE_ID` sont stockées dans le document Firestore `platform/secrets`, accessible uniquement via le SDK Admin dans les Cloud Functions. Le client n'y a jamais accès (règle `allow read, write: if false`). L'admin peut les configurer via l'onglet "Intégrations" du tableau de bord (appel à `saveApiConfig`).

---

## 8. Cloud Functions

Toutes les fonctions sont définies dans `functions/src/index.ts` avec le SDK Firebase Functions v2.

| Fonction | Type | Description |
|---|---|---|
| `initiateSubscriptionPayment` | `onCall` (auth requise) | Crée une demande de paiement Jèko pour l'abonnement d'un prestataire. Retourne une URL de checkout et un `paymentRequestId`. |
| `checkPaymentStatus` | `onCall` (auth requise) | Interroge l'API Jèko pour vérifier le statut d'une demande de paiement (`pending` / `success` / `error`). |
| `requestProviderWithdrawal` | `onCall` (auth requise) | Crée ou met à jour un contact Jèko, initie un transfert Mobile Money vers le prestataire et enregistre la transaction dans Firestore. |
| `saveApiConfig` | `onCall` (auth requise) | Persiste les clés API Jèko dans `platform/secrets` via le SDK Admin (clés jamais transmises au navigateur). |
| `jekoWebhook` | `onRequest` (HTTP public) | Reçoit les événements Jèko Pay. Met à jour `users/{id}.isSubscribed` pour les paiements d'abonnement réussis, et le statut de `transactions` pour les retraits. |
| `sendSms` | `onCall` | **STUB** — journalise le message sans l'envoyer. À brancher sur Twilio ou l'API Orange SMS. |

### Comportement du webhook d'abonnement

- Durée calculée automatiquement : si `amount >= 10 000 FCFA` → 365 jours, sinon → 30 jours.
- Met à jour `users/{userId}.isSubscribed = true` et `subscriptionExpiresAt`.
- Préfixe de référence : `SUB-{userId}-{timestamp}`.

---

## 9. Sécurité

### Décisions de sécurité clés

| Décision | Détail |
|---|---|
| **Mots de passe jamais en Firestore** | La règle `hasNoPasswordField()` bloque toute écriture contenant un champ `password` dans la collection `users`. Les mots de passe ne sont utilisés qu'en mémoire pour l'authentification applicative. |
| **Clés Jèko isolées** | `platform/secrets` a `allow read, write: if false` — aucun accès client. Seul le SDK Admin (Cloud Functions) peut lire ces données. |
| **Auth anonyme Firebase** | `signInAnonymously()` est appelé au démarrage de l'app pour satisfaire le `isSignedIn()` des règles Firestore. L'identité réelle de l'utilisateur est gérée en base applicative. |
| **pending_payments inaccessible** | La collection `pending_payments` est entièrement bloquée côté client (`allow read, write: if false`). Seules les Cloud Functions interagissent avec elle. |
| **Clés API publiques dans `.env`** | Les variables `VITE_FIREBASE_*` sont publiques par design (Firebase Security Rules protègent les données). Ne pas y mettre de secrets serveur. |
| **Upload Storage avec timeout** | La fonction `uploadImage` a un timeout de 3,5 s pour éviter les blocages UI sur connexion lente. |

### Règles Firestore en résumé

```
users            → lecture/écriture si auth (+ guard password)
missions         → lecture/écriture si auth
transactions     → lecture/création si auth, suppression bloquée
notifications    → lecture/écriture si auth
pending_payments → BLOQUÉ (Cloud Functions via Admin SDK seulement)
platform/config  → lecture/écriture si auth
platform/secrets → BLOQUÉ (Cloud Functions via Admin SDK seulement)
```

---

## 10. Variables d'environnement

### Frontend (fichier `.env` à la racine)

Ces variables sont **publiques** (préfixe `VITE_`) et incluses dans le bundle. Firebase Security Rules sont le seul mécanisme de protection des données.

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=serviplus-f1b8f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=serviplus-f1b8f
VITE_FIREBASE_STORAGE_BUCKET=serviplus-f1b8f.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=G-...

# Optionnel — IA Gemini pour estimation de mission
VITE_GEMINI_API_KEY=...
```

### Cloud Functions (fichier `functions/.env`)

Ces variables sont **privées** et ne quittent jamais le serveur Firebase. Elles peuvent aussi être configurées via l'onglet "Intégrations" du tableau de bord admin (fonction `saveApiConfig`).

```env
JEKO_API_KEY=...
JEKO_API_KEY_ID=...
JEKO_STORE_ID=...
APP_BASE_URL=https://serviplus-f1b8f.web.app
```

> **Attention** : ne jamais committer `functions/.env` ni `.env.local` dans le dépôt Git.

---

## 11. Déploiement

### Prérequis

- Node.js 18+
- Firebase CLI : `npm install -g firebase-tools`
- Compte Firebase avec projet `serviplus-f1b8f` configuré

### Étapes

```bash
# 1. Installer les dépendances frontend
npm install

# 2. Installer les dépendances des Cloud Functions
cd functions && npm install && cd ..

# 3. Configurer les variables d'environnement
#    Frontend : créer .env à la racine avec les VITE_FIREBASE_* ci-dessus
#    Functions : créer functions/.env avec JEKO_API_KEY, JEKO_API_KEY_ID, JEKO_STORE_ID

# 4. (Optionnel) Tester en local
npm run dev                     # Frontend sur http://localhost:5173
firebase emulators:start        # Émulateurs Firestore + Functions

# 5. Builder le frontend
npm run build                   # Génère dist/

# 6. Déployer tout (Hosting + Functions + Firestore rules + Storage rules)
firebase deploy

# 7. Déploiement partiel (exemples)
firebase deploy --only hosting
firebase deploy --only functions
firebase deploy --only firestore:rules
```

### Build Android (Capacitor)

```bash
npm run build
npx cap sync android
# Ouvrir Android Studio :
npx cap open android
# Puis Build > Generate Signed APK / Bundle
```

---

## 12. Structure des fichiers

```
servi+/
├── index.html                  # Point d'entrée HTML
├── index.tsx                   # Montage React
├── App.tsx                     # Routage et état global de l'app
├── types.ts                    # Modèles TypeScript (User, Mission, Transaction...)
├── constants.ts                # Constantes (tarifs, villes, icônes de service)
├── global.d.ts                 # Déclarations TypeScript globales
├── index.css                   # Styles Tailwind (directives @tailwind)
├── vite.config.ts              # Configuration Vite + plugin Tailwind
├── tsconfig.json               # Configuration TypeScript
├── firebase.json               # Configuration Firebase (Hosting, Functions, Firestore, Storage)
├── firestore.rules             # Règles de sécurité Firestore
├── firestore.indexes.json      # Index Firestore
├── storage.rules               # Règles de sécurité Storage
├── capacitor.config.ts         # Configuration Capacitor (Android)
│
├── components/
│   ├── App.tsx (via index.tsx) # Composant racine
│   ├── Auth.tsx                # Écran de connexion / inscription
│   ├── Layout.tsx              # Shell de navigation partagé
│   ├── ClientDashboard.tsx     # Interface client
│   ├── ProviderDashboard.tsx   # Interface prestataire
│   ├── AdminDashboard.tsx      # Interface admin (orchestrateur des panneaux)
│   ├── MapView.tsx             # Composant carte Leaflet
│   └── admin/
│       ├── AdminStatsPanel.tsx
│       ├── AdminMissionsPanel.tsx
│       ├── AdminProvidersPanel.tsx
│       ├── AdminSubscriptionsPanel.tsx
│       ├── AdminOffersPanel.tsx
│       ├── AdminContentsPanel.tsx
│       └── AdminIntegrationsPanel.tsx
│
├── services/
│   ├── firebase.ts             # Init Firebase (db, storage, functions, auth)
│   ├── configService.ts        # Lecture/écriture de platform/config (AppConfig)
│   ├── jekoService.ts          # Appels aux Cloud Functions Jèko (côté client)
│   ├── geminiService.ts        # Estimation IA via Gemini 2.5 Pro
│   ├── notificationService.ts  # Notifications in-app (Firestore)
│   └── smsService.ts           # Envoi SMS via Cloud Function sendSms
│
├── lib/
│   └── utils.ts                # Utilitaires (cn pour clsx + tailwind-merge)
│
├── functions/
│   ├── package.json            # Dépendances Node.js des Cloud Functions
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts            # Cloud Functions (Jèko Pay, SMS, webhook)
│       └── jeko.ts             # Client HTTP Jèko Pay (createPaymentRequest, createTransfer...)
│
├── android/                    # Projet Android Capacitor
├── public/                     # Assets statiques (images d'offres, etc.)
├── dist/                       # Build Vite (déployé sur Firebase Hosting)
└── docs/
    ├── PROJECT.md              # Ce fichier
    ├── DESIGN_SYSTEM.md        # Système de design
    └── RAPPORT_PROJET.md       # Rapport de projet
```

---

## 13. Ressources

- **Firebase Console** : https://console.firebase.google.com/project/serviplus-f1b8f
- **Firebase Hosting** : https://serviplus-f1b8f.web.app
- **Jèko Pay Business Dashboard** : https://business.jeko.money
- **Webhook Jèko** : `https://us-central1-serviplus-f1b8f.cloudfunctions.net/jekoWebhook`
- **Google AI Studio** (projet d'origine) : https://ai.studio/apps/f4b79617-df70-45fc-85ad-376b65772cec
