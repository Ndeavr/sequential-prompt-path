# Revenue Reality — smoke test

1. Sign in as an admin.
2. Open `/admin/revenue-reality`.
3. Confirm the funnel table renders with real 24h counts + "0 en 24 h" chips wherever a stage is dead.
4. Confirm the "Pourquoi le pipeline est bloqué" panel surfaces the top production blockers grouped by (agent, event, message). Expected top line right now:
   > `launch-agent-scout · blocked · google_places: REQUEST_DENIED: The provided API key is invalid.`
5. Toggle **Dry-run** ON, click "Simuler 25 SMS". Response JSON must contain 25 attempts with `dry_run: true` and no writes to `acq_sms_logs`.
6. Add the secret `GOOGLE_PLACES_API_KEY` with a valid key (via admin secrets tool). Within ~1 minute the scout blocker disappears from the panel.
7. Toggle **Dry-run** OFF, click "Envoyer 25 SMS RÉELS".
   - Expected: first attempt targets `+15142499522`, `acq_sms_logs` row count increases by up to 25, and each row has a Twilio SID or an explicit error.
   - The funnel row "SMS sent" flips from 0 to a real number on the next 30 s refresh.
8. Click one of the SMS links from the phone that received the test.
   - Expected: `click_events` +1 → visible on cockpit within 30 s.
