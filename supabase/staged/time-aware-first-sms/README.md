# Premier SMS avec question selon l'heure d'envoi — STAGED (non déployé)

Statut : préparé et testé hors des dossiers Edge actifs. Aucun envoi, aucun déploiement.

## Comportement une fois appliqué
- `send-verified-batch` avec `template: "time_aware_first_touch_v1"` (+ `sender_first_name` facultatif) rédige le
  texte de base avec le jeton `[QUESTION_HORAIRE]`; salutation via `buildSmsGreeting` existant (prénom fiable →
  équipe de l'entreprise → « Bonjour à vous, »). Sans prénom d'expéditeur fiable : « ici UNPRO (unpro.ca). »
- `sendSms` résout le jeton à l'instant réel d'envoi (America/Toronto) : 8:00–10:59 aujourd'hui, 11:00–15:59
  cet après-midi, 16:00–18:59 demain. Avant 8 h / dès 19 h : `deferred_window`, reprise au plus tard entre le
  prochain 8:00 et la fenêtre canonique `sendWindow.ts`; la phrase est recalculée à la reprise.
- La fenêtre SMS existante (lun-ven 9-17 h, sam 10-13 h, dim bloqué), le gate OUTREACH, la preuve CASL revue,
  le STOP, le plafond 25/jour, les doublons 72 h, l'idempotence et la pause sur échecs restent inchangés.
- `validateSmsBody` refuse tout jeton `[MAJUSCULES]` non résolu.
- Coordonnées LCAP : `TIME_AWARE_SMS_CONFIG.casl_contact_line` (adresse postale approuvée + unpro.ca/contact).

## Blocage connu
Texte de base ≈ 413–421 septets = 3 segments. Le contrôle existant limite la prospection à 1 segment
(160 septets) : ce SMS sera refusé tant qu'une version courte n'est pas approuvée. Aucun assouplissement.
Aucun calendrier des jours fériés n'existe dans la fenêtre canonique.

## Appliquer (après approbation explicite de déploiement)
1. `cp supabase/staged/time-aware-first-sms/timeAwareFirstSms.ts supabase/functions/_shared/`
2. `patch -p1 < supabase/staged/time-aware-first-sms/time-aware-first-sms.patch` (refuser si une section échoue).
3. `bunx vitest run src/test/time-aware-first-sms-staged.test.ts`.
