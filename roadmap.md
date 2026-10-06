# Roadmap — P0 automated contractor acquisition

- [x] Number check switched on (PAID_LOOKUP_ENABLED, TWILIO_LOOKUP_ENABLED).
- [ ] BLOCKED (Twilio): Line Type Intelligence returns error 60601 — must be activated in the Twilio console before any number can be confirmed mobile.
- [x] Hard CASL gate in canonical sender (evidence + source + timestamp, opt-outs via smsGuard).
- [ ] BLOCKED: end-to-end SMS test — admin session could not be minted (needs Yan signed in to the preview once).
- [ ] Turn OUTREACH_ENABLED on — only after the end-to-end test passes (rule 9).
- [ ] Follow-up crons (no click / unfinished / checkout) — enable with the switch; they go through the same gate.
- [x] Dashboard /admin/acquisition-funnel (activations today on top, funnel today + 7 days).
