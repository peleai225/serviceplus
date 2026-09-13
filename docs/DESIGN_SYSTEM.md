# Servi+ — Design System
> Version 1.0 · Palette Vert Forêt · Style : Moderne Minimaliste

---

## 1. Philosophie

L'interface de Servi+ s'inspire du design minimaliste de Claude.ai et des grandes fintech africaines (Wave, Orange Money). Elle repose sur **trois principes** :

| Principe | Traduction visuelle |
|---|---|
| **Clarté** | Beaucoup d'espace blanc, hiérarchie typographique forte |
| **Confiance** | Vert forêt sobre + blanc immaculé = sérieux, fiabilité |
| **Fluidité** | Animations légères (Motion), coins arrondis généreux |

L'app est **mobile-first** (max-width 448 px). Chaque décision de design est pensée pour un écran de poche en Côte d'Ivoire.

---

## 2. Palette de Couleurs

### 2.1 Couleur Primaire — Green Forest

```
Green-50  : #f0fdf4   ← fond de section, hover très léger
Green-100 : #dcfce7   ← fond badge, fond chip
Green-200 : #bbf7d0   ← bordure douce, ring focus
Green-300 : #86efac   ← illustration, décor
Green-500 : #22c55e   ← état hover bouton
Green-600 : #16a34a   ← ★ COULEUR PRINCIPALE — boutons, tab active, logo
Green-700 : #15803d   ← état pressed / dark mode
Green-800 : #166534   ← texte sur fond vert clair
Green-900 : #14532d   ← titre sur fond très clair
```

> **Règle d'or** : n'utiliser Green-600 que sur des éléments interactifs (boutons, onglets, liens). Tout le reste est neutre.

---

### 2.2 Neutres — Base de l'interface

```
White     : #FFFFFF   ← fond principal de l'app, cards
Gray-50   : #F9FAFB   ← fond d'écran derrière les cards
Gray-100  : #F3F4F6   ← fond input, fond chip inactif
Gray-200  : #E5E7EB   ← séparateur, bordure card
Gray-400  : #9CA3AF   ← placeholder, icône inactif, tab inactive
Gray-600  : #4B5563   ← texte secondaire, label, sous-titre
Gray-900  : #111827   ← texte principal, titre H1/H2
```

---

### 2.3 Couleurs Sémantiques

```
Succès    : #16a34a  (= Green-600, idem primaire)
Attention : #D97706  (Amber-600)  — retard, paiement en attente
Erreur    : #DC2626  (Red-600)    — litige, suppression, alerte
Info      : #0284C7  (Sky-600)    — notification info, lien
```

---

### 2.4 Surfaces

```
Surface-app      : #F9FAFB  (fond global derrière le container)
Surface-card     : #FFFFFF  (toutes les cards)
Surface-overlay  : rgba(0,0,0,0.45)  (modals, drawers)
Surface-glass    : rgba(255,255,255,0.85) + blur(12px)  (header, bottom nav)
```

---

## 3. Typographie

### 3.1 Polices sélectionnées

#### Police Principale — **Plus Jakarta Sans**
> Google Fonts · Libre · Moderne · Humaniste

Usage : **tous les textes** (titres, corps, labels, boutons).

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Pourquoi ce choix :
- Géométrique mais chaleureuse → parfait pour une app de services humains
- Excellente lisibilité aux petites tailles (labels, badges)
- La graisse 800 donne des titres très percutants
- Utilisée par des apps comme Loom, Framer

---

#### Police d'Accent — **Sora**
> Google Fonts · Libre · Arrondie · Distinctive

Usage : **logo "S+"**, grandes statistiques (portefeuille, montants), hero titles.

```html
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
```

Pourquoi ce choix :
- Rondeur unique qui distingue les chiffres des titres standards
- Renforce l'identité visuelle du logo
- Excellent pour afficher des montants FCFA

---

### 3.2 Échelle typographique

