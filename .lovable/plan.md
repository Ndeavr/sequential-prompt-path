

# AIPP v2 — AI Visibility & Authority Engine

## Context

Strong existing foundation:
- `aipp-real-scan` edge function: Firecrawl-based website scraping with signal extraction
- `edge-generate-aipp-preview`: Factor-based scoring (18 factors, 7 categories) for outbound prospects
- `aippScoreService.ts`: Client-side contractor profile scoring
- DB tables: `aipp_scores`, `prospect_aipp_scores`, `prospect_aipp_factors`
- Pages: `PageAIPPAnalysisLoading`, `PageAIPPScoreReveal`, entrepreneur landing

**Gap**: No unified public-facing audit page where any user enters a domain and gets a full v2 analysis with AEO, entity authority, conversion intelligence, local dominance, and revenue loss estimation. The existing system is split between contractor profiles and outbound prospect pipelines.

## Plan

### Phase 1 — Database (Migration)

4 new tables:

```text
aipp_audits         — id, user_id (nullable), domain, status (pending/processing/done/failed), created_at
aipp_audit_scores   — id, audit_id FK, score_global, score_aeo, score_authority, score_conversion, score_local, score_tech, revenue_loss_estimate, created_at
aipp_audit_entities — id, audit_id FK, entity_type (service/city/brand/faq/schema), name, confidence, created_at
aipp_audit_recommendations — id, audit_id FK, title, description, priority (high/medium/low), impact_score, created_at
```

RLS: public insert (for anonymous audits), select own rows or public via audit_id.

### Phase 2 — Edge Function: `aipp-v2-analyze`

Single orchestrator edge function that:
1. Calls existing `aipp-real-scan` logic (Firecrawl scrape)
2. Extracts entities (services, cities, brand signals)
3. Scores 6 dimensions with new AEO-focused weights:
   - **AEO** (30%): Q&A presence, direct answers, problem→solution structure, semantic density
   - **Authority** (25%): Brand coherence, reviews, mentions, credibility signals
   - **Conversion** (20%): CTAs, friction level, trust signals, offer clarity
   - **Local** (15%): City coverage, geographic coherence, local business signals
   - **Tech SEO** (10%): SSL, structured data, meta, schema.org
4. Generates recommendations sorted by impact
5. Estimates revenue loss based on weak dimensions
6. Saves to `aipp_audits` + `aipp_audit_scores` + `aipp_audit_entities` + `aipp_audit_recommendations`

Reuses existing Firecrawl integration and signal extraction from `aipp-real-scan`.

### Phase 3 — Pages & Components

**`/audit-aipp` — PageAuditAIPPv2**
- `HeroSectionAuditAIVisibility`: Gradient headline, domain input, CTA "Analyser avec IA"
- `InputWebsiteAnalysis`: Domain field with validation + submit
- On submit → create audit row, call edge function, navigate to loading

**`/audit-aipp/loading/:auditId` — Reuse/extend PageAIPPAnalysisLoading**
- Poll audit status, redirect to results when done

**`/audit-aipp/results/:auditId` — PageAuditResultsAIPPv2**
- `CardScoreGlobalAIPP`: Big score gauge with gradient aura
- `WidgetRadarScoreBreakdown`: Radar chart (5 axes: AEO, Authority, Conversion, Local, Tech)
- `PanelAEOReadiness`: AEO-specific signals breakdown
- `PanelEntityAuthority`: Detected entities list with confidence
- `PanelConversionIntelligence`: CTA, friction, trust analysis
- `PanelLocalDominance`: City coverage map
- `PanelRevenueLeak`: Revenue loss counter with animation
- `ListRecommendationsAIPP`: Priority-sorted action items
- `CTAUpgradePlanAIPP`: Persistent upgrade CTA
- `PanelAlexInterpretation`: Natural language summary (static template, no AI call)

### Phase 4 — Admin Dashboard

**`/admin/aipp-v2` — PageAdminAIPPv2Dashboard**
- Recent audits table with scores
- Score distribution chart
- Conversion tracking (audit → plan upgrade)

### Phase 5 — Routing

Add 3 routes to `router.tsx`:
- `/audit-aipp` → PageAuditAIPPv2
- `/audit-aipp/results/:auditId` → PageAuditResultsAIPPv2
- `/admin/aipp-v2` → PageAdminAIPPv2Dashboard

## File Changes

| Action | File |
|--------|------|
| Create | Migration SQL (4 tables) |
| Create | `supabase/functions/aipp-v2-analyze/index.ts` |
| Create | `src/pages/PageAuditAIPPv2.tsx` |
| Create | `src/pages/PageAuditResultsAIPPv2.tsx` |
| Create | `src/pages/admin/PageAdminAIPPv2Dashboard.tsx` |
| Create | `src/components/aipp-v2/CardScoreGlobalAIPP.tsx` |
| Create | `src/components/aipp-v2/WidgetRadarScoreBreakdown.tsx` |
| Create | `src/components/aipp-v2/PanelAEOReadiness.tsx` |
| Create | `src/components/aipp-v2/PanelEntityAuthority.tsx` |
| Create | `src/components/aipp-v2/PanelConversionIntelligence.tsx` |
| Create | `src/components/aipp-v2/PanelLocalDominance.tsx` |
| Create | `src/components/aipp-v2/PanelRevenueLeak.tsx` |
| Create | `src/components/aipp-v2/ListRecommendationsAIPP.tsx` |
| Create | `src/components/aipp-v2/CTAUpgradePlanAIPP.tsx` |
| Create | `src/components/aipp-v2/HeroSectionAuditAIVisibility.tsx` |
| Create | `src/components/aipp-v2/PanelAlexInterpretation.tsx` |
| Create | `src/hooks/useAIPPv2Audit.ts` |
| Modify | `src/app/router.tsx` (add routes) |

## Constraints

- Reuses existing `aipp-real-scan` Firecrawl logic — no duplication
- Does not modify existing AIPP scoring for contractors or prospects
- Mobile-first, dark premium theme
- Mock fallback if Firecrawl unavailable
- fr-CA first

