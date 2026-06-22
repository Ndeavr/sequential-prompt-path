# Replace "Continue to Lovable" with "Continue to UNPRO" on Google sign-in

## What you're seeing

The Google account picker says **"to continue to Lovable"** with the Lovable heart logo. This screen is rendered by Google, not by our app. Its branding (app name + logo) comes from whichever Google Cloud OAuth client is used by the backend.

Today we use **Lovable Cloud's managed Google OAuth credentials** — convenient, but the consent screen will always say "Lovable" with the Lovable logo. There is **no code change in this repo** that can rename that screen. The only way to show "UNPRO" + UNPRO logo there is to switch to **our own Google OAuth client** (BYOK = Bring Your Own Keys).

## Plan

This is a configuration task, not a code task. Steps:

### 1. Create UNPRO's Google OAuth client (you, in Google Cloud Console)
- Console → **OAuth consent screen**
  - App name: `UNPRO`
  - User support email: your support address
  - App logo: upload UNPRO logo (PNG, square, ≥120×120, <1 MB) — this is the logo shown on the Google account picker
  - Authorized domains: `unpro.ca`, `lovable.app`
  - Scopes: `openid`, `userinfo.email`, `userinfo.profile`
  - Publishing status: **In production** (otherwise Google shows "unverified app" and limits to test users)
- Console → **Credentials → Create OAuth client ID → Web application**
  - Authorized redirect URI: the callback URL shown in Lovable Cloud → Users → Auth Settings → Google provider (something like `https://<project>.supabase.co/auth/v1/callback`). I'll surface the exact URL once we start.
- Copy the **Client ID** and **Client Secret**.

### 2. Plug them into Lovable Cloud
- Lovable Cloud → Users → Authentication Settings → Sign-in methods → **Google** → toggle "Use my own credentials" → paste Client ID + Secret → Save.

### 3. Google verification (required to remove the "unverified" warning and to use a custom logo publicly)
- Submit the OAuth consent screen for verification in Google Cloud Console. Logo verification typically takes 3–5 business days; full app verification can take longer if Google asks for a homepage/privacy policy demo. The screen will keep saying "Lovable" until UNPRO's client is live + verified.

### 4. Verify
- Sign out, click **Continuer avec Google** in the app — Google's screen should now read **"to continue to UNPRO"** with the UNPRO logo.

## Out of scope

- No edits to `GoogleSignInButton.tsx`, `OAuthButtons.tsx`, or the `lovable.auth.signInWithOAuth` flow — those stay as-is; only the upstream OAuth client changes.
- No change to user data, sessions, or RLS.

## Questions before we start

1. Do you want me to **walk you through the Google Cloud Console setup step-by-step** (with the exact redirect URI from your Lovable Cloud auth settings), or have you already created an OAuth client and just need help wiring the Client ID/Secret into Lovable Cloud?
2. Which UNPRO logo file should be used for the Google consent screen? (Needs to be a square PNG, ≥120×120, <1 MB — the `U` mark on navy from the brand kit usually works best.)
