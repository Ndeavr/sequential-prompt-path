
## Goal

Collapse the multi-button, sequence-heavy SMS Sprint page (`/admin/sms-sprint`) into a single-button revenue engine focused on one outcome: get the next contractor to pay $1. No J+0/J+2 exposure, no editing, no manual batching.

## Scope

Rewrite `src/pages/admin/PageAdminSmsSprint.tsx` only. Reuse existing edge functions (`sms-sprint-scrape`, `sms-sprint-send`, `sms-sprint-followups`, `sms-sprint-test`) and DB tables (`sms_sprint_*`). No schema changes, no new endpoints, no changes to Alex, checkout, or landing pages.

## New page layout (top → bottom)

1. **Goal Today banner**
   - "🎯 Prochain entrepreneur qui active à 1 $"
   - Progress bar: `activations_today / 1` (or /5 once first sale lands)
   - Revenue counter (activations × $1) with green pulse when > 0

2. **Campaign Status strip** (auto-computed, no controls)
   - Prospects ready (qualified count)
   - Mobile numbers validated (phone_type = mobile)
   - High AI score (roi_score ≥ threshold)
   - SMS remaining today (daily cap − sent today)
   - Status pill: 🟢 Ready / 🟡 Test required / 🔴 Quota reached

3. **Current Experiment card** — the 6 new variants shown as compact cards with live win-rate (activation ÷ sent). Ribbon 🏆 on the leader. Copy comes from a new constant `SMS_REVENUE_VARIANTS` (see Technical). No edit affordance — read-only.

4. **One Button**
   - Large primary: `🚀 Trouver mon premier dollar`
   - Under it, sub-text: "L'IA choisit le meilleur message, envoie aux numéros mobiles validés, surveille les réponses, met en pause sur STOP, et apprend automatiquement."
   - Disabled states surface as tiny copy: "Test SMS requis" / "Quota atteint" / "Aucun prospect qualifié — j'en cherche…"

5. **Live Feed** — vertical timeline of the last 30 events (SMS sent, delivered, clicked, onboarding started, paid). Real-time via existing Supabase channels on `sms_sprint_messages` + `sms_sprint_link_events` + `sms_sprint_prospects` (activation).

Everything else on the current page (rejection breakdown, prospects table, test SMS card, Scrape/Send-5/Send-20/Follow-ups buttons, KPI grid of 8 tiles) is removed.

## Button behavior ("Find My First Dollar")

Single click orchestrates in order, hidden from operator:
1. If no `sms_sprint_test_runs` success → run `sms-sprint-test`, toast "Test envoyé", exit.
2. If qualified prospects < 5 → invoke `sms-sprint-scrape` with `{ limit: 25 }`.
3. Invoke `sms-sprint-send` with `{ batch: 5 }` when no prior batch, else `{ batch: 20 }` if 30 min elapsed + ≥1 click, else `sms-sprint-followups`. All timing rules already exist in the current page — moved into a `pickNextAction()` helper inside the component.
4. On any error, single toast in plain FR: "Impossible pour l'instant — je réessaie automatiquement."
5. Auto-refresh state every 15 s while the tab is visible.

## Variants (read-only display)

Ship the 6 SMS bodies from the message as the source of truth. Rendered from a `SMS_REVENUE_VARIANTS` array declared at the top of the file:

```
1. Recommandation IA + activation 1 $
2. « Courir après les soumissions »
3. « Si l'IA recommandait aujourd'hui, serait-ce vous ? »
4. « Meilleurs entrepreneurs ≠ plus visibles »
5. « Votre fiche est prête »
6. « Vous avez été identifié dans votre secteur »
```

Win-rate is computed from existing `sms_sprint_prospects.variant` + `activation_status` (already done in the current file). Copy is only visual for now — actual send-side variant selection continues to use whatever `sms-sprint-send` already picks. A follow-up sprint can wire the new variant keys into the send function when ready; this UI change does not require it.

## Live Feed data source

Merge three streams client-side into one sorted timeline:
- `sms_sprint_messages` inserts → "SMS envoyé à {company}"
- `sms_sprint_link_events` inserts → "Cliqué" / "Checkout démarré"
- `sms_sprint_prospects` update where `activation_status = 'activated'` → "Payé 1 $ 🎉" (green highlight, confetti-free — just color)

Subscribed via `supabase.channel('sms-revenue-feed').on('postgres_changes', …)`. Fallback: 15 s polling if realtime unavailable.

## Out of scope

- No changes to edge functions, DB, Alex, checkout, or landing.
- No new routes, no navigation changes (same `/admin/sms-sprint` URL).
- No A/B routing logic on the send side (deferred).
- No Observability Foundation — that comes after the first sale, per the sprint charter.

## Files touched

- `src/pages/admin/PageAdminSmsSprint.tsx` — full rewrite (~250 lines).

## Success criteria

- Operator sees one goal, one status strip, one button.
- No mention of J+0/J+2/J+5/J+8 anywhere on the page.
- Click sends the right next action automatically without prompting.
- Live feed shows activity within 2 s of a real event.
- Zero regression on the underlying send/scrape/followup pipeline.