| Token | Taille | Graisse | Police | Usage |
|---|---|---|---|---|
| `display` | 32px / 2rem | 800 | Sora | Montant portefeuille, héros |
| `h1` | 24px / 1.5rem | 700 | Jakarta | Titre de page |
| `h2` | 20px / 1.25rem | 700 | Jakarta | Titre de section |
| `h3` | 17px / 1.0625rem | 600 | Jakarta | Titre de card |
| `body-lg` | 16px / 1rem | 400 | Jakarta | Texte principal |
| `body` | 14px / 0.875rem | 400 | Jakarta | Description, contenu |
| `label` | 13px / 0.8125rem | 600 | Jakarta | Label champ, chip |
| `caption` | 11px / 0.6875rem | 500 | Jakarta | Date, meta info, badge |

**Hauteur de ligne (line-height)** :
- Titres : `1.25` (tight)
- Corps : `1.6` (relaxed)
- Labels/captions : `1.4`

---

### 3.3 CSS Variables à déclarer

```css
@theme {
  --font-display: "Sora", ui-sans-serif, system-ui, sans-serif;
  --font-sans:    "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;

  /* Couleurs principales */
  --color-primary:       #16a34a;
  --color-primary-light: #22c55e;
  --color-primary-xlight:#dcfce7;
  --color-primary-dark:  #15803d;

  /* Neutres */
  --color-surface:  #F9FAFB;
  --color-card:     #FFFFFF;
  --color-border:   #E5E7EB;
  --color-muted:    #9CA3AF;
  --color-text-2:   #4B5563;
  --color-text:     #111827;

  /* Sémantiques */
  --color-warning:  #D97706;
  --color-error:    #DC2626;
  --color-info:     #0284C7;
}
```

---

## 4. Espacement & Grille

**Base unit : 4px**

| Token | Valeur | Usage typique |
|---|---|---|
| `space-1` | 4px | Espace interne micro (icône + texte) |
| `space-2` | 8px | Padding petit élément, gap dans un groupe |
| `space-3` | 12px | Padding chip, gap liste dense |
| `space-4` | 16px | Padding card, padding page horizontal |
| `space-5` | 20px | Gap entre sections |
| `space-6` | 24px | Padding section, gap vertical principal |
| `space-8` | 32px | Margin entre blocs majeurs |
| `space-12` | 48px | Padding hero, espace visuel large |

**Padding de page** : `px-4` (16px gauche + droite) — constant sur tous les écrans.

---

## 5. Coins Arrondis (Border Radius)

```
radius-sm  : 8px   → badge, chip, input léger
radius-md  : 12px  → bouton, input standard
radius-lg  : 16px  → card principale
radius-xl  : 20px  → carte mission, modal bottom sheet
radius-2xl : 24px  → card hero, section featured
radius-full: 9999px → avatar, pill badge, bouton icon-only
```

> Règle : **les boutons sont en `radius-xl` (20px)**. Cela donne un look moderne sans être trop "bulle".

---

## 6. Ombres (Shadows)

```
shadow-xs  : 0 1px 2px rgba(0,0,0,0.05)           → card au repos
shadow-sm  : 0 2px 8px rgba(0,0,0,0.06)            → card légère
shadow-md  : 0 4px 16px rgba(0,0,0,0.08)           → card active, modal
shadow-lg  : 0 8px 32px rgba(0,0,0,0.10)           → bottom sheet
shadow-green: 0 4px 20px rgba(22,163,74,0.25)      → bouton primaire vert
shadow-green-lg: 0 8px 32px rgba(22,163,74,0.30)   → bouton primaire au hover
```

> Le **shadow vert sur bouton** est la signature visuelle principale de l'app. Il donne de la profondeur sans lourdeur.

---

## 7. Composants — Spécifications

### 7.1 Boutons

```
┌─ Primary ─────────────────────────────────────────────┐
│  bg: #16a34a  text: white  radius: 20px  py: 14px  px: 24px  │
│  font: Jakarta 600 15px  shadow: shadow-green               │
│  hover → bg: #15803d + shadow-green-lg                      │
│  active → scale(0.97) via Motion                            │
└──────────────────────────────────────────────────────────┘

┌─ Secondary ───────────────────────────────────────────┐
│  bg: #dcfce7  text: #15803d  border: 1px #86efac     │
│  radius: 20px  py: 14px  px: 24px  font: Jakarta 600  │
└──────────────────────────────────────────────────────┘

┌─ Ghost ───────────────────────────────────────────────┐
│  bg: transparent  text: #16a34a  radius: 20px         │
│  hover → bg: #f0fdf4                                  │
└──────────────────────────────────────────────────────┘

┌─ Danger ──────────────────────────────────────────────┐
│  bg: #FEF2F2  text: #DC2626  border: 1px #FECACA     │
│  radius: 20px                                         │
└──────────────────────────────────────────────────────┘

┌─ Icon Button ─────────────────────────────────────────┐
│  bg: #F3F4F6  radius: full  p: 10px                   │
│  active variant → bg: #dcfce7  text: #16a34a         │
└──────────────────────────────────────────────────────┘
```

---

### 7.2 Cards

```
┌─ Card Standard ───────────────────────────────────────┐
│  bg: white  radius: 16px  border: 1px #E5E7EB        │
│  shadow: shadow-xs  padding: 16px                     │
│  hover (si cliquable) → shadow-sm + border #bbf7d0   │
└──────────────────────────────────────────────────────┘

┌─ Card Mission (featured) ─────────────────────────────┐
│  bg: white  radius: 20px  border: none               │
│  shadow: shadow-md  padding: 20px                    │
│  accent bar gauche : 3px solid #16a34a (radius 2px)  │
└──────────────────────────────────────────────────────┘

┌─ Card Statistique / Portefeuille ─────────────────────┐
│  bg: gradient(135deg, #16a34a, #15803d)              │
│  radius: 20px  text: white  padding: 20px            │
│  montant → Sora 800 28px                              │
└──────────────────────────────────────────────────────┘
```

---

### 7.3 Inputs

```
┌─ Input Standard ──────────────────────────────────────┐
│  bg: #F9FAFB  border: 1px #E5E7EB  radius: 12px     │
│  px: 16px  py: 13px  font: Jakarta 400 15px          │
│  placeholder: #9CA3AF                                │
│  focus → border: #16a34a + ring: 3px #dcfce7         │
│  error → border: #DC2626 + ring: 3px #FEF2F2         │
└──────────────────────────────────────────────────────┘
```

---

### 7.4 Badges & Status

```
● Acceptée    → bg #dcfce7  text #15803d  dot #16a34a
● En attente  → bg #FEF9C3  text #92400E  dot #D97706
● En cours    → bg #DBEAFE  text #1E40AF  dot #2563EB
● Litige      → bg #FEE2E2  text #991B1B  dot #DC2626
● Terminée    → bg #F3F4F6  text #374151  dot #6B7280
● Annulée     → bg #F3F4F6  text #9CA3AF  dot #D1D5DB

Taille badge : 11px font-medium  px:8px  py:3px  radius:full
```

---

### 7.5 Navigation Basse (Bottom Tab Bar)

```
┌─ Tab Item ────────────────────────────────────────────┐
│  Inactif : icône Gray-400 + label Gray-400 text-[10px]│
│  Actif   : icône Green-600 + label Green-600          │
│             → indicateur : barre 3px Green-600 en bas │
│             → fond pill : bg Green-50, radius: full   │
│  Fond nav : white/90 + backdrop-blur-lg              │
│  Hauteur  : 72px + safe-area-inset-bottom             │
└──────────────────────────────────────────────────────┘
```

---

### 7.6 Header

```
┌─ Header ──────────────────────────────────────────────┐
│  bg: white/85 + backdrop-blur-md                     │
│  border-bottom: 1px #F3F4F6                          │
│  hauteur: 60px  px: 16px                             │
│  Logo "S+" → bg: Green-600  text: white  radius: 10px│
│             → font: Sora 800                         │
└──────────────────────────────────────────────────────┘
```

---

## 8. Icônes

**Librairie** : `lucide-react` (déjà installé ✓)

