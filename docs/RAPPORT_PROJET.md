# Rapport Projet — Servi+
*Généré le 10 septembre 2026*

---

## 1. Vue d'ensemble

**Servi+** est une marketplace de services à domicile ciblant la **Côte d'Ivoire** (Abidjan et villes secondaires). L'app met en relation des clients avec des prestataires pour des services tels que ménage, cuisine, jardinage, babysitting, garde de personnes âgées, et courses de marché.

| Détail | Valeur |
|---|---|
| Version | 0.0.0 (dev) |
| Plateforme cible | Mobile (Android via Capacitor + PWA) |
| App ID Capacitor | `com.example.app` ⚠️ **à changer** |
| Monnaie | F CFA |
| Langue | Français |

---

## 2. Stack technique

| Couche | Technologie | Version |
|---|---|---|
| Framework UI | React | 19.x |
| Langage | TypeScript | ~5.8 |
| Bundler | Vite | 6.x |
| CSS | Tailwind CSS v4 | 4.2.x |
| Animations | Motion/React | 12.x |
| Icônes | Lucide React | 0.555.x |
| Graphiques | Recharts | 3.5.x |
| Mobile | Capacitor (Android) | 8.4.x |
| Base de données | Firebase Firestore (NoSQL) | 12.x |
| Auth | Firebase Auth (OTP SMS) | 12.x |
| Stockage fichiers | Firebase Storage | 12.x |
| Cloud Functions | Firebase Functions | 12.x |
| IA | Google Gemini (`gemini-3-pro-preview`) | @google/genai 1.30 |
| Polices | Onest (body) + Sora (display) | Google Fonts |

---

## 3. Architecture du projet

```
servi+/
├── App.tsx                    # Orchestration principale, sync Firebase
├── index.tsx                  # Point d'entrée React
├── index.css                  # Design system (variables, composants)
├── types.ts                   # Interfaces TypeScript (User, Mission, Transaction…)
├── constants.ts               # Mock data + tarifs de base
├── components/
│   ├── Auth.tsx               # Authentification (login, inscription, OTP)
│   ├── Layout.tsx             # Shell (header, bottom nav)
│   ├── ClientDashboard.tsx    # Interface client
│   ├── ProviderDashboard.tsx  # Interface prestataire
│   └── AdminDashboard.tsx     # Console d'administration
├── services/
│   ├── firebase.ts            # Init Firebase, uploadImage
│   ├── geminiService.ts       # Estimation IA des missions
│   ├── configService.ts       # Config plateforme (localStorage)
│   └── smsService.ts          # Envoi OTP SMS (simulation ou Twilio)
├── lib/
│   └── utils.ts               # cn() (clsx + tailwind-merge)
├── public/
│   ├── servi_logo.png         # Logo fond blanc (light mode)
│   └── servi_logo1.png        # Logo fond sombre (non utilisé)
├── capacitor.config.ts        # Config Capacitor Android
└── android/                   # Projet Android natif Capacitor
```

---

## 4. Rôles et fonctionnalités

### 4.1 Client (`UserRole.CLIENT`)
- Création de missions avec description, catégorie, localisation, date/heure
- Estimation automatique IA (durée + prix via Gemini)
- Paiement par mobile money (Orange, MTN, Wave) — **UI uniquement, non intégré**
- Suivi temps réel du prestataire (lat/lng stockés, **pas de carte rendue**)
- Notation prestataire après mission
- Historique des missions
- Gestion du profil + photo

### 4.2 Prestataire (`UserRole.PROVIDER`)
- Tableau de bord Bankify (hero vert, KPIs, analytics)
- Acceptation/refus de missions
- Extension de durée de mission
- Portefeuille (gains, retraits Orange Money/MTN/Wave)
- Abonnement plateforme
- Académie de formations (vidéos, guides, QCM)
- Gestion du profil + compétences + pièce d'identité

### 4.3 Administrateur (`UserRole.ADMIN`)
- Console desktop (sidebar 8 onglets)
- Vue d'ensemble KPIs + graphiques (Recharts)
- Gestion des utilisateurs (vérification, bonus, blocage)
- Finance (approbation des retraits)
- Litiges (arbitrage)
- Marché & courses (commandes)
- Équipe admin (super admin → sous-admins par ville)
- Paramètres plateforme (tarifs, commissions, annonces flash, toggles fonctionnalités)
- Profil administrateur

---

## 5. État du design — Ce qui est fait ✅

