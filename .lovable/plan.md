## Painting Calculator → Intelligent Surface, Coating & Sealant Estimator

Transform the painting calculator into a multi-surface project + protective-coating estimator with a richer taxonomy (interior, exterior, deck/wood, metal/specialty, commercial, **piscine, pavé uni, asphalte, toiture nano**), application method, surface material, expanded condition signals, smarter AI photo analysis, and a richer result panel — all on the existing `/peinture/calculateur` route.

### 1. New taxonomy module

**`src/features/paintingCalculator/projectCatalog.ts`** (new) — single source of truth.

`ProjectCategory`:
- `interior` — Murs, Plafonds, Portes, Escaliers, Condo/maison, Cuisine/SDB
- `exterior` — Façade, Revêtement, Brique peinte, Aluminium, Bois extérieur, Garage
- `deck_wood` — Patio, Clôture, Pergola, Teinture, Bois traité, Cèdre
- `metal_specialty` — Fer forgé, Rampes, Escaliers métal, Epoxy, Spray, Antirouille
- `commercial` — Bureau, Entrepôt, Restaurant, Multi-logements, Cage d'escalier, Stationnement
- **`pool` — Piscine béton, Piscine fibre, Spa, Margelles, Plage de piscine**
- **`paver_sealing` — Pavé uni résidentiel, Allée, Patio en pavé, Bordures, Joints polymériques**
- **`asphalt` — Entrée résidentielle, Stationnement commercial, Réparations, Scellant noir, Lignage**
- **`roof_nano` — Toiture asphalte, Toiture métal, Toiture plate, Bardeaux, Membrane élastomère**

`ApplicationMethod`: `rouleau | pinceau | spray | airless | teinture | vernis | epoxy | antirouille | scellant_nano | scellant_acrylique | scellant_silane | epandage_asphalte`. Each carries `labour_multiplier`, `coverage_bonus`, `unit_basis` (`sqft` vs `linear_ft`), and one Alex hint sentence.

`SurfaceMaterial`: `gypse | bois | aluminium | vinyle | brique | beton | metal | fer_forge | composite | stucco | pave_uni | asphalte | bardeau | membrane_elasto | fibre_piscine | beton_piscine`. Each carries `prep_factor`, `primer_factor`, and a `recommended_methods[]` shortlist used for the auto-recommendation.

`SurfaceConditionCode` (rich FR labels) maps to engine codes:
- Pavé/asphalte: `joints_erodes`, `mauvaises_herbes`, `affaissement`, `taches_huile`, `fissures_pave`, `decoloration_asphalte`
- Toiture nano: `mousse_lichen`, `granules_perdus`, `oxydation`, `infiltration_legere`
- Piscine: `farinage`, `taches_calcaire`, `coque_usee`
- Plus existing: `excellent, bon, ecaille, rouille, fissures, bois_abime, moisissure, ancienne_peinture, graffiti, decoloration_uv`

Each rich code → underlying `WallCondition` + condition-specific `prep_modifier`, `materials_modifier`, `urgency_hint`.

`ProjectDetails` = `{ category, items[], method, material, conditionCodes[] }`.

### 2. Engine extensions

**`src/features/paintingCalculator/engine.ts`** (edit) — back-compat additive.

- Extend `CalculatorInput` with optional `category, items, method, material, conditionCodes`.
- New helper `applyAdvancedModifiers(base, input)` multiplies prep/materials/labour by material × method × max(condition) factors.
- For categories where `unit_basis === "linear_ft"` (clôture, lignage) or `linear_ft + sqft` mixed (asphalte: linear edge + surface), `computeEstimate` accepts `linearFt` alongside `avgRoomSqft` and uses the right multiplier path. Pool/asphalte/pavé/toiture use a single-zone surface model (no room/ceiling math).
- Result gains `recommendedMethod`, `difficulty` (facile/moyenne/elevee/specialisee), `lifespanYears`, `maintenanceLevel` (faible/moyen/eleve), `paintVsStainAdvice?`, `resaleRoiPct?`.
- Deterministic recommendation examples:
  - `pool + beton_piscine` → `scellant_acrylique` (epoxy si farinage)
  - `paver_sealing + pave_uni` → `scellant_silane` + Alex hint sur joints polymériques
  - `asphalt + entree` → `epandage_asphalte`
  - `roof_nano + bardeau` → `scellant_nano` (gating: rejette si `infiltration_legere` → recommande inspection)
  - `clôture + cèdre + teinture` → `spray + finition rouleau`
  - `fer_forge` → `pinceau + antirouille`

### 3. UI: new step structure (same route)

Replace existing Step 1 chip grid with 5 intelligent steps in `src/pages/painting/steps/`:

