# UNPRO — Clara SMS pilot, 2026-11-20

## Intent
A homeowner texts their most difficult renovation question to +1 450 328-6776.
Clara responds in French-Québec (or English) with one relevant question at a time.
Not a contractor marketing campaign, shared-lead program, or booking guarantee.

## Reuse, not rebuild
- twilio-inbound stays the signed inbound webhook and preserves STOP/HELP, contractor replies, and pre-existing logging.
- Reuses sms_messages (unique message_sid, direction/intent/phone), sms_events_v2 and canonical _shared/twilioSend.ts.
- Worker clara-sms calls OpenAI API directly; no Lovable AI gateway.
- No new DB table, public route, UI, Twilio number, automation or CRM.

## Safe rollout
DEFAULT OFF. No messages go out based on this branch alone.
1. Establish authorized write access to production backend clmaqdnphbndvmmqvpff (not unrelated connected Supabase projects).
2. Read-only confirm Twilio number ownership/capability, incoming SMS webhook points to twilio-inbound, and delivery status callbacks. Confirm provider policy eligibility for this first-party user-initiated renovation assistance use case.
3. Supply backend secrets OPENAI_API_KEY (separately billed API), CLARA_SMS_PILOT_ALLOWLIST (comma-separated consenting E.164 testers), CLARA_SMS_ENABLED=true only after approved pilot. Keep Twilio token and service role key server-only.
4. Deploy clara-sms (JWT required) and minimal twilio-inbound/sender updates without publishing site or enabling outreach.
5. Test one genuine inbound, one verified delivery SID, continuation, webhook replay deduplication, STOP, invalid signature, missing key and provider errors.
6. Keep pilot allowlist and rate limit (8 replies/number/day). Broaden only after explicit authorization, provider policy review and proven pilot.

## Security and privacy
- twilio-inbound verifies signed Twilio webhook before dispatch.
- clara-sms requires service-role token, explicit launch flag and sender allowlist.
- Existing SMS suppression and delivery audit remain via sendSms.
- Inbound SMS only: no autonomous follow-up, contractor contact, Stripe checkout or third-party data sharing.
- SMS history is stored in the existing SMS table. Confirm retention and access policies before public release.
- Phone ownership does not establish identity; never infer verified properties or contractor credentials.
- Canada SMS provider policy excludes certain third-party lead-generation uses.

## Test commands
npx vitest run src/test/twilio-inbound-help.test.ts src/test/clara-sms-pilot.test.ts

Tests are synthetic. A successful test is not live provider delivery.

## Known blocker
Currently connected Supabase lists other projects and denies access to production clmaqdnphbndvmmqvpff. This branch is not deployed and no production SMS test, secret setup or public release is asserted.
