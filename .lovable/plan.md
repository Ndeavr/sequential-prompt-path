# Refonte Home + Fiche Entrepreneur — Direction Cinematic Premium

Scope strictement limité à **2 surfaces** : la home (`/`) et la fiche entrepreneur publique (`/entrepreneur/:slug`). Tout le reste du site (Alex, checkout, admin, outbound, AIPP, etc.) reste intact.

## Direction visuelle

**Palette** (conforme à `mem://style/premium-cinematic-theme` côté app + warm côté public — ici on bascule la home publique vers le cinematic dark)
- Base: `#050816` → `#0A1428` (dégradé radial)
- Glow primaire: cyan `hsl(189 94% 55%)` à 18% opacité
- Glow secondaire: bleu UNPRO `hsl(217 91% 60%)` à 14% opacité
- Texte: blanc pur sur dark, bleu nuit `#0B1430` pour CTA sticky
- Accent verre: `rgba(255,255,255,0.04)` + `backdrop-blur(24px)` + border `rgba(255,255,255,0.08)`

**Typo**
- Inter (déjà présent), `tracking-[-0.04em]` sur H1, font-weight 600 max, line-height 1.05 sur titres
- Tailles mobile: H1 44px, H2 32px, body 17px

**Motion** (subtil, jamais gadget)
- Easing master `cubic-bezier(.22,1,.36,1)` @ 420ms
- Hover = `translateY(-2px)`, jamais scale
- Glow pulse 4s sur orb Alex
- Float slow 8s sur éléments hero
- Parallax léger sur image hero (translateY au scroll)

## 1. HOME (`src/pages/Index.tsx` ou route `/`)

D'abord vérifier le composant actuellement monté sur `/` puis créer une nouvelle version `HomeCinematic.tsx` (ne pas casser l'existant — feature flag/route swap minimal).

### Sections (mobile-first, ordre strict)

```text
┌─────────────────────────────────┐
│ HERO IMMERSIF                   │
│  Image maison + glow cyan       │
│  H1 "Trouvez le bon             │
│      entrepreneur du            │
│      premier coup."             │
│  Sous-titre 1 ligne             │
│  Input géant glassmorphism      │
│  Chips suggestions x8           │
│  CTA "Analyser mon projet"      │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ ACTIONS RAPIDES (2x2 mobile)    │
│  [Analyser 3 soumissions]       │
│  [Score Maison] [Parler Alex]   │
│  [Vérifier entrepreneur]        │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ ENTREPRENEURS RECOMMANDÉS       │
│  Cards "recommandation IA"      │
│  Bloc "Pourquoi recommandé ?"   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ SOCIAL PROOF ÉMOTIONNEL         │
│  Visages réels + stats glow     │
└─────────────────────────────────┘
```

### Composants à créer
- `src/components/home-cinematic/HeroImmersive.tsx` — image hero + input central + chips
- `src/components/home-cinematic/QuickActionsGrid.tsx` — 4 cards glassmorphism
- `src/components/home-cinematic/RecommendedProsRail.tsx` — cards entrepreneur "AI-style" avec bloc "Pourquoi recommandé"
- `src/components/home-cinematic/SocialProofEmotional.tsx` — stats + visages
- `src/components/home-cinematic/PageHomeCinematic.tsx` — assembleur

### Logique
- Input + CTA → `openAlex("home_intent", { prefill: userText })` via le hook `useAlexVoice()` existant (pas de nouvelle route)
- Chips → pré-remplissent l'input puis déclenchent le même handler
- Cards entrepreneurs → fetch `contractors` top 3 par `recommendation_score` (vue existante `v_contractor_recommendation_score`)

## 2. FICHE ENTREPRENEUR (`src/pages/PageEntrepreneurPublic.tsx` ou équivalent)

Localiser la fiche actuelle (`/entrepreneur/:slug`) puis refondre **uniquement** son rendu visuel. Conserver toute la data layer (queries, hooks, edge calls).

### Sections (ordre)

