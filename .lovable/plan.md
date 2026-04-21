

# UNPRO Auth Module — Premium Rebuild

## Summary

The auth components exist (Google OAuth, Phone OTP, Magic Link, Overlay). The main work is restructuring the `AuthOverlayPremium` flow to eliminate the role-selection-first pattern and instead show Google + SMS as primary buttons immediately. Magic link becomes a hidden secondary option. Trust microcopy, conversion tracking, and polished animations are added throughout.

---

## Technical Details

### Block 1 — Rewrite `AuthOverlayPremium.tsx`

Replace the current 4-mode flow (role → choice → login → signup) with a single streamlined screen:

**New flow:**
1. **Default view**: UNPRO logo + headline "Trouvez le bon pro. Plus vite." + two primary buttons: `Continuer avec Google` and `Recevoir un code par SMS`
2. Below buttons: trust microcopy (checkmarks for "Connexion rapide", "Aucun mot de passe", "Accès sécurisé")
3. Below trust: subtle "Autres options de connexion" text link
4. When clicked → reveals magic link form inline (no page change)
5. Pending action badge preserved as-is
6. Security footer preserved
7. Remove role selection entirely from overlay — role detection happens post-login via `AuthReturnRouter` / existing role system

**Remove:**
- `AuthMode` type (role/choice/login/signup states)
- Role grid (9 roles)
- choice mode (signup vs login buttons)
- login/signup mode split
- Apple button from primary view (keep Google only as primary OAuth)

**Keep:**
- Focus trap, scroll lock, intent saving
- Close button, backdrop
- Glass card styling

### Block 2 — Update `OAuthButtons.tsx`

Remove Apple button. Keep only Google as the single OAuth provider. Rename component to reflect single-provider usage or keep generic but render only Google.

Update styling to match spec: large button, premium shadow, subtle hover glow, tactile press effect.

### Block 3 — Polish `PhoneOtpForm.tsx`

Already well-built. Minor enhancements:
- Add success animation (checkmark with scale) after verification
- Ensure auto-focus works on mount for both steps

### Block 4 — Analytics Tracking

Add event tracking via a lightweight `trackAuthEvent(event: string, props?: Record<string, unknown>)` helper that logs to `sniper_engagement_events` or console in dev:

Events: `auth_method_selected`, `google_success`, `sms_sent`, `sms_success`, `magic_link_selected`, `dropoff_step`

Wire into overlay buttons and form submissions.

### Block 5 — Post-Login Profile Update

After successful auth (in `AuthReturnRouter` or a new `usePostAuthProfile` hook):
- Upsert `profiles` row with `auth_provider`, `last_login_at`
- Extract `first_name`, `last_name`, `email` from session user metadata
- Extract `phone` if SMS auth was used
- Only update fields that are currently null (don't overwrite human-validated data per memory rules)

### Block 6 — User Type Detection

After first login with no existing role:
- Show a minimal inline question in the overlay before closing: "Comment utiliserez-vous UNPRO?"
- Three options: "J'ai besoin d'un pro" (homeowner), "Je suis entrepreneur" (contractor), "Autre" (default)
- Insert selected role into `user_roles` table
- Then route via existing `getDefaultRedirectForRole()`

---

## Files Created/Modified

| Action | File |
|---|---|
| Rewrite | `src/components/auth/AuthOverlayPremium.tsx` |
| Modify | `src/components/auth/OAuthButtons.tsx` — remove Apple, keep Google only |
| Modify | `src/components/auth/PhoneOtpForm.tsx` — add success animation |
| Create | `src/services/auth/trackAuthEvent.ts` — lightweight analytics |
| Modify | `src/components/auth/AuthReturnRouter.tsx` — add profile upsert + role detection |

No database migration needed — `profiles` and `user_roles` tables already exist.

