

# Plan: Fix QA Simulation — User Cannot See or Create Data

## Root Cause

Your account is not assigned the `admin` role in the database. All simulation tables have Row-Level Security policies requiring admin access (`has_role(auth.uid(), 'admin')`). Without that role, every query returns empty results and every insert is silently blocked.

**Evidence:**
- The edge function `edge-qa-simulation-executor` works correctly (tested live, returns real infrastructure checks)
- The previous successful run was created by user `cf5b80c2` who HAS the admin role
- Your current session user has no entry in `user_roles`

## Fix (1 step)

**Add your user to `user_roles` with `admin` role.**

I need to identify which `auth.users` ID corresponds to your current session. Based on the screenshots showing `vturcotte@gmail.com`, I will:

1. Look up the exact user ID for your email in `auth.users`
2. Create a migration to insert the admin role for your user
3. After that, the simulation dashboard will immediately show scenarios, allow launching runs, and display results

## Secondary Fix — Edge Function Extract Validation

The extract step currently fails in real mode because `fn-extract-business-data` returns a 400 and the response body doesn't contain the expected fields at the top level. I will update the edge function to handle the actual response format from `fn-extract-business-data` (fields may be nested differently).

## Files Changed

- 1 migration (insert admin role for your user)
- `supabase/functions/edge-qa-simulation-executor/index.ts` (fix extract response parsing)

