# UNPRO — Intelligence Layer Upgrade (No Redesign)

## Scope rule (non-negotiable)
- Zero changes to: color tokens, gradients, typography, orb, glassmorphism, homepage structure, navigation, animations, branding.
- All work is **additive**: new components mounted inside existing surfaces (Alex chat, upload flow, Passeport Maison, quote analyzer, homepage symptom prompts).
- No new pages except where strictly required for routing parity; reuse existing layouts.

---

## Priority 1 — Visual AI Chat Layer (image analysis inside Alex)

**Where it lives:** existing Alex chat + existing upload flow. No new page.

New components (mounted inside `src/features/alex/AlexMessageList.tsx` when a message has an `image` part):
- `AIAnnotationLayer` — SVG overlay on top of uploaded image: circles, arrows, highlight zones, warning glow, FR labels (e.g. "Infiltration possible", "Ventilation insuffisante", "Croissance de moisissure suspectée").
- `VisualConversationPanel` — mobile-first: image on top, Alex contextual bubbles below + floating tag bubbles anchored to annotation coords. Reuses existing glass + radii tokens.

Flow:
1. User uploads image via existing `AlexUploadDropzone`.
2. New service `visualAnalysisService.analyze(file, propertyId?)` → calls edge function `visual-analysis`.
3. Edge function uses Lovable AI (`google/gemini-2.5-flash` for multimodal) returning `{ findings[], annotations[{x,y,w,h,label,severity}], urgency, summary }`.
4. Result rendered via `VisualConversationPanel` inside the assistant message. Alex speaks the summary using existing voice path (sanitized via `sanitizeAlexText`).
5. Persisted to `visual_analyses`. Linked to property when available via memory layer.

---

## Priority 2 — Passeport Maison intelligence (additive cards only)

**Where:** `src/pages/dashboard/PropertyDetail.tsx`. Keep `PropertyHeader`, score grid, recs, timeline, documents as-is.

Add two minimal cards in the existing grid (no layout overhaul):
- `PropertyHealthCard` — overall score + 4 sub-scores (insulation, ventilation, moisture, structural) + trend arrow + small risk dots. Pure presentational, reads from `property_health_scores`.
- `SmartInsightsCard` — bulleted FR insights generated from memory events + visual analyses + quotes (e.g. "Votre grenier pourrait bénéficier d'une inspection de ventilation.", "Garantie expire bientôt.", "Motif récurrent d'humidité détecté.", "Coûts Hydro suggèrent un déficit d'isolation.").

Computation: new edge function `compute-property-health` aggregates `visual_analyses`, `property_memory_events`, existing `home_scores`, quote analyses → writes `property_health_scores`. Triggered after each visual analysis or quote analysis (event-driven, no cron).

---

## Priority 3 — Quote intelligence upgrade (AI logic only, no UI redesign)

Keep current quote comparison flow (`src/features/quoteAnalyzer/*`, `runQuoteAnalysis`). Enhance only the edge function `analyze-quote-comparative`:
- **Scope Gap Detection** — flag missing ventilation, soffit work, vague wording, suspicious exclusions.
- **Price Anomaly Detection** — underpriced risk / overpriced warning / unusually low scope (vs internal benchmarks + LLM reasoning).
- **Comparison Intelligence** — replace any generic "compare table" payload with AI summary + risks + missing items + homeowner questions to ask.

Add fields to the existing `QuoteAnalysisPayload`:
```ts
scopeGaps: { vendorSlot, item, severity, note }[]
priceAnomalies: { vendorSlot, type: 'under'|'over'|'low_scope', note }[]
homeownerQuestions: string[]
```
Existing UI components render new fields as additional inline blocks using current tokens — no new screens.

---

## Priority 4 — Symptom-first homepage prompts (copy only)

Find current example/prompt array on the existing homepage (already conversational per memory). Replace generic service labels with symptom FR copy:
- "Maison trop chaude"
- "Humidité au grenier"
- "Facture Hydro trop élevée"
- "Condensation fenêtres"
- "Fissure inquiétante"
- "Moisissure suspecte"

No structural or visual change. Just edit the prompt config array.

---

## Priority 5 — AI memory layer (invisible)

New service `propertyMemoryService` writing to `property_memory_events` on every:
- Visual analysis completed
- Quote analyzed
- Recurring symptom detected (Alex conversation)
- Contractor interaction (booking, message)
- Document uploaded

Reads feed:
- `SmartInsightsCard`
- Alex system prompt context (inject last N memory events into existing Alex brain context — no new Alex prompt rewrite)
- `compute-property-health`

No UI surface; pure data + context injection.

---

## Database

```sql
visual_analyses (
  id uuid pk, property_id uuid null, user_id uuid,
  storage_path text, ai_findings jsonb, annotations jsonb,
  urgency_level text, summary text, created_at timestamptz
)

property_health_scores (
  id uuid pk, property_id uuid,
  overall_score int, moisture_score int, ventilation_score int,
  insulation_score int, structural_score int, maintenance_score int,
  trend text, generated_at timestamptz
)

property_memory_events (
  id uuid pk, property_id uuid null, user_id uuid,
  event_type text, ai_summary text, risk_level text,
  related_documents jsonb, created_at timestamptz
)
```
All with RLS scoped to `auth.uid()` via property ownership / user_id, GRANTs to `authenticated` + `service_role`.

---

## Edge functions
- `visual-analysis` — Gemini 2.5 Flash multimodal → findings + annotations + summary.
- `compute-property-health` — aggregates signals → upserts `property_health_scores`.
- `analyze-quote-comparative` — extended (existing function modified) to include scope gaps, price anomalies, homeowner questions.

All use Lovable AI Gateway (`LOVABLE_API_KEY`, already configured), `esm.sh@2.49.1` Supabase import per project memory.

---

## Files (new)
- `src/features/visualAI/AIAnnotationLayer.tsx`
- `src/features/visualAI/VisualConversationPanel.tsx`
- `src/features/visualAI/visualAnalysisService.ts`
- `src/features/propertyIntelligence/PropertyHealthCard.tsx`
- `src/features/propertyIntelligence/SmartInsightsCard.tsx`
- `src/services/propertyMemoryService.ts`
- `supabase/functions/visual-analysis/index.ts`
- `supabase/functions/compute-property-health/index.ts`

## Files (edited — minimal/surgical)
- `src/features/alex/AlexMessageList.tsx` — render `VisualConversationPanel` for image messages.
- `src/features/alex/hooks/useAlexUIBridge.ts` (or upload handler) — call `visualAnalysisService` on image upload.
- `src/pages/dashboard/PropertyDetail.tsx` — insert two new cards in existing grid slots.
- `src/features/quoteAnalyzer/components/*` — render new payload fields inline.
- `supabase/functions/analyze-quote-comparative/index.ts` — extend AI prompt + payload schema.
- Homepage symptom prompts config — copy swap only.

---

## Constraints reaffirmed
- No design system changes. No new colors, fonts, radii.
- No new pages, dashboards, or admin widgets.
- No directory/marketplace UX. No enterprise widgets.
- All AI behavior in FR-CA, Alex speaks via existing voice path.
- Mobile-first; one-handed; image-first; conversational.

## Done when
- Uploading an image in Alex chat shows annotated overlay + spoken summary, persisted.
- Property page shows Health Score + Smart Insights cards using existing tokens.
- Quote analysis surfaces scope gaps + price anomalies + homeowner questions inline.
- Homepage prompts read as symptoms, not trades.
- Memory events accumulate silently and feed insights + Alex context.
