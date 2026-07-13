# Débloquer Batch Sender — SMS Health visible + Test SMS 1-clic

## Diagnostic (confirmé dans le code)

- Message vient de `supabase/functions/_shared/smsHealth.ts` (`assertSmsHealthy`).
- Vue lue : `public.v_sms_infrastructure_status` (migration `20260616144735_*`).
- Règle de statut :
  - `ERROR` si aucun callback Twilio (`sms_events_v2.webhook_received_at IS NULL`)
  - `WARNING` si aucun `sms_test_runs.success = true` dans les 24 h
  - `ERROR` si >10 SMS et taux livraison 24 h < 90 %
  - Sinon `HEALTHY`
- `first-dollar-send-batch` appelle `assertSmsHealthy()` → `WARNING`/`ERROR` = batch bloqué avec le texte affiché.
- Un endpoint de test existe déjà : `supabase/functions/sms-admin-test/index.ts` (insère dans `sms_test_runs`, envoie via Twilio, met à jour `success` via `twilio-status-v2`). Il n'est juste pas exposé dans l'UI Batch Sender.

Cause réelle du blocage actuel : aucune ligne récente dans `sms_test_runs` avec `success=true` (test jamais lancé depuis >24 h), ou aucun callback Twilio reçu.

## Livrables (UI seulement, aucune nouvelle logique métier)

### 1. Panneau Health en haut de `/admin/first-dollar/batches`
Nouveau composant `SmsHealthPanel` qui lit `v_sms_infrastructure_status` + dernier `sms_test_runs`. Affiche :

- Statut global : Vert (HEALTHY) / Jaune (WARNING) / Rouge (ERROR)
- Dernier callback Twilio (`last_callback_at`)
- Dernier test SMS réussi (`last_test_success_at`)
- Taux livraison 24 h
- Dernier test : numéro, statut Twilio, `error_code`/`error_message`, horodatage
- Raison exacte du blocage (mappe la règle de la vue en phrase claire)
- Bouton **« Exécuter un test SMS »** → `supabase.functions.invoke('sms-admin-test')`, toast succès/échec, refetch health

### 2. Message de blocage actionnable dans le Batch Sender
Quand `useSendBatch` retourne bloqué, remplacer le toast opaque par un encart persistant :
- Cause détectée (mappée depuis `health.status` + champs)
- CTA « Exécuter un test SMS » (mêmes handlers que panneau)
- Lien vers `/admin/outbound/email-health` déjà existant si dispo pour infra plus large (optionnel)

### 3. Hook `useSmsHealth`
Nouveau `src/hooks/useSmsHealth.ts` :
- Query `v_sms_infrastructure_status` + top 1 `sms_test_runs`
- Mutation `runTestSms` → invoke `sms-admin-test`
- Refetch 30 s

### 4. Aucune modification de la règle de garde
On garde `assertSmsHealthy` inchangé. La correction est UX : rendre visible et exécutable ce qui débloque le flag (envoyer 1 test → Twilio callback → `success=true` → `HEALTHY` → batch autorisé).

## Fichiers touchés

- `src/hooks/useSmsHealth.ts` (nouveau)
- `src/components/admin/SmsHealthPanel.tsx` (nouveau)
- `src/pages/admin/PageAdminFirstDollarBatches.tsx` (insertion du panneau + encart d'erreur enrichi)

## Hors scope

- Pas de changement à la vue SQL, à `smsHealth.ts`, ni au seuil 24 h.
- Pas de nouveau panneau global multi-canaux (Resend/Stripe/etc.) — seulement SMS ici, focus premier 1 $.
- Pas de modification de `sms-admin-test` (fonctionne déjà).

## Critère de succès

Sur `/admin/first-dollar/batches` : je vois pourquoi c'est bloqué, je clique « Exécuter un test SMS », le test part vers `ADMIN_TEST_PHONE`, le callback Twilio arrive, la vue passe `HEALTHY`, le bouton « Envoyer 25 SMS » cesse de bloquer.
