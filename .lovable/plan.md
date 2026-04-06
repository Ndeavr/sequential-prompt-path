
# Module Outbound CRM UNPRO — Plan de build

## Constat

Le projet possède déjà 20 tables `outreach_*` et 25 tables `prospect_*`. Le nouveau module "outbound CRM" ajoute une couche CRM native avec pipeline, scoring, séquences, mailboxes et landing pages.

**Stratégie** : Créer les tables `outbound_*` dédiées (séparées de l'existant `outreach_*`) et les pages/composants associés. Build en 4 phases pour livrer progressivement.

---

## Phase 1 — Foundation (cette session)

### Database (migration)
Créer les 20 tables outbound principales :
- `outbound_companies`, `outbound_contacts`, `outbound_leads`
- `outbound_campaigns`, `outbound_sequences`, `outbound_sequence_steps`
- `outbound_messages`, `outbound_events`, `outbound_replies`
- `outbound_suppressions`, `outbound_mailboxes`, `outbound_mailbox_warmup`
- `outbound_landing_pages`, `outbound_ai_scores`, `outbound_ai_personalizations`
- `outbound_notes`, `outbound_tasks`, `outbound_tags`, `outbound_lead_tags`, `outbound_owners`
- Avec RLS admin-only, indexes, relations FK

### Mock Data
- 4 campagnes (Laval/Isolation, Montréal/Toiture, Longueuil/Électricité, Québec/Condo)
- 3 mailboxes (alex@, partenariats@, yan@go.unpro.ca)
- 40 leads réalistes, 3 séquences, événements CRM variés

### Pages (Phase 1)
- `PageOutboundDashboard` — Vue d'ensemble avec stats cards + campagnes actives
- `PageOutboundCampaigns` — Liste campagnes avec filtres
- `PageOutboundLeadsQueue` — File d'attente leads avec tri ville/spécialité

### Composants (Phase 1)
- `CardOutboundVolumeToday`, `CardOutboundReplyRate`, `CardOutboundBounceRate`
- `TableOutboundLeadQueue`, `TableOutboundCampaignPerformance`
- `FilterBarOutboundMaster` (ville, spécialité, statut, campagne)
- `BadgeCRMStatus`, `BadgeMailboxHealth`, `BadgeCampaignHealth`

### Routes
- `/admin/outbound` → Dashboard
- `/admin/outbound/campaigns` → Campagnes
- `/admin/outbound/leads` → Leads Queue

---

## Phase 2 — CRM & Lead Profile (session suivante)

- `PageOutboundLeadProfile` avec timeline CRM complète
- `DrawerLeadFullProfile`, `PanelCRMTimelineLead`
- `PageOutboundSequences` avec éditeur
- `FormSequenceStepEditor`, `CardSequenceStepPreview`
- Actions CRM : assign owner, add note, update status, suppress

---

## Phase 3 — Mailboxes, Landing Pages, Suppression (session suivante)

- `PageOutboundMailboxes` avec health monitoring
- `PageOutboundLandingPages` avec générateur go.unpro.ca
- `PageOutboundSuppressionCenter`
- `PanelMailboxWarmupStatus`, `FormMailboxConfiguration`
- `FormLandingPageTemplateEditor`

---

## Phase 4 — Analytics, AI, Automation (session suivante)

- `PageOutboundAnalytics` avec widgets de performance
- `PageOutboundSettings`
- Edge Functions : import-leads, score-lead, generate-sequence, send-step
- `PanelAILeadScoring`, `PanelAIPersonalizationEngine`
- `PanelAutomationExecutionLogs`
- Webhooks open/click/reply/bounce

---

## Ce qui ne change PAS
- Tables `outreach_*` et `prospect_*` existantes (pas de conflit)
- Pages admin existantes `/admin/outreach/*`
- Navigation et routes existantes
- Auth flow et RLS existant
