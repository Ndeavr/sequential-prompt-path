## Two fixes

### 1. Reject obvious fake / placeholder phones before send

The circled `514-550-1234` is a textbook placeholder — QC area code + sequential last four. Current `classifyPhone` only checks NANP + area code, so it slips through as `pending_validation` → `valid`.

Add a `blocked_pattern` check to `supabase/functions/_shared/phoneValidation.ts` inside `classifyPhone`, before returning `pending_validation`. Blocks on the E.164 digits:

- **Sequential last 4**: `1234`, `2345`, `3456`, `4567`, `5678`, `6789`, `0123`
- **Repeating last 4**: `0000`, `1111`, `2222`, …, `9999`
- **Repeating last 7**: any single digit repeated (e.g. `5555555`)
- **Movie/reserved 555 exchange**: NXX `555` with last-4 in `0100-0199` (`+1AAA5550100`…`+1AAA5550199`)
- **Sequential across full 7**: `1234567`, `2345678`, …
- **All-zero subscriber**: `AAA0000000`

When matched → return `{ status: "invalid_phone", reason: "blocked_pattern" }`. `blocked_pattern` already exists in `PhoneFailureReason`, and `leadValidation` already drops non-`valid_*` statuses out of the sendable bucket — so this stops the send with zero other wiring.

Add a matching client-side warning in `src/components/admin/ValidationDebugPanel.tsx` bucket "Blocked pattern" for visibility.

### 2. BCC the next 5 sends to the founder

Create a founder-mirror quota:

```
public.founder_outreach_bcc (
  id int PRIMARY KEY default 1 CHECK (id=1),  -- single-row
  remaining_email int NOT NULL DEFAULT 5,
  remaining_sms   int NOT NULL DEFAULT 5,
  bcc_email text NOT NULL DEFAULT 'yturcotte@gmail.com',
  bcc_phone text NOT NULL DEFAULT '+15142499522',
  updated_at timestamptz DEFAULT now()
)
```

GRANT to service_role only; RLS enabled, no anon/authenticated policies (admin-only via service role).

Seed one row `(1, 5, 5, …)`.

Then, in the two live senders:

- **`supabase/functions/outreach-resend-send/index.ts`** — before the Resend POST, atomically decrement `remaining_email` (`update … set remaining_email = greatest(remaining_email-1,0) where remaining_email>0 returning bcc_email`). If a row is returned, add `bcc: [bcc_email]` to the Resend payload. Log a `founder_bcc: true` tag on `email_send_log.metadata`.
- **`supabase/functions/sms-prospect-send/index.ts`** (and `send-sms-prospect` if it's the live path) — after a successful Twilio send, if `remaining_sms>0`, atomically decrement and fire a second Twilio message to `bcc_phone` with body prefixed `[UNPRO BCC → <company>] ` + the same copy. Failure of the mirror send never blocks or fails the primary.

Deploy both edge functions after edits.

### Success

- A lead with `514-550-1234` shows in the admin panel under a new "Blocked pattern" bucket and never enters the SMS/email send queue.
- The next 5 real prospect emails also arrive in `yturcotte@gmail.com`; the next 5 real prospect SMS also arrive at `514-249-9522`. After that, quotas hit 0 and mirroring stops automatically.
- No changes to templates, throttling, or the general validator/lookup pipeline.

### Out of scope

- Twilio Lookup carrier heuristics (already handled by prior migration).
- Any UI to top up the BCC quota — you can bump it later with a one-line update.
