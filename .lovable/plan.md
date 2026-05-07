## Plan: UNPRO Exterior Trades Acquisition + Outreach Command Center

### Contexte critique
Beaucoup d'infrastructure existe déjà:
- **Scraping**: `sniper-import-targets`, `sniper-enrich-target`, `enrich-prospect`, `war-prospecting-engine`, `execute-prospect-pipeline`
- **Email**: système Lovable Cloud natif (`process-email-queue`, queue pgmq)
- **SMS**: `sniper-queue-send`, `acq-sms-send`, `send-sms-prospect`
- **Tracking**: `track-outreach-open`, `track-outreach-click`, `outreach-unsubscribe`
- **Dashboards**: `/admin/sniper`, `/admin/outbound/*`, `/admin/recruitment/*`, `PageAdminEmailCampaigns`

Au lieu de tout recoder, on va **étendre** ces systèmes pour couvrir les 10 métiers extérieurs QC + construire un **Campaign Control Center unifié** (5 écrans) qui consolide la vue ops dispersée actuellement.

---

### Phase 1 — Scraper QC Métiers Extérieurs (edge function)

**Edge function: `scrape-qc-exterior-trades`** (Deno, planifié via pg_cron quotidien)

Logique:
- Itère 10 métiers × 5 villes (Laval, Montréal, Longueuil, Brossard, Repentigny)
- Sources publiques via Firecrawl (déjà configuré): pagesjaunes.ca, canada411.ca, bbb.org/ca
- Vérification RBQ via `rbq.gouv.qc.ca` (license lookup par nom)
- Google Places si `GOOGLE_PLACES_API_KEY` présent (sinon skip)
- Rate limit: 2s entre requêtes (concurrence=2 via `Promise` semaphore)
- Backoff exponentiel sur 429/503, skip sur 403
- Max 5 pages/query, max 200 records/run

Validation:
- Indicatifs QC uniquement: 438, 450, 514, 579, 581, 819, 873
- Reject: ville hors QC, `company_name < 3` chars, placeholders
- Dedup primaire: `normalize(company_name) + normalize(phone)` → merge en gardant champs les plus riches

Schema d'écriture: insère dans `contractor_prospects` existant (réutilise `enrichment_status`, `extraction_confidence`, `source_name`). Ajoute:
- `trade_category` (nouveau enum: roofing, pavers, asphalt, landscaping, snow, fences, decks, foundation, gutters, ext_painting)
- `rbq_verified boolean`
- `rbq_license text`
- `avg_job_value_cad integer` (pré-calculé selon trade)

Idempotence: clé unique sur `(normalize(company_name), normalize(phone))`. Re-run même jour = no-op.

Cron: `0 6 * * *` (6h Quebec time), un trade toutes les 5min.

**Scoring auto** (réutilise `acq-generate-score` existant + `aipp-real-scan`):
- Score 0–100 (reviews 40, website 20, SEO 20, gap 20)
- `lost_revenue_monthly_cad = avg_job_value × leakage_rate × estimated_missed_jobs`
- Sauvegardé dans `contractor_aipp_scores` (table existante)

Export quotidien: edge function `export-qc-leads-daily` génère JSON+CSV dans Supabase Storage `/data/leads_{trade}_{YYYY-MM-DD}.json` (consultable via signed URL admin).

---

### Phase 2 — Tables nouvelles (séquences day_0 / day_2 / day_5)

```sql
-- séquence d'outreach par contractor
CREATE TABLE campaign_contacts (
  id uuid PK,
  prospect_id uuid REFERENCES contractor_prospects(id),
  segment text CHECK (segment IN ('A','B','C')),  -- Ghost/Incomplete/Established
  score numeric,
  lost_revenue_monthly integer,
  status text DEFAULT 'pending',  -- pending|active|engaged|replied|clicked|opted_out|completed|failed
  current_day text DEFAULT 'day_0',
  sequence_started_at timestamptz,
  sequence_completed_at timestamptz,
  -- tracking par jour (email/sms sent/opened/delivered)
  day_0_email_sent_at, day_0_email_opened_at, day_0_sms_sent_at, day_0_sms_delivered_at,
  day_2_email_sent_at, day_2_email_opened_at, day_2_sms_sent_at,
  day_5_email_sent_at, day_5_sms_sent_at,
  reply_received_at, reply_channel, reply_preview,
  link_clicked_at, link_clicked_url,
  book_url_clicked boolean DEFAULT false,
  score_page_clicked boolean DEFAULT false,
  opted_out boolean DEFAULT false,
  created_at, updated_at
);

CREATE TABLE campaign_send_log (...)  -- append-only audit
CREATE TABLE campaign_hot_leads (...)  -- répliques + assignation
```
RLS: admin only (`has_role(auth.uid(),'admin')`).

