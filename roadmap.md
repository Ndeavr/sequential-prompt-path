# Roadmap — P0 contractor acquisition golden path
- [x] Entry350 quote-free handoff (2026-10-22): base CTA and Clara CTA open short inline review on /entrepreneurs/activation-350?activate=1 (ref/UTM kept); declared business name required, prefill from Clara qualification; existing create-checkout-session entryActivation without quoteId; server guard rejects email-only names (business_name_required), never overwrites owned identity; honest pending copy on Stripe return. Monthly funnel unchanged for the appointments option. 23/23 focused tests, harness build OK, deno check: only two pre-existing errors. Intercepted 390px browser: SMS link → Clara → review → name alert → /login handoff, name preserved on return, no overflow/page errors. Edge function change NOT deployed (guard inactive until deploy); no real payment, no publication. HEAD 522837467.
- [x] Targeted direct activation link: canonical contractor Clara visible before greeting without navigation state; same token, homeowner history withheld, direct purchase/audit and minimize preserved. Three new focused scenarios (10/10 total, exit 0); scoped lint exit 0 (two existing warnings), harness build OK. Intercepted 390/1280 browser: direct link → price answer → canonical intake with ref/UTM/source, minimize/restore and reload, no page errors/overflow. Auth/Checkout/live audit/physical devices not tested; no remote changes, publication or revenue. Evidence: /tmp/browser/clara-direct/.
- [x] Targeted Clara commercial close: automatic monthly pitch replaced by canonical entry350 activation; four focused commercial scenarios plus three continuity regressions pass (7/7, exit 0), scoped lint exit 0, automatic build OK. Intercepted 390/1280 DOM: “Je suis entrepreneur” → price question → 44px activation CTA → existing intake, ref/UTM/source retained, no overflow/page errors. No hosted audit/voice/auth/payment, deployment, sends or revenue verified; existing payment release blocker unchanged.
- [x] 2026-10-22 targeted entry350 continuation: reproduced identical retries creating two Stripe sessions (exit 1); server-contract provider idempotency added; 105 isolated regressions pass (exit 0), harness build OK. FR 390 homepage and landing→intake checked; no remote events/deployment. See docs/audits/entry350-continuation-2026-10-22.md.
- [ ] Entry350 release QA blocked: hosted isolated Auth/router/Stripe TEST webhook environment unavailable; full landing and Clara journeys through UI confirmation/reload, different-contract concurrent sessions, expired-session retry and standalone typecheck not validated. No release or live payment.
- [x] P0 duplicate backlog incident: only direct consumer identified; unconditional server stop at handler and both provider boundaries, activation creator suspended; shared SMS checks both switches and score ≥95. Local provider-free backlog/concurrency tests and read-only quarantine proposal prepared. All historic rows and cron state preserved; no deployment.
- [ ] Legacy agent queue release blocked: founder-approved reversible reconciliation, atomic recipient/canal/campaign/window claim for BOTH channels, full CASL/mobile/suppression proof and isolated provider-failure QA required. Never release by score alone.
- [x] 2026-10-22 homepage only: selective PR #28 reuse; 50 regressions, scoped lint and harness build OK; 360/390/430/desktop, simulated keyboard, English and synthetic contractor context checked. Physical keyboard/live AI unverified; no merge, deployment or publication. See docs/audits/clara-home-mobile-2026-10-22.md.
- [x] Constrained outreach P0 repair (2026-10-22): restricted Resend introspection + strict delivered/funnel/payment assertions; 60 targeted regressions including provider-free handler QA pass, automatic build OK. Read-only campaign audit completed; no sends, remote writes, release or deployment.
- [ ] Outreach launch blocked: human-reviewed CASL evidence and verified mobile destinations absent; email atomic quota/message claims and duplicate draft reconciliation need verification/repair before isolated signed-provider QA. Existing E2E cleanup on failure remains unverified. No activation authorized by simulated tests.
- [x] Minimal P0 follow-up: remove undefined admin hook dependency and align active entry-offer copy only; preserve Checkout/webhook and historical rights. Automatic compilation verification pending; no production actions authorized.
- [ ] Authorized P1 isolation interventions: repair pack persistence/finalize, exact declared scope matching and active Clara lead payload; synthetic local QA only, no deployment or production writes.
- [ ] Entry 350 tax parity: shared exclusive rates, mode-isolated cache, versioned signed Checkout contract, strict webhook tax validation, isolated QA and audit; release blocked pending founder GST/QST registration confirmation and full isolated authenticated E2E.
- [x] Targeted Clara mobile suggestion clipping: 48 real-DOM scenarios at 320/360/375/390/412/1280 and 24 regression tests pass; initial suggestions intrinsic-sized, no empty-thread bottom follow. Physical Android keyboard unverified; no publication while authenticated 350 QA remains blocked. See clara-suggestion-clipping-2026-10-17.md.
- [x] Four-issues bounded repair: RBQ gazon/gaz and explicit Clara role logic repaired; public address component now uses guest session hook; authenticated model inventory only. 65 tests pass, no payment code changes/release/outreach. See four-issues-first-revenue-2026-10-17.md.
- [ ] Four-issues QA gate: real tactile homeowner CTA is covered by full-screen mobile chat; DOM activation only passed at 360/390. Address provider and three full mobile forms remain unverified; complete isolated interactive QA before release.
- [x] Authorized local isolated QA: 87/87 targeted tests, including 15 SQL-role/RLS and signed-handler scenarios; 13 mocked Checkout checks, 63 browser checks. Invited perpetual-subscription and personalized-token fallthrough repaired locally; report docs/audits/entry-350-qa-isolation-2026-10-17.md. No remote writes, payments, sends or deployment.
- [x] Strict paid 350 collection gate: both entry circuits reject unpaid/free/underpaid events before paid telemetry or activation. 72/72 targeted tests + 13/13 mocked checkout checks, automatic build OK; details in entry-350 recovery audit.
- [ ] RELEASE BLOCKED: free isolated Auth/PostgREST/Edge stack with full schema/RLS and both mobile routes unavailable; local adapters are not hosted full-stack E2E. Full-router invited mobile check redirects to https://localhost and remains unverified. No deployment/outreach.
- [x] P0 2026-10-17 bounded repair: signing-secret absence fails closed; interrupted same-session entry activation resumes without another ledger receipt; redirect no longer emits payment_completed. 58 focused tests + 13 mocked checkout handler checks pass; real router 360/390/1280 offer/cancel/unmatched return passes with all external requests intercepted; harness build OK. No remote writes, sends or publication.
- [x] Canonical 12-month Presence resolver (existing migration 0023) validated locally for both entry offers, refund/dispute, expiry and owner isolation; no alternate entitlement source or migration. Hosted E2E remains blocked above.
- [x] Ultra-targeted homepage follow-up: exact homeowner FR/EN text, conversion disclaimer removed, one canonical native call pill at bottom. 10 focused tests pass; browser / and /index, 360/390/1280, CTA destinations and reduced-motion verified; harness build OK. Preview only. Physical keyboard/devices and actual calls untested.
- [x] Focused homepage: approved two-path section replaces dials; animated scenario consolidated on /impact. 21 focused tests and local browser checks at 360/390/1280, FR/EN, /index, CTA destinations and reduced motion pass. Preview only; physical devices, voice and authenticated payment unverified. Evidence: `docs/audits/home-matching-2026-10-12.md`.
- [x] Bounded HELP repair: public SMS contact, signed simulations and live unsigned 403 verified; only twilio-inbound deployed. Twilio Advanced Opt-Out text still requires console inspection; no SMS or configuration changes. Evidence: `docs/audits/sms-help-2026-10-12.md`.
- [ ] Current P0: address autocomplete mobile/Places configuration, readable Clara streaming, strict property/business/territory context separation; verify targeted tests and preview, no publication without proof.
- [x] Focused homepage impact dials: explicit per-journey scenario, once-per-visit animation, methodology; 8 tests and desktop/mobile simulated browser checks passed. Report: `docs/audits/impact-dials-2026-10-11.md`. Not published.