| Fichier | Statut | Détail |
|---|---|---|
| `index.css` | ✅ Terminé | Design system complet : tokens verts, Onest+Sora, `.btn-primary`, `.card`, `.input`, `.badge` |
| `Layout.tsx` | ✅ Terminé | Logo officiel, tab bar vert, glassmorphism, safe area |
| `Auth.tsx` | ✅ Terminé | Hero vert + logo, formulaires redesignés, animations |
| `ClientDashboard.tsx` | ✅ Terminé | Hero vert Bankify-style, KPIs flottants, scroll horizontal, dark analytics card |
| `ProviderDashboard.tsx` | ✅ Terminé | Home Bankify complet, Portefeuille, Profil, Académie |
| `AdminDashboard.tsx` | ✅ Terminé | Couleurs vertes, logo sidebar, boutons de sauvegarde verts, `rounded-2xl` uniforme |

---

## 6. Ce qui reste à faire ⚠️

### 6.1 Critique (bloquant pour la production)

| # | Problème | Fichier | Action requise |
|---|---|---|---|
| 1 | **App ID Capacitor** est `com.example.app` (placeholder) | `capacitor.config.ts` | Changer en `com.serviplus.app` (ou votre vrai ID) avant build Play Store |
| 2 | **SMS OTP en mode simulation** (`USE_SIMULATION_MODE = true`) | `services/smsService.ts` | Déployer une Firebase Cloud Function avec Twilio ou Orange API, puis passer à `false` |
| 3 | **Clé API Gemini** non définie en prod (`process.env.API_KEY`) | `services/geminiService.ts` | Configurer la variable d'environnement dans Vite (`.env`) ou via Firebase Remote Config |
| 4 | **Config plateforme dans localStorage** | `services/configService.ts` | Migrer vers Firestore pour que la config admin soit partagée entre appareils/admins |

### 6.2 Fonctionnalités UI présentes mais non connectées

| # | Fonctionnalité | État actuel | À faire |
|---|---|---|---|
| 5 | **Carte / Géolocalisation** | Lat/lng stockés dans les missions, aucune carte rendue | Intégrer Google Maps ou Leaflet pour afficher la position du prestataire |
| 6 | **Paiement mobile money** | UI complète (Orange/MTN/Wave) | Connecter à une vraie passerelle (CinetPay, Fedapay, ou API opérateurs) |
| 7 | **Push notifications** | Aucune implémentation | Configurer Firebase Cloud Messaging (FCM) pour alertes missions |
| 8 | **Biométrie** | Toggle ON/OFF dans les paramètres | Implémenter avec `@capacitor/biometric-auth` |
| 9 | **2FA SMS** | Toggle ON/OFF dans les paramètres | Lier au service SMS réel (item #2 ci-dessus) |
| 10 | **Notifications in-app** | Icône cloche présente sans badge dynamique | Créer une collection `notifications` Firestore + badge en temps réel |

### 6.3 Technique & qualité

| # | Problème | Action requise |
|---|---|---|
| 11 | **Mock data mélangées aux données réelles** | `MOCK_USERS` fusionnés avec Firestore en production → nettoyer la logique de merge dans `App.tsx` |
| 12 | **Modèle Gemini inexistant** | `gemini-3-pro-preview` n'est pas un modèle valide → utiliser `gemini-2.5-pro` |
| 13 | **App name Capacitor** | `appName: 'servi+'` → Android n'accepte pas le `+` → renommer en `Servi Plus` |
| 14 | **Aucun test automatisé** | Zéro tests unitaires ou E2E → ajouter Vitest + Playwright pour les flux critiques |
| 15 | **`servi_logo1.png` inutilisée** | `public/servi_logo1.png` (569KB) n'est référencée nulle part → supprimer ou utiliser |
| 16 | **Clé Firebase dans le code** | `apiKey`, `projectId` etc. en dur dans `services/firebase.ts` → déplacer dans `.env` |

---

## 7. Variables d'environnement requises

Créer un fichier `.env` à la racine :

```env
VITE_FIREBASE_API_KEY=AIzaSyCQ8TihwntETKPot4dOqn9I1w1a2kbS83Q
VITE_FIREBASE_AUTH_DOMAIN=serviplus-f1b8f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=serviplus-f1b8f
VITE_FIREBASE_STORAGE_BUCKET=serviplus-f1b8f.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=86413980892
VITE_FIREBASE_APP_ID=1:86413980892:web:ad53f1c531ebd12e65f019
VITE_GEMINI_API_KEY=<votre-clé-gemini>
```

Et mettre `.env` dans `.gitignore`.

---

## 8. Commandes utiles

```bash
# Développement web
npm run dev

# Build production
npm run build

# Sync vers Android (après build)
npx cap sync android

# Ouvrir dans Android Studio
npx cap open android
```

---

## 9. Priorités suggérées

```
Phase 1 — Production-ready (bloquant)
  → Items #1, #2, #3, #12, #13, #16

Phase 2 — Fonctionnalités core manquantes
  → Items #5 (carte), #6 (paiement), #7 (push notifs)

Phase 3 — Qualité & sécurité
  → Items #4, #11, #14, #15
  → Items #8, #9 (biométrie / 2FA)
```
