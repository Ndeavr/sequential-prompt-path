# Isolation Solution Royal — advertising landings

Public-safe. No customer records.

## Release mode — free inspection, address first

Owner confirmed on 2026-11-07: inspection is free and lasts 60 minutes.
FR CTA: « Prenez rendez-vous maintenant »; EN: “Book your appointment now”.
Supporting copy: « Inspection gratuite · Prévoyez 60 minutes ».
The external isroyal.ca handoff has been removed. The CTA opens the property
address step on UNPRO; address and campaign are retained in session storage.

Booking remains unavailable: read-only configuration check found no connected
calendar, no active availability rules, and no active free 60-minute appointment
type on the canonical ISR record. The existing slot engine accepts coordinates
but does not use them for travel filtering. Complete address-based scheduling
requires the actual calendar, working hours and server-side travel validation.
The UI reports unavailable slots without creating or confirming appointments.
`ISR_BOOKING_READY` remains false pending those dependencies and the authorized
notification/eligibility path. The retained intake below is not enabled.

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

## SEO subsidies page — 2026-11-07
- Indexable FR route: `/c/isolation-solution-royal/subventions-renoclimat-logisvert`; registered in sitemap generator and linked from FR campaign pages.
- Original content with local attic photo, canonical, Article/FAQ structured data. No fictional EN alternate route.
- Official sources: Québec Rénoclimat October 1, 2026 update and participant guide; Hydro-Québec LogisVert residential page/guide. Technical R-60/R-20/300 sq ft criteria and $1.75/sq ft; house ceiling $2,000. LogisVert $1,500 requires roof insulation and caulking, R-50 over entire roof. No combined subsidy promise or blanket contractor accreditation claim.
- CTA reuses existing ISR address-first free 60-minute inspection journey. Calendar/auth prerequisites documented above remain unresolved; this content update does not enable slot booking.