1. `StepProjectCategory.tsx` — 9 premium category chips (5 originaux + Piscine, Pavé, Asphalte, Toiture nano).
2. `StepProjectItems.tsx` — multi-select items scoped to category.
3. `StepMethod.tsx` — methods filtered by category (ex. `roof_nano` n'affiche que scellants).
4. `StepMaterial.tsx` — materials filtered by category.
5. `StepCondition.tsx` — multi-select conditions filtered by category.

Existing photo / surface-detail / gate / result steps shift down. Progress bar adapts to the new count. Surface-detail step swaps room/ceiling fields for `surface_sqft` + optional `linear_ft` when category is pool/asphalte/pavé/toiture.

### 4. Dynamic ambient effects

**`src/pages/painting/AmbientLayer.tsx`** (new, CSS-only, respects `prefers-reduced-motion`):
- `deck_wood + clôture` → animated wood-plank gradient
- `metal_specialty || fer_forge` → metallic radial shimmer
- `spray` method → subtle particle field
- `pool` → soft cyan caustics
- `asphalt` → black gradient with subtle yellow lane stripe
- `paver_sealing` → herringbone faint pattern
- `roof_nano` → slow blue-to-cyan diagonal sheen ("nano" feel)

### 5. Photo analysis enhancements

**`supabase/functions/analyze-painting-photo/index.ts`** (edit) — extend Gemini tool-call schema:

Existing fields + new: `fenceLengthFt?, railingComplexity?, windowCount?, sidingType?, rustSeverity?, sprayFeasibility?, patioDimensions?, paverAreaSqft?, paverJointCondition?, asphaltAreaSqft?, asphaltCrackSeverity?, oilStainsPresent?, roofPitch?, roofMaterial?, mossPresence?, granuleLoss?, poolSurfaceType?, poolChalking?`.

Photo step auto-fills `category`, `material`, `conditionCodes` when first photo returns high-confidence detections (user can override).

### 6. Result panel

Replace flat Stat grid with three sections:

- **Estimation principale** — min/max range with bigger typography + "Méthode recommandée".
- **Décomposition** — Préparation / Matériaux / Produit / Main-d'œuvre / Durée estimée / Difficulté chips.
- **Décision propriétaire** (collapsible) — `Peinture vs teinture` (interior/exterior/deck) OU `Scellant nano vs traditionnel` (toiture/pavé) OU `Scellant acrylique vs époxy` (piscine); `Durée de vie estimée`; `Entretien futur`; `Rentabilité avant revente`.

Alex inline hint from catalog, e.g.:
- "Le scellant nano sur toiture prolonge la durée de vie sans remplacement complet."
- "Sceller un pavé uni protège les joints et empêche les mauvaises herbes."
- "L'asphalte refait dans les 30 derniers jours ne doit pas être scellé tout de suite."
- "Une piscine en béton qui farine demande un époxy plutôt qu'un acrylique."

### 7. Persistence

**`supabase/migrations/<ts>_painting_estimate_project_details.sql`**

```sql
ALTER TABLE public.painting_estimates
  ADD COLUMN IF NOT EXISTS project_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS recommended_method text,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS lifespan_years numeric,
  ADD COLUMN IF NOT EXISTS maintenance_level text,
  ADD COLUMN IF NOT EXISTS linear_ft numeric;
```

`handleSaveAndContinue` writes `project_details = { category, items, method, material, conditionCodes }` + flat columns. RLS untouched.

### 8. Verification

- TS: `computeEstimate` stable when new fields absent.
- Mobile preview (384px): 9-category grid stays 2-col, ambient effect doesn't push CTAs.
- No banned phrases in result/match copy; swap hard-coded "n'avons pas encore de peintre" for `<NoMatchConversionCard>` (shipped last turn).
- SEO unchanged (title/canonical/JSON-LD stable); page still works for guest until gate.
- Sanity check that pool/asphalte/pavé/toiture estimates land in realistic QC ranges before opening to users.

### Files touched

**New (8):** `projectCatalog.ts`, `AmbientLayer.tsx`, 5 step components, 1 SQL migration.
**Edited (4):** `engine.ts`, `types.ts`, `PaintingCalculatorPage.tsx`, `analyze-painting-photo/index.ts`.

### Out of scope (defer)

- Renaming the route from `/peinture/calculateur` to a generic `/coatings/calculateur` — keep existing SEO; add category-specific landing pages in a Phase 2 AEO batch (`/piscine/scellant/:ville`, `/pave-uni/scellant/:ville`, `/asphalte/scellant/:ville`, `/toiture/nano/:ville`).
- Real ML for spray feasibility / roof pitch — Phase 1 uses Gemini Vision text classification.
- Separate normalized items/methods tables — jsonb suffices for Phase 1.
