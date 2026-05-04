## Problem

The OTP verification fails with "Erreur. Réessayez." Edge function logs show two bugs in `supabase/functions/verify-otp/index.ts`:

1. **`sb.auth.admin.updateUser is not a function`** — wrong API. Must be `sb.auth.admin.updateUserById(user.id, {...})`.
2. **`A user with this email address has already been registered`** — the phone lookup `u.phone === phone` fails because Supabase stores `phone` without the `+` (e.g. `15142499522`), but we compare to `+15142499522`. So existing users aren't found and `createUser` re-attempts with the same synthetic email → conflict.

## Fix

In `supabase/functions/verify-otp/index.ts`:

1. Match user by normalizing both sides:
   ```ts
   const phoneDigits = phone.replace(/\D/g, "");
   let user = list?.users?.find((u) => (u.phone || "").replace(/\D/g, "") === phoneDigits);
   ```
   Add a fallback lookup by synthetic email if not found by phone.

2. Replace both `sb.auth.admin.updateUser(user.id, {...})` calls with `sb.auth.admin.updateUserById(user.id, {...})`.

3. If `createUser` returns `email_exists`, recover by fetching the existing user via `listUsers` filtered by email and continuing the flow instead of failing.

After deploy, OTP verification will mint a session correctly for both new and returning numbers.
