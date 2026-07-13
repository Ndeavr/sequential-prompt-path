## Objectif

Générer le **premier paiement 1 $** réel via le pipeline existant. Aucune nouvelle feature — on **mesure, batch et optimise** ce qui existe déjà (`launch-*`, `sniper-*`, `PageAdminLaunchWarRoom`, `PageSniperCommandCenter`).

## Livrables (5 blocs)

### 1. Dashboard funnel temps réel — `/admin/first-dollar`
Une seule page qui affiche les 11 étapes en cascade :

```text
Scraped → Valid Mobile → SMS Sent → Delivered → Clicked
→ Landing Viewed → Alex Started → Profile Started
→ Checkout Started → Payment ✓ → Activated
```

- 3 onglets : **Aujourd'hui / 7 jours / Total**
- Chaque étape : compte, % conversion vs étape 1, % drop-off vs étape précédente
- Badge rouge si étape = 0
- Source : vues SQL agrégeant `contractor_funnel_events` + `launch_leads` + `launch_pipeline_events` + `contractor_recruitment_messages` + `contractor_recruitment_replies` + `billing_checkout_sessions`
- Refresh 15 s

### 2. Batch Sender SMS — `/admin/first-dollar/batches`
- Bouton **Envoyer 25 SMS** (taille par défaut, réglable 5–50)
- Pipeline : sélectionne 25 leads `status='SCORED'` triés par score → crée un `sms_batch` (nouvelle table) → invoque `launch-agent-outreach` lead par lead
- Statuts par ligne : Pending / Queued / Sent / Delivered / Clicked / Converted (déjà présents dans `launch_leads.state`)
- **Pause obligatoire** après chaque batch : bouton "Approuver le prochain batch" verrouillé tant que `sms_batch.reviewed_at is null`
- Colonne "Template" (A/B/C) assignée round-robin

### 3. Copy SMS A/B/C
- Nouvelle table `sms_templates_first_dollar` (id, code A|B|C, body, active)
- Seed avec les 3 textes exacts fournis (SMS A / B / C)
- `launch-agent-outreach` sélectionne le template selon `lead.template_code` au lieu du copy en dur
- Placeholders : `[FIRSTNAME]`, `[LINK]` (résolution existante)

### 4. Landing + Alex — trim seulement (pas de nouvelle page)
- `PageProActivate.tsx` (route landing SMS actuelle) : masquer sections `features`, `explanations`, `marketing`; garder Hero + 4 checkmarks + CTA `1 $ COMMENCER`
- `alexModes.ts` → mode `first_dollar_qualification` : **3 questions max** exactement (secteurs / type projets / accepte nouveaux clients), puis message de clôture + CTA `ACTIVER 1 $` qui ouvre le checkout existant
- Aucun changement au flow Stripe/webhook (déjà branché : `stripe-webhook` → `launch-stripe-webhook` → `launch-agent-activation`)

### 5. Vérification paiement + rapport quotidien
- Ajouter checks dans dashboard bloc **Stripe Health** (dernier checkout, webhook reçu, activation) — lecture de `billing_webhook_events`, `launch_pipeline_events`
- Nouvelle edge function `first-dollar-daily-report` (cron 8 h) : insère 1 ligne dans `first_dollar_daily_reports` avec compte par étape + identifie le plus gros drop-off; visible en haut du dashboard

## Détails techniques

**Migration** (1 fichier) :
- `sms_templates_first_dollar(id, code, body, active, created_at)` + seed A/B/C
- `sms_batches(id, size, sent_count, delivered_count, clicked_count, converted_count, template_distribution jsonb, created_by, created_at, reviewed_at, notes)`
- `first_dollar_daily_reports(id, report_date unique, metrics jsonb, top_dropoff text, created_at)`
- Vue `v_first_dollar_funnel` (11 étapes × période)
- GRANT authenticated SELECT sur les vues, admin-only via RLS `has_role(uid,'admin')`

**Fichiers front** :
- `src/pages/admin/PageAdminFirstDollar.tsx` (dashboard)
- `src/pages/admin/PageAdminFirstDollarBatches.tsx` (batch sender)
- `src/hooks/useFirstDollarFunnel.ts`
- `src/hooks/useSmsBatches.ts`
- Route ajoutée dans `src/app/router.tsx` + entrée admin sidebar
- Trim `src/pages/pro/PageProActivate.tsx`
- Ajout mode `first_dollar_qualification` dans `src/config/alexModes.ts`

**Edge functions** :
- `first-dollar-send-batch` (nouvelle) — sélectionne 25 leads, assigne template round-robin, invoque `launch-agent-outreach`
- `first-dollar-daily-report` (nouvelle, cron)
- Modif `launch-agent-outreach` : lecture template depuis DB au lieu de constante

**Zero fluff** : on ne recode pas les agents scout/enrich/checkout/activation/payment. On empile juste **observabilité + gouvernance batch + copy paramétrable** au-dessus.

## Critère de succès
1 entrepreneur réel × 1 paiement 1 $ réussi × 1 profil activé, tous visibles sur `/admin/first-dollar`.
