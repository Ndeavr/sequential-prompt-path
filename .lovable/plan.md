# Séquence SMS Curiosité 12 (Entrepreneurs)

Objectif: planter l'idée "les 3 soumissions ne suffisent plus" chez l'entrepreneur via 12 SMS sur 12 jours, avec reveal UNPRO au SMS #11 et CTA au #12.

Le moteur SMS existe déjà (`sms-prospect-send` via Twilio gateway, `/admin/prospect-sms`, tables `sms_campaigns`, `sms_messages`, `sms_templates`, `prospect_pages`). On ajoute UNE nouvelle séquence multi-touches branchée sur le cockpit existant. Aucun nouveau moteur SMS, aucun nouveau provider.

## 1. Migration (DB)

Nouvelle table dédiée pour ne pas polluer `curiosity_sequences` (déjà utilisée pour un autre flux):

```text
contractor_curiosity_sms_sequences
  id uuid pk
  prospect_id uuid fk prospect_pages(id) on delete cascade
  phone text not null
  status text  -- active | paused | completed | stopped | failed
  current_step int default 0   -- 0 = pas encore envoyé, max 12
  next_send_at timestamptz default now()
  last_sent_at timestamptz
  unsubscribed_at timestamptz
  enrolled_by uuid (admin)
  meta jsonb (company, city, service, link)
  created_at, updated_at

contractor_curiosity_sms_events
  id uuid pk
  sequence_id uuid fk
  step int (1..12)
  template_key text  -- 'curiosity_01' ... 'curiosity_12'
  status text  -- queued | sent | failed | skipped_stop
  twilio_sid text
  error text
  sent_at timestamptz default now()
```

GRANTS standards (`authenticated` SELECT/INSERT/UPDATE/DELETE, `service_role` ALL), RLS admin-only (`has_role(auth.uid(),'admin')`), service_role bypass.

Seed des 12 templates dans `sms_templates` avec `template_key = curiosity_01..12`, `audience_type='contractor'`, body avec placeholders `{{company}}`, `{{link}}`. Contenu = texte exact fourni par l'utilisateur (12 messages).

Planning J1/J3/J5/J7/J10/J12 → on déclenche les 12 SMS sur ces 6 jours actifs (les autres jours servent de respiration). Mapping retenu:
- J1 → #1
- J2 → #2
- J3 → #3
- J4 → #4
- J5 → #5
- J7 → #6, #7, #8
- J10 → #9, #10, #11
- J12 → #12

(Cadence "puissante" demandée: les 6 jours-clés contiennent les SMS les plus importants; reveal #11 à J10, CTA #12 à J12.) Si tu préfères 1 SMS par jour je peux ajuster.

## 2. Edge functions

- `sms-curiosity-enroll` (admin POST): crée la séquence pour un `prospect_id`, vérifie le numéro, refuse les opt-outs (`sms_opt_outs`), inscrit avec `next_send_at = now()` step 0.
- `sms-curiosity-tick` (CRON `*/15 * * * *` via pg_cron): lit toutes les séquences `status='active' AND next_send_at <= now()`, pour chaque: calcule prochain step selon planning J1→J12, rend le template (`{{company}}`, `{{link}}`), envoie via Twilio gateway (réutilise `connector-gateway.lovable.dev/twilio/Messages.json`), log dans `contractor_curiosity_sms_events` + `sms_messages`, MAJ `current_step` et `next_send_at`. Termine à step 12. Idempotent par `(sequence_id, step)`.
- `sms-curiosity-unsubscribe` (webhook STOP existant ou réutilise handler actuel): set `status='stopped'`.

Sécurité: validation Zod sur l'enroll, JWT admin, throttle, suppression check, hard cap 12.

## 3. Cron

`select cron.schedule('sms-curiosity-tick','*/15 * * * *', $$ select net.http_post(...) $$);` posé via `supabase--insert` (pas migration).

## 4. UI — Admin (réutilise `/admin/prospect-sms`)

Ajout dans `PageAdminProspectSMS.tsx`:
- Nouvelle section "Séquence Curiosité 12" en haut du panneau prospect:
  - Bouton "Inscrire à la séquence Curiosité 12" sur chaque prospect (action: `sms-curiosity-enroll`).
  - Toggle `dryRun` (preview-only: rend les 12 SMS dans un Drawer avec date d'envoi, sans envoi réel).
  - Badge état séquence par prospect (step X/12, prochain envoi).
- Nouvel onglet "Curiosité 12" listant `contractor_curiosity_sms_sequences` avec colonnes: company, phone, step, next_send_at, status, dernier event, bouton Pause/Resume/Stop.
- Drawer "Aperçu 12 SMS" rendant chaque template avec placeholders résolus.

## 5. Anti-spam / conformité

- Mention STOP dans chaque SMS (déjà standard projet).
- Respect `sms_opt_outs` à chaque tick.
- Fenêtre d'envoi 9h–20h America/Toronto (réutilise `outbound_send_window_policy` si dispo, sinon check inline). Si hors fenêtre → reporter `next_send_at` à 9h.
- Cap quotidien sender hérité de `outbound_global_settings`.

## 6. Hors scope

- Pas de modification du moteur prospect_sms existant.
- Pas de variante A/B sur cette séquence (texte verrouillé par toi).
- Pas de séquence propriétaire (audience contractor only, confirmé).

## 7. Validation

- Test dry-run sur 1 prospect: les 12 SMS rendus correctement.
- `supabase--curl_edge_functions` sur `sms-curiosity-enroll` puis `sms-curiosity-tick` (forçant `next_send_at=now()`) → vérifier 1 envoi réel sur ton numéro de test.
- Vérifier event loggé dans `contractor_curiosity_sms_events` + `sms_messages`.

## Détails techniques

- Twilio: même gateway que `sms-prospect-send`. `From` = `TWILIO_FROM_NUMBER` env. `Body` rendu côté edge.
- Phone E.164 validation (libphonenumber-style regex `^\+[1-9]\d{7,14}$`).
- Idempotence: `UNIQUE(sequence_id, step)` sur `contractor_curiosity_sms_events`.
- Compteur step pilote le planning (table de mapping en TS dans la function, pas en DB pour rester ajustable).
