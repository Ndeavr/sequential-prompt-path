## Fix critical security findings

The latest scan flags **7 error-level vulnerabilities** exposing PII to anonymous or all-authenticated users. Plan: one consolidated migration that locks down each table/bucket to the legitimate owner or admins.

### Findings to fix

| # | Resource | Current risk | Fix |
|---|----------|--------------|-----|
| 1 | `public.contractor_import_sessions` | Public SELECT exposes email, phone, RBQ, NEQ, business name | Replace open SELECT with `initiated_by_user_id = auth.uid() OR has_role(auth.uid(),'admin')` |
| 2 | `public.audit_intake_sessions` | Public SELECT exposes prospect email, phone, RBQ, website | Restrict SELECT to admin; allow row owner via `session_token` header match (server-side function) |
| 3 | `public.condo_waitlist_leads` | Public SELECT exposes name/email/phone | Restrict SELECT to admins only (writes stay public via existing INSERT policy) |
| 4 | `public.alex_homeowner_recovery_queue` | Public SELECT exposes recovery PII (phone NOT NULL) | Restrict SELECT to admins only |
| 5 | `public.contractor_import_followups` | Open ALL policy for anon+authenticated | Drop open policy; add owner-scoped policies via join to `contractor_import_sessions.initiated_by_user_id` + admin override |
| 6 | `public.profile_missing_fields` | Authenticated ALL `true` lets anyone read/modify others' gaps | Scope to contractor owner via join to `contractors.user_id` + admin override |
| 7 | Storage bucket `business-assets` | SELECT only checks bucket_id, not folder ownership | Add `(auth.uid())::text = (storage.foldername(name))[1]` to SELECT policy (matches contractor-documents pattern) |

### Out of scope (reserved schema)

- `realtime.messages` finding — project rules forbid modifying the `realtime` schema. Will flag this for the user to address via Lovable Cloud subscription scoping in app code separately.

### Implementation

Single migration that, per table:
1. `DROP POLICY` on existing permissive policy
2. `CREATE POLICY` scoped via `auth.uid()` + `has_role(auth.uid(),'admin')`
3. Keep existing INSERT/UPDATE policies untouched unless they are the same offending one
4. Storage: drop and recreate the SELECT policy on `storage.objects` for `business-assets`

After approval and migration run, mark the 7 findings as fixed via `manage_security_finding`, then update `mem://security/access-control-standards` if needed.

### Verification

- Re-run `security--run_security_scan` to confirm error count drops to 0
- Spot-check each table with anon + authenticated session to confirm no rows leak

Confirm and I'll execute the migration.