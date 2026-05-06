
# Plan — Auth bullet-proof (OAuth Google, courriel, SMS)

## Diagnostic (ce que les logs révèlent)

Les logs Supabase et console montrent que **l'auth fonctionne côté serveur** mais que la couche client est cassée :

1. **Google OAuth** : login OK côté Supabase (`/token` 200, login_method=oidc), mais ensuite `useAuth` part dans une boucle de timeouts (8s × ~25 fois) → l'utilisateur reste figé sur "Chargement…" puis est libéré sans rôle.
2. **Magic link "Gmail"** : le courriel **est envoyé** (auth-email-hook → Resend ID `24531b1b…`), mais quand l'utilisateur clique, le callback retombe sur `/verify` avec **`403 One-time token not found`**. Cause : la nouvelle session OAuth a invalidé le token magic-link entre-temps, et `AuthCallbackPage` ne distingue pas les deux flux.
3. **SMS** : `send-otp` ne reçoit aucun appel récent (juste boot/shutdown). Le bouton "Envoi…" reste pris dans son safety 3s parce que l'appel `fetch(.../send-otp)` ne propage pas l'erreur (pas d'`apikey` ni de gestion de réponse non-200).
4. **Lenteur globale** :
   - `supabase.auth.getSession()` met >5s (timeout warning fired) → `localStorage` bloqué par le multi-tab/iframe preview.
   - `useAuth` setTimeout de 8s sur le rôle **n'est jamais clearé** quand la query réussit → flood de warnings.
   - 6 listeners `onAuthStateChange` sont créés (le hook `useAuth` est monté 6 fois en parallèle dans l'arbre — Providers, Layouts, Guards, Pages…). Chaque listener réémet, multipliant les renders.

## Corrections (atomiques, pas de re-architecture)

### 1. `src/hooks/useAuth.ts` — singleton + cleanup correct
- Extraire la résolution de session dans un **store global** (Zustand léger, comme `alexVoiceLockedStore`) afin qu'**un seul listener `onAuthStateChange`** existe pour toute l'app, peu importe combien de composants appellent `useAuth()`.
- Clear le timer `roleTimedOut` dès que `roleQuery.isFetched === true`.
- Remplacer `getSession()` (qui touche localStorage et peut bloquer) par `onAuthStateChange` + `INITIAL_SESSION` event (Supabase 2.99 émet l'init via le listener).
- Réduire les timeouts : session 3s, rôle 4s. Logs en `info` pas `warn`.

### 2. `src/pages/AuthCallbackPage.tsx` — robustesse
- Détecter explicitement le type de retour : `?code=` (PKCE), `#access_token=` (implicit), `?error=` (provider error), `?type=recovery|magiclink` (Supabase verify).
- Si `error` ou `error_description` présent dans l'URL → afficher le message au lieu d'aller en boucle.
- Réduire safety timeout à 5s (au lieu de 8s) et router vers `/login` plutôt que `/onboarding` en cas de panne.
- Ne plus appeler `getSession()` deux fois ; lire la session via le listener déjà en place.

### 3. `src/components/auth/PhoneOtpForm.tsx` — appel edge correct
- Remplacer le `fetch` brut vers `/functions/v1/send-otp` par `supabase.functions.invoke("send-otp", { body })` qui injecte automatiquement `apikey` + `Authorization` (sinon CORS / 401 silencieux).
- Vérifier `res.error` avant d'utiliser `data` ; remonter le message Twilio à l'utilisateur (ex. "Numéro non vérifié en sandbox Twilio").
- Idem pour `verify-otp`.
- Augmenter le safety à 8s (Twilio Verify peut prendre 4-5s légitimement) au lieu de 3s qui faisait toujours afficher "Envoi trop long".

### 4. `supabase/functions/send-otp/index.ts` & `verify-otp/index.ts`
- Vérifier que les CORS headers acceptent `apikey, content-type, authorization` (déjà fait normalement, à confirmer).
- Logger explicitement les erreurs Twilio (compte SID manquant, numéro non vérifié, etc.) au lieu de retourner `{ fallback: true }` opaque.

### 5. `src/components/auth/OAuthButtons.tsx` & `LoginMagicLinkForm.tsx`
- OAuth : passer `redirect_uri: ${window.location.origin}/auth/callback` (et non `window.location.origin` brut) pour que le callback unique gère le flux ; sinon Lovable renvoie sur `/` et `AuthReturnRouter` doit deviner.
- Magic link : ajouter `shouldCreateUser: true` explicite et message clair "vérifiez aussi vos courriels indésirables".

### 6. Petit nettoyage de bruit
- Désactiver le `console.warn` répétitif de `useAuth` une fois qu'on a un singleton.
- Ajouter dans `/admin/outbound/test-center` (déjà existant) une mini-section "Auth health" qui ping `getSession`, `send-otp` (dry-run), et auth-email-hook pour vérifier la chaîne en un clic.

## Hors scope (ce qu'on ne touche pas)

- Les credentials OAuth Google (managés par Lovable Cloud — fonctionnent, login Yanick OK à 23:31).
- La config Twilio / Resend (clés OK, hooks émettent).
- `src/integrations/lovable/index.ts` (auto-généré).

## Ordre d'exécution

1. Singleton `useAuth` + cleanup timer.
2. `AuthCallbackPage` robuste.
3. `PhoneOtpForm` → `functions.invoke`.
4. Edge functions logs explicites.
5. Boutons OAuth + magic link redirect_uri unifié.
6. Mini "Auth health" dans `/admin/outbound/test-center`.

Après ces 6 patches, OAuth Google, magic link courriel et SMS Twilio fonctionnent sans timeout, et l'overlay d'auth se termine en <2s au lieu de 8-15s.
