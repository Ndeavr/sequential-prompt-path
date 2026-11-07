# Clara contractor workspace — v1

Public-safe reference. No customer records.

## v1 scope (extends the website-first entry in `docs/contractor-profile.md`)

1. **Entry** — `/entrepreneurs` hero: one field, « Entrez le nom ou le site de votre entreprise. Clara prépare votre présence UNPRO. » `detectContractorEntry()` routes a domain to `website`, anything else to `name`; a rejected address (private host, credentials) is never reused as a name.
2. **Confirmed dossier** — existing `PageMatchingProfileWizard` draft review: company, website, description (≤600), preferred work, work to avoid, service areas. Each row has its own « Compléter / Modifier » button that opens exactly one question. Saved answers > account record > URL input; an account description prefills only when nothing is saved and is labelled « à confirmer ». Re-confirming a completed profile keeps it completed.
3. **Private preview** — `PresencePreview`, built only from the confirmed dossier, labelled « Aperçu privé · non publié »; declared credentials read « Déclaré, vérification UNPRO à venir ». Nothing is published from here.
4. **Offer** — base activation CAD 350 + taxes, profile + 12 months, « Rendez-vous inclus dans l'activation de base : aucun ». Existing promotions/entitlements are confirmed by the canonical checkout before payment; free-year accounts keep their existing path.
5. **Checkout** — unchanged canonical `/entrepreneurs/activation-350?activate=1` with ref/promo/lang/attribution preserved.
6. **« Le travail de Clara pour votre entreprise »** — `ClaraWorkPanel` (`src/lib/claraContractorWorkspace.ts`, `src/services/claraContractorWorkService.ts`). Rows come only from:
   - saved matching draft (`matching-profile`: saved date, server `missing_matching_fields`, status);
   - `contractor_plan_code()` (activation), `get_my_free_service_entitlement()` (free membership);
   - own `contractors.public_status` (publication);
   - own `appointments` count excluding `archived_test`.
   Any read error → « Inconnu », never zero. A Stripe return stays « en attente » until the server plan exists. Signed-out visitors see no account state.

## Known dependency (not built)

No website reading is performed. Existing import endpoints (`import-business-website`, `aipp-import-website`, `contractor-activation-enrich`) call paid services without the required owner auth, rate limit and pinned fetch; `enrich-official-website` is pinned but service-only. The panel therefore says « Lecture automatique non effectuée : chaque information vient de vous. » Enabling analysis requires an owner-authenticated, rate-limited wrapper around the pinned fetch — a backend change to review separately.

## Later phases (not in v1)

- Safe website analysis as above, with per-field source + date shown in the dossier.
- Publication request flow once verification gates pass (never automatic).
- Activity history from canonical events (profile views, matches proposed, appointments) with provenance.
- Social/marketing operations and continuous agents: out of scope until explicitly approved.

## Synthetic QA (2026-11-07, mocked backend/Stripe, 360 px)

28/28 checks: FR website entry, EN name fallback, failed save keeps edits then retry, reload keeps dossier, one-question edit, saved identity over URL, completed status preserved, private preview, zero-appointment offer, canonical checkout keeps ref/promo/lang, Stripe return pending → confirmed only after server plan, cross-account denial, no horizontal overflow. 20 unit tests (`claraContractorWorkspace.test.ts`, `contractor-profile-entry.test.ts`). Hosted auth, real webhook and real publication state not exercised.
