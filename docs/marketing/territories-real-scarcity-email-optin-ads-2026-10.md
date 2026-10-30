# UNPRO — Real territory capacity + voluntary email/ads (27 October 2026)

STATUS: read-only production audit + marketing drafts. Nothing live, no email sent, no media spending, no payment. Target: 3,000 unique verified CAD350 paying pros by Dec 31 2026. Never invent appointment entitlement in the base CAD350 12-month profile offer.

## 1. No authenticated remaining-spots numbers yet

Production observations 27 Oct 2026, backend clmaqdnphbndvmmqvpff:
- market_capacity: 179 rows, all last updated Aug 16, zero actual monthly demand, zero active pros; nonetheless all have remaining_positions positive. NOT a source for scarcity.
- acq_territory_slots: 6 configured rows: Laval isolation 3/0, plumbing 6/0, roofing 3/0; Montreal isolation 5/0, plumbing 8/0, roofing 5/0. Last updated May/Aug, not tied to delivered appointments or settled payments. NOT publishable availability.
- recruitment_capacity_targets: 9 rows last recalculated April 15, some claim paid/full without new Stripe LIVE reconciliation. NOT publishable availability.
- market_capacity_commitments: 0 rows.
- appointments: 8 total (3 archived_test, 3 requested, 2 confirmed), only 1 non-test created in last 30 days, zero completed.
- projects: 0.
- Verified-prospect records are NOT committed contractors or paid customers.

ANSWER: no city-by-trade maximum or spots remaining can currently be certified from these tables. It would be misleading to say “2 spots left”, “region full”, “join the waitlist” or to aggregate old placeholders toward the 3,000 payer goal. Unknown availability is not zero and not unlimited.

Crucial distinction: the $350 activation is a business profile/12-month UNPRO presence, without included guaranteed appointments. Its enrollment need not be territorially capped. ONLY a distinct exclusive-appointment offer may have finite availability if actual demand, signed commitments, and operational limits justify it. A real human-validation throughput limit can be shared only if measured and enforced.

### Defensible exclusive-appointment capacity formula

Evaluate each trade x verified service area x rolling 30-day window, not city alone. Service-area overlaps require a single commitment allocation to avoid selling the same homeowner appointment twice.

Q = unique qualified homeowner appointment demand per period, excluding bots/test/duplicates.
D = distinct completed EXCLUSIVE appointments in the same area/trade, excluding test/cancelled.
r = conservative deliverable share observed from verified homeowner-to-completed funnel, NOT assumed.
m = minimum monthly completed appointment obligation per partner under the separate appointment offer.
c = genuine UNPRO qualification/booking operations capacity if verified.
p = already reserved active contractor capacity, deduplicated with verified booking/contract/payment state.

Cmax = max(0, min(c, floor(min(Q*r,D)/m))).
Remaining = max(0,Cmax-p).

No public numeric display unless Q,D,r,m,c,p and source dates are available, current (30 days), signed/traceable, company/territory-specific and allocated atomically. Otherwise show “Disponibilité des jumelages exclusifs en validation — commencer mon analyse sans paiement.” Do not block the base profile purchase.

FICTIONAL explanation only (never an ad): Q40, r75%, D24 completed, m4, c10, p3 -> Cmax6 and hypothetical 3 positions. These values do NOT describe any current UNPRO territory.

### Honest FOMO templates (conditional only)

When REAL verified availability exists:
- “Il reste {N} positions de jumelage exclusif pour {métier} à {territoire}, mise à jour le {date}.”
- Only when complete: “La capacité des rendez-vous exclusifs est atteinte dans ce secteur. Votre profil UNPRO demeure accessible; vous pouvez demander un avis lorsqu'une position se libère.”
- Only if actual waitlist entries counted with consent: “{N} professionnels ont demandé un avis de réouverture.”
Never say “Votre entreprise sera sur une liste d'attente” just to pressure someone, or count prospect rows as paid/reserved partners. No countdown unless a genuine, enforceable offer deadline exists. UNPRO internal Dec31 goal is NOT an advertised sale end date.

When capacity unverified, use non-scarcity urgency: “Choisissez les secteurs que vous voulez couvrir dès maintenant. Une analyse de départ est disponible sans paiement.”

## 2. Email: reachable addresses are not a marketing list

Production read-only counts:
- contractor_prospects: 955 records, 77 emails, 43 untouched non-DNC with email.
- verified_contractor_prospects: 1,188 records, 568 emails; 141 email_eligible flags. Flags do not independently constitute current CASL consent.
- email CASL evidence: 5 rows total: 2 reviewed from company website, 3 government registry not reviewed. These do NOT mean 5 confirmed eligible commercial sends without fresh relevance/refusal/suppression checks.

