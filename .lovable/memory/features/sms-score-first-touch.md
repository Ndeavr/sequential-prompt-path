---
name: SMS score-first first-touch
description: First-touch outreach SMS is curiosity → free personalized AI score; never pricing/payment/subscription; lands on /unpro/audit/:token
type: feature
---
# SMS First-Touch — Score IA gratuit

- First-touch SMS copy: `firstTouchScoreSms()` in `supabase/functions/_shared/offerCopy.ts`. Curiosity only ("Curieux de savoir si {entreprise} est recommandée par l'IA? … score actuel gratuit"). **Forbidden in first-touch SMS:** $350, any price, payment, subscription, guaranteed appointment counts. Enforced by `FORBIDDEN_FIRST_TOUCH` guard in `send-verified-batch` (model overrides containing those terms are replaced by the canonical score template).
- Destination: `/unpro/audit/:token` → `PageAuditTokenRedirect` resolves the canonical `verified_prospect_tokens` token (records click via `activation-token-resolve`), then redirects to `/entrepreneurs/audit-ia?p=<prospect_id>&at=<token>&utm_*`.
- `PageAiRecommendationAudit`: `p` = exact verified prospect (auto-runs its real-signal audit on arrival, `source: "outreach_first_touch"`); `at` = outreach activation token, forwarded to `/entrepreneurs/garantie` as `t` so `create-activation-checkout` keeps attribution; `at` also stored in audit row `utm.outreach_token`.
- Campaign: `ai_score_first_touch`. Email path unchanged ($350 golden path via `/unpro/activate/:token`).
- **Provenance gate (updated 2026-08-25):** `send-verified-batch` accepts `website_url`, `google_business_url`, `google_place_id`, `phone_source_url`, **or a real official public registry URL persisted in `source_urls.official_registry`** (RBQ/REQ/Novoclimat lists). Internal lineage only (`source_table: contractor_prospects`, manual_import, facebook with no public URL) still fails the gate — never fabricate provenance.