Segmentation auto à l'insertion (trigger):
- A = no website, no email
- B = website, no email
- C = website + email

---

### Phase 3 — Agent orchestrateur (edge function)

**`campaign-agent-loop`** déclenché toutes les 5min via pg_cron:

```
for each campaign_contact WHERE status IN ('active','engaged'):
  if status IN ('replied','clicked','opted_out'): mark completed, skip
  if now() < scheduled_day_at OR sent_today(day): skip
  if now() outside [07:00, 21:00] America/Toronto: skip
  if weekday() == 6 (Sunday): skip
  if daily_count(sms) >= 50 or daily_count(email) >= 100: skip
  
  send via:
    - email → enqueue dans Lovable Cloud email queue (gabarits day_N depuis sequence)
    - SMS → invoque sniper-queue-send (Twilio existant)
  
  log dans campaign_send_log
  schedule day_N+2 ou day_N+5 selon règle
  if 3 failures consécutifs sur même contact: status='failed'
```

Règles intelligentes:
- Day 0 ouvert → skip day 2 email, garde SMS
- Day 5 = email + SMS toujours envoyés (final touch)

**Tracking pixels** (existants): `track-outreach-open`, `track-outreach-click` mis à jour pour écrire dans `campaign_contacts`.

**Détection réplique**:
- Email replies: webhook Resend déjà capté → ajout handler qui marque `status='replied'`, crée `campaign_hot_leads`, ping Slack si `SLACK_WEBHOOK_URL` configuré
- SMS replies: webhook Twilio → idem
- STOP/STOP/UNSUBSCRIBE détecté → `opted_out=true`

---

### Phase 4 — Campaign Control Center UI (5 écrans)

