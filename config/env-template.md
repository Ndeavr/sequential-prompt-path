# UNPRO — Environment Variables

> This file lists all environment variables required by the UNPRO application.
> Store these as secrets in Lovable Cloud (Settings → Cloud → Secrets).

## Supabase (Lovable Cloud)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> Note: When using Lovable Cloud, `SUPABASE_URL` and `SUPABASE_ANON_KEY` are automatically configured. The service role key is only needed for edge functions.

## Stripe

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

> Used for subscription billing and payment processing. Set up in Stripe Dashboard → Developers → API Keys.

## Google Calendar

```
GOOGLE_OAUTH_CLIENT_ID=<project-number>-<id>.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
# Recommended (fall back to GOOGLE_OAUTH_CLIENT_SECRET when absent):
CALENDAR_OAUTH_STATE_SECRET=random-64-chars
CALENDAR_TOKEN_ENCRYPTION_KEY=random-64-chars   # changing it makes saved tokens unreadable → reconnect
PUBLIC_SITE_URL=https://unpro.ca
```

> Read by the `calendar-*` edge functions (the old `GOOGLE_CALENDAR_*` names are not read). Redirect URI to register on the OAuth client: `https://<project-ref>.supabase.co/functions/v1/calendar-google-oauth-callback`. Scopes: `calendar.readonly`, `calendar.events`, `openid`, `email`, `profile`.

---

## How to Add Secrets

1. Open your Lovable project
2. Go to Settings → Cloud → Secrets
3. Add each variable as a key-value pair
4. Secrets are available in edge functions via `Deno.env.get('KEY_NAME')`

**Never commit actual secret values to the repository.**