- [x] Focused public date freshness audit (2026-10-11): original dates preserved, shared display/schema corrected, one sourced IA guide updated; tests and representative public browser checks recorded in `docs/audits/date-freshness-2026-10-11.md`. Not published.
- [ ] Deferred after two real $350 activations: full price/grant/legal article review with current sources, SEO publication provenance and crawler date consistency; do not bulk refresh dates.

- [ ] DEFERRED after first two real paid $350 contractor activations: DNA matching, learning, voluntary questionnaire, feedback, and content pipeline; reference `docs/roadmap/UNPRO_DNA_MATCHING_LEARNING_CONTENT_PIPELINE_2026-10-11.md`. Documentation only; no implementation or funnel impact now.
- [ ] Current mobile P0: active surface, shared viewport repair, real-DOM smoke tests; physical Gboard and authenticated final registration require device/session verification.
- [ ] P0 Clara → onboarding réel : actions structurées confirmées par le rendu, assistance continue mobile/bureau, préremplissage partagé et reprise sans perte; valider échec, répétition, retour, rafraîchissement et voix/texte.

- [ ] P0 mobile Clara: keyboard-aware viewport, one scroll owner, shared live voice transcript; targeted tests and mobile browser checks.
- [ ] Publish mobile repair only after checks and security gate pass; existing critical findings remain an external publication blocker.

