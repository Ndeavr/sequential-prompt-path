## Diagnostic

L'écran montre deux problèmes distincts qui plafonnent Overall à 60 :

1. **Étape 7/14 — `TWILIO_PHONE_NUMBER missing`**  
   Le secret a été ajouté à la dernière itération, mais la fonction `acq-e2e-real` semble toujours lire `undefined`. Causes probables :
   - Le secret a été ajouté mais la fonction n'a pas été redéployée (les Edge Functions doivent être redéployées pour récupérer les nouveaux secrets dans certains cas) — peu probable mais à vérifier.
   - Plus probable : le code lit un nom de variable différent (ex. `TWILIO_FROM_NUMBER`, `TWILIO_FROM`, `TWILIO_SENDER`) ou le `.trim()` n'est pas appliqué (espace/retour de ligne dans le secret le rend "présent mais vide").
   - Ou le secret a été enregistré sans le `+` (Twilio exige E.164 strict `+15145551234`).

2. **`resend_api_key_ping → HTTP 400 — API key is invalid`**  
   Le secret `RESEND_API_KEY` configuré n'est **pas** une clé Resend native (`re_xxx`). C'est probablement :
   - Une clé du Lovable Connector (`lovc_xxx`) → doit être routée via le Gateway, pas vers `api.resend.com` directement.
   - Ou une clé Resend révoquée/expirée/d'un mauvais workspace.
   - Ou une clé restreinte qui n'a pas le scope `emails:send` (Resend renvoie 401 normalement, mais 400 si format invalide).

## Plan de correction

### Étape A — Fix `TWILIO_PHONE_NUMBER` (Step 7/14)

1. Inspecter `supabase/functions/acq-e2e-real/index.ts` à l'étape `send_sms` pour vérifier :
   - Nom exact de la variable d'environnement lue.
   - Présence d'un `.trim()` sur la valeur.
   - Validation E.164 (`+` en tête).
2. Ajouter un diagnostic explicite : `{ from_present: !!from, from_length: from?.length, starts_with_plus: from?.startsWith("+") }` au lieu d'un simple "missing".
3. Si le secret existe mais commence sans `+`, normaliser automatiquement : `from.startsWith("+") ? from : "+" + from.replace(/\D/g, "")`.
4. Vérifier également l'utilisation cohérente dans `outreachDispatch.ts` / `smsGuard.ts` / `outreach-repair-agent` pour qu'aucune fonction ne lise un autre nom (`TWILIO_FROM`, `TWILIO_SENDER`, etc.).

### Étape B — Fix Resend (HTTP 400 invalid)

1. Ajouter au panneau **Diagnostic Resend** (déjà présent dans la UI) l'affichage de :
   - Préfixe de la clé (`re_`, `lovc_`, autre) — déjà fait selon UI.
   - Source détectée (Lovable Gateway vs Resend direct).
   - Endpoint réellement utilisé pour le ping.
2. Renforcer `probeResend` dans `outreach-health-agent` :
   - Si clé commence par `lovc_` → ping via `https://connector-gateway.lovable.dev/resend/emails` avec headers Lovable Gateway (`Authorization: Bearer ${LOVABLE_API_KEY}` + `X-Connection-Api-Key: ${RESEND_API_KEY}`).
   - Si clé commence par `re_` → ping direct `https://api.resend.com/api-keys` (GET, vérifie validité sans envoyer).
   - Sinon → marquer la clé comme `format inconnu` au lieu de tenter un appel qui retournera 400.
3. Aligner `outreachDispatch.ts` (et toutes les fonctions email : `send-onboarding-email`, `resend-events`, etc.) sur le même routeur (`_shared/emailSender.ts`) pour qu'elles utilisent la même logique de détection que le health probe.
4. Si la clé est `lovc_` mais le connector Resend n'est pas lié, retourner un message actionnable : "Connector Resend non lié — ouvrir Workspace → Connectors → Resend".

### Étape C — Vérification

1. Redéployer `acq-e2e-real`, `outreach-health-agent`, `outreach-repair-agent`.
2. Relancer **Run health agent** → vérifier que Messaging passe de 60 à 100.
3. Relancer **Run E2E (14)** → vérifier que l'étape 7 passe et que Overall remonte ≥ 95.

### Questions avant build

- Voulez-vous que je présume **Resend connector Lovable** (clé `lovc_`) ou **Resend direct API** (clé `re_`) ? La présence d'un panneau "Diagnostic Resend" qui affiche le préfixe suggère que vous voulez du diagnostic — je vais simplement faire en sorte que le probe route correctement selon le préfixe détecté.
- Pour `TWILIO_PHONE_NUMBER` : voulez-vous l'auto-normalisation au `+` en tête, ou échec strict si format invalide ?
