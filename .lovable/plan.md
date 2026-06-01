
# UNPRO Homeowner Intelligence — Phase 1

Refonte de la homepage et fondations du système d'intelligence maison. On garde l'existant (PageHomeCopilot, AIPP, Passeport, /diagnostic-photo) et on construit la nouvelle couche par-dessus, sans casser les routes actuelles.

## Scope Phase 1 (cette livraison)

1. Nouvelle homepage `Maison Intelligence` — remplace `/` et `/index` (l'ancienne reste en `/legacy-home` pour rollback).
2. 8 cartes "situations homeowner" (pas de trades).
3. Auto-start Alex à 2.5s (respecte le contrat event-driven existant : 1 seule fois par tab via `alexSessionState`).
4. Page `/diagnostic` rebrandée + composant `VisualAnalysisCanvas` avec overlay annotations sur image (chat à côté, pas dessous).
5. Tables Supabase : `visual_analyses`, `property_health_scores`, `property_timelines`, `maintenance_predictions`.
6. Edge function `visual-analysis` (Gemini 2.5 Flash multimodal) pour produire `ai_findings` + `annotations` JSON.

## Hors scope (phases ultérieures)

- Catégories 2-6 livrées comme deep-links Alex en Phase 1, pages dédiées en Phase 2.
- Admin queue + heatmaps régionales = Phase 3.
- AEO/SEO cluster pages symptôme-based = Phase 4 (la mécanique AEO existe déjà).

## Architecture & fichiers

### Nouvelle homepage

```
src/pages/home-intel/
  PageHomeIntelligence.tsx       (route / et /index)
src/components/home-intel/
  HeroIntelligence.tsx           (headline + orb + glassmorphism)
  SituationCardsCarousel.tsx     (sliding horizontal, mobile-first)
  SituationCard.tsx              (1 carte : icône, titre, sous-titre, CTA)
  PropertyHealthPreview.tsx      (score si user connecté + propriété)
  HomeIntelFooterSignals.tsx     (trust signals, sans directory)
src/config/
  homeownerSituations.ts         (les 8 situations + intent_hint + route)
```

Les 8 situations :
1. Diagnostic visuel IA → `/diagnostic`
2. Vérifier une soumission → `/compare` (existe)
3. Vérifier un entrepreneur → Alex avec intent `verify_pro`
4. Passeport Maison → `/passeport` (existe)
5. Planifier une rénovation → Alex `plan_reno`
6. Problèmes urgents → Alex `urgency` (déclenche triage rouge)
7. Économies d'énergie → Alex `energy`
8. Condo / Loi 16 → `/condo` (existe)

### Diagnostic Visuel IA

```
src/pages/diagnostic/
  PageDiagnosticIntel.tsx        (remplace logique de /diagnostic-photo)
src/components/diagnostic/
  VisualAnalysisCanvas.tsx       (image + overlay SVG)
  AIAnnotationLayer.tsx          (circles/arrows/heat zones SVG absolute)
  AnnotationChatSidebar.tsx      (chat à droite desktop, drawer mobile)
  UrgencyBadge.tsx
  ImageRiskScore.tsx
  BeforeAfterViewer.tsx
  VisualTimeline.tsx
```

Chat positionné :
- Desktop : grid 2 colonnes (canvas gauche 60%, chat droite 40%).
- Mobile : canvas plein écran + bottom-sheet chat 50% hauteur, dragable.

### Edge function

`supabase/functions/visual-analysis/index.ts` :
- Input : `{ image_url, property_id? }`
- Appelle Lovable AI Gateway `google/gemini-2.5-pro` multimodal.
- Output structuré (AI SDK `Output.object`) : `{ findings: [{ label, severity, x, y, w, h, type }], risk_score, urgency_level, recommended_action }`.
- Insert dans `visual_analyses`.
- Met à jour `property_health_scores` si `property_id`.

### Alex auto-start

Modif `HeroIntelligence.tsx` :
- `useEffect` 2.5s → si `alexSessionState.canGreet('home-intel')` → `openAlex('homeowner', greetingPersonalized)`.
- Greeting : `Bonjour ${firstName ?? ''}. Quel problème puis-je vous aider à régler aujourd'hui?` (respecte mem core).
- Pas de retry, pas de reprompt — règle Alex event-driven respectée.

## Données

### Migration unique

```sql
-- property_health_scores
CREATE TABLE public.property_health_scores (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  user_id uuid not null,
  overall_score int check (overall_score between 0 and 100),
  moisture_score int, insulation_score int, ventilation_score int,
  structural_score int, electrical_score int,
  signals jsonb default '{}',
  generated_at timestamptz default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON ... TO authenticated;
GRANT ALL ON ... TO service_role;
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
-- policy: user_id = auth.uid()

-- visual_analyses
CREATE TABLE public.visual_analyses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid,
  user_id uuid,           -- nullable pour guest
  session_id text,        -- pour guest tracking
  uploaded_file text not null,
  ai_findings jsonb,
  annotations jsonb,
  urgency_level text check (urgency_level in ('low','medium','high','critical')),
  risk_probability numeric,
  created_at timestamptz default now()
);
-- guest peut INSERT par session_id, SELECT par session_id ou auth.uid()

-- property_timelines
CREATE TABLE public.property_timelines (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  user_id uuid not null,
  event_type text not null,    -- repair|inspection|invoice|warranty|maintenance
  event_date date not null,
  contractor_id uuid,
  documents jsonb default '[]',
  ai_summary text,
  created_at timestamptz default now()
);

-- maintenance_predictions
CREATE TABLE public.maintenance_predictions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null,
  user_id uuid not null,
  issue_type text not null,
  confidence numeric,
  estimated_timeline text,
  recommendation text,
  created_at timestamptz default now()
);
```

GRANT + RLS standard sur les 4 tables.

## UI/UX — règles strictes

- Theme cinematic dark (`#050816` + 4-layer bg) — mem core respectée.
- Glassmorphism : `bg-white/[0.04] backdrop-blur-2xl` + radius 28px cartes / 18px boutons.
- Inter, tracking -0.04em sur H1.
- Hover translateY(-2px), easing `cubic-bezier(.22,1,.36,1)` 420ms.
- Carrousel cartes : snap horizontal mobile, grid 4 colonnes desktop ≥1024px.
- Valeur visible < 5s : Hero + cartes visibles sans scroll sur viewport mobile 384x709.
- Aucun mot "entrepreneur recommandé" sur la home — la philosophie Concierge Décisif reste, mais on parle situations.

## Sécurité & conformité memory

- Pas de directory, pas de "Voir tous les entrepreneurs" (rule existante).
- Pas de "3 soumissions" — on parle "Vérifier une soumission".
- Alex greeting respecte le opening canonique + FR-only.
- Permission caméra = uniquement au tap sur "Diagnostic visuel IA" (mem permission system).
- `visual_analyses` accessible guest via `session_id` (pattern Business Card Guest Mode).

## Tâches d'exécution (ordre)

1. Migration Supabase (4 tables + GRANTs + RLS).
2. `homeownerSituations.ts` config + assets icônes (Lucide).
3. `HeroIntelligence`, `SituationCardsCarousel`, `SituationCard`, `PageHomeIntelligence`.
4. Wire route `/` et `/index` → `PageHomeIntelligence`; ancien composant → `/legacy-home`.
5. Auto-start Alex 2.5s via `alexSessionState`.
6. Edge function `visual-analysis` + secret check (`LOVABLE_API_KEY` auto).
7. `VisualAnalysisCanvas` + `AIAnnotationLayer` + chat sidebar/drawer.
8. `PageDiagnosticIntel` route `/diagnostic` (alias `/diagnostic-photo` → redirect).
9. `PropertyHealthPreview` (lit `property_health_scores` si connecté).
10. Update mem index : ajouter `mem://features/homeowner-intelligence-os`.

## Succès Phase 1

- Mobile 384px : hero + 4 premières cartes visibles sans scroll.
- Alex démarre 1 fois à 2.5s, jamais bloque, fallback chat si voice fail.
- Upload photo sur `/diagnostic` → annotations overlay apparaissent en <8s.
- `property_health_scores` peuplé sur premier diagnostic.
- Aucune mention "trade" ou "trouver un X" sur la home.

Phase 2 (proposée après validation) : pages dédiées catégories 2-6, admin queue, predictions seasonal QC, AEO clusters symptômes.
