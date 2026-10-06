# Roadmap — P0 automated contractor acquisition

- [ ] Unlock first-contact pool: 0 verified-mobile fresh prospects; 49 never-contacted numbers have unknown line type (blocked by "no paid Lookup" rule). Waiting for Yan: approve Twilio Lookup (~0.008 $/number) or keep blocked.
- [ ] Turn on OUTREACH_ENABLED + canonical sender cron (≤25/day, 09–17 Toronto). Waiting for Yan's explicit go.
- [ ] Discovery: active (unpro-acquisition-discovery-6h, enrichment 6h, worker 15m). Re-target easy categories (pools, windows, car shelters, lawn, ducts, carpet, pest).
- [ ] Follow-ups (no click / clicked not done / checkout abandoned): crons exist but are off; enable once sending is on.
- [ ] One-page acquisition dashboard: found → activated, today's numbers first.
- [ ] End-to-end test with Yan's number (+1 514-249-9522): SMS → link → prefilled onboarding → checkout (Stripe test mode) → activation.
