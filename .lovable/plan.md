## État actuel (diagnostic rapide)

- **Domaine email**: `notify.unpro.ca` ✅ vérifié — mais `email_domain_configs` est vide (le sender n'est pas enregistré côté UNPRO config).
- **Prospects**: 80 lignes dans `contractor_prospects`, **1 seule** ligne dans `sniper_targets`. Le scraping n'alimente pas le sniper.
- **Envois**: `email_send_log` = **0 email** envoyé sur 7 jours. Test Center a logué : *"Test email échec: Edge Function returned a non-2xx status code"*.
- **SMS**: tables `sms_*` + `acq_sms_logs` présentes, mais connector Twilio non vérifié.
- **Fonctions présentes**: `fn-scrape-google-results`, `scrape-rbq-leads`, `scrape-qc-exterior-trades`, `sniper-import-targets`, `sniper-enrich-target`, `sniper-generate-assets`, `sniper-queue-send`, `sniper-update-heat`, `sms-prospect-send`, `send-sms-prospect`, `send-outbound-test-email`, `send-transactional-email`.
- **Landing**: `/analyse/:slug` → `PageOutreachLanding` existe ✅.

## Objectif

Rendre opérationnel le flux **scrape → enrich → score AIPP → envoi email + SMS → landing `/analyse/:slug`** sur les 3 pipelines (Sniper, Outbound Autopilot, Prospect Execution).

## Plan d'exécution

### 1. Diagnostic complet (lecture)
- Lire `send-outbound-test-email` + `sniper-queue-send` + `sms-prospect-send` pour repérer la cause du non-2xx.
- Vérifier secrets disponibles (`RESEND_API_KEY` ou Lovable Emails, `TWILIO_*`, `FIRECRAWL_API_KEY`).
- Vérifier connector Twilio via `standard_connectors--list_connections`. Si absent → demander connexion.
- Inspecter `sniper-import-targets` pour comprendre pourquoi `contractor_prospects` (80) ne sont pas migrés en `sniper_targets` (1).

### 2. Correctifs Email
- Seed `email_domain_configs` avec `notify.unpro.ca` (sender = `alex@notify.unpro.ca`, reply-to = `bonjour@unpro.ca`, `is_active = true`).
- Corriger l'erreur non-2xx du `send-outbound-test-email` (probablement: domaine sender hardcodé vs vérifié, ou template manquant).
- Forcer toutes les fonctions d'envoi à utiliser la file `transactional_emails` Lovable Emails (queue process-email-queue déjà en place).
- Lien dans email = `https://unpro.ca/analyse/{slug}` avec UTM + token de tracking (déjà supporté par PageOutreachLanding).

### 3. Correctifs SMS
- Si Twilio non connecté → présenter `standard_connectors--connect` Twilio.
- Brancher `sms-prospect-send` sur gateway Twilio (`/Accounts/{SID}/Messages.json`) avec lien court vers `/analyse/{slug}`.
- Activer la séquence fallback SMS (2 emails non ouverts → SMS) via `sms_fallback_sequences`.

### 4. Pipeline scraping → sniper
- Backfill: convertir les 80 `contractor_prospects` existants en `sniper_targets` via une RPC `import_prospects_to_sniper()`.
- Vérifier que `fn-scrape-google-results` écrit bien dans `contractor_prospects` (queries Google ville×catégorie depuis `city_activity_matrix`).
- Brancher cron `outbound-autopilot` (15 min) pour déclencher en cascade: scrape → enrich (Firecrawl + AIPP) → generate-assets (email + SMS) → queue-send (respect des fenêtres).

### 5. Smoke test end-to-end
- Lancer manuellement `fn-scrape-google-results` pour 1 ville × 1 catégorie (ex: Laval × Isolation).
- Vérifier insertion `sniper_targets`.
- Déclencher `sniper-enrich-target` puis `sniper-generate-assets` puis `sniper-queue-send` sur 1 cible test.
- Confirmer ligne `email_send_log` status = `sent`, ouvrir `/analyse/{slug}`, vérifier tracking view.
- Tester SMS sur un numéro test (admin).
- Publier le résultat dans **Test Center** (table `outbound_test_logs` à créer si nécessaire avec entrées success/error).

### 6. Cockpit Test Center
- Ajouter bouton **"Lancer cycle complet"** dans `/admin/sniper` qui exécute les 4 étapes en séquence et stream les logs en realtime.
- KPI temps réel: scraped (24h), enriched, sent (email/sms), opens, landing views, conversions.

## Constraints

- Aucune nouvelle UI superflue — réutiliser `/admin/sniper`, `/admin/outbound`, `/admin/test-center`.
- Garder lien unique = `/analyse/:slug` (Landing AIPP) pour tous les envois.
- Respecter quota Lovable Emails + Twilio (rate limit, send windows 9h-19h heure QC, max 50/jour par boîte).
- Aucune fuite copy interne (jamais "non-2xx", "edge function", etc.) dans les UI utilisateur.

## Livrables

1. Migration: seed `email_domain_configs` + RPC `import_prospects_to_sniper()` + table `outbound_test_logs` si manquante.
2. Fix `send-outbound-test-email` + `sniper-queue-send` + `sms-prospect-send` (corps réponse, sender, lien).
3. Hook Twilio connector + edge function `send-sms-prospect` câblé.
4. Cron autopilot 15 min.
5. Bouton **"Lancer cycle complet"** + stream logs en realtime.
6. Smoke test passé (email reçu + SMS reçu + landing tracked).

## Question préalable

Twilio est-il déjà connecté dans le workspace, ou je dois déclencher l'ajout du connector Twilio en début d'implémentation ?
