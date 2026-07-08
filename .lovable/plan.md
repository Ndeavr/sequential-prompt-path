## Contractor Revenue Readiness Report

### Part 1 — The 7 active contractors NOT booking-enabled

| Business name | Plan | Visible | Category | Service area | Reason `booking_enabled = false` | Rec. eligible |
|---|---|---|---|---|---|---|
| Construction Gagnon | Recrue (free) | Yes | renovation-generale | Montréal | `is_accepting_appointments=false` (only blocker) | No |
| Isolation Solution Royal | Recrue | No (discoverable=false) | isolation-entretoits, isolation | Laval | accepting=false **+** verification=pending **+** discoverable=false | No |
| Jean-Édouard Fanfan | Recrue | No (unpublished) | — none — | — none — | accepting=false + no city + no category + no area + not published | No |
| Pros Rénovation | Recrue | No (unpublished) | isolation-entretoits, isolation | Montréal, Laval, Longueuil, +3 | accepting=false + not published + not discoverable | No |
| Rénovations Lafortune | Recrue | Yes | renovation-generale | Laval | accepting=false (only blocker) | No |
| Toiture hogue | Recrue | No | — none — | — none — | accepting=false + no city + no category + no area + not published | No |
| Toitures Beaupré | Recrue | Yes | toiture | Québec | accepting=false + verification=pending | No |

**Root cause:** all 7 have `is_accepting_appointments=false`. The `sync_contractor_booking_flags` trigger only lights up booking when accepting flips true. 3 of the 7 (Construction Gagnon, Rénovations Lafortune, Toitures Beaupré) are one flag flip away from being fully bookable.

### Lost revenue estimate for these 7

Assumptions: Recrue plan $149/mo baseline subscription potential; appointment-driven revenue only counts the 3 "one-flip-away" profiles at ~2 appointments/mo × $85 avg booking fee.

- Subscription upside (7 × $149): **$1,043 / mo** (~$12.5k/yr)
- Appointment fee upside (3 × 2 × $85): **$510 / mo** (~$6.1k/yr)
- **Total leak: ~$1,553 / mo (~$18.6k/yr)**

### Part 2 — Full readiness across 19 active contractors

| Stage | Count | % of active |
|---|---|---|
| Active | 19 | 100% |
| Publicly visible (published + discoverable) | 15 | 78.9% |
| Booking enabled | 12 | 63.2% |
| Appointment ready (booking + accepting + area + category) | 10 | 52.6% |
| Recommendation eligible (above + verification ∈ verified/pending) | 6 | 31.6% |
| Fully verified & eligible | 4 | 21.1% |

### Exact blockers remaining (19 active)

- **7** — `is_accepting_appointments=false` (see Part 1) — biggest blocker.
- **2** — verification=`unverified` blocks recommendation: Benali Construction, Lavoie Peinture, Plomberie Démo Neuve *(3, but Plomberie also has no specialty)*.
- **1** — verification=`rejected`: Pellegrino Carrelage (permanent exclusion).
- **2** — junk profiles still marked active with no city/category/area/publish: Jean-Édouard Fanfan, Toiture hogue → recommend deactivation.
- **1** — Plomberie Démo Neuve: no specialty field → no category assignment.
- **0** — missing service areas (all backfilled).
- **0** — missing category assignments among booking-enabled contractors.

### Next actions (proposed, awaiting approval to build)

1. **Auto-flip trigger extension** — when a contractor completes onboarding (`profile_completion ≥ threshold` or admin publish), set `is_accepting_appointments=true` so the existing trigger lights up booking.
2. **Nudge sequence** — email/SMS to the 3 one-flip-away contractors ("Activez vos rendez-vous en 1 clic") with a magic link that toggles `is_accepting_appointments`.
3. **Deactivate junk** — mark Jean-Édouard Fanfan and Toiture hogue `account_status='inactive'` (no city + no specialty + unpublished).
4. **Verification funnel** — surface the 3 unverified booking-enabled pros in `/admin/dispatch-center` so they get pushed through verification (currently invisible to the recommendation engine).

Confirm which of (1)–(4) to ship and I'll build the migration + edge function in one pass.
