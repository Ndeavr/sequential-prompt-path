# Diagnostic + déblocage global app & Alex

## Problème observé
- `/onboarding` reste sur "Chargement…" indéfiniment.
- Alex Voice reste sur "Connexion d'Alex…" (token signé jamais résolu après >2s, aucune coupure).
- Aucun timeout, aucun fallback, aucune trace pour identifier l'étape qui bloque.

## Causes identifiées par l'inspection du code
1. **`useOnboardingSession`** (`src/hooks/useOnboardingSession.ts`) — `setLoading(false)` n'est appelé que dans le `await`. Si la requête Supabase hang (RLS, réseau, edge), `loading` reste `true` pour toujours → `OnboardingFlow` bloqué.
2. **`useProfile`** (`src/hooks/useProfile.ts`) — pas de timeout, pas de retry borné. `OnboardingGuard` attend `profileLoading` sans plafond.
3. **`useAuth`** — `roleQuery` n'a pas de timeout ; le watchdog `roleTimedOut` est à 4s mais `isAuthLoading = loading || isRoleLoading` peut rester actif si `useAuthSession.loading` retombe alors que la query reste en flight.
4. **Alex Voice** — `useLiveVoice` n'a un timeout que **après** réception du signed URL (5s sur la connexion WS). L'appel `supabase.functions.invoke("voice-get-signed-url")` lui-même n'a **aucun timeout**. Les logs montrent "🐢 Token slow (>2s)" sans suite — l'edge réponse n'arrive jamais et rien ne tue l'attente.
5. Alex est lancé depuis n'importe quelle route ; il n'a aucun mode "guest_limited" et dépend implicitement de l'état app via overlays/store.

## Plan d'action — 3 couches

### Couche 1 — Boot tracer global (read-only, instrumentation)
- Nouveau fichier `src/lib/bootDebug.ts` exposant `window.__UNPRO_DEBUG` + helper `logBoot(step, data?)`.
- Instrumenter les points clés :
  - `src/main.tsx` → `APP_MOUNT`
  - `src/integrations/supabase/client.ts` (au load) → `SUPABASE_CLIENT_READY`
  - `src/stores/authSessionStore.ts` → `AUTH_SESSION_START`, `AUTH_SESSION_OK|NULL|TIMEOUT`
  - `src/hooks/useAuth.ts` → `ROLE_FETCH_START/OK/ERROR/TIMEOUT`
  - `src/hooks/useProfile.ts` → `PROFILE_FETCH_START/OK/ERROR/TIMEOUT`
  - `src/hooks/useOnboardingSession.ts` → `ONBOARDING_LOAD_START/OK/EMPTY/ERROR/TIMEOUT`
  - `src/hooks/useLiveVoice.ts` → `VOICE_TOKEN_START/OK/TIMEOUT`, `VOICE_WS_CONNECTED/TIMEOUT`
- Bouton flottant temporaire `src/components/dev/BootDebugButton.tsx` (dev only, en bas-droite, `import.meta.env.DEV`) qui affiche un panneau JSON : derniers steps, route, auth, profile, alex state.

### Couche 2 — Timeouts durs partout (le vrai fix)
- **`useOnboardingSession`** : wrap `await supabase…` avec `Promise.race([query, timeout(5000)])`. En timeout : `setLoading(false)`, garder `DEFAULT_SESSION`, log `ONBOARDING_LOAD_TIMEOUT`. Évite d'écraser une session existante en BDD.
- **`useProfile`** : ajouter `staleTime`/`gcTime` raisonnables, `retry: 1`, et wrapper la `queryFn` avec timeout 5s. En échec → retourner `null`, ne pas throw.
- **`OnboardingGuard` / `AuthGuard` / `RoleGuard` / `PropertyGuard`** : tous gagnent un `useEffect` qui force `loadingTimedOut=true` après 6s. Si timed out → continuer en mode invité (laisser passer ou rediriger vers route publique selon le guard) au lieu d'afficher "Chargement…" éternel.
- **`useAuth`** : si `useAuthSession.loading` est `false` (le store a déjà son propre fallback 3s), borner `isRoleLoading` à 4s max (déjà présent via `roleTimedOut`) et garantir que `isAuthLoading = false` après 6s même si la query plante.
- **`useLiveVoice` (start)** : encadrer `supabase.functions.invoke("voice-get-signed-url")` par `Promise.race` avec timeout 6s. En timeout → `alexVoiceService.setError("token_timeout")`, déclencher `switchAlexToChatFallback("voice_token_timeout", "Connexion vocale lente. Je continue par message.")`. Aucun spinner > 6s.
- **Étiquette UI Alex** : à 6s sans token, l'overlay affiche "Mode chat activé" + bouton "Réessayer la voix" (réutilise `recoverAlex()`).

### Couche 3 — Découplage Alex / app
- Alex (overlay verrouillé) ne lit que `useAuthSession` (déjà découplé). Vérifier qu'aucun chemin dans `OverlayAlexVoiceFullScreen` ne dépend de `useProfile` ou `useOnboardingSession` ; sinon basculer vers lecture optionnelle (`?? null`) et un `contextMode: "guest_limited"` dans le store Alex.
- `AlexProvider` ne doit pas attendre ni bloquer le rendu enfant : déjà OK, mais on ajoute un `try/catch` dans chaque hook pour qu'une exception ne casse pas la racine.

## Fichiers touchés
- + `src/lib/bootDebug.ts`
- + `src/components/dev/BootDebugButton.tsx` (monté dans `src/app/App.tsx` si DEV)
- ~ `src/main.tsx`, `src/app/App.tsx`
- ~ `src/stores/authSessionStore.ts`
- ~ `src/hooks/useAuth.ts`, `src/hooks/useProfile.ts`, `src/hooks/useOnboardingSession.ts`
- ~ `src/hooks/useLiveVoice.ts`
- ~ `src/guards/AuthGuard.tsx`, `OnboardingGuard.tsx`, `RoleGuard.tsx`, `PropertyGuard.tsx`
- ~ `src/components/voice/OverlayAlexVoiceFullScreen.tsx` (étiquette + CTA fallback à 6s)

## Hors périmètre
- Aucune modif design, Stripe, flows métier, Alex personality, ElevenLabs SDK.
- Pas de migration BDD.

## Critère de succès
- `window.__UNPRO_DEBUG.bootSteps` montre exactement où ça bloque.
- Aucun écran "Chargement…" ne dure > 6 s.
- Alex bascule en chat automatiquement si le signed URL ne revient pas en 6 s.
- `/onboarding` rend toujours l'UI (mode invité si données absentes).
- App utilisable même si Supabase auth/profil/edge échoue.
