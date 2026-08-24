---
name: Sparse Lead Retention Rule
description: Contractor prospects with only a person name + phone (Facebook comments) are never discarded; kept as "À enrichir" with pending fields
type: feature
---

Acquisition rule (canonical, non-negotiable):

- A prospect is NEVER discarded because we only have a first/person name + phone.
- Unknown business fields are stored as `pending` (category placeholder `a_confirmer`), source context is preserved, enrichment runs, and the prospect stays in the pool even when enrichment fails.
- Only phone validity, consent (CASL / do_not_contact), and regulated-trade licence gates decide outreach eligibility.
- Sparse leads with a structurally valid non-toll-free NANP phone are SMS-eligible tier C (`phone_type = 'unknown_valid'`, `phone_sms_capable = true`).
- Outreach for sparse leads addresses the person by first name and must NOT claim knowledge of a business ("vos services", never "votre entreprise").
- Admin surfaces them as **À enrichir** with the list of pending fields.

Implementation:
- `supabase/functions/_shared/sparseLead.ts` (canonical) + `src/lib/sparseLead.ts` (UI mirror).
- `_shared/phone.ts` → `unknown_valid` + `sms_capable`; `selectOutreachChannel({ sms_capable })`.
- `_shared/outreachEligibility.ts` → SMS_CAPABLE_TYPES tier C.
- `_shared/leadValidation.ts` → sparse person lead = `valid` + `tentative_send`.
- `acquisition-recalculate-priority` → no `unreachable` suppression for sparse; adds `regulated_trade_unverified` gate.
- `acquisition-queue-worker` → selection keeps `owner_name`-only rows; promotion stores pending category instead of rejecting.
- `_shared/masterOutreachCopy.ts` → sparse-safe SMS/email variants.
