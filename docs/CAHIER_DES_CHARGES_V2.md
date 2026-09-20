# CAHIER DES CHARGES — SERVI+ v2.0
## Marketplace de services à domicile — Côte d'Ivoire

> **Version** : 2.0  
> **Date** : Septembre 2026  
> **Stack** : Laravel 12 (backend) · React 19 + shadcn/ui (frontend)  
> **Statut** : En conception

---

## TABLE DES MATIÈRES

1. [Contexte & Vision](#1-contexte--vision)
2. [Stack Technique](#2-stack-technique)
3. [Rôles & Acteurs](#3-rôles--acteurs)
4. [Modèle de Données](#4-modèle-de-données)
5. [Modules Fonctionnels](#5-modules-fonctionnels)
   - 5.1 [Authentification](#51-module-authentification)
   - 5.2 [Client](#52-module-client)
   - 5.3 [Prestataire](#53-module-prestataire)
   - 5.4 [Admin](#54-module-admin)
   - 5.5 [Paiements Jèko](#55-module-paiements-jèko)
6. [API Endpoints](#6-api-endpoints)
7. [Sécurité](#7-sécurité)
8. [Interfaces Utilisateur](#8-interfaces-utilisateur-react--shadcnui)
9. [Intégrations Tierces](#9-intégrations-tierces)
10. [Règles Métier](#10-règles-métier-importantes)
11. [Déploiement & Environnements](#11-déploiement--environnements)
12. [Phases de Développement](#12-phases-de-développement)

---

## 1. CONTEXTE & VISION

### Présentation

**Servi+** est une plateforme de mise en relation entre particuliers (clients) et prestataires de services à domicile en Côte d'Ivoire. Elle opère principalement à Abidjan et dans les grandes villes ivoiriennes.

### Problème résolu

Trouver un prestataire fiable (femme de ménage, cuisinier, babysitter, etc.) est difficile, opaque et non sécurisé en Côte d'Ivoire. Servi+ centralise l'offre, vérifie les prestataires, sécurise les paiements et professionnalise les relations.

### Modèle économique

| Source de revenus | Détail |
|---|---|
| Abonnements prestataires | STARTER (2 500 FCFA/mois) / PRO (5 000 FCFA/mois) / PREMIUM (10 000 FCFA/mois) |
| Frais de transaction | 1,5% Jèko répercutés sur le client à chaque paiement |
| Frais de service marché | 500 FCFA frais service + 1 000 FCFA livraison (Faire mon marché) |

### Cibles

- **Clients** : ménages urbains ivoiriens équipés de smartphones et Mobile Money
- **Prestataires** : travailleurs du secteur informel cherchant une plateforme structurée
- **Géographie** : Abidjan, Bouaké, Daloa, Yamoussoukro, Man, Gagnoa

---

## 2. STACK TECHNIQUE

### Backend

| Composant | Technologie |
|---|---|
| Framework | **Laravel 12** (PHP 8.3) |
| Base de données | **MySQL 8** |
| Cache / Queues | **Redis** |
| Auth API | **Laravel Sanctum** (tokens Bearer SPA) |
| Temps réel | **Laravel Echo + Pusher** (ou Soketi self-hosted) |
| Stockage fichiers | **Cloudflare R2** (compatible S3) |
| SMS / OTP | **Africa's Talking** (numéros CI +225) |
| Paiements | **Jèko Partner API** |
| Mails | Mailtrap (dev) → Mailgun (prod) |

### Frontend

| Composant | Technologie |
|---|---|
| Framework | **React 19** + **TypeScript** |
| Build | **Vite 6** |
| UI Components | **shadcn/ui** (Radix UI + Tailwind CSS v4) |
| State global | **Zustand** |
| Fetching / Cache | **TanStack Query v5** |
| Formulaires | **React Hook Form** + **Zod** |
| Routing | **React Router v7** |
| Icons | **Lucide React** |
| Temps réel | **Laravel Echo** (Pusher JS) |

### Infrastructure

| Composant | Technologie |
|---|---|
| Backend | **Railway** ou **DigitalOcean App Platform** |
| Frontend | **Vercel** |
| CDN / Fichiers | **Cloudflare R2** |
| CI/CD | **GitHub Actions** |

---

## 3. RÔLES & ACTEURS

| Rôle | Description |
|---|---|
| **CLIENT** | Particulier qui commande des services à domicile |
| **PROVIDER** (Prestataire) | Travailleur vérifié qui exécute les missions |
| **ADMIN** | Gestionnaire de la plateforme (équipe Servi+) |
| **SUPER_ADMIN** | Accès total, gère les autres admins |

---

## 4. MODÈLE DE DONNÉES

### Table `users`

```sql
id                ULID         PRIMARY KEY
name              VARCHAR(100)
phone             VARCHAR(20)  UNIQUE          -- format +2250XXXXXXXXX
email             VARCHAR(150) NULLABLE UNIQUE
role              ENUM(CLIENT, PROVIDER, ADMIN, SUPER_ADMIN)
avatar_url        TEXT         NULLABLE
address           TEXT         NULLABLE
city              VARCHAR(50)  NULLABLE
id_number         VARCHAR(50)  NULLABLE UNIQUE  -- CNI / Passeport
id_recto_url      TEXT         NULLABLE
id_verso_url      TEXT         NULLABLE
wallet_balance    DECIMAL(10,2) DEFAULT 0
is_verified       BOOLEAN      DEFAULT false
is_suspended      BOOLEAN      DEFAULT false
last_login_at     TIMESTAMP    NULLABLE
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### Table `auth_credentials`

```sql
id                ULID         PRIMARY KEY
user_id           ULID         FK users
phone             VARCHAR(20)  UNIQUE
password          TEXT                          -- PBKDF2 SHA-512 : {salt}:{hash}
temp_code         VARCHAR(10)  NULLABLE         -- code temporaire admin
temp_expires_at   TIMESTAMP    NULLABLE
updated_at        TIMESTAMP
```

### Table `sessions`

```sql
id                ULID         PRIMARY KEY
user_id           ULID         FK users
token             VARCHAR(96)  UNIQUE           -- 48 bytes hex
expires_at        TIMESTAMP
ip_address        VARCHAR(45)  NULLABLE
user_agent        TEXT         NULLABLE
created_at        TIMESTAMP
```

### Table `otp_codes`

```sql
id                ULID         PRIMARY KEY
phone             VARCHAR(20)
code              VARCHAR(6)
expires_at        TIMESTAMP
used              BOOLEAN      DEFAULT false
created_at        TIMESTAMP
```

### Table `provider_profiles`

```sql
id                    ULID         PRIMARY KEY
user_id               ULID         FK users UNIQUE
bio                   TEXT         NULLABLE
services              JSON                      -- ['CLEANING', 'COOKING', ...]
cities                JSON                      -- ['Abidjan', ...]
experience_years      TINYINT      DEFAULT 0
rating                DECIMAL(3,2) DEFAULT 0
rating_count          INT          DEFAULT 0
subscription_plan     ENUM(FREE, STARTER, PRO, PREMIUM) DEFAULT FREE
subscription_expires_at TIMESTAMP  NULLABLE
missions_this_month   INT          DEFAULT 0
badges                JSON         DEFAULT '[]'
is_available          BOOLEAN      DEFAULT true
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### Table `missions`

```sql
id                    ULID         PRIMARY KEY
client_id             ULID         FK users
provider_id           ULID         FK users NULLABLE
category              ENUM(CLEANING, COOKING, LAUNDRY, BABYSITTING,
                           GARDENING, MARKET, ELDERLY_CARE, HANDYMAN)
title                 VARCHAR(150)
description           TEXT
status                ENUM(PENDING, ACCEPTED, IN_PROGRESS,
                           COMPLETED, CANCELLED, DISPUTED)
mission_date          DATE
start_time            TIME
end_time              TIME         NULLABLE
duration_hours        DECIMAL(4,2)
address               TEXT
city                  VARCHAR(50)
latitude              DECIMAL(10,8) NULLABLE
longitude             DECIMAL(11,8) NULLABLE
base_price            DECIMAL(10,2)
jeko_fee              DECIMAL(10,2) DEFAULT 0
total_price           DECIMAL(10,2)
payment_status        ENUM(PENDING, PAID, REFUNDED) DEFAULT PENDING
payment_ref           VARCHAR(100) NULLABLE
bonus_amount          DECIMAL(10,2) DEFAULT 0
notes                 TEXT         NULLABLE
-- Champs Faire mon Marché
market_list           TEXT         NULLABLE
market_budget         DECIMAL(10,2) NULLABLE
market_service_fee    DECIMAL(10,2) NULLABLE
market_delivery_fee   DECIMAL(10,2) NULLABLE
market_paid           BOOLEAN      DEFAULT false
-- Champs Lessive
laundry_quantity      INT          NULLABLE
-- Admin
admin_notes           TEXT         NULLABLE
is_remote_possible    BOOLEAN      DEFAULT false
created_at            TIMESTAMP
updated_at            TIMESTAMP
```

### Table `transactions`

```sql
id                ULID         PRIMARY KEY
user_id           ULID         FK users
mission_id        ULID         FK missions NULLABLE
type              ENUM(INCOME, PAYOUT, SUBSCRIPTION, REFUND, BONUS, MARKET)
amount            DECIMAL(10,2)
fee               DECIMAL(10,2) DEFAULT 0
net_amount        DECIMAL(10,2)
method            ENUM(WAVE, ORANGE_MONEY, MTN_MOMO, MOOV_MONEY, WALLET)
reference         VARCHAR(100) NULLABLE
jeko_id           VARCHAR(100) NULLABLE
status            ENUM(PENDING, SUCCESS, FAILED, CANCELLED)
description       TEXT         NULLABLE
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### Table `subscriptions`

```sql
id                ULID         PRIMARY KEY
user_id           ULID         FK users
plan              ENUM(STARTER, PRO, PREMIUM)
price             DECIMAL(10,2)
jeko_fee          DECIMAL(10,2)
total_paid        DECIMAL(10,2)
transaction_id    ULID         FK transactions
started_at        TIMESTAMP
expires_at        TIMESTAMP
status            ENUM(ACTIVE, EXPIRED, CANCELLED)
created_at        TIMESTAMP
```

### Table `pending_payments`

```sql
id                    ULID         PRIMARY KEY
type                  ENUM(SUBSCRIPTION, MARKET, MISSION)
user_id               ULID         FK users
reference             VARCHAR(100) UNIQUE
jeko_payment_id       VARCHAR(100) UNIQUE
amount                DECIMAL(10,2)
payload               JSON                      -- données contextuelles
expires_at            TIMESTAMP
status                ENUM(PENDING, SUCCESS, FAILED)
created_at            TIMESTAMP
```

### Table `reviews`

```sql
id                ULID         PRIMARY KEY
mission_id        ULID         FK missions UNIQUE
client_id         ULID         FK users
provider_id       ULID         FK users
rating            TINYINT                       -- 1 à 5
comment           TEXT         NULLABLE
created_at        TIMESTAMP
```

### Table `disputes`

```sql
id                ULID         PRIMARY KEY
mission_id        ULID         FK missions
opened_by         ULID         FK users
reason            TEXT
status            ENUM(OPEN, UNDER_REVIEW,
                       RESOLVED_CLIENT, RESOLVED_PROVIDER, CLOSED)
resolution_note   TEXT         NULLABLE
resolved_by       ULID         FK users NULLABLE
created_at        TIMESTAMP
updated_at        TIMESTAMP
```

### Table `notifications`

```sql
id                ULID         PRIMARY KEY
user_id           ULID         FK users
type              VARCHAR(50)                   -- 'mission_accepted', ...
title             VARCHAR(150)
body              TEXT
data              JSON         NULLABLE
read_at           TIMESTAMP    NULLABLE
created_at        TIMESTAMP
```

### Table `platform_config`

```sql
id                INT          PRIMARY KEY DEFAULT 1
data              JSON                          -- toute la config plateforme
updated_at        TIMESTAMP
```

### Table `platform_secrets`

```sql
key               VARCHAR(50)  PRIMARY KEY     -- 'jeko_api_key', ...
value             TEXT                          -- chiffré via APP_KEY Laravel
updated_at        TIMESTAMP
```

### Table `rate_limits`

```sql
key               VARCHAR(100) PRIMARY KEY     -- 'login:+2250103030334'
attempts          INT
window_start      TIMESTAMP
```

---

## 5. MODULES FONCTIONNELS

---

### 5.1 MODULE AUTHENTIFICATION

#### Inscription

1. Saisie : nom complet, téléphone (+225XXXXXXXXXX), code PIN 4 chiffres, ville, rôle (client ou prestataire)
2. Photo de profil **obligatoire** (upload Cloudflare R2)
3. **Prestataire uniquement** : CNI recto + verso (upload R2), numéro de CNI unique
4. Validation unicité : téléphone, CNI, photo de profil, photo CNI recto
5. Hash du PIN en **PBKDF2 SHA-512** (100 000 itérations, salt 32 bytes aléatoires)
6. Création `users` + `auth_credentials` + `provider_profiles` (si PROVIDER)
7. Réponse : token Sanctum + profil complet (sans hash)

#### Connexion

1. Saisie : téléphone + PIN
2. Lookup `auth_credentials` par téléphone
3. Vérification PBKDF2 **timing-safe** (`hash_equals`)
4. Création session (token 96 chars hex, expiry 7 jours)
5. Réponse : token + profil utilisateur complet

#### OTP (désactivé au lancement — activer quand Africa's Talking est configuré)

```
POST /api/otp  { action: 'send', phone }     → génère code 6 chiffres, expiry 5 min
POST /api/otp  { action: 'verify', phone, code } → vérifie et invalide le code
```

Rate limiting :
- 3 envois / 10 min par téléphone
- 5 vérifications / 10 min par téléphone

#### Reset mot de passe

- **Option admin** : génération d'un code temporaire 4 chiffres depuis le backoffice → affiché à l'admin, communiqué manuellement à l'utilisateur
- **Option OTP** *(futur)* : `POST /api/password/reset` via SMS Africa's Talking

#### Déconnexion

```
POST /api/logout  → supprime le token Sanctum de la base
```

---

### 5.2 MODULE CLIENT

#### Créer une mission

**Formulaire par catégorie :**

| Catégorie | Champs spécifiques |
|---|---|
| 🧹 Ménage | Superficie, type de logement, consignes |
| 🍳 Cuisine | Type de repas, nombre de personnes, régimes alimentaires |
| 👕 Lessive | Nombre de pièces (minimum 10), type (délicat / normal) |
| 🌱 Jardinage | Superficie jardin, travaux demandés |
| 👶 Nounou | Âge(s) des enfants, horaires, consignes de sécurité |
| 🛒 Courses | Liste de courses (texte libre), budget en FCFA |
| 👴 Personnes âgées | Niveau de mobilité, besoins médicaux |
| 🔧 Bricolage | Type de travaux, matériaux fournis ou non |

**Champs communs :**

- Date de la mission
- Heure de début, durée estimée
- Adresse exacte + ville
- Notes / consignes supplémentaires
- Bonus d'incitation (optionnel, +x FCFA pour attirer les prestataires)

**Calcul du prix :**

```
Prix total = base_price + frais_service + frais_livraison + frais_jeko

Frais Jèko    = ceil(sous_total × 0.015)   -- 1,5% arrondi au FCFA supérieur
Frais service = 500 FCFA  (Marché uniquement)
Frais livraison = 1 000 FCFA  (Marché uniquement)
```

> ⚠️ Les frais Jèko sont **toujours à la charge du client**. Afficher la décomposition détaillée avant toute confirmation de paiement.

**Paiement :**

- Via **Jèko** (Wave CI, Orange Money, MTN MoMo, Moov Money)
- Redirect vers le checkout Jèko → retour automatique via webhook
- **Faire mon marché** : paiement obligatoire à la création de la mission

#### Suivi de mission

| Statut | Description |
|---|---|
| `PENDING` | Mission créée, en attente d'un prestataire |
| `ACCEPTED` | Prestataire accepté, mission confirmée |
| `IN_PROGRESS` | Mission en cours (démarrée par le prestataire) |
| `COMPLETED` | Mission terminée et validée |
| `CANCELLED` | Annulée (client, prestataire ou admin) |
| `DISPUTED` | Litige ouvert |

- Chat temps réel avec le prestataire (Laravel Echo / Pusher)
- Bouton **Valider la fin** (client confirme)
- Option **Prolonger** la durée (si activé dans les paramètres)

#### Notes & Avis

- Note de 1 à 5 étoiles + commentaire texte
- Une seule note par mission, uniquement après statut `COMPLETED`
- Impacte la note globale du prestataire

#### Portefeuille client

- Solde disponible
- Historique des transactions (filtres type/date)
- Remboursements automatiques (litige résolu en faveur du client)

---

### 5.3 MODULE PRESTATAIRE

#### Profil & Vérification

- Bio libre
- Compétences (sélection multiple parmi les catégories de services)
- Villes d'intervention (multi-sélection)
- Années d'expérience
- Badge **Vérifié** ✅ → activé manuellement par l'admin après vérification CNI
- Toggle disponibilité (ON / OFF)

#### Tableau de bord

- Missions disponibles correspondant aux catégories/villes
- Missions en cours
- Historique complet
- Revenus du mois en cours

#### Gestion des missions

| Action | Condition |
|---|---|
| Accepter | Mission en statut `PENDING`, limite mensuelle non atteinte |
| Refuser | Mission en statut `PENDING` |
| Démarrer | Mission en statut `ACCEPTED` |
| Clôturer | Mission en statut `IN_PROGRESS` |

#### Plans d'abonnement

| Plan | Prix/mois | Missions/mois | Avantages |
|---|---|---|---|
| 🆓 GRATUIT | 0 FCFA | **5 max** | Accès basique |
| 🥉 STARTER | 2 500 FCFA | **20 max** | Badge Starter |
| 🥈 PRO | 5 000 FCFA | **Illimité** | Badge Pro + priorité d'affichage |
| 🥇 PREMIUM | 10 000 FCFA | **Illimité** | Badge Premium + support prioritaire + mise en avant |

- Paiement via Jèko (frais 1,5% inclus dans le montant affiché)
- Activation immédiate après confirmation webhook Jèko
- Blocage automatique à la limite → modal d'upgrade s'affiche

#### Badges

> Pas de système de points au lancement — badges uniquement.

| Badge | Condition d'obtention |
|---|---|
| ✅ Vérifié | CNI validé manuellement par l'admin |
| 🥉 Starter / 🥈 Pro / 🥇 Premium | Abonnement actif |
| 🎓 Formation | Quiz de l'académie complété |
| ⭐ Top Prestataire | Note ≥ 4,5 avec ≥ 20 avis |

#### Demande de retrait

- `POST /api/withdrawal` → transfert Jèko (Pay-out)
- Minimum : **500 FCFA**
- Opérateurs : Wave, Orange Money, MTN, Moov
- Statut visible dans le portefeuille

#### Académie / Formation

- Vidéos YouTube embed (guides professionnels)
- Tests / Quiz avec score et certification
- Images pédagogiques
- Filtré par catégorie de service

---

### 5.4 MODULE ADMIN

#### Dashboard KPIs

- Missions : total, par statut, par catégorie, par ville
- Revenus : plateforme, commissions, abonnements
- Utilisateurs : clients actifs, prestataires actifs, inscriptions/semaine
- Taux de satisfaction moyen (étoiles)
- Graphiques **7j / 30j / 90j** (Recharts)

#### Gestion Utilisateurs

- Table avec filtres : rôle, ville, statut, abonnement, date d'inscription
- Vue détaillée : profil complet, missions, transactions, portefeuille
- **Actions disponibles** :
  - ✅ Vérifier (badge vérifié)
  - 🚫 Suspendre / Réactiver
  - 🎁 Attribuer un bonus (crédit portefeuille)
  - 🔑 Générer un code temporaire (reset PIN)
- Affichage des documents CNI (recto/verso) pour vérification

#### Reset PIN (Option Admin)

1. Admin clique "Générer code temporaire" sur le profil utilisateur
2. Le système génère un code 4 chiffres aléatoire
3. Code affiché dans le backoffice (expiry 24h)
4. Admin communique le code à l'utilisateur (téléphone/WhatsApp)
5. À la prochaine connexion avec ce code, forcer le changement de PIN

#### Gestion Missions

- Table complète avec filtres : statut, catégorie, ville, date, prestataire
- Affectation manuelle d'un prestataire
- Annulation forcée avec motif
- Export CSV

#### Finance

- Transactions complètes (filtres : type / statut / date / utilisateur)
- Revenus Servi+ (commissions)
- Retraits prestataires en attente / validés

#### Litiges

- Liste des disputes ouvertes
- Vue détaillée : historique de la mission, messages, montant en jeu
- Résolution :
  - En faveur du **client** → remboursement wallet
  - En faveur du **prestataire** → libération du wallet gelé
- Note de résolution obligatoire

#### Paramètres Plateforme

Stockés dans `platform_config.data` (JSON éditable depuis le backoffice) :

```json
{
  "enable2FA": false,
  "enableHourExtension": true,
  "enableTrainingSection": true,
  "cityAvailability": {
    "Abidjan": true,
    "Bouaké": true,
    "Daloa": true,
    "Yamoussoukro": true,
    "San-Pédro": false,
    "Korhogo": false,
    "Man": true,
    "Gagnoa": true
  },
  "serviceAvailability": {
    "CLEANING": true,
    "COOKING": true,
    "LAUNDRY": true,
    "BABYSITTING": true,
    "GARDENING": true,
    "MARKET": true,
    "ELDERLY_CARE": true,
    "HANDYMAN": true
  },
  "baseRates": {
    "CLEANING": 3500,
    "COOKING": 4000,
    "LAUNDRY": 3000,
    "BABYSITTING": 2500,
    "GARDENING": 4500,
    "ELDERLY_CARE": 5000,
    "HANDYMAN": 5000
  },
  "subscriptionPlans": {
    "starter": 2500,
    "pro": 5000,
    "premium": 10000
  },
  "flashAnnouncements": []
}
```

#### Gestion Abonnements

- Prix éditables STARTER / PRO / PREMIUM (impact immédiat)
- Compteur d'abonnés par plan
- Historique des paiements d'abonnement

#### Annonces Flash

- Créer / modifier / supprimer des bandeaux promotionnels
- Ciblage : TOUS / CLIENT / PRESTATAIRE
- Activation / désactivation en temps réel

#### Intégrations API

- Saisie sécurisée des clés Jèko (stockées chiffrées dans `platform_secrets`)
- Test de connexion Jèko
- Configuration Africa's Talking (clé + identifiant expéditeur)

#### Gestion Sous-Admins *(Super Admin uniquement)*

- Créer un compte admin
- Suspendre un admin
- Voir le journal d'actions admin

---

### 5.5 MODULE PAIEMENTS JÈKO

#### Flux Pay-in (client paie)

```
1. Client → POST /api/payments/initiate  { missionId, phone, operator }
2. Laravel → crée pending_payment (status: PENDING)
3. Laravel → appelle Jèko POST /v1/payment-requests
4. Jèko   → retourne { id, redirectUrl }
5. Laravel → retourne { checkoutUrl } au client
6. Client  → redirigé vers le checkout Jèko
7. Client  → complète le paiement Mobile Money sur Jèko
8. Jèko   → POST /api/webhooks/jeko  (callback signé HMAC)
9. Laravel → vérifie signature + idempotence
10. Laravel → met à jour mission.payment_status, transaction, wallet
11. Laravel → notification temps réel client + prestataire
```

#### Flux Pay-out (retrait prestataire)

```
1. Prestataire → POST /api/withdrawal  { amount, phone, operator }
2. Laravel → vérifie solde wallet suffisant
3. Laravel → appelle Jèko POST /v1/transfers
4. Jèko   → retourne { id, status: PENDING }
5. Jèko   → POST /api/webhooks/jeko  (callback)
6. Laravel → met à jour transaction SUCCESS ou FAILED
7. Si FAILED → restitution du montant au wallet
```

#### Opérateurs Mobile Money supportés

| Opérateur | Code Jèko |
|---|---|
| Wave CI | `wave` |
| Orange Money CI | `orange_money` |
| MTN Mobile Money CI | `mtn` |
| Moov Money CI | `moov` |

#### Calcul des frais

```php
// Toujours arrondi au FCFA supérieur
$jekoFee = (int) ceil($baseAmount * 0.015);
$totalToPay = $baseAmount + $jekoFee;
```

#### Sécurité webhook

```php
// Vérification signature HMAC-SHA256
$signature = hash_hmac('sha256', $rawBody, config('services.jeko.webhook_secret'));
if (!hash_equals($signature, $request->header('X-Jeko-Signature'))) {
    return response('Unauthorized', 401);
}

// Idempotence — clé UNIQUE sur jeko_payment_id
$pending = PendingPayment::where('jeko_payment_id', $payload['id'])->first();
if ($pending?->status !== 'PENDING') {
    return response('Already processed', 200);
}
```

---

## 6. API ENDPOINTS

### Authentification (public)

```
POST  /api/register
POST  /api/login
POST  /api/logout                     [auth]
POST  /api/otp                        { action: 'send'|'verify', phone, code? }
POST  /api/me                         [auth]
```

### Profil utilisateur

```
GET   /api/profile                    [auth]
PUT   /api/profile                    [auth]
POST  /api/profile/avatar             [auth]  multipart/form-data
POST  /api/profile/change-pin         [auth]
```

### Missions

```
GET   /api/missions                   [auth]  filtrés par rôle automatiquement
POST  /api/missions                   [auth=CLIENT]
GET   /api/missions/{id}              [auth]
PUT   /api/missions/{id}/accept       [auth=PROVIDER]
PUT   /api/missions/{id}/start        [auth=PROVIDER]
PUT   /api/missions/{id}/complete     [auth=PROVIDER]
PUT   /api/missions/{id}/cancel       [auth]
POST  /api/missions/{id}/review       [auth=CLIENT]
POST  /api/missions/{id}/dispute      [auth]
PUT   /api/missions/{id}/extend       [auth=CLIENT]
```

### Prestataire

```
GET   /api/provider/profile           [auth=PROVIDER]
PUT   /api/provider/profile           [auth=PROVIDER]
GET   /api/provider/missions/available [auth=PROVIDER]
GET   /api/provider/stats             [auth=PROVIDER]
```

### Abonnements

```
POST  /api/subscriptions/create       [auth=PROVIDER]  { plan, phone, operator }
GET   /api/subscriptions/current      [auth=PROVIDER]
```

### Paiements

```
POST  /api/payments/initiate          [auth=CLIENT]  { missionId, phone, operator }
GET   /api/payments/{id}/status       [auth]
POST  /api/payments/market            [auth=CLIENT]  { list, budget, phone, operator }
POST  /api/withdrawal                 [auth=PROVIDER] { amount, phone, operator }
POST  /api/webhooks/jeko              [public — vérification HMAC]
```

### Notifications

```
GET   /api/notifications              [auth]
PUT   /api/notifications/{id}/read    [auth]
PUT   /api/notifications/read-all     [auth]
```

### Admin

```
GET   /api/admin/stats                [auth=ADMIN]
GET   /api/admin/users                [auth=ADMIN]
GET   /api/admin/users/{id}           [auth=ADMIN]
PUT   /api/admin/users/{id}           [auth=ADMIN]
POST  /api/admin/users/{id}/suspend   [auth=ADMIN]
POST  /api/admin/users/{id}/verify    [auth=ADMIN]
POST  /api/admin/users/{id}/bonus     [auth=ADMIN]
POST  /api/admin/users/{id}/reset-pin [auth=ADMIN]
GET   /api/admin/missions             [auth=ADMIN]
PUT   /api/admin/missions/{id}        [auth=ADMIN]
GET   /api/admin/transactions         [auth=ADMIN]
GET   /api/admin/disputes             [auth=ADMIN]
PUT   /api/admin/disputes/{id}/resolve [auth=ADMIN]
GET   /api/admin/config               [auth=ADMIN]
PUT   /api/admin/config               [auth=ADMIN]
POST  /api/admin/config/api-keys      [auth=SUPER_ADMIN]
GET   /api/admin/subscriptions        [auth=ADMIN]
POST  /api/admin/users                [auth=SUPER_ADMIN]  créer admin
```

---

## 7. SÉCURITÉ

### Authentification & Sessions

- **Laravel Sanctum** — tokens Bearer
- Tokens : 96 caractères hexadécimaux (48 bytes `random_bytes`)
- Expiry : 7 jours glissants
- Révocation immédiate au logout (`DELETE` du token en base)
- Un utilisateur peut avoir plusieurs sessions actives (multi-appareils)

### Stockage des mots de passe

```
Format : {salt}:{hash}
Salt   : 32 bytes aléatoires (hex = 64 chars)
Hash   : PBKDF2-HMAC-SHA512, 100 000 itérations, 64 bytes de sortie (hex = 128 chars)
Comparaison : hash_equals() — timing-safe obligatoire
```

> ⚠️ Le hash du PIN ne doit **jamais** apparaître dans une réponse API ou un log.

### Rate Limiting (Laravel + Redis)

| Endpoint | Limite | Fenêtre |
|---|---|---|
| `POST /api/login` | 5 tentatives | 15 min (par IP + téléphone) |
| `POST /api/otp` action=send | 3 envois | 10 min (par téléphone) |
| `POST /api/otp` action=verify | 5 vérifications | 10 min (par téléphone) |
| `POST /api/register` | 3 inscriptions | 1 heure (par IP) |
| `POST /api/withdrawal` | 3 demandes | 24 heures (par utilisateur) |

### Validation des données

| Champ | Règle |
|---|---|
| Téléphone CI | Regex `/^\+225\d{10}$/` |
| PIN | Exactement 4 chiffres `/^\d{4}$/` |
| Montants | Décimal positif, max 5 000 000 FCFA |
| Avatar | MIME : `image/jpeg`, `image/png` — max 5 MB |
| CNI recto/verso | MIME : `image/jpeg`, `image/png`, `application/pdf` — max 10 MB |

### Clés Jèko

- Stockées dans `platform_secrets` chiffrées via `Crypt::encrypt` (Laravel, APP_KEY)
- **Jamais exposées** dans une réponse API cliente
- Lecture uniquement dans les jobs et controllers protégés
- Écriture uniquement par le Super Admin via `POST /api/admin/config/api-keys`

### CORS

```php
// config/cors.php
'allowed_origins' => ['https://serviceplus-steel.vercel.app'],
'allowed_methods' => ['POST', 'GET', 'PUT', 'DELETE', 'OPTIONS'],
'allowed_headers' => ['Authorization', 'Content-Type', 'Accept'],
```

### Webhook Jèko

- Vérification **HMAC-SHA256** obligatoire (header `X-Jeko-Signature`)
- Idempotence garantie par contrainte `UNIQUE` sur `pending_payments.jeko_payment_id`
- Réponse `200 OK` systématique pour éviter les re-tentatives Jèko

---

## 8. INTERFACES UTILISATEUR (REACT + SHADCN/UI)

### Design System

| Élément | Valeur |
|---|---|
| Composants | shadcn/ui (Radix UI + Tailwind v4) |
| Couleur primaire | `#16a34a` (green-600) |
| Couleur secondaire | `#f59e0b` (amber-500) |
| Fond | white / gray-50 |
| Typographie | **Inter** (Google Fonts) |
| Responsive | Mobile-first (90% des utilisateurs sur mobile) |
| Langue | Français (Côte d'Ivoire) |
| Mode sombre | Non requis au lancement |

### Composants shadcn utilisés

`Button` · `Card` · `CardContent` · `Dialog` · `Form` · `Input` · `Label` · `Select` · `Tabs` · `Table` · `Badge` · `Avatar` · `Sheet` · `Toast` · `Separator` · `Progress` · `Skeleton` · `ScrollArea` · `DropdownMenu` · `Popover` · `Calendar` · `Textarea` · `Switch` · `Checkbox` · `RadioGroup`

---

### Pages CLIENT

| Route | Page | Description |
|---|---|---|
| `/login` | Connexion | Téléphone + PIN 4 chiffres |
| `/register` | Inscription | Stepper multi-étapes (infos perso → photo → CNI si prestataire) |
| `/` | Dashboard | Missions récentes, CTA nouvelle mission, annonces flash |
| `/mission/new` | Nouvelle mission | Formulaire dynamique selon catégorie sélectionnée |
| `/mission/:id` | Détail mission | Statut, chat temps réel, actions |
| `/market` | Faire mon marché | Liste de courses + budget + décomposition frais |
| `/wallet` | Portefeuille | Solde + historique transactions |
| `/notifications` | Notifications | Liste + marquer comme lu |
| `/profile` | Profil | Modifier infos, changer PIN |

---

### Pages PRESTATAIRE

| Route | Page | Description |
|---|---|---|
| `/provider` | Dashboard | Missions dispo, stats mois, portefeuille |
| `/provider/missions` | Missions disponibles | Liste filtrée par catégories/villes |
| `/provider/missions/:id` | Détail mission | Accepter / Démarrer / Clôturer |
| `/provider/my-missions` | Mes missions | Historique complet |
| `/provider/subscription` | Abonnement | 4 cards plans + paiement Jèko |
| `/provider/academy` | Académie | Vidéos + tests de formation |
| `/provider/wallet` | Portefeuille | Solde + demande de retrait |
| `/provider/profile` | Profil | Compétences, villes, disponibilité, bio |

---

### Pages ADMIN

| Route | Page | Description |
|---|---|---|
| `/admin` | Dashboard | KPIs + graphiques (Recharts) |
| `/admin/users` | Utilisateurs | Table + filtres avancés |
| `/admin/users/:id` | Profil utilisateur | Détail + historique + actions admin |
| `/admin/missions` | Missions | Table + filtres + affectation |
| `/admin/missions/:id` | Détail mission | Vue complète + actions |
| `/admin/finance` | Finance | Transactions + revenus Servi+ |
| `/admin/disputes` | Litiges | Liste + résolution |
| `/admin/subscriptions` | Abonnements | Plans + prix éditables + compteurs |
| `/admin/settings` | Paramètres | Toggles, tarifs, villes, services |
| `/admin/announcements` | Annonces flash | Créer / gérer les bandeaux |
| `/admin/academy` | Académie | Gérer le contenu de formation |
| `/admin/api` | Intégrations | Clés Jèko + Africa's Talking |

---

## 9. INTÉGRATIONS TIERCES

### Jèko Partner API

| Élément | Valeur |
|---|---|
| Base URL | `https://api.jeko.africa` |
| Auth | Headers `X-API-KEY` + `X-API-KEY-ID` |
| Sandbox | `https://sandbox.api.jeko.africa` |

**Endpoints utilisés :**

| Méthode | Endpoint | Usage |
|---|---|---|
| `POST` | `/v1/payment-requests` | Créer un Pay-in (client → Servi+) |
| `GET` | `/v1/payment-requests/{id}` | Vérifier le statut d'un paiement |
| `POST` | `/v1/contacts` | Upsert contact prestataire |
| `POST` | `/v1/transfers` | Créer un Pay-out (retrait prestataire) |

**Webhook :** `POST /api/webhooks/jeko` — payload JSON signé HMAC-SHA256

---

### Africa's Talking (SMS OTP)

| Élément | Valeur |
|---|---|
| Documentation | [africastalking.com/docs](https://africastalking.com/docs) |
| Usage | Envoi OTP uniquement (6 chiffres, expiry 5 min) |
| Identifiant expéditeur | `ServiPlus` (à enregistrer chez AT) |
| Fallback dev | `Log::info("[OTP] $phone : $code")` |

---

### Cloudflare R2 (Stockage fichiers)

| Élément | Valeur |
|---|---|
| Bucket | `serviplus-media` |
| Contenu | Avatars, CNI recto/verso, photos de missions |
| Accès | URLs signées (expiry 1h pour les CNI — données sensibles) |
| Compatibilité | S3 (driver Laravel `s3`) |

---

### Pusher / Soketi (Temps réel)

| Canal | Événements |
|---|---|
| `mission.{id}` | `status-changed`, `new-message`, `provider-assigned` |
| `user.{userId}` | `notification`, `wallet-updated`, `mission-update` |

**Auth endpoint :** `POST /api/broadcasting/auth` (Sanctum)

---

## 10. RÈGLES MÉTIER IMPORTANTES

| # | Règle |
|---|---|
| 1 | Un prestataire **FREE** est bloqué après **5 missions acceptées** dans le mois calendaire. Afficher une modal d'upgrade. |
| 2 | Les frais Jèko **1,5%** sont toujours **à la charge du client**. Jamais absorbés par Servi+. Afficher la décomposition avant tout paiement. |
| 3 | **Faire mon marché** : paiement **obligatoire à la création**. Frais : 500 FCFA service + 1 000 FCFA livraison + 1,5% Jèko sur le total. |
| 4 | Un prestataire est **non vérifié par défaut**. L'admin doit valider manuellement les CNI uploadés avant d'activer le badge. |
| 5 | En cas de litige (`DISPUTED`), le wallet du prestataire est **gelé** jusqu'à résolution. |
| 6 | **Unicité** sur la plateforme : téléphone, numéro CNI, photo de profil, photo CNI recto — toutes uniques. |
| 7 | Les **prix des abonnements** sont éditables depuis le backoffice admin en temps réel. |
| 8 | Le **webhook Jèko** doit être idempotent : vérifier `pending_payments.status` avant toute mise à jour. |
| 9 | Le hash du PIN n'est **jamais** retourné dans une réponse API ou loggué. |
| 10 | La **2FA par OTP** est désactivée par défaut tant qu'Africa's Talking n'est pas configuré. |

---

## 11. DÉPLOIEMENT & ENVIRONNEMENTS

### Variables d'environnement Laravel (`.env`)

```env
# Application
APP_NAME="Servi+"
APP_ENV=production
APP_KEY=                            # php artisan key:generate
APP_URL=https://api.serviplus.ci
APP_DEBUG=false

# Base de données
DB_CONNECTION=mysql
DB_HOST=
DB_PORT=3306
DB_DATABASE=serviplus
DB_USERNAME=
DB_PASSWORD=

# Redis (cache + queues)
REDIS_HOST=
REDIS_PASSWORD=
REDIS_PORT=6379
CACHE_DRIVER=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=database

# Pusher (temps réel)
PUSHER_APP_ID=
PUSHER_APP_KEY=
PUSHER_APP_SECRET=
PUSHER_APP_CLUSTER=mt1
BROADCAST_DRIVER=pusher

# Cloudflare R2 (compatibilité S3)
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=auto
AWS_BUCKET=serviplus-media
AWS_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
AWS_USE_PATH_STYLE_ENDPOINT=true

# Africa's Talking (SMS)
AFRICAS_TALKING_API_KEY=
AFRICAS_TALKING_USERNAME=
AFRICAS_TALKING_SENDER_ID=ServiPlus

# Jèko (stocké chiffré dans platform_secrets, pas dans .env)
# JEKO_WEBHOOK_SECRET=    ← dans platform_secrets

# Mail
MAIL_MAILER=mailgun
MAILGUN_DOMAIN=
MAILGUN_SECRET=
MAIL_FROM_ADDRESS=noreply@serviplus.ci
MAIL_FROM_NAME="Servi+"
```

### Variables d'environnement Frontend (`.env`)

```env
VITE_API_URL=https://api.serviplus.ci
VITE_PUSHER_APP_KEY=
VITE_PUSHER_APP_CLUSTER=mt1
VITE_APP_NAME="Servi+"
```

### CI/CD — GitHub Actions

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]

jobs:
  backend:
    - php artisan test          # PHPUnit feature tests
    - php artisan migrate       # migrations auto
    - deploy vers Railway

  frontend:
    - npm run type-check        # tsc --noEmit
    - npm run build             # vite build
    - deploy vers Vercel
```

---

## 12. PHASES DE DÉVELOPPEMENT

### Phase 1 — Foundation (3 semaines)

- [ ] Setup Laravel 12 (migrations, seeders, factories)
- [ ] Auth complète (register, login, logout, Sanctum, PBKDF2)
- [ ] Setup React + Vite + shadcn/ui + Zustand + TanStack Query
- [ ] Pages login / inscription (stepper client + prestataire)
- [ ] Upload fichiers (avatar, CNI) → Cloudflare R2

### Phase 2 — Core Missions (3 semaines)

- [ ] CRUD missions (toutes les 8 catégories)
- [ ] Dashboard client + prestataire
- [ ] Matching prestataire / mission (catégories + villes)
- [ ] Chat temps réel (Pusher)
- [ ] Système de notifications

### Phase 3 — Paiements (2 semaines)

- [ ] Intégration Jèko Pay-in (missions + abonnements)
- [ ] Webhook Jèko (idempotent + HMAC)
- [ ] Retraits prestataires (Pay-out Jèko)
- [ ] Faire mon marché (paiement à la création)
- [ ] Décomposition frais Jèko côté client

### Phase 4 — Admin Backoffice (2 semaines)

- [ ] Dashboard KPIs + graphiques Recharts
- [ ] Gestion users (vérification CNI, suspension, bonus, reset PIN)
- [ ] Gestion missions + litiges
- [ ] Finance (transactions, revenus)
- [ ] Paramètres plateforme (tarifs, villes, API keys)
- [ ] Annonces flash

### Phase 5 — Finalisation (1 semaine)

- [ ] Tests end-to-end (Playwright)
- [ ] Optimisation performances (bundle, images)
- [ ] Déploiement production (Railway + Vercel)
- [ ] Intégration Africa's Talking SMS
- [ ] Activation 2FA depuis le backoffice admin

---

## RÉSUMÉ TECHNIQUE

```
serviplus-backend/          serviplus-frontend/
├── app/                    ├── src/
│   ├── Http/               │   ├── components/
│   │   ├── Controllers/    │   │   └── ui/          (shadcn)
│   │   └── Middleware/     │   ├── pages/
│   ├── Models/             │   ├── services/        (api calls)
│   ├── Jobs/               │   ├── stores/          (zustand)
│   └── Services/           │   └── lib/             (utils)
├── database/               ├── tailwind.config.ts
│   ├── migrations/         ├── vite.config.ts
│   └── seeders/            └── package.json
├── routes/api.php
└── .env
```

---

*Document produit pour Servi+ v2.0 — Toute modification des règles métier ou du modèle de données doit être répercutée dans ce cahier des charges.*
