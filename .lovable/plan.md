## Root cause

Le bouton « Tester maintenant » appelle l'edge function `sms-admin-test`, qui délègue à `_shared/twilioSend.ts → sendSms()`. Aujourd'hui, ce chemin **n'envoie pas** le flag `strict_admin_override: true`. Résultat :

1. `smsGuard.validateBeforeSend` ne trouve pas le numéro admin dans `ADMIN_SMS_ALLOWLIST` (aucun override actif).
2. Sans `lead_id` (test admin), `resolvedPhoneType` reste `null`.
3. Le guard lance un Twilio Lookup, qui répond `unknown` (ou échoue), et retourne `not_mobile` → `phone_type=unknown`.
4. L'événement `sms_events_v2` est écrit avec `status='not_mobile'`, aucun SMS n'est envoyé, le panneau reste rouge → verrou 24 h impossible à débloquer.

Le test Twilio applique donc, à tort, la règle prospect au numéro administrateur. Correction chirurgicale du chemin de test uniquement — le pipeline prospects reste strict.

## Fix (surface minimale)

### 1. `supabase/functions/sms-admin-test/index.ts`
- Lire le numéro dans cet ordre : `SMS_TEST_DESTINATION_NUMBER` → `ADMIN_TEST_PHONE` (fallback historique). Si `body.to` est fourni, ignorer (le numéro ne doit jamais venir du navigateur).
- Normaliser en E.164 (`+1XXXXXXXXXX`) avant l'appel, sinon retourner `SMS_TEST_DESTINATION_NUMBER n'est pas configuré` / `invalid_admin_test_phone`.
- Appeler `sendSms({ ..., strict_admin_override: true, lead_id: undefined })` — jamais de `lead_id`, donc aucune consultation `contractor_leads.phone_type`.
- Retourner : `ok, test_run_id, twilio_sid (masqué côté UI), status, valid_until (null jusqu'au callback), error_code, error_message`.
- Journaliser dans `sms_test_runs` avec `destination_masked` (masquer côté serveur : garder 3 derniers chiffres).

### 2. Secret `ADMIN_SMS_ALLOWLIST`
Vérifier via `fetch_secrets` puis, si nécessaire, garantir que le numéro terminant par `9522` est présent au format E.164 (`+15142499522`). Sans lui, l'override échoue silencieusement. Ne pas exposer le numéro complet côté client.

### 3. `supabase/functions/twilio-status/index.ts` (callback)
Confirmer que sur `MessageStatus=delivered`, on met à jour `sms_test_runs.delivered_at = now()` et que la vue `get_sms_outbound_health()` calcule `valid_until = delivered_at + interval '24 hours'`. Idempotent par `MessageSid`. Sur `failed/undelivered`, on conserve `ErrorCode` + `ErrorMessage` et l'outbound reste bloqué.

### 4. `src/components/admin/SmsHealthPanel.tsx`
- Après clic : afficher « Test envoyé — attente de livraison Twilio » + SID masqué (`SM••••••••XXXX`).
- Polling `useSmsHealth` toutes les 5 s tant que `status ∈ {queued, sending, sent}`, stop dès `delivered` ou `failed`.
- Compteur 5 min lié au dernier `sms_test_runs.created_at` serveur, pas au clic frontend.
- Ne jamais afficher un toast historique `phone_type=unknown` après un nouveau test.

### 5. `src/components/admin/EligibilityPanel.tsx`
Renforcer la séparation visuelle déjà en place :
- Bloc **Canal SMS** : dernier test Twilio, `valid_until`, statut.
- Bloc **Bassin de prospects** : décompte par `phone_type` (`mobile`, `landline`, `voip`, `unknown`, `null`) + `opt_out`, `déjà contacté`, `wrong_status`.
- Confirmer que `phone_type=unknown` n'est **jamais** promu automatiquement en mobile — l'action reste la validation Twilio Lookup par worker séparé.

### 6. Aucune modification à
- `_shared/smsGuard.ts` (règle prospects intacte)
- `first-dollar-send-batch` (éligibilité batch inchangée)
- La fenêtre de sécurité 24 h et le hard-cap 25 restent en place.

## Success criteria

- « Tester maintenant » envoie un vrai SMS via Twilio, aucun `not_mobile / phone_type=unknown` dans `sms_events_v2`.
- Un `MessageSid` est enregistré et le callback `delivered` met à jour `sms_test_runs.delivered_at`.
- `get_sms_outbound_health()` retourne `status='HEALTHY'` avec `valid_until = delivered_at + 24h`.
- Le panneau Twilio passe au vert automatiquement (sans reload).
- Les 188 leads `unknown` restent séparément non éligibles jusqu'à validation Twilio Lookup dédiée.
- Zéro faux `delivered` dans la base.

## Tasks

1. Vérifier / configurer les secrets `SMS_TEST_DESTINATION_NUMBER` et `ADMIN_SMS_ALLOWLIST` (E.164, `+15142499522`).
2. Éditer `sms-admin-test/index.ts` : lire le numéro depuis les secrets, normaliser, `strict_admin_override: true`, pas de `lead_id`.
3. Vérifier `twilio-status` : idempotence + mise à jour `sms_test_runs.delivered_at`, propagation vers `get_sms_outbound_health`.
4. Ajuster `SmsHealthPanel` : polling 5 s, SID masqué, message d'attente clair, cooldown serveur.
5. Ajuster `EligibilityPanel` : séparation « Canal SMS » vs « Bassin de prospects », décompte par `phone_type`.
6. Déployer, cliquer « Tester maintenant », attendre `delivered`, confirmer `valid_until` et statut vert.
7. **Ne pas** envoyer le batch tant que `phone_type=mobile` sur des prospects reste à 0 — c'est la prochaine phase (worker Twilio Lookup sur les 188).
