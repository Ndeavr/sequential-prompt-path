# Isolation Solution Royal — advertising landings

Public-safe. No customer records.

## Routes (existing `/c/:contractorSlug/:intentSlug`, code-defined for ISR)

| Campaign | FR | EN |
|---|---|---|
| Attic insulation | `/c/isolation-solution-royal/isolation-entretoit` | `/c/isolation-solution-royal/attic-insulation` |
| Cold home / heat loss | `/c/isolation-solution-royal/maison-froide` | `/c/isolation-solution-royal/cold-home` |
| Ventilation / ice dams | `/c/isolation-solution-royal/ventilation-barrages-glace` | `/c/isolation-solution-royal/attic-ventilation-ice-dams` |

Other contractor slugs keep the DB `contractor_campaigns` template. Pages are `noindex`. Ad links: `?utm_source=…&utm_medium=…&utm_campaign=isr_<key>` (copyable from `/pro/qr-performance`, ISR account only).

## Behaviour

- Identity, territory and booking flags come from `get_contractor_public_profile('isolation-solution-royal')`; no contractor ID in code.
- Services shown = owner-declared only (blown fiberglass, ventilation, soffits/baffles, hatch/weatherstripping). No reviews, licence, subsidy, savings, slots, guarantee or "free" claim (no confirmed free offer found).
- Clara intake: 4 questions, one at a time (address or saved address, concern, timing, availability). Draft + UTMs in `sessionStorage` (24 h, ISR-only, strict parse) → survives sign-in via `saveReturnPath` + `/login?returnTo=`.
- Request: `appointments` insert under existing RLS (`auth.uid() = homeowner_user_id`), `status = requested`, no slot/scheduled time. Confirmation copy says the appointment remains to be confirmed.
- « Choisir mon rendez-vous » is never shown: ISR calendar not connected, 0 open slots (read 2026-11-07).
- Events (`platform_events`, labels only): `isr_campaign_landing_view`, `isr_campaign_intake_started`, `isr_campaign_request_saved`, `isr_campaign_appointment_confirmed` (only if server status is scheduled/confirmed). Landing also writes existing `campaign_attributions` (no query string in URL).

## Blockers / limitations

- **No notification**: no trigger on `appointments`; `notify-appointment-created` is unauthenticated and says « confirmé », so it is not called. ISR sees requests in its pro appointments list only.
- **No server eligibility check on appointment insert**; requests open only when the public profile has `booking_enabled` and `is_accepting_appointments`. ISR licence: RBQ declared, compliance `not_provided`, public status `published_pending_verification` — admin verification pending.
- Duplicate ISR-like contractor rows exist (two unpublished); the canonical row is the one owning slug `isolation-solution-royal`.
- Optional photos not collected (no owner-safe upload wired in this slice).
- Not published; QA synthetic only.
