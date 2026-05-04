## Goal

1. Remove the persistent contractor call pop-up everywhere.
2. Fix Google OAuth so the user actually lands authenticated.

## 1. Remove pop-up

**`src/app/router.tsx`**
- Delete import line 10: `import PersistentContractorCallPopup from "@/components/PersistentContractorCallPopup";`
- Delete the `<PersistentContractorCallPopup />` render at line 649.

**`src/components/PersistentContractorCallPopup.tsx`**
- Delete the file entirely (no other usages).

## 2. Fix Google OAuth

### Diagnosis
- Supabase auth logs confirm Google OIDC `/token` returns 200 (login succeeds at the broker).
- Client console shows repeated `[useAuth] session resolution timeout (5s)` after returning from Google → user remains unauthenticated in the UI.
- Root cause: `OAuthButtons.tsx` (and `ButtonConnectGoogleCalendar`, `ModalInlineAuth`, `Login.tsx` flow) use `redirect_uri: ${window.location.origin}/auth/callback`. With Lovable Cloud's managed OAuth (`lovable.auth.signInWithOAuth`), the broker returns tokens to the **redirect_uri page** and then calls `supabase.auth.setSession(tokens)` inside the SDK. But our `/auth/callback` page immediately calls `supabase.auth.getSession()` and `exchangeCodeForSession(code)` — this is the legacy Supabase flow, not the Lovable broker flow. The two flows race / conflict and the session is never persisted reliably, so `useAuth` times out.
- Per Lovable docs, the correct pattern with managed OAuth is `redirect_uri: window.location.origin` (no custom callback page) — the SDK handles token exchange, then we navigate based on app logic.

### Fix

**`src/components/auth/OAuthButtons.tsx`**
- Change `redirect_uri: ${window.location.origin}/auth/callback` → `redirect_uri: window.location.origin`.
- After `signInWithOAuth` returns without `redirected` and without `error`, the session is set. Navigate to `/auth/callback` programmatically using `useNavigate` so the existing post-login routing logic (role assignment, intent consumption) still runs — OR simpler: keep `/auth/callback` reachable but only as a post-auth router, not the OAuth landing page.

  Cleanest: keep `redirect_uri = window.location.origin`, and after success call `navigate("/auth/callback")` to reuse existing routing logic in `AuthCallbackPage` (which will now find the session immediately via `getSession()` since the SDK already called `setSession`).

**`src/components/auth/GoogleSignInButton.tsx`**
- Already uses `redirect_uri: window.location.origin` — leave as-is.

**`src/components/auth/ModalInlineAuth.tsx`**
- Uses `supabase.auth.signInWithOAuth` directly (legacy). Replace with `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` for consistency with managed OAuth.

**`src/pages/AuthCallbackPage.tsx`**
- Remove the `exchangeCodeForSession(code)` branch — no longer needed because the Lovable SDK handles token exchange before redirect. Keep the `getSession()` + role/profile setup + redirect logic. If session is missing, redirect to `/login` instead of attempting code exchange.

### Verification
- Click "Continuer avec Google" on `/login` → Google consent → returns to `/` (origin) → SDK sets session → app navigates to `/auth/callback` → role/profile resolved → redirect to intended destination.
- No more `[useAuth] session resolution timeout` warnings.
- Pop-up no longer appears on any route.

## Out of scope
- The unrelated `AlexChatFallbackPanel` `forwardRef` warning and Alex voice boot timeout (separate issues, not requested).