Use the EXISTING Resend CRM sender, proof records and suppression logic; DO NOT mass-email scraped 568 addresses. For each actual message require justified express/implied consent under CASL, company ID/address/contact, functional unsubscribe, relevant business role and source evidence, current no-refusal / STOP state and logging.

EMAIL A, only after authorization:
Subject: {entreprise} : quels contrats voulez-vous vraiment?
Bonjour {prénom}, avec UNPRO, précisez les services, territoires et mandats qui vous conviennent. Commencez par analyser votre entreprise sans paiement : {lien}. L'activation à 350 $ + taxes est présentée avant toute transaction. UNPRO — {signature et adresse valides} — {désabonnement}.

EMAIL B, only after authorization:
Subject: Des demandes hors secteur pour {entreprise}?
Bonjour {prénom}, trop de soumissions pour des travaux que vous ne faites pas ou des clients trop loin? Définissez vos clients idéaux avec Clara : {lien}. UNPRO — {signature valide} — {désabonnement}.

NEVER say a personal analysis is ready if no real completed analysis exists.

## 3. Paid ads where the professional voluntarily requests the link

### Preferred route A: instant value (no email required)
Meta or Google ad -> canonical UNPRO contractor/join landing -> visitor identifies company by site/business/NEQ/RBQ as relevant -> real company preview -> Clara asks needed preferences one at a time -> present base CAD350 offer + applicable taxes BEFORE optional Stripe checkout. Direct landing is easier to audit and avoids deliverability/spam friction.

### Route B: requested-link form, one-response relationship
Meta Ads “Leads > Instant Forms > Higher Intent” (review screen) or eligible Google Ads Lead Form asset -> company name/site, first name and email requested -> user clicks “Envoyez-moi mon lien d'analyse” -> signed provider form webhook or supported CRM connector -> dedupe and store source campaign/ad/form/submission ID, exact consent and request text, timestamp and privacy notice version -> ONE requested link email via existing verified sender -> analysis/Clara/optional activation. No checkout automatically.

Add a separate UNCHECKED checkbox for ongoing commercial communications:
“J'accepte aussi de recevoir par courriel les conseils, nouvelles et offres d'UNPRO. Je pourrai me désabonner en tout temps.”
No checkbox = the requested link only (subject to lawful response-to-request rules), not a follow-up marketing flow.
Separate optional phone channel and separate SMS marketing opt-in; do not assume email request authorizes recurring SMS. No prechecked forms, no purchased lead list, no retargeting contrary to privacy settings.
Privacy policy link is required for Google Ads lead forms; confirm Meta account and form eligibility. Meta's own Lead Generation Guide supports instant forms, Higher Intent, CRM ingestion and Conversions API. Google lead assets support direct CSV/webhook/API CRM routing.

Read current in-app schemas BEFORE adding any CRM tables. Reuse contractor join, attribution, logged funnel events, CASL evidence, consent, opt-out, and payment verification. Require provider webhook signing, replay/idempotency guard and no other-user record access. DO NOT launch without approved budget and verified policy page.

### French-Québec ad creative (two first variants)
A: “Choisissez les contrats que vous voulez.” — “Spécialités, territoires, mandats : dites à Clara ce que vous recherchez. Découvrez comment UNPRO peut présenter votre entreprise. Commencez sans paiement.” CTA “Analyser mon entreprise” (site) or “Recevoir mon lien d'analyse” (form).
B: “Tanné des leads qui mènent nulle part?” — “Trop loin, hors spécialité, soumissions inutiles? Dites à Clara quels mandats valent votre temps. Découvrez UNPRO, sans paiement pour commencer.” CTA “Obtenir mon lien”.
Professional-services sector: “Votre expertise mérite mieux qu'une liste de noms.” — “Courtiers, notaires, inspecteurs, gestionnaires et géomètres : présentez vos mandats, votre territoire et vos champs de pratique. Découvrez UNPRO.”

Form confirmation:
“Vous demandez le lien pour commencer votre analyse UNPRO, sans paiement. Aucun abonnement marketing n'est déclenché sauf consentement distinct et explicite.”

## 4. A/B decision and spend
Test direct site landing (A) vs Higher Intent requested-link form (B) for the SAME trade/area and comparable creatives/approved budget. Primary outcome: UNIQUE verified paying CAD350 contractors per dollar invested. Secondary: qualified link requests, delivered requested emails, started/completed analyses, registration, signed LIVE Stripe payment+entitlement, refunds, complaints. Remove tests/QA/bots and dedupe businesses. Do not declare winner based on lowest CPL or most form submissions.
CAC ceiling is NOT known: CAD350 pretax minus verified fulfillment cost, Stripe fee, commissions, refund reserve and required contribution margin. No ads or budgets launched until user explicitly authorizes financial spend; no promise of sales volume.

**Official references:** CRTC CASL FAQ https://crtc.gc.ca/eng/com500/faq500.htm ; CRTC implied consent https://crtc.gc.ca/eng/com500/guide.htm ; ISED guide https://ised-isde.canada.ca/site/canada-anti-spam-legislation/en/getting-consent-send-email ; Quebec CAI Law25 collection https://www.cai.gouv.qc.ca/protection-renseignements-personnels/information-entreprises-privees/collecte-renseignements-personnels_entreprises ; Meta guide https://about.fb.com/ltam/wp-content/uploads/sites/14/2023/11/LeadGenerationGuide.pdf ; Google Ads https://support.google.com/google-ads/answer/9423234 and policy https://support.google.com/adspolicy/answer/9472930 .

## 5. GitHub-first rollout with minimal Lovable credits

P0: source fix stops old frontend promises of default “3 places” when market row is missing; no FOMO until fresh verified demand/commitments (PR separate).
P0: keep basic 350 profile open regardless of exclusive appointment availability.
P1: create opt-in-to-link attribution/CRM protocol with explicit future marketing checkbox; verify provider signatures and no duplicates before sending real emails.
P1: link webhook signed settled Stripe CAD350 to acquisition campaign, one company, 12-month entitlements. Publish no fabricated conversion counts.
P1: launch ONE A/B only after consent/webhook and financial approval.
P2: compute weekly real capacity from completed exclusive appointment ledger + active commitments + delivery rate; only then permit area/trade specific waiting list and numbers.

CURRENT STATUS: Data audited, strategy and copy written; capacity claims NOT VERIFIED; Meta/Google forms NOT CONFIGURED; email campaigns NOT SENT; no budget approved; no appointments or scarcity sold through this plan.


## 6. Intake technical acceptance inventory (source inspection, 28 October 2026)