Route: `/admin/campaign-center` (dark ops theme #080808 + #E8321A).

**Écran 1 — Launch Control** (`PageCampaignLaunch`)
- KPI strip live (réutilise `KpiStrip` existant): Active / Sent today / Opens / Clicks / Replies / Opted out
- Sélecteur segment (All/A/B/C) + preview count
- Cost preview: `$X Twilio + $0 Lovable Email`
- Bouton **▶ Launch Campaign** → input "CONFIRMER" requis pour déverrouiller
- Boutons emergency: ⏸ Pause All / ⏹ Stop All

**Écran 2 — Live Feed** (`PanelCampaignLiveFeed`)
- Subscribe Supabase realtime sur `campaign_send_log`
- Format: `[09:04:12] ✉️ Email envoyé → {company} (Jour N)`
- Code couleurs: dim white (sent), yellow (opened), blue (clicked), red pulse (replied), gray strikethrough (opt-out)

**Écran 3 — Pipeline Kanban** (`CampaignPipelineBoard`)
- Colonnes: Pending | Day 0 Sent | Opened | Clicked | 🔥 Replied | Completed
- Cards: nom + badge segment + score + revenue
- Click → drawer historique séquence + texte réplique
- Drag-to-move = override manuel

**Écran 4 — Hot Leads** (`PageCampaignHotLeads`)
- Table: company / channel / preview / replied_at / assigned_to / notes
- Actions: [Mark as Booked] [Schedule Follow-up] [Add Note] [Export CSV]

**Écran 5 — Analytics** (`PageCampaignAnalytics`)
- Recharts: Line (sends/opens/clicks/replies dans le temps)
- Bar: perf par segment A/B/C
- Bar: email vs SMS reply rate
- Table: best subject lines par open rate

Composants réutilisés: `KpiStrip`, `PipelineBoard`, `RecentEventsFeed`, `CampaignPerformancePanel` (déjà au `/components/command-center/`).

---

### Phase 5 — Sécurité & contraintes (hard rules dans `campaign_settings` table)

```sql
CREATE TABLE campaign_settings (
  id int PK DEFAULT 1,
  daily_sms_cap int DEFAULT 50,
  daily_email_cap int DEFAULT 100,
  send_window_start time DEFAULT '07:00',
  send_window_end time DEFAULT '21:00',
  send_on_sunday boolean DEFAULT false,
  max_failures_before_stop int DEFAULT 3
);
```
Modifiable depuis `/admin/campaign-center/settings`.

Footer auto sur tous les emails: `Pour ne plus recevoir nos messages: https://unpro.ca/stop?id={contractor_id}`
Footer auto sur tous SMS: `Répondez STOP pour ne plus recevoir.`

---

### Phase 6 — Chip "Je suis un entrepreneur" sur landing

Tu as aussi mentionné cette demande au début: ajouter une chip bleue **"Je suis un entrepreneur"** sur la home (`HeroSectionAlexFirst`) qui linke vers `/contractor-ai-growth` (la page créée plus tôt).

---

### Livrables techniques

**Migrations SQL** (1 seul fichier):
1. `campaign_contacts` + `campaign_send_log` + `campaign_hot_leads` + `campaign_settings`
2. Ajout colonnes à `contractor_prospects`: `trade_category`, `rbq_verified`, `rbq_license`, `avg_job_value_cad`
3. Trigger segmentation auto
4. RLS admin
5. Cron jobs (scrape 6h, agent-loop /5min)

**Edge functions nouvelles**:
- `scrape-qc-exterior-trades`
- `export-qc-leads-daily`
- `campaign-agent-loop`
- `campaign-launch` (POST start/pause/stop)
- `campaign-status` (GET aggregate)

**Edge functions étendues**:
- `track-outreach-open`, `track-outreach-click`, `outreach-unsubscribe` → écrire aussi dans `campaign_contacts`
- `process-email-queue` (existe) — pas modifié
- Webhooks email/SMS reply → marquage `replied` + hot lead

**Pages frontend**:
- `src/pages/admin/campaign/PageCampaignLaunch.tsx`
- `src/pages/admin/campaign/PageCampaignLiveFeed.tsx`
- `src/pages/admin/campaign/PageCampaignPipeline.tsx`
- `src/pages/admin/campaign/PageCampaignHotLeads.tsx`
- `src/pages/admin/campaign/PageCampaignAnalytics.tsx`
- `src/pages/admin/campaign/PageCampaignSettings.tsx`
- Layout: `src/layouts/CampaignCenterLayout.tsx` (sidebar 5 écrans)

**Hooks**:
- `useCampaignContacts.ts`, `useCampaignLiveFeed.ts` (realtime), `useCampaignAnalytics.ts`

**Edit landing**:
- `HeroSectionAlexFirst.tsx`: ajout chip bleue "Je suis un entrepreneur"

**Connecteurs requis** (à confirmer):
- Twilio (déjà connecté visiblement vu `acq-sms-send`)
- Firecrawl (déjà connecté)
- Lovable Email (natif, pas besoin de Resend)

---

### Hors scope (volontairement)
- Pas de Resend (on utilise Lovable Email natif comme tu as choisi)
- Pas de Slack webhook obligatoire (optionnel via secret `SLACK_WEBHOOK_URL`)
- Pas de Next.js (le projet est Vite + React, on garde la stack existante)
- Pas de Google Places hard requirement (skip si secret absent)

### Critères de succès
1. Le scraper tourne quotidien à 6h, peuple `contractor_prospects` avec 10 métiers × 5 villes, ≤200 records/run, dedup OK
2. Scoring auto exécuté dans la foulée
3. Lancement campagne via UI: 50 contractors → séquence day_0/2/5 respectée
4. Replies détectées automatiquement → hot leads créés → Slack pingé
5. KPIs live, kanban drag-to-move, opt-out instantané
6. Hard caps respectés (50 SMS/j, 100 emails/j, fenêtre 7h-21h, no Sunday)
7. Chip "Je suis un entrepreneur" visible sur landing → linke vers `/contractor-ai-growth`

Approuves-tu ce plan? J'exécute en mode build dès accord.