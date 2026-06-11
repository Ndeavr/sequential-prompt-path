## Objectif

Créer un système de backgrounds premium UNPRO — texture légère, profondeur, intelligence invisible — utilisable derrière Hero, Alex, Passeport Maison, "Comment ça fonctionne", Entrepreneurs et Footer. Aucun trombone, aucun motif crypto/circuit. SVG + CSS + Framer Motion uniquement.

## Architecture

Un composant racine `IntelligenceBackground` qui compose 4 couches indépendantes, et expose une prop `variant` pour adapter le mix par section.

```
src/components/visual/intelligence-bg/
  IntelligenceBackground.tsx        // orchestrateur (variant)
  LayerGradientField.tsx            // Layer 1
  LayerHousingMesh.tsx              // Layer 2 (SVG)
  LayerDotIntelligenceField.tsx     // Layer 3 (SVG)
  LayerFloatingDataOrbs.tsx         // Layer 4 (blurred divs + framer)
  overlays/
    HousingKnowledgeGraph.tsx       // hero overlay
    PassportArchiveDrift.tsx        // PIM overlay
    NeuralHomeIntelligenceField.tsx // Alex overlay
    TerritoryRecommendationMesh.tsx // entrepreneurs overlay
    FooterConstellation.tsx         // footer overlay
  intelligence-bg.css               // keyframes + reduced-motion
```

`variant`: `"hero" | "passport" | "alex" | "contractors" | "footer" | "default"`. Chaque variante choisit son overlay et ajuste l'opacité/teinte des couches.

## Détails des couches (tokens fixés)

**Layer 1 — Gradient principal** (light surfaces)
```
radial-gradient(circle at 20% 20%, rgba(59,130,246,.12), transparent 40%),
radial-gradient(circle at 80% 30%, rgba(14,165,233,.08), transparent 35%),
radial-gradient(circle at 50% 80%, rgba(99,102,241,.08), transparent 40%),
linear-gradient(180deg, #ffffff 0%, #f8fbff 35%, #f2f7ff 100%);
```
Footer override : `linear-gradient(180deg,#071120 0%,#0b1730 100%)`.

**Layer 2 — Housing Intelligence Mesh** (SVG inline, opacity 0.04)
Courbes Bézier douces évoquant plans de maison + nœuds de connexion (intersections aux jointures). Pas de grille rigide. Stroke 0.6, `stroke="#2563EB"`, `stroke-linecap="round"`.

**Layer 3 — Dotted Intelligence Field** (SVG, opacity 0.08)
Nuages de points concentrés top-right + bottom-left, suggérant silhouettes de toiture (pente 30°) et contour de parcelle (rectangle déformé). Cercles r=1.2, fill `#3B82F6`.

**Layer 4 — Floating Data Orbs** (4 divs absolus)
`filter: blur(90px)`, `opacity: .22`, dimensions 320–520px. Couleurs : `#3B82F6`, `#0EA5E9`, `#6366F1`. Animation `translate3d` 25–40s `ease-in-out infinite alternate`. Respecte `prefers-reduced-motion`.

## Overlays par section

- **HousingKnowledgeGraph** (Hero) — SVG animé : points + liens reliant petites icônes abstraites (maison, doc, bouclier garantie, loupe inspection). Stroke 0.05 opacity, draw-on animation lente 30s.
- **PassportArchiveDrift** (PIM) — silhouettes très floues (blur 40px, opacity 0.06) de cartes/factures/photos qui dérivent verticalement à 60s.
- **NeuralHomeIntelligenceField** (Alex) — particules SVG lentes + halo respirant centré sur l'orb (scale 1 → 1.06, 6s). L'orb semble alimenter le réseau (lignes qui partent de son centre vers les nœuds périphériques).
- **TerritoryRecommendationMesh** (Entrepreneurs) — visualisation abstraite Ville → Projet → Compatibilité → Entrepreneur, opacity max 0.05.
- **FooterConstellation** — constellation de points + quelques lignes connectées sur fond `#071120 → #0b1730`.

## Intégration (sites d'utilisation)

Surface unique d'utilisation = pages publiques (Warm/Cinematic). Câblage minimal :
1. `src/pages/Home.tsx` (ou la home active selon `HomeIntentRouterDynamic`) → wrap Hero avec `<IntelligenceBackground variant="hero">`.
2. `src/pages/PagePIMLanding.tsx` → ajouter `<IntelligenceBackground variant="passport" />` en absolute derrière `HeroSectionPIMLanding` (remplace le gradient radial local).
3. `src/components/home-simple/HeroAlexCentered.tsx` → remplacer (ou superposer derrière) `AlexTradesAura` par overlay Alex pour les routes premium concernées.
4. Section "Entrepreneurs" de la home (composant existant) → wrapper avec variant `contractors`.
5. Footer global (`MainLayout` footer) → ajouter overlay `footer`.

Composant utilisé en `absolute inset-0 -z-10 pointer-events-none` sous le contenu. Le contenu reste inchangé.

## Performance & accessibilité

- 100% SVG + CSS + Framer Motion. Pas de canvas, pas de Three, pas de Lottie, pas de vidéo.
- `will-change: transform, opacity` uniquement sur orbes + overlays animés.
- `prefers-reduced-motion: reduce` → désactive toutes les animations (keyframes neutralisées via CSS).
- Mobile : Layer 4 réduit à 3 orbes, blur 70px (perf paint).
- Aucun rerender React (animations CSS pures sur Layers 1–3).
- `aria-hidden="true"` sur tout le composant.

## Garde-fous d'identité

- Vocabulaire visuel autorisé uniquement : maison, mémoire, réseau invisible, historique, parcelle, toiture, document, garantie.
- Vocabulaire interdit hardcodé dans une liste de revue (commentaire en tête de fichier) : trombones, cadenas, engrenages, circuits, blockchain, crypto, chains.
- Couleurs limitées à : `#3B82F6` (UNPRO Blue), `#0EA5E9` (Cyan), `#6366F1` (Indigo), `#7DD3FC` (highlight). Aucune teinte hors palette.

## Critères de succès

- Composant `IntelligenceBackground` rendu sans erreur sur Home, /pim, section Alex, section Entrepreneurs, Footer.
- 4 couches visibles, opacités respectées, animations lentes (≥ 20s).
- Aucune référence visuelle à un trombone/chaîne/circuit.
- Mobile fluide (pas de jank au scroll), Lighthouse ≥ 90.
- `prefers-reduced-motion` coupe les animations.

## Hors scope

- Pas de refonte de la typographie, des CTA, ni du contenu.
- Pas de modification des dashboards admin ni des pages SaaS authentifiées.
- Pas de nouvelle dépendance npm.
- Pas de migration DB.
