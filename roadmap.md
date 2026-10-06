# Roadmap — P0 contractor acquisition golden path

- [x] Paid number check OFF again (PAID_LOOKUP_ENABLED=false, TWILIO_LOOKUP_ENABLED=0).
- [x] OUTREACH_ENABLED=false kept during repair.
- [x] Hard CASL gate in canonical sender matches stored 10-digit evidence; unknown line types stay excluded.
- [x] One SMS dispatcher cron active (acquisition-queue-worker); all legacy senders inactive.
- [x] Telemetry: otp_requested only after send-otp success; dashboard excludes QA/test SMS and quotes.
- [ ] BLOCKED (auth): authenticated Stripe TEST E2E — needs a non-admin QA account signed into the preview.
- [ ] Controlled outreach — awaits Yan's go after E2E (17 incomplete signups, 14 Rive-Nord email-eligible; 0 SMS-eligible).
