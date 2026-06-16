# Fix SMS Health edge functions 500 error

## Root cause
Both `sms-admin-test` and `sms-infrastructure-audit` call `supabase.auth.getClaims(token)`, which does not exist in `@supabase/supabase-js@2.49.1` (the version pinned project-wide per the Edge Functions Runtime rule). The call throws synchronously, the `catch` returns 500, and the UI surfaces "Edge Function returned a non-2xx status code".

Verified by direct curl:
```
500 {"error":"supabase.auth.getClaims is not a function"}
```

## Fix
Replace the `getClaims` block in both files with the standard `auth.getUser(token)` pattern already used everywhere else in the codebase:

```ts
const { data: { user } } = await supabase.auth.getUser(token);
const uid = user?.id;
if (!uid) return json({ error: "unauthorized" }, 401);
```

Files touched:
- `supabase/functions/sms-admin-test/index.ts`
- `supabase/functions/sms-infrastructure-audit/index.ts`

Then redeploy both functions and re-run the "Envoyer un SMS de test" + "Réauditer" buttons on `/admin/sms-health` to confirm the autodiagnostic loads and the test E2E pipeline (queued → sent → delivered) executes.

No schema, UI, or shared-library changes required.
