# Targeted no-match recruitment — preview and unreleased containment

## Objective and delivered journey
Reuse the existing no-match UI, demand landing, contractor Clara and one-time activation checkout. No new table, agent, cron, pricing, supplier, outreach or public release.

The preview normalizes capage / architectural sheet metal / aluminium folding / column cladding to `capage_colonnes_exterieures`, not ventilation. The no-match page no longer writes a case simply because a URL was opened. Its follow-up form requires explicit consent and phone OR email; the client requires a project anchor and an authenticated session, and checks persistence responses before showing confirmation.

The existing `/pro/demande/:city/:category` now passes validated city/category to the GET resolver, without direct-table fallback or double decoding. It does not publish unverified counts, revenue or guaranteed appointments. It renders the existing contractor Clara with a scope-specific opening and links to the existing voluntary activation checkout, retaining attribution. The personalized option uses the existing intake's `ville` / `metier` parameters.

The admin action opens candidate review, never claims outreach was launched; target-save failure is explicit. The four existing sheet-metal prospects were not read, reimported, qualified or contacted.

## Server changes NOT deployed
`server.patch` contains localized replacements for four existing handlers. Companion `.ts` files are proposed handler versions, outside the active Edge directories (not additional endpoints).

- `alex-no-match-handle`: verified user/project ownership and persisted consented demand required; server-derived user/service/city; read-before-insert reuse; stats/retry admin/service-only; retry returns 409/zero matches instead of selecting generic active contractors; no notification or retry-job insertion.
- `demand-signal-create`: authentication then 409 containment before any demand write. A safe complete trigger is NOT claimed.
- `outreach-demand-injector`: admin/service guard, then review-required/zero queued; no aggregate-derived invitation or status mutation.
- `recruitment-landing-resolver`: validates bounds; public service/territory only, no PII, financial projections or unverified demand counts.

Auth reuses the canonical server guard. No direct active Edge edit: Lovable-managed Edge writes auto-deploy, which conflicts with this request's explicit no-deployment limit.

## Verified findings preventing complete recruitment
Read-only hosted metadata confirms `projects.user_id` and `projects.matching_status`. Existing `demand_signals` has project_id uniqueness, metadata, notify_channels and homeowner_id. Existing signal triggers already create recruitment targets, so no parallel funnel is needed.

However the hosted `fn_match_waiting_demand` updates signals to matched based only on service-area/category joins: no RBQ validity, verified public status, capacity or availability. `fn_refresh_market_demand` similarly counts generic supply. Direct authenticated demand INSERT is also permitted by current RLS without a persisted-confirmation/consent guard; no-match/waitlist permit public INSERT. Editing only four endpoints cannot secure these parallel database paths. No policy or SQL change was applied, and no migration was invented to bypass these findings.

Needed for a complete real-demand trigger: a reviewed atomic ownership/consent/no-match transaction coordinating existing demand/case/waitlist writes and the existing trigger, with a verified matching result rather than client-declared no-match. Read-before-insert waitlist dedupe is not concurrency-safe without this transaction. Follow-up consent is NOT outreach CASL consent. No human legal review, delivery, payment or entitlement is fabricated.

## Checks actually run
- Source verification script passed on initial HEAD `ef073c3db5d010be724f3bae4d7639c64c6384a0`.
- `bunx vitest run src/test/no-match-recruitment.test.ts src/test/activation-350-links.test.ts src/test/affiliate-proposal-server.test.ts`: 38/38 passed (26 new no-match rules/handler tests, 7 attribution/activation, 5 existing proposal/payment refusals).
- Handler tests execute proposed source with synthetic IO; no hosted QA identities or real writes. They cover consent denial, missing project, auth/admin denial, no generic match/notification, existing-demand waitlist save/reuse, persistence failure, blocked injection/outreach and public resolver projection. This is not production transaction or concurrency evidence.
- Playwright 390 px: actual preview landing DOM, precise resolver query, no false count/guarantee, no horizontal overflow, activation CTA preserving `ref=QA-REF`, existing activation content loaded, no JS errors. Resolver response intercepted and all remote mutations blocked. Screenshots under `/tmp/browser/no-match/`; Clara resume error in screenshot is the deliberately blocked remote service, not a verified live conversation.
- Automatic preview build log: build OK after edits. Standalone typecheck/build not manually run per environment rules.

## Unverified / excluded
Real consented project → persisted target → 3–5 contextual Clara questions → saved profile → eligible original project is not completed or claimed. No hosted authenticated save/reload, cross-owner transaction, complete Clara dialogue, Stripe TEST checkout or paid activation was exercised. No notification, SMS/email, production fixture, CASL approval, paid lookup, data removal, migration, deployment or publication.

Credit consumption was not measured; no numeric credit total is claimed. Skill shaping the work: UNPRO Operating System.