## Objectif

Recréer pixel-par-pixel la homepage premium du mockup (bleu clair / glassmorphism / orb Alex) sur `/`, en isolant le nouveau thème à la home uniquement, et remplacer globalement la bottom nav par la nouvelle dock 5-icônes.

## Architecture

```
src/pages/PageHomeUnicorn.tsx              ← nouvelle home, scope CSS `.unicorn-theme`
src/styles/unicorn-theme.css               ← variables HSL bleu clair (#F7FAFF, #2563FF, #3B82F6)
src/components/home-unicorn/
  ├── HeaderFloatingGlass.tsx              ← logo + FR + cloche + profil
  ├── HeroAlexOrb.tsx                      ← headline 2 colonnes + orb
  ├── AlexOrbPremium.tsx                   ← orb liquide animé (CSS + framer-motion)
  ├── AiInputCard.tsx                      ← input + chips + CTA "Parler avec Alex"
  ├── SecondaryActionCards.tsx             ← Téléverser photo / Analyser soumission
  ├── CategoryChipsScroll.tsx              ← 6+ pills horizontales scrollables
  ├── LiveStatsCard.tsx                    ← 4 stats avec deltas verts
  ├── HowItWorksCards.tsx                  ← 3 cartes étapes avec flèches
  ├── ContractorAippSplit.tsx              ← split text gauche + carte pro droite
  └── BottomDockGlass.tsx                  ← (utilisée aussi globalement)
```

## Changements de routage / nav

- `src/app/router.tsx` : route `/` et `/index` → `PageHomeUnicorn` (remplace `HomeWithFeatureFlag` / `PageHomeCopilot` pour ces 2 routes uniquement). Toutes les autres routes inchangées.
- `MobileBottomNav` global remplacé par `BottomDockGlass` (Accueil / Croissance / **Alex (orb central glow)** / Profil / Compte). Conserve la signature props existante pour rester drop-in dans `MainLayout` / `DashboardLayout`.

## Thème isolé (clé)

- `unicorn-theme.css` définit des tokens HSL scopés sous `.unicorn-theme { --bg, --primary, --primary-glow, --text, --muted, --glass, --shadow-soft, --shadow-glow }`.
- `PageHomeUnicorn` enveloppe tout dans `<div className="unicorn-theme min-h-screen">` — aucun token global modifié, le reste de l'app (Cinematic Dark, Landing Warm) intact.
- Background : 3 couches → gradient base `#F7FAFF`, radial glows bleu/cyan, noise SVG 0.015.

## Composants détaillés

**AlexOrbPremium** : sphère 220px, 3 calques (core gradient bleu→cyan, reflet spéculaire blanc, halo blur 60px), 6 particules flottantes en orbit (framer-motion `repeat: Infinity`), breathing scale 1→1.04 sur 4s.

**AiInputCard** : container blanc radius 28px, shadow layered `0 20px 60px -20px rgba(37,99,255,.25)`, input top, row chips scrollable + bouton refresh, CTA full-width gradient `#2563FF→#3B82F6` avec icône mic + waveform 5 barres animées.

**HeroAlexOrb mobile** : grid `1fr 1fr`, headline gauche (Inter 800, tracking -0.04em, "Alex s'occupe du reste" en gradient), orb droite. Sur ≥sm garde 2 colonnes plus aérées.

**CategoryChipsScroll** : `overflow-x-auto snap-x`, 6 pills avec icône pastel circulaire (Isolation/Toiture/Thermopompe/Humidité/Condo/Électricité/Apparei…).

**LiveStatsCard** : 1 carte blanche, 4 colonnes (mobile : 2×2 grid), chaque stat = icône colorée + chiffre 24px bold + label muted + delta vert.

**HowItWorksCards** : 3 cartes radius 24px, badge numéroté bleu, titre, description, illustration coin bas-droit, connecteurs SVG horizontal entre cartes (caché sur mobile).

**ContractorAippSplit** : grid 1fr/1fr, texte+2 boutons (Voir mon AIPP plein bleu, Activer mon profil outline) à gauche, carte AIPP (photo, "Toitures LB inc.", 4.9★ (128), badge "Profil vérifié", 3 stats) à droite.

**BottomDockGlass** : fixed bottom, `backdrop-blur-xl bg-white/70`, 4 ic+labels + orb central surélevé (-translate-y-4) avec glow bleu.

## Animations

- Page : `fade-in` global 400ms.
- Orb : breathing + particles orbit (framer-motion).
- CTA : magnetic hover (translateY -2px + shadow expand).
- Chips : `hover:scale-105` désactivé, on garde translate uniquement (cohérent avec règle "never scale").
- Stats : count-up sur viewport entry.

## Données

- Pas de migration DB. Stats `LiveStatsCard` lues du counter engine existant (`src/lib/counterEngine.ts`), avec valeurs mock fallback si indispo.
- Carte AIPP utilise mock realistic data (Toitures LB, 4.9, 289 projets).

## Intégration Alex

- CTA "Parler avec Alex" → `useAlexVoice().openAlex("home_intent")` (respecte permission manager + event-driven session).
- Chips → `openAlex("home_intent", chip.label)`.
- Pas d'autostart, conforme à `mem://features/alex-event-driven-session`.

## SEO

- Helmet identique à `PageHomeCopilot` (title, meta, JSON-LD Service + FAQ), canonical `https://unpro.ca`.
- H1 unique = headline "Décrivez votre situation. Alex s'occupe du reste."

## Hors scope (à ne PAS toucher)

- Aucune autre page, aucun token global, aucune logique business.
- `PageHomeCopilot` conservé (peut servir ailleurs).
- Pas de changement DB, edge functions, ou Alex prompt.

## Critères de succès

1. `/` affiche la home unicorn identique au mockup à 384px (viewport actuel).
2. Aucun token global modifié — visiter `/admin/*` confirme le dark theme intact.
3. Bottom dock visible partout en mobile.
4. CTA orb / "Parler avec Alex" ouvre Alex sans erreur console.
5. Build passe sans warning TS.