**Observed at GitHub source commit \`1979b13ace5d\`; not deployed/tested-provider evidence.** This section translates Route B into a future implementation checklist, without activating a campaign or implying that a provider webhook already exists.

- **Existing first-party flow:** \`src/features/aiVisibilityLanding/AiVisibilityLeadForm.tsx\` invokes \`visibilite-ia-lead\` using the visitor's explicit request. \`supabase/functions/visibilite-ia-lead/index.ts\` validates the form server-side, normalizes Canadian phone to E.164, checks \`leads\` for a same-source/phone row in the prior 24 hours, then inserts one canonical \`leads\` row with \`intent=ai_visibility_audit\`. Its optional Resend email goes **to an internal administrator**, not the requesting lead. Existing UTM fields are visitor-supplied attribution clues, **not authenticated provider identity** or proof of advertising spend.
- **Existing privacy boundary:** PR #100 removed the phone from the successful \`contractor_funnel_events\` analytics event, but the canonical CRM stores phone, contact name, company, full submitted attribution, plus currently \`x-forwarded-for\` and user agent. The contact notice states a one-request purpose only. Revisit necessity/retention/access restrictions for IP and user agent before any external-form import; do not copy this PII into generic analytics.
- **Verified concurrency gap (read-only schema, 29 October):** the 24-hour first-party check is **read-then-insert**, so parallel requests can race. `public.leads` has a UUID primary-key unique index but **no additional unique index** for provider submission IDs, phone/source or request-level idempotency. This is verified metadata, not a claim that duplicates already occurred. No atomic RPC was proven. Do not apply any index/migration/function to production without separate reviewed authorization.
- **Not yet supported:** a Meta/Google-originated signed webhook, provider submission-ID ledger, provider replay protection, provider form consent-version capture, and requested-link sender are **not demonstrated by the inspected first-party function**. A UTM parameter or client-supplied campaign ID must not be accepted as a signature.

### Acceptance before a provider lead-form integration is implemented or activated

1. Verify the exact provider's official signature/authentication and challenge requirements at implementation time. Reject absent/invalid signatures and unauthorized form or account IDs **before** canonical CRM writes; verify timestamp/replay window where provider supports it. Store only non-secret identifiers and minimal signature-verification evidence.
2. Use the existing canonical CRM and attribution primitives. For a **signed** callback, deduplicate atomically by provider + account/form + provider-submission ID, and separately reconcile business identity and E.164 conflicts. Repeat delivery returns the same outcome; concurrent deliveries create **at most one** qualified request. Prove this in isolated parallel synthetic tests.
3. Preserve the original user's **single requested-link response** purpose, exact form text/notice version, timestamp, contact channel and separate opt-in status. An unchecked marketing checkbox means **no recurring commercial messages**, no SMS, no inferred consent and no automatic CASL \`reviewer_id\`. Validate STOP and withdrawal before any authorized future send.
4. One signed request may trigger **at most one** solicited analysis-link response through the existing approved sender after explicit launch authorization and idempotent email dispatch; retries must not send again. No provider webhook or lead request may grant a Stripe-paid entitlement, a recommendation badge or an exclusive appointment.
5. Exclude phone/email/IP/raw request bodies/secrets from application and CI logs, funnel events and error telemetry. Enforce least-privilege reads and current privacy retention policy; make lead deletion and suppression propagate across the canonical record and any derived attribution.
6. Isolated, synthetic QA must prove invalid signature, unknown form, duplicate/replay, concurrent callback, malformed phone, existing-business conflict, non-opt-in, unsubscribe/STOP, sender failure/retry, RLS denial and complete funnel attribution **before** any external registration, sending, flag change or publication. Revalidate current HEAD, P0 #86 and legal/privacy gates at that time.

**Status at this inspection:** first-party form source inspected; external signed webhook **not implemented/verified** by this review; atomic duplicate guarantee **not proven**; none of the above QA/deployment/campaign steps performed. Retain the existing inactive commercial and outreach gates.

## 7. Read-only intake and conversion audit (29 October 2026; GitHub `d472dd2b`)

**Evidence, not a launch:** the deployed revision of Edge functions is not verified. The public first-party UI at `src/features/aiVisibilityLanding/AiVisibilityLeadForm.tsx` asks for company, contact, phone, website (optional) and trade, invokes `visibilite-ia-lead`, and displays a success message promising later human contact. It **does not** create a contractor registration, automatically send the requested self-serve analysis link to the visitor, or show an immediate continuation into Clara from that success state. The server stores `leads` with `lead_type='contractor'`, `intent='ai_visibility_audit'`, service in `specialty_needed`, and user details/UTMs under `payload`. Optional Resend notification targets the **internal admin**, not the submitted contact. This route is therefore **a manual-response intake, not yet a high-volume automated conversion path**.

**Live read-only baseline (27 October 00:00 EDT onward):** Lovable analytics returned **179 visitors / 232 pageviews** (not verified eligible businesses); `contractor_funnel_events` contained **55 non-test/non-internal events in 24 distinct sessions**, 0 linked companies, 0 signup events and 0 checkout events, with 100% sessions **unattributed**; `contractors` had **0 newly created rows** and `leads` had **0 new contractor-type rows** in the same period. Seven existing billing/webhook/entitlement tables had **0 new rows** in this window. The Stripe LIVE PaymentIntent inventory had 91 total, **three CAD1 successes and zero CAD350 successes**. None of these observations replaces the required signed-webhook + legal-business + 12-month entitlement proof; absent or unlinked event data cannot be treated as a verified channel conversion.

**Reuse plan, not implemented:** Prioritize direct-site, voluntary self-serve analysis once the P0 payment and access gates are proven. For a future Meta/Google lead-form route, reuse `leads`, existing `contractor_funnel_events`, verified sender, STOP/suppression and human CASL review; do not invent new prospect identities or providers. After provider-specific signature and authorized form/account checks on the raw signed payload, store a minimal canonical request in `leads.payload` with verified provider/account/form/submission IDs, notice-text version, request timestamp, separate **unchecked by default** marketing opt-in and consent provenance. A client-supplied UTM never authenticates a provider. Require an **atomic** transaction/idempotency contract for the provider submission identity and separate existing-business/phone collision handling; neither `SELECT` then `INSERT` nor a client lock is sufficient. Prepare any partial unique index or service-only RPC and concurrent synthetic tests **outside production** for later explicit review; do not alter live schema or add a parallel CRM. One authorized user-requested link response is distinct from ongoing marketing permission, and no request can award paid status, appointment entitlement or human CASL signature. Keep PII and provider secrets out of analytics/logs.

**Acceptance prior to any rollout:** isolated parallel replays and rejected signatures, no duplicate CRM requests or response emails, suppression/STOP and non-opt-in tests, service-only permissions/RLS, explicit contact notice, single authenticated business after signup, successful self-serve continuation, attribution by declared vs verified channel, and verified LIVE $350 payment separately. No paid form, live email, provider setup, production migration, publication or Lovable credit expenditure occurred in this audit.
