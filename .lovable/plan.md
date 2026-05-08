## Problem

The "Launch Campaign" button fails with `Failed to send a request to the Edge Function`. The `campaign-launch` edge function logs show:

```
TypeError: supabase.auth.getClaims is not a function
```

`getClaims()` does not exist on `@supabase/supabase-js@2.49.1`. The function crashes before any work happens, returning a non-2xx the client surfaces as a generic FunctionsFetchError.

## Fix

Replace the broken auth check in `supabase/functions/campaign-launch/index.ts` with the standard pattern used elsewhere in the project: build a second Supabase client bound to the caller's JWT, call `auth.getUser()`, then `has_role(user.id, 'admin')`.

Pseudocode:
```ts
const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: auth } }
});
const { data: { user } } = await userClient.auth.getUser();
if (!user) return 401;
const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
if (!isAdmin) return 403;
```

Also:
- Ensure error responses include `Content-Type: application/json` consistently (a few branches omit it).
- Add a small log line on entry + on each branch result for diagnostics in `/admin/campaign-logs`.

## Verification

1. Redeploy `campaign-launch`.
2. From `/admin/campaign-center`, press "Launch Campaign" — should return `{ inserted, skipped }` and rows appear in `campaign_contacts`.
3. Confirm no more `getClaims` errors in edge function logs.

## Files

- `supabase/functions/campaign-launch/index.ts` — fix auth verification.
