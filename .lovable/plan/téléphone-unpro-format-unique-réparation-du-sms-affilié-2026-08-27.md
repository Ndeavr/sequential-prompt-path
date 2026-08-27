# Téléphone UNPRO : format unique + réparation du SMS affilié

## Cause réelle de « Unsupported phone provider »

Ce message ne vient pas d'UNPRO : il est renvoyé par le service d'authentification lui-même quand on lui demande d'envoyer un SMS alors qu'aucun fournisseur SMS n'est activé côté authentification.

`src/pages/affiliate/PageAffiliateOnboarding.tsx` (et `PageAffiliateLogin.tsx`) appellent directement `supabase.auth.signInWithOtp({ phone })`. Or UNPRO n'utilise pas l'OTP téléphone natif : il possède déjà son propre canal OTP Twilio complet et fonctionnel — les fonctions `send-otp` / `verify-otp` (code hashé, TTL 5 min, limites par téléphone et par IP, création/liaison du compte, ouverture de session) utilisées par `src/components/auth/PhoneOtpForm.tsx`.

Deux chemins SMS coexistent donc ; l'onboarding affilié est branché sur le mauvais. C'est ça qu'on répare, pas le message d'erreur. (À noter : l'ancienne fonction `auth-otp-dispatch` renvoie aussi `sms_unavailable` en dur pour le canal SMS — vestige de la même supposition.)

## Ce qui sera fait

### 1. Une seule logique téléphone
La logique canonique existe déjà (`src/utils/normalizeInput.ts` + `src/utils/formatPhone.ts` : affichage `(514) 249-9522`, stockage `+15145551212`, pas de double « 1 »). Elle n'est pas réutilisée partout.

- Consolider `src/components/ui/phone-input.tsx` comme **le** champ téléphone UNPRO : `inputMode="tel"`, formatage progressif pendant la frappe, Backspace/sélection/copier-coller/mobile naturels, reformatage automatique d'une valeur préchargée (`15142499522` → `(514) 249-9522`), valeur E.164 exposée au parent.
- Ajouter un helper d'affichage unique (`formatPhoneDisplay`) et l'appliquer aux affichages en lecture seule (CRM, admin, prospects, fiches, rendez-vous) pour qu'aucun `15142499522` brut ne soit visible.
- Remplacer les formatages locaux/ad-hoc (~16 fichiers avec `type="tel"` ou `replace(/\D/g,…)` maison) par le composant et les utilitaires partagés : affiliés, onboarding affilié, propriétaires, entrepreneurs, prospects, CRM, admin, login, OTP, profils, rendez-vous, imports.
- Les fonctions edge conservent leur normalisation serveur (double sécurité), alignée sur la même règle.

### 2. Réparation du SMS sur `/affilies/onboarding`
- Remplacer `supabase.auth.signInWithOtp({ phone })` par l'appel aux fonctions existantes `send-otp` / `verify-otp` (aucun nouveau système d'auth, SMS ou OTP créé).
- Même correction sur `PageAffiliateLogin.tsx`, qui a le même défaut.
- Le numéro transmis est exactement `+15142499522` pour un affichage `(514) 249-9522`.
- Vérifier côté fonction : secrets Twilio présents, Messaging Service configuré, réponse réelle du fournisseur ; si le fournisseur bloque, le diagnostic est reporté dans les logs, pas dans l'UI.

### 3. Message utilisateur
- Aucune erreur technique anglaise affichée. Repli fr-CA : « Impossible d'envoyer le code par SMS pour le moment. Réessayez ou utilisez le lien par courriel. » (le lien courriel existant reste disponible).
- Détails techniques uniquement dans les logs. Le code OTP n'est jamais journalisé.

### 4. Comportement OTP conservé
- 6 cases, remplissage automatique Android/iOS (`autoComplete="one-time-code"`) et collage acceptés.
- **Aucune auto-validation** : quand les 6 chiffres sont là, le bouton « Vérifier le code » s'active seulement ; c'est le clic qui appelle la vérification.

### 5. Après OTP réussi
- Pas de retour vers `/login`. La session ouverte par `verify-otp` reprend le parcours en cours : l'onboarding affilié continue à l'étape suivante, en conservant `returnTo` / `slug` / attribution déjà en place.

### 6. Tests
- Champ chargé avec `15142499522` → UI `(514) 249-9522`, valeur envoyée `+15142499522`.
- `/affilies/onboarding` : envoi SMS réel, disparition de « Unsupported phone provider », écran OTP, collage/auto-remplissage, absence d'auto-validation, clic « Vérifier », suite de l'onboarding.
- Vérification navigateur (mobile, largeur Android Chrome) + typecheck/build + tests unitaires de formatage (jeu de formats d'entrée exigé).

## Détails techniques

| Élément | Action |
|---|---|
| `src/utils/normalizeInput.ts`, `formatPhone.ts` | Source unique, conservée |
| `src/components/ui/phone-input.tsx` | Champ canonique consolidé |
| `PageAffiliateOnboarding.tsx`, `PageAffiliateLogin.tsx` | Basculés sur `send-otp` / `verify-otp` |
| `supabase/functions/auth-otp-dispatch` | Branche SMS alignée sur le canal Twilio réel |
| Champs téléphone restants | Migrés vers le composant partagé |

Aucun nouveau système d'authentification, de SMS ou d'OTP n'est créé ; la couche Twilio existante est réutilisée telle quelle.