**Tailles standards** :
```
Taille nav     : 22px  strokeWidth: 1.75
Taille action  : 20px  strokeWidth: 1.75
Taille inline  : 16px  strokeWidth: 2
Taille display : 32px  strokeWidth: 1.5
```

**Couleurs d'icônes** :
- Navigation inactive → `#9CA3AF`
- Navigation active → `#16a34a`
- Action / bouton → hérite du bouton parent
- Décorative → `#16a34a` sur `#dcfce7`

---

## 9. Animations (Motion)

```
Transition standard     : duration 200ms  ease: easeOut
Transition entrée page  : opacity 0→1 + y 12→0  duration 300ms
Transition sortie page  : opacity 1→0 + y 0→-8  duration 200ms
Spring bouton (tap)     : type "spring" stiffness 500 damping 30
Spring tab active       : type "spring" stiffness 400 damping 25
Hover card              : y -2px  shadow → shadow-md  duration 150ms
```

---

## 10. Import Google Fonts — Code prêt à coller

Dans `index.html`, section `<head>` :

```html
<!-- Servi+ Design Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
```

Dans `index.css` (remplacer le `@theme` existant) :

```css
@import "tailwindcss";

@theme {
  --font-display: "Sora", ui-sans-serif, system-ui, sans-serif;
  --font-sans:    "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;

  --color-primary:        #16a34a;
  --color-primary-light:  #22c55e;
  --color-primary-xlight: #dcfce7;
  --color-primary-dark:   #15803d;

  --color-surface: #F9FAFB;
  --color-card:    #FFFFFF;
  --color-border:  #E5E7EB;
  --color-muted:   #9CA3AF;
  --color-text-2:  #4B5563;
  --color-text:    #111827;

  --color-warning: #D97706;
  --color-error:   #DC2626;
  --color-info:    #0284C7;
}

@layer base {
  body {
    @apply antialiased text-gray-900 bg-gray-50 overflow-x-hidden;
    font-family: var(--font-sans);
    -webkit-tap-highlight-color: transparent;
  }
}

@layer components {
  .glass-header {
    @apply sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-gray-100;
    padding-top: env(safe-area-inset-top);
  }

  .bottom-nav {
    @apply fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-100;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .btn-primary {
    @apply bg-green-600 text-white font-semibold px-6 py-3.5 rounded-[20px]
           shadow-[0_4px_20px_rgba(22,163,74,0.25)]
           hover:bg-green-700 hover:shadow-[0_8px_32px_rgba(22,163,74,0.30)]
           active:scale-[0.97] transition-all duration-200;
  }

  .btn-secondary {
    @apply bg-green-50 text-green-800 font-semibold px-6 py-3.5 rounded-[20px]
           border border-green-200
           hover:bg-green-100 transition-all duration-200;
  }

  .card {
    @apply bg-white rounded-2xl border border-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.05)] p-4;
  }

  .input {
    @apply w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3
           font-sans text-[15px] text-gray-900 placeholder:text-gray-400
           focus:outline-none focus:border-green-500 focus:ring-[3px] focus:ring-green-100
           transition-all duration-150;
  }
}

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.safe-top    { padding-top: env(safe-area-inset-top); }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
```

---

## 11. Résumé Visuel Rapide

```
SERVI+ DESIGN AT A GLANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Primary    ██████  #16a34a  Green-600
  Primary Lt ██████  #22c55e  Green-500
  Surface    ██████  #dcfce7  Green-100
  Background ██████  #FFFFFF  White
  Text       ██████  #111827  Gray-900
  Muted      ██████  #9CA3AF  Gray-400
  Warning    ██████  #D97706  Amber-600
  Error      ██████  #DC2626  Red-600

  FONTS
  ─────
  Logo / Montants  →  Sora 800
  Titres           →  Plus Jakarta Sans 700
  Corps            →  Plus Jakarta Sans 400
  Labels           →  Plus Jakarta Sans 600

  RADIUS  buttons: 20px  cards: 16px  inputs: 12px
  SHADOW  bouton: 0 4px 20px rgba(22,163,74,0.25)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

*Design System Servi+ · 2025 · Mis à jour avec chaque itération majeure*
