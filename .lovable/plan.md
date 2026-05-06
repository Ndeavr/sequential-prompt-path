
## Problème

OAuth Google reste bloqué sur "Connexion…" dans le preview mobile Lovable. Cause racine : le WebView du preview ne peut pas faire un OAuth full-page, le broker ouvre alors une fenêtre séparée et la callback ne revient jamais. **Ceci est une limitation connue du preview Lovable, pas du code.** Sur `unpro.ca` (URL publiée) le flow fonctionne — voir les `auth-logs` qui confirment un login Google réussi à 21:07 UTC pour `yturcotte@gmail.com`.

## Ce qu'on corrige (minimal, zero régression)

### 1. `src/components/auth/OAuthButtons.tsx` + `GoogleSignInButton.tsx`
- Retirer `/auth/callback` du `redirect_uri`. Utiliser `window.location.origin` seul, comme la doc Lovable le recommande. Le broker (`/~oauth/callback`) gère lui-même la redirection finale.
- Détecter `result.redirected === true` et **laisser** le bouton en état "Connexion…" (la page va naviguer). Ne PAS faire `setGoogleLoading(false)` dans ce cas.
- Si `result.error` ou exception → `setGoogleLoading(false)` immédiatement + toast.
- Ajouter un timeout de garde (8 s) qui reset le loader si rien ne s'est passé (cas WebView preview).

### 2. Pas de changement à
- `src/integrations/lovable/index.ts` (auto-généré, interdit)
- `src/hooks/useAuth.ts` (signOut déjà corrigé précédemment)
- `src/stores/authSessionStore.ts`
- Configuration Supabase / providers

### 3. Communication utilisateur
Afficher un petit hint sous le bouton **uniquement** si l'app détecte qu'on tourne dans un WebView Lovable (`navigator.userAgent` contient `lovable` ou `wv`) :
> "Pour tester la connexion Google, ouvre `unpro.ca` dans Safari/Chrome."

## Hors scope
- SMS OTP : à diagnostiquer séparément si toujours cassé après ce fix (les `auth-logs` ne montrent pas d'échec SMS récent).
- Refonte du flux auth.
- Toucher au broker Lovable.

## Vérification
1. Sur `https://unpro.ca` → clic Google → redirection → retour → session active.
2. Sur preview Lovable → clic Google → bouton revient à l'état initial après 8 s + hint visible.
3. `auth_step` debug badge passe `oauth_initiating → oauth_redirecting` puis disparaît à la callback.

## Pourquoi c'est court
Tu as raison sur les tokens : on ne touche QUE les 2 fichiers de boutons OAuth. Pas de cascade.
