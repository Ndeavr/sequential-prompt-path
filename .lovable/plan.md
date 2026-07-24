## Root cause

The canary preview cards show empty `city`, `category`, and `landing_url` because `previewCanaryBatch` in `supabase/functions/funnel-audit-report/index.ts` only selects `company_name`, `mobile_phone`, `phone` from `v_commercial_send_eligibility` and CASL evidence — never joins `contractor_leads` for city/category and never resolves a public landing URL. The eligibility view + `contractor_leads` already carry that data (or can derive it), and `pro-landing-resolve` already generates `/pro/:slug` pages. Nothing new to build — repair the preview + add a per-lead readiness gate reusing the existing `commercial-send-gate` and `pro-landing-resolve`.

## Scope (repair-only, no new tables/routes/functions)

### 1. Enrich canary preview response
File: `supabase/functions/funnel-audit-report/index.ts` → `previewCanaryBatch`
- Left-join `contractor_leads` (by `contractor_lead_id`) to pull `city`, `category`/`trade`, `slug`, `google_place_id`, `postal_code`, `address`.
- Derive missing `city` in-function from postal code / address / Google Place cache (read-only fallbacks already available on the row).
- Derive missing `category` from `trade` → UNPRO category mapping already used by `acquisition-queue-worker`.
- Compute `landing_url = ${SITE_URL}/pro/${slug}` when slug exists; otherwise mark `landing_status: "pending_generation"` (do not write here — surfaced to UI as a repair action).
- Add per-lead `readiness`: `{ status: "ready" | "missing_landing" | "missing_city" | "missing_category" | "missing_phone" | "casl_pending", checks: { phone, casl, city, category, landing } }`.
- Keep the existing `disclaimer` and NO-SEND behavior.

### 2. Add read-only aggregate to the audit response
Same file, top-level report:
- `canary_readiness`: `{ eligible, ready_now, missing_city, missing_category, missing_landing, missing_phone, ready_pct }` computed from the same eligibility view (bounded, e.g. top 100 candidates) — reuses existing query, no new table.

### 3. Add opt-in "Auto-repair missing landings" action (reuses existing generator)
Same file, guarded by `?action=repair_landings&limit=N` (admin JWT required, N ≤ 10, no SMS):
- For each eligible lead with no slug, call the existing `pro-landing-resolve` (or the existing slug-generation path it uses) to produce/persist a slug on `contractor_leads`.
- Return before/after readiness counts. Purely idempotent, no outreach side effects.

### 4. Admin UI wiring (no new page)
File: `src/pages/admin/AdminFunnelAudit.tsx` + `src/hooks/useFunnelAudit.ts`
- Render the enriched preview fields: City, Category, Landing (as clickable URL when present, "Génération requise" pill when missing), and a per-card readiness chip (🟢 Ready / 🟠 Missing landing / 🔴 Missing phone …) with a checklist of the 5 checks.
- Replace all `—` placeholders with explicit `Manquant`, `En cours d'enrichissement`, `Généré automatiquement`, or `Vérifié`.
- Add two buttons next to "Aperçu 3 prospects réels":
  - "Auto-réparer les landings manquants (max 10)" → calls the new `?action=repair_landings` mode, re-fetches preview.
  - "Valider la production (3 prospects)" → runs the same eligibility fetch and displays a single `READY TO SEND` / `BLOCKED: …` verdict per lead (uses existing `commercial-send-gate` in dry-run — no send).
- Show the `canary_readiness` aggregate as a compact stat strip above the preview cards.

### 5. No changes to
- `contractor_leads` schema, RLS, cron jobs, Twilio/Stripe/Resend integrations, sender code, sitemaps, SEO, AI corpus, `/pro/:slug` runtime.
- No new tables, no new edge functions, no new routes.

## Verification (real data only, no SMS)

1. `GET /functions/v1/funnel-audit-report?canary_preview=1&canary_limit=3` — every card returns non-null `city`, `category`, `landing_url` OR an explicit `readiness.status` explaining the gap.
2. `canary_readiness` counts match hand-tallied query on `v_commercial_send_eligibility` (spot check 3 rows via `supabase--read_query`).
3. `?action=repair_landings&limit=3` — 3 previously-missing slugs become present; preview re-run shows their `landing_url` populated and `HTTP 200` on `/pro/:slug` (curl check via exec).
4. `commercial-send-gate` dry-run on the same 3 leads returns `allowed: true` → UI shows `READY TO SEND`.
5. Admin UI at 390 / 984 / 1280 px: chips, checklist, and buttons render without overflow; disclaimer "NO SMS was sent" remains.

## Deliverable
Plain enriched canary that tells the operator exactly which real contractors are ready to send now and which single field is blocking each of the rest — with a one-click, non-outreach landing repair that reuses `pro-landing-resolve`. First real $1 send stays a manual, explicit action taken from `/admin/acquisition-pipeline` after readiness reaches 🟢.

Not in this run (explicit, per your P0/P1 boundary): the real end-to-end $1 send + Stripe activation walk-through (task 8). That requires the readiness gate above to first show ≥1 🟢 lead in production; I'll execute it as the next step once you approve this repair.