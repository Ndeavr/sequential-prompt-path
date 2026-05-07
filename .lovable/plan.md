A — PROMPT LOVABLE FINAL

1. CONTEXT
Build the `/cyndia` private keypad flow so the first-use PIN setup and every later unlock sends Cyndia directly into her approved partner dashboard, not onboarding, not login, not a generic role dashboard.

2. OBJECTIVE
Implement a deterministic post-PIN redirect:
`/cyndia` → PIN setup/unlock → authenticated partner session → `/partenaire/dashboard` → Cyndia call queue.

3. USERS
- Cyndia: private partner/recruiter.
- Admin: validates that Cyndia lands directly on the partner dashboard.

4. DELIVERABLES
- Update private access backend function redirect logic.
- Update frontend keypad flow to preserve the intended return path before sending the magic link.
- Update auth return routing so partner/private-slug sign-ins are never redirected to homeowner onboarding/dashboard.
- Ensure Cyndia partner record has approved status and correct partner access.
- Keep `/partenaire/dashboard` protected by PartnerGuard.

5. LOGIC
- On `/cyndia`, after 4-digit code confirmation/setup, call `private-access` unlock.
- `private-access` returns a magic link with explicit redirect target `/partenaire/dashboard` on the current app origin.
- Before navigation, store auth intent `/partenaire/dashboard` client-side as a safety net.
- When the auth session is created, AuthReturnRouter must honor `/partenaire/dashboard` even if the route is not a standard auth surface.
- If user role lookup returns no role, but the partner row exists and is approved, route to `/partenaire/dashboard` instead of `/onboarding`.
- Keep partner access based on the `partners` table approval, not localStorage.

6. DATA
- No new table required.
- Verify existing `partners` row for `cyndia@unpro.ca` is approved.
- Ensure existing private access slug points to `cyndia@unpro.ca`.
- If required, update the edge function to upsert a partner role only if the `user_roles` enum supports `partner`; otherwise rely on `partners` approval and PartnerGuard.

7. UI/UX
- Keep keypad premium and mobile-first.
- After unlock, show a short “Ouverture du tableau de bord…” state before redirect.
- Do not expose technical auth details to Cyndia.
- Do not send Cyndia to onboarding.

8. COMPONENTS
- Refactor `PagePrivateKeypad.tsx` redirect state and intent preservation.
- Keep `PartnerDashboard.tsx` as destination.
- Keep `PartnerCallQueue.tsx` displayed first on the dashboard.

9. ACTIONS
- Update `private-access` redirect URL construction.
- Update `PagePrivateKeypad.tsx` unlock handling.
- Update `AuthReturnRouter.tsx` partner/private access routing.
- Optionally update `AuthCallbackPage.tsx` if magic links pass through `/auth/callback` in the current environment.
- Test `/cyndia` first-use flow and repeat unlock flow.

10. CONSTRAINTS
- Do not weaken PartnerGuard.
- Do not use localStorage/sessionStorage as proof of partner status; use it only for return path intent.
- Do not manually edit generated Supabase client/types files.
- Do not add generic login screens.
- Keep French-first copy.
- Keep roles out of profiles.

11. SUCCESS
- Cyndia enters PIN twice on first use.
- Cyndia lands directly on `/partenaire/dashboard`.
- The dashboard shows “Mes 30 prochains appels”.
- “Générer 30 appels” works when there is no active todo list.
- Cyndia never sees homeowner onboarding after private PIN login.

12. TASKS
- Patch private access magic-link redirect.
- Patch keypad unlock loading and intent persistence.
- Patch AuthReturnRouter partner routing safety net.
- Verify PartnerGuard accepts the Cyndia approved partner row.
- Validate route on mobile viewport.