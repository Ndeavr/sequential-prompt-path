## Objectif

Alex propose la connexion (ou la création de compte) **après la 1ʳᵉ intention captée**, via une **carte glass inline + voix**, et **rappelle avant chaque action engageante** (booking, devis, sauvegarde dossier, recommandation perso). Méthodes : **Magic Link courriel** + **SMS OTP**. Couvre les 3 rôles : propriétaire, entrepreneur, gestionnaire condo.

## Architecture

### 1. Hook central `useAuthGate`
`src/hooks/useAuthGate.ts` — source unique de vérité :
- `isAuthenticated`, `userRole`
- `requestLoginPrompt(reason: AuthGateReason)` → ouvre la carte/sheet
- `requireAuth(action: () => void, reason)` → si connecté exécute, sinon ouvre la carte avec callback de reprise
- `dismissCount` persisté en `sessionStorage` (1 « plus tard » silencieux, re-prompt seulement aux actions engageantes ensuite)
- `AuthGateReason` : `first_intent | book | quote | save_project | personalized_reco | save_lead`

### 2. Store `authGateStore` (zustand)
`src/stores/authGateStore.ts` — `isOpen`, `reason`, `pendingAction`, `open()`, `close()`, `setMethod('email'|'sms')`.

### 3. Composant `AuthGateCard`
`src/components/auth/AuthGateCard.tsx` — carte glass bleue (réutilise `.glass-strong` et tokens cinematic dark) montée :
- **Inline dans la conversation Alex** : nouvelle `chat-card` rendue par `OverlayAlexVoiceFullScreen` quand `authGateStore.isOpen && reason === 'first_intent'`.
- **Modal bottom-sheet** pour les actions engageantes (`book/quote/...`) — même composant, prop `variant="sheet"`.

UI :
- Titre : « Pour vous offrir une meilleure expérience »
- Sous-titre rôle-aware (FR-CA) :
  - propriétaire : « Sauvegardez votre dossier propriété et vos rendez-vous. »
  - entrepreneur : « Activez votre profil et vos opportunités. »
  - gestionnaire : « Conservez vos dossiers d'immeuble et l'historique. »
- 2 onglets : « Courriel » (magic link) / « SMS » (OTP)
- Champ unique (email *ou* téléphone) avec `normalizeInput` (déjà en place)
- CTA primaire « M'envoyer le lien / le code »
- Lien discret « Plus tard » (ne ferme que la carte courante, ne bloque pas la conversation)
- Petit lien : « Pas encore de compte? On en crée un automatiquement. » (les deux méthodes créent le compte si inconnu)

### 4. Edge function `auth-otp-dispatch`
`supabase/functions/auth-otp-dispatch/index.ts` :
- POST `{ channel: 'email'|'sms', identifier, role?, returnUrl? }`
- Email → `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo, shouldCreateUser: true, data: { role } } })`
- SMS → `supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: true, data: { role } } })` (utilise Twilio connector côté Supabase Phone Auth)
- Anti-abus : rate-limit 3 envois / 10 min / identifiant (`auth_otp_attempts` table).
- Retourne `{ sent: true, channel, masked_identifier }` pour la confirmation à l'écran.

### 5. Confirmation OTP SMS
Quand channel = sms, après envoi : la carte affiche 6 cases OTP. Soumission via `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`. À succès → `pendingAction()` est rejoué.

### 6. Magic link courriel
Email envoyé via le système Lovable Auth Email Templates existant. Au retour sur l'app, `onAuthStateChange` détecte la session → on rejoue `pendingAction` si stockée en `sessionStorage`.

### 7. Branchements dans Alex
`src/lib/alexSessionState.ts` + `OverlayAlexVoiceFullScreen.tsx` :
- Après la 1ʳᵉ intention captée (event `alex:intent_captured` déjà émis par le brain) → `requestLoginPrompt('first_intent')` **si non connecté** ET `dismissCount === 0`.
- Voix d'Alex (variante FR-CA, 1 phrase) : « Pour mieux vous aider, je vous propose une connexion rapide. Sinon on continue, vous me le direz. » — déclenchée via prompt addendum contextuel, **pas** d'ajout au system prompt.

### 8. Branchements des actions engageantes
Wrap les CTA existants avec `requireAuth(...)` :
- Booking : `BookingPaymentSuccess` / panneaux de prise de RV → `requireAuth(book, 'book')`
- Devis : `PageAnalyseTroisSoumissions`, `PageAjouterSoumissionAuDossier`
- Sauvegarde dossier propriété : `PageMesPropriétés`, `PIM landing`
- Recommandation perso : carte de recommandation contractor (homeowner)
- Activation entrepreneur : `PageContractorJoinLive`, checkout fondateur

### 9. Méthode SMS — Twilio
SMS OTP via Supabase Phone Auth. Vérifier la connexion Twilio app-connector ; sinon prompter l'utilisateur pour la connecter (`standard_connectors--connect twilio`). Sans Twilio actif, désactiver l'onglet SMS avec un message inline « Bientôt disponible » (pas d'erreur exposée).

## Data

### Table `auth_otp_attempts`
```
id uuid pk default gen_random_uuid()
identifier text not null            -- email ou phone E.164
channel text not null check (channel in ('email','sms'))
ip inet
created_at timestamptz default now()
```
+ index `(identifier, created_at desc)`. RLS : insert/select **service_role only**. Pas de grant anon/authenticated.

### `user_roles` existant
Au verifyOtp success, si `data.role` présent et pas de row → insert dans `user_roles` (via trigger `handle_new_user` déjà en place, à étendre si nécessaire).

## Constraints
- Aucune fuite technique (« erreur réseau », « SMS échoué ») → libellés UX-safe : « Lien envoyé », « Code envoyé », « Impossible pour le moment, essayons par courriel ».
- Respect `mem://standards/ui-readability-rule` : carte sur fond verre bleu Apple-like déjà défini, texte token `--text-primary`.
- Respect `mem://ai/alex/behavioral-kernel` : Alex n'insiste pas, n'expose pas d'erreur.
- Aucune écriture dans `auth.*` ni `src/integrations/supabase/client.ts`.
- Pas d'auto-confirm email (Magic Link gère le retour de session naturellement).
- `sessionStorage` clé `unpro_auth_gate_dismissed` empêche la re-proposition initiale.

## Success
- Sur les 3 rôles, après 1ʳᵉ intention : la carte glass bleue s'affiche **dans le chat**, Alex la mentionne 1 fois.
- L'utilisateur entre courriel → reçoit magic link → revient dans l'app connecté → l'action en attente reprend.
- L'utilisateur entre téléphone → reçoit code SMS → entre les 6 chiffres → connecté → action reprend.
- Si « Plus tard » → conversation continue sans re-prompt. Re-prompt **seulement** au prochain « book/quote/save/reco ».
- 0 fuite technique, 0 flicker, 0 prompt sur page load.

## Tasks
1. Migration `auth_otp_attempts` + RLS + grants
2. Edge function `auth-otp-dispatch` (+ déploiement)
3. Store + hook (`authGateStore`, `useAuthGate`)
4. `AuthGateCard` (variants inline + sheet) + onglets email/SMS + OTP input
5. Branchement Alex `first_intent` (event listener + voix addendum)
6. Wrappers `requireAuth` sur les 5 actions engageantes listées
7. Toast UX-safe (réutiliser `friendlyErrors.ts`)
8. Vérification Twilio connector ; fallback désactivation onglet SMS
9. Tests : 3 rôles × 2 canaux × reprise pendingAction