```text
┌─────────────────────────────────┐
│ HEADER HERO immersif            │
│  Image grande + gradient        │
│  Nom · Métier · Score · Ville   │
│  Badges: RBQ · Vérifié · Avis   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ POURQUOI UNPRO LE RECOMMANDE    │
│  4 raisons IA (checks cyan)     │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ AVANTAGES (cards)               │
│  Certifié · Assuré · Garantie   │
│  Financement · 24/7 · Photos    │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ PROJETS AVANT/APRÈS             │
│  Slider visuel Tesla-style      │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ AVIS + RÉSUMÉ IA                │
│  "Les clients mentionnent..."   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ FAQ accordions                  │
└─────────────────────────────────┘

[STICKY MOBILE BOTTOM]
 Appeler · Message · Rendez-vous
```

### Composants à créer
- `src/components/contractor-public/HeaderImmersive.tsx`
- `src/components/contractor-public/WhyRecommendedBlock.tsx`
- `src/components/contractor-public/AdvantagesGrid.tsx`
- `src/components/contractor-public/BeforeAfterShowcase.tsx` (réutilise le clip-path slider du Design AI Workspace si présent)
- `src/components/contractor-public/ReviewsAiSummary.tsx`
- `src/components/contractor-public/StickyMobileCta.tsx`
- `src/components/contractor-public/FaqAccordions.tsx`

### Logique
- Sticky CTA mobile : `fixed bottom-0` avec `safe-area-inset-bottom`, 3 boutons (tel:, ouvrir thread, modal booking existante)
- "Pourquoi recommandé" : si `recommendation_reasons` jsonb manquant → fallback déterministe (avis ≥4.5, distance < 25km, slot < 7j, projets similaires count)
- Résumé IA avis : si `reviews_ai_summary` absent → top 3 mots récurrents calculés client-side sur les avis chargés

## 3. Assets & images

- Générer 1 image hero home (maison premium nuit + glow cyan subtil) → `src/assets/home-hero-cinematic.jpg` via `imagegen` premium
- Générer 1 image fallback header entrepreneur (chantier lumière dorée) → `src/assets/contractor-hero-fallback.jpg`
- Tokens glow réutilisés depuis `index.css` existant (ne pas dupliquer)

## 4. Détails techniques

- Tailwind tokens semantic only — aucun hex en dur dans les composants
- Ajouter dans `index.css` (sous `:root`) si manquant :
  - `--cinematic-base: 222 60% 5%;`
  - `--cinematic-glow-cyan: 189 94% 55%;`
  - `--cinematic-glow-blue: 217 91% 60%;`
  - `--glass-surface: 0 0% 100% / 0.04;`
- Lazy load `RecommendedProsRail` et `BeforeAfterShowcase` via `React.lazy`
- Toutes images: `loading="lazy"`, `decoding="async"`, `srcset` 1x/2x
- Pas de framer-motion sur la home (CSS animations only pour perf mobile)

## 5. SEO (maintenu)

- H1 unique par page
- `<title>` + `<meta description>` mis à jour via Helmet existant
- JSON-LD `LocalBusiness` conservé sur fiche entrepreneur

## 6. Hors scope (ne PAS toucher)

- Routes admin, AIPP, outbound, sniper, journal, lead-empire
- Alex voice/chat logic (uniquement consommé via hook existant)
- Checkout / pricing / Stripe
- Auth, role selection
- Edge functions
- Schéma DB

## Ordre d'exécution

1. Lire la home et la fiche actuelles (identifier composants montés)
2. Générer les 2 images hero (parallèle)
3. Créer composants Home + assembler `PageHomeCinematic`
4. Brancher la route `/` sur la nouvelle page (garder l'ancienne en backup `/home-legacy`)
5. Créer composants fiche + remplacer le rendu de `PageEntrepreneurPublic`
6. Vérifier visuellement via screenshot mobile (375x812)

## Critère de succès

Sur mobile : effet "wow / 5 ans en avance", input central immédiatement visible, valeur en <5s, glow subtil non agressif, sticky CTA fiche entrepreneur fonctionnel.
