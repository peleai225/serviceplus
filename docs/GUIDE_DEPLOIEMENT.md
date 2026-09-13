# Servi+ — Guide de Déploiement & Configuration

> Guide complet pour déployer Servi+ en production et configurer tous les services externes.

---

## Table des matières

1. [Prérequis](#1-prérequis)
2. [Architecture de déploiement](#2-architecture-de-déploiement)
3. [Déploiement sur Vercel](#3-déploiement-sur-vercel)
4. [Configuration Firebase](#4-configuration-firebase)
5. [Configuration Jèko Pay](#5-configuration-jèko-pay)
6. [Configuration du Webhook Jèko](#6-configuration-du-webhook-jèko)
7. [Variables d'environnement](#7-variables-denvironnement)
8. [Test complet du système](#8-test-complet-du-système)
9. [Build Android (Capacitor)](#9-build-android-capacitor)
10. [Dépannage](#10-dépannage)

---

## 1. Prérequis

| Outil | Usage | Installation |
|---|---|---|
| Node.js 20+ | Build & développement | https://nodejs.org |
| Compte GitHub | Hébergement du code source | https://github.com |
| Compte Vercel | Hébergement frontend + API | https://vercel.com (gratuit) |
| Projet Firebase | Base de données Firestore | https://console.firebase.google.com |
| Compte Jèko Business | Paiements Mobile Money | https://business.jeko.africa |

**Coût total : 0 F CFA** — tous les services utilisés sont dans leur offre gratuite.

---

## 2. Architecture de déploiement

```
┌──────────────────────────────────────────────────────┐
│                    VERCEL (gratuit)                   │
│                                                      │
│   Frontend React ──── https://serviceplus-steel.     │
│   (dist/)              vercel.app                    │
│                                                      │
│   API Routes ────── /api/initiate-payment            │
│   (api/)            /api/check-payment               │
│                     /api/request-withdrawal           │
│                     /api/save-api-config              │
│                     /api/jeko-webhook  ◄── Jèko POST │
│                     /api/send-sms                     │
└──────────────┬───────────────────────┬───────────────┘
               │                       │
               ▼                       ▼
┌──────────────────────┐   ┌───────────────────────┐
│  Firebase Firestore  │   │   Jèko Pay API        │
│  (plan Spark gratuit)│   │   (Mobile Money CI)   │
│                      │   │                       │
│  Collections :       │   │  - Pay-in (checkout)  │
│  - users             │   │  - Pay-out (transfer) │
│  - missions          │   │  - Webhook callback   │
│  - transactions      │   │                       │
│  - notifications     │   └───────────────────────┘
│  - platform/config   │
│  - platform/secrets  │ ◄── Clés API Jèko (Admin SDK only)
│  - pending_payments  │
└──────────────────────┘
```

---

## 3. Déploiement sur Vercel

### 3.1 — Pousser le code sur GitHub

```bash
cd servi+
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/VOTRE_USER/serviceplus.git
git push -u origin main
```

### 3.2 — Importer dans Vercel

1. Va sur **https://vercel.com/new**
2. Clique **Import Git Repository**
3. Sélectionne ton repo `serviceplus`
4. Vercel détecte automatiquement **Vite** comme framework
5. Clique **Deploy**
6. Attends ~1 minute → ton site est live

### 3.3 — URL de production

Après déploiement, Vercel te donne une URL du type :
```
https://serviceplus-xxxxx.vercel.app
```

Note cette URL — tu en auras besoin pour le webhook Jèko.

---

## 4. Configuration Firebase

### 4.1 — Service Account Key

Les API routes Vercel ont besoin d'accéder à Firestore. Pour cela :

1. Va sur https://console.firebase.google.com/project/serviplus-f1b8f/settings/serviceaccounts/adminsdk
2. Clique **"Generate new private key"**
3. Un fichier JSON est téléchargé — **ne le partage jamais**
4. Dans Vercel : **Settings → Environment Variables**
5. Ajoute :

| Variable | Valeur |
|---|---|
| `FIREBASE_PROJECT_ID` | `serviplus-f1b8f` |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | *(colle tout le contenu JSON du fichier)* |

6. Clique **Save**
7. Va dans **Deployments** → clic sur **⋯** → **Redeploy** pour appliquer

### 4.2 — Déployer les Firestore Rules

```bash
npx firebase-tools login
npx firebase-tools use serviplus-f1b8f
npx firebase-tools deploy --only firestore:rules
```

Les règles de sécurité garantissent :
- ✅ Les utilisateurs authentifiés (Anonymous Auth) peuvent lire/écrire `users`, `missions`, `transactions`
- ✅ Les mots de passe ne sont jamais stockés dans Firestore
- 🔒 `platform/secrets` est **totalement bloqué** côté client — seul le serveur (Admin SDK) y accède

---

## 5. Configuration Jèko Pay

### 5.1 — Créer un compte Jèko Business

1. Va sur https://business.jeko.africa
2. Crée ton compte marchand
3. Complète la vérification KYC

### 5.2 — Récupérer tes clés API

Dans le dashboard Jèko Business :
1. Va dans **Paramètres → API**
2. Note les 3 valeurs :

| Clé | Description | Où la trouver |
|---|---|---|
| **API Key** | Clé secrète d'authentification | Paramètres → API → Clé API |
| **API Key ID** | Identifiant de la clé | Paramètres → API → ID de la clé |
| **Store ID** | Identifiant de ta boutique | Paramètres → Informations → ID du store |

### 5.3 — Entrer les clés dans le backoffice admin

1. Connecte-toi sur ton app en tant qu'**Admin**
2. Va dans **Paramètres → API** (onglet API)
3. Clique sur la carte **Jèko Pay**
4. Remplis les 3 champs :
   - **JEKO_API_KEY** — ta clé API secrète
   - **JEKO_API_KEY_ID** — l'ID de ta clé
   - **JEKO_STORE_ID** — l'ID de ton store
5. Sélectionne **Sandbox (Test)** pour commencer
6. Clique **"Enregistrer les clés Jèko (sécurisé)"**

Les clés sont envoyées au serveur via une API sécurisée et stockées dans Firestore `platform/secrets`. **Elles ne sont jamais visibles dans le navigateur.**

### 5.4 — Passer en production

Quand tu es prêt pour les vrais paiements :
1. Retourne dans **Paramètres → API → Jèko**
2. Change l'environnement sur **Production**
3. Remplace les clés sandbox par les clés de production Jèko
4. Clique **Enregistrer**

---

## 6. Configuration du Webhook Jèko

> ⚠️ **OBLIGATOIRE** — Sans webhook, les paiements et retraits ne seront jamais confirmés dans Firestore.

### 6.1 — Qu'est-ce que le webhook ?

Quand un paiement Mobile Money aboutit (ou échoue), Jèko envoie une notification HTTP POST à ton serveur. Le webhook met automatiquement à jour :

- **Abonnements** : `users/{userId}.isSubscribed = true` + date d'expiration
- **Retraits** : `transactions/{ref}.status = SUCCESS` ou `REJECTED`

### 6.2 — Configurer le webhook

1. Va dans ton **Dashboard Jèko Business**
2. Clique **Paramètres → API & Webhooks**
3. Dans le champ **URL du Webhook**, entre :

```
https://serviceplus-steel.vercel.app/api/jeko-webhook
```

> ⚠️ Remplace `serviceplus-steel` par le nom de ton projet Vercel si différent.

4. Clique **Sauvegarder**

### 6.3 — Vérifier que le webhook fonctionne

1. Fais un paiement de test (en mode sandbox)
2. Vérifie dans Firebase Console → Firestore :
   - Collection `pending_payments` : le document doit passer de `status: "pending"` à `status: "success"`
   - Collection `users` : le prestataire doit avoir `isSubscribed: true`

### 6.4 — Flux complet du webhook

```
Client/Prestataire          Jèko                    Ton serveur Vercel         Firestore
       │                      │                            │                       │
       ├── Paie via MoMo ───►│                            │                       │
       │                      ├── Traite le paiement      │                       │
       │                      │                            │                       │
       │                      ├── POST /api/jeko-webhook ─►│                       │
       │                      │   { status: "success",     │                       │
       │                      │     reference: "SUB-..." } │                       │
       │                      │                            ├── Update Firestore ──►│
       │                      │                            │   isSubscribed: true   │
       │                      │                            │                       │
       │◄─────────── L'app se met à jour en temps réel (onSnapshot) ──────────────┤
```

---

## 7. Variables d'environnement

### Frontend (fichier `.env` à la racine)

```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=serviplus-f1b8f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=serviplus-f1b8f
VITE_FIREBASE_STORAGE_BUCKET=serviplus-f1b8f.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=86413980892
VITE_FIREBASE_APP_ID=1:86413980892:web:XXXXXXXXX
VITE_GEMINI_API_KEY=AIzaSyXXXXXXXXX
```

> Ces variables sont publiques (elles finissent dans le bundle JS). C'est normal pour Firebase — la sécurité vient des Firestore Rules, pas des clés frontend.

### Serveur Vercel (Settings → Environment Variables)

| Variable | Obligatoire | Description |
|---|---|---|
| `FIREBASE_PROJECT_ID` | ✅ | ID du projet Firebase |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | ✅ | JSON complet du service account |
| `JEKO_API_KEY` | ❌ | Fallback si pas configuré via admin UI |
| `JEKO_API_KEY_ID` | ❌ | Fallback si pas configuré via admin UI |
| `JEKO_STORE_ID` | ❌ | Fallback si pas configuré via admin UI |
| `APP_BASE_URL` | ❌ | URL du site (auto-détecté sinon) |

> Les variables `JEKO_*` côté Vercel sont optionnelles car les clés sont normalement gérées depuis l'admin UI → Firestore `platform/secrets`. Elles servent uniquement de fallback.

---

## 8. Test complet du système

### 8.1 — Checklist avant mise en production

- [ ] Firestore rules déployées (`npx firebase-tools deploy --only firestore:rules`)
- [ ] Service Account Key configuré dans Vercel
- [ ] Clés Jèko entrées dans le backoffice admin
- [ ] Webhook Jèko configuré avec l'URL Vercel
- [ ] Mode **Sandbox** sélectionné pour les tests

### 8.2 — Test du paiement d'abonnement

1. Connecte-toi en tant que **Prestataire**
2. Va dans **Wallet** → section **Abonnement Servi+ PRO**
3. Choisis un opérateur Mobile Money (Wave / Orange / MTN)
4. Entre un numéro de test sandbox
5. Clique **S'abonner**
6. La page checkout Jèko s'ouvre → complète le paiement test
7. **Vérifie dans Firestore** :
   - `pending_payments/{ref}` → `status: "success"`
   - `users/{prestataire}` → `isSubscribed: true`, `subscriptionExpiresAt` renseigné

### 8.3 — Test du retrait prestataire

1. Connecte-toi en tant que **Prestataire** (avec un solde > 0)
2. Va dans **Wallet** → clique **Retirer**
3. Entre un montant (minimum 1 000 F CFA)
4. Choisis un opérateur et entre un numéro
5. Clique **Confirmer le retrait**
6. **Vérifie dans Firestore** :
   - `transactions/{WITHDRAWAL-xxx}` → `status: "PENDING"` puis `"SUCCESS"` après webhook

### 8.4 — Test de la sauvegarde admin

1. Connecte-toi en tant qu'**Admin**
2. Va dans **Paramètres** → modifie un tarif ou une annonce
3. Clique **Sauvegarder**
4. **Vérifie dans Firestore** :
   - `platform/config` → les valeurs sont mises à jour

### 8.5 — Passage en production

Quand tous les tests sandbox passent :
1. Dans l'admin → **Paramètres > API > Jèko** → passe en **Production**
2. Entre les clés API de **production** Jèko
3. Dans Jèko Business → vérifie que le webhook pointe toujours vers ta bonne URL
4. Fais un premier paiement réel de petit montant pour vérifier

---

## 9. Build Android (Capacitor)

```bash
# Synchroniser le build web avec le projet Android
npx cap sync android

# Ouvrir dans Android Studio
npx cap open android
```

Dans Android Studio :
1. **Build → Generate Signed Bundle / APK**
2. Crée un keystore (première fois) ou utilise le tien
3. Sélectionne **release**
4. Le fichier `.aab` est prêt pour le Google Play Store

---

## 10. Dépannage

### "Les clés Jèko ne se sauvegardent pas"

- Vérifie que tu es connecté en tant qu'**Admin** (pas Client ou Prestataire)
- Ouvre la console navigateur (F12) → regarde les erreurs
- Vérifie que `FIREBASE_SERVICE_ACCOUNT_KEY` est bien configuré dans Vercel

### "Le paiement Jèko ne se confirme pas"

- Vérifie que le **webhook** est configuré dans Jèko Business
- L'URL doit être exactement : `https://serviceplus-steel.vercel.app/api/jeko-webhook`
- Vérifie dans Vercel → **Logs** (onglet Functions) si le webhook est reçu

### "Erreur Firestore: PERMISSION_DENIED"

- L'Anonymous Auth doit être activé dans Firebase Console → Authentication → Sign-in method → Anonymous
- Les Firestore rules doivent être déployées : `npx firebase-tools deploy --only firestore:rules`

### "Le site affiche une page blanche"

- Vérifie que le build passe : `npm run build`
- Vérifie les variables `VITE_FIREBASE_*` dans le fichier `.env`
- Regarde la console navigateur (F12) pour les erreurs JavaScript

### "Les données ne se synchronisent pas"

- Vérifie la connexion internet
- Vérifie que Firestore est actif dans la Firebase Console
- Les données locales (localStorage) sont toujours disponibles en mode hors-ligne

---

## Contacts & Ressources

| Ressource | URL |
|---|---|
| Dashboard Firebase | https://console.firebase.google.com/project/serviplus-f1b8f |
| Dashboard Jèko Business | https://business.jeko.africa |
| Dashboard Vercel | https://vercel.com |
| Documentation Jèko API | https://developer.jeko.africa |
| Repo GitHub | https://github.com/peleai225/serviceplus |
| App en production | https://serviceplus-steel.vercel.app |