- [x] Paid number check OFF again (PAID_LOOKUP_ENABLED=false, TWILIO_LOOKUP_ENABLED=0).
- [x] OUTREACH_ENABLED=false kept during repair.
- [x] Hard CASL gate in canonical sender matches stored 10-digit evidence; unknown line types stay excluded.
- [x] One SMS dispatcher cron active (acquisition-queue-worker); all legacy senders inactive.
- [x] Telemetry: otp_requested only after send-otp success; dashboard excludes QA/test SMS and quotes.
- [ ] BLOCKED (auth): authenticated Stripe TEST E2E — needs a non-admin QA account signed into the preview.
- [ ] Controlled outreach — awaits Yan's go after E2E (17 incomplete signups, 14 Rive-Nord email-eligible; 0 SMS-eligible).

- [ ] P0 Réconcilier contractor_prospects ↔ verified_contractor_prospects (dédup téléphone/courriel/domaine/nom) — avant tout nouveau lot
- [ ] Lot SMS V1 nouveaux prospects — bloqué : 0 mobile confirmé + 0 preuve CASL SMS (décision Yan : source avec type de ligne ou Lookup plafonné)
- [ ] Courriel Maple Wood Painting — attend « Envoie Maple Wood » entre 9 h et 17 h

- [x] Activation 350 $ (paiement unique) sur le plan personnalisé + activation par webhook idempotent — fonctions déployées
- [ ] 350 $ : parcours payé en TEST avec le compte QA (connexion requise dans l'aperçu)
- [ ] 350 $ : volume 5/10/20 sans double facturation + consentement d'abonnement explicite
- [ ] 350 $ : 12 mois de Présence IA reliés aux droits (consignés au registre, pas encore aux accès)
- [ ] Tableau de pilotage « premiers 350 $ » (événements réels)
- [ ] Prospection Laval/Terrebonne/Rive-Nord — reste OFF jusqu'à preuve CASL + feu vert de Yan
- [ ] Backlog préservé : affiliés 20 %/5 %, capacité ville/métier, RBQ/CMMTQ/CMEQ, calendrier, Clara voix/mémoire, soumissions, Plus/Gold, SEO/AEO, partenariats, knowledge graph
- [x] Compteur d’impact accueil + /impact : scénario type transparent avec hypothèses serveur existantes, sans total mondial ni gains UNPRO attribués; cadrans animés, dollars en consolidation.

## Backlog — Affiliation RBQ « entreprise titulaire » (art. 46 B-1.1)
- [ ] Invitation sécurisée expirable au responsable autorisé de l'entreprise titulaire (identité, autorité, fonctions, période, révocation, audit).
- [ ] Vérification registre RBQ de l'employeur (active, sous-catégories, nom/NEQ concordants) + règles CCQ/CMEQ/CMMTQ.
- [ ] Statut EMPLOYER_AFFILIATION_VERIFIED, affichage « Membre autorisé de [société] », contrat/paiement au nom de la société titulaire.
- [ ] Écran admin d'examen des déclarations RBQ (exemption, incertain, autre, employeur, indépendant).
- [x] Stripe authenticated LIVE read confirms enabled endpoint and all eight events at 2026-10-17 20:48 UTC; delivery and full authenticated E2E remain unverified.

## P0 — five concrete alerts, local-only repair
- [x] Address ownership/origins and three visitor forms tested locally with simulated responses. Real Google remains unverified; authorized-origin validation and later deployment require approval.
- [x] Canonical bounded home history and contractor/homeowner transition; four viewport browser flows with simulated services passed.
- [x] RBQ whole-token FR/EN regression coverage; no new verified licence or entitlement.
- [x] Four active text/vision extraction sites migrated from catalog-deprecated 2.5 Flash to supported lower-token-price 3.1 Flash Lite; protocol mocks passed.
- [ ] Remaining deprecated image/voice/other models: protocol, cost and actual deployed activity must be verified before replacement; no paid probe authorized.
- [x] Focused tests (90), lint (zero errors; two preexisting warnings), automatic build OK, intercepted mobile browser and audit. No hosted E2E or manual build/typecheck claimed.
