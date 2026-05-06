# CRM Partenaire UNPRO + Permission Client + Nouvelle Structure Commissions

## Vue d'ensemble

Deux chantiers liés:
1. **Restructuration commissions** (Affilié 10%/24mo, Partenaire Certifié 20%/24mo + 5% résiduel à vie sous conditions)
2. **CRM Partenaire complet** avec pipeline, rappels, listes de prospection, et **système de consentement bloquant** pour SMS/email

Règle absolue: aucun envoi automatisé sans `consent_status` valide. UI désactive les boutons, edge functions rejettent l'envoi côté serveur.

---

## Phase 1 — Migrations Supabase

### 1.1 Mise à jour table `partners`
```sql
ALTER TABLE partners
  ADD COLUMN partner_type text DEFAULT 'affiliate'
    CHECK (partner_type IN ('affiliate','certified_partner','territory_partner'));

-- Recalcul commissions par défaut selon type
UPDATE partners SET
  commission_rate_first_24_months = 0.10,
  commission_rate_lifetime = 0.00
WHERE partner_type = 'affiliate';

UPDATE partners SET
  commission_rate_first_24_months = 0.20,
  commission_rate_lifetime = 0.05
WHERE partner_type = 'certified_partner';
```
Defaults pour nouveaux affiliés: 0.10 / 0.00. Certifiés: 0.20 / 0.05.

### 1.2 Nouvelles tables CRM
- `partner_leads` — fiche prospect avec `lead_status`, `consent_status`, score, prochain rappel
- `partner_lead_activities` — log appels/emails/SMS/notes (append-only)
- `partner_tasks` — rappels/tâches avec `due_at`, `priority`, `status`
- `lead_consent_logs` — audit trail consentement (immuable)

Schéma exact tel que fourni dans la spec.

### 1.3 Indices et triggers
- Index sur `(partner_id, lead_status)`, `(partner_id, next_follow_up_at)`, `(lead_id, created_at)`
- Trigger `updated_at` auto sur `partner_leads`
- Trigger sur changement `consent_status` → insert dans `lead_consent_logs`

### 1.4 RLS
- `partner_leads`: SELECT/INSERT/UPDATE où `partner_id = current_partner_id(auth.uid())`. Pas de DELETE.
- `partner_lead_activities`, `partner_tasks`: même règle, scope partenaire.
- `lead_consent_logs`: SELECT seulement pour le partenaire propriétaire; INSERT par trigger/edge function uniquement.
- Admin (`has_role(auth.uid(),'admin')`): accès complet.
- Helper SQL `current_partner_id(uuid)` via SECURITY DEFINER.

---

## Phase 2 — Edge Functions

Toutes les fonctions d'envoi font cette vérification serveur:
```ts
const VALID = ['verbal_permission','written_permission','web_form_opt_in','existing_business_relationship'];
if (!VALID.includes(lead.consent_status) || lead.opt_out_at) {
  return 403 "Permission client requise avant l'envoi.";
}
```

Fonctions à créer:
- `generate-partner-leads` — query enrichie (filtre métier/ville/RBQ/site/avis/AIPP/territoire/déjà-contacté), insère en batch avec `consent_status='permission_required'`
- `save-partner-lead` — création manuelle
- `update-lead-status` — transitions pipeline + log activity
- `log-lead-activity` — appel/note/email logged manuellement
- `record-lead-consent` — change `consent_status`, écrit `consent_proof`, log dans `lead_consent_logs`
- `schedule-partner-reminder` — crée `partner_tasks`
- `send-partner-email` — vérifie consentement, envoie via infra email Lovable, log activity
- `send-partner-sms` — vérifie consentement, envoie via Twilio connector, ajoute footer "STOP pour ne plus recevoir"
- `convert-lead-to-contractor` — crée profil contracteur, attribue commission au partenaire, marque lead `actif`
- Webhook Twilio inbound `STOP` → set `opt_out_at`, `consent_status='opted_out'`, `do_not_contact`

---

## Phase 3 — Routes & Pages

```text
/partenaire/crm           → Dashboard CRM (KPIs + Kanban résumé)
/partenaire/leads         → Tableau filtrable de tous les leads
/partenaire/prospection   → Générateur de listes (filtres + preview + import)
/partenaire/rappels       → Calendrier + liste rappels (today/late/week)
/partenaire/pipeline      → Vue Kanban full-screen
/partenaire/contacts      → Carnet de contacts autorisés (consent valide)
/partenaire/leads/:id     → Fiche lead détaillée (drawer ou page)
```

Toutes protégées par `PartnerGuard` existant.

---

## Phase 4 — Composants UI

### Dashboard CRM (`/partenaire/crm`)
**Top cards (KPIs):** Leads générés · Permission requise · Contacts autorisés · Rappels aujourd'hui · Démos planifiées · Conversions · Commissions potentielles

**Sections:**
- `KanbanPipeline` — 12 colonnes (Nouveau prospect → Permission à obtenir → Contact autorisé → Contacté → À rappeler → Intéressé → Démo planifiée → En onboarding → Paiement en attente → Actif → Refusé → Perdu)
- `RemindersToday` — widget rappels du jour
- `RecentActivities` — flux 10 dernières activités

### Fiche Lead (`LeadDetailDrawer`)
Sections: Infos entreprise · **Badge consentement** (Rouge/Jaune/Vert/Noir) · Pipeline (select status) · Coordonnées · Score potentiel · Notes · Rappels · Activités (timeline) · Actions rapides · Conversion UNPRO

**Boutons d'action** (avec gating):
- Toujours actifs: Appeler (tel:), Marquer permission, Note, Tâche, Planifier démo, Archiver, Ne plus contacter, Convertir
- **Désactivés si pas de consentement valide:** Envoyer courriel, Envoyer SMS → tooltip "Permission requise avant l'envoi"

### Générateur de prospection (`/partenaire/prospection`)
Form filtres → preview résultats → "Importer comme prospects" → insert avec `consent_status='permission_required'` + bannière "Ce sont des prospects, pas des contacts autorisés"

### Composants génériques
- `ConsentBadge` (rouge/jaune/vert/noir + label)
- `LeadStatusSelect` (12 statuses pipeline)
- `ReminderForm` (date/heure/type/note/priorité)
- `ActivityTimeline`
- `LeadKanbanCard`
- `ConsentProofModal` (méthode + texte preuve obligatoire)

---

## Phase 5 — Mise à jour textes & landing partenaires

Pages à mettre à jour:
- `/partenaires-certifies` (landing publique)
- Onboarding partenaire (formulaire d'application)
- Simulateur de revenus (`PartnerRevenueSimulator` si existe)
- Dashboard partenaire (cards de commissions)
- Emails automatiques d'application/approbation

**Nouveaux textes:**
- Affilié: "Recommandez UNPRO et obtenez des revenus récurrents." — 10% / 24 mois
- Partenaire Certifié: "Développez un portefeuille d'entrepreneurs et bâtissez des revenus récurrents à long terme." — 20% / 24 mois + 5% à vie (sous condition de 10 nouveaux entrepreneurs actifs/an)
- Mention exclusion: services enterprise, frais setup, campagnes internes

---

## Phase 6 — Conformité

- Bannière interne sur `/partenaire/crm`: "Vous devez obtenir la permission du client avant d'envoyer un message. UNPRO conserve l'historique de consentement afin de protéger les partenaires, les entrepreneurs et la plateforme."
- Footer SMS auto: "Répondez STOP pour ne plus recevoir de messages."
- Footer email: lien désinscription (utilise infra `email_unsubscribe_tokens` existante)
- `lead_consent_logs` immutable (pas de UPDATE/DELETE policy)

---

## Détails techniques clés

**Helper consentement (front + back):**
```ts
export function hasValidConsent(lead): boolean {
  if (lead.opt_out_at) return false;
  return ['verbal_permission','written_permission',
          'web_form_opt_in','existing_business_relationship']
         .includes(lead.consent_status);
}
```

**Hooks React Query:**
- `usePartnerLeads(filters)`, `useLead(id)`, `useLeadActivities(id)`
- `usePartnerTasks({ window: 'today'|'late'|'week' })`
- `useUpdateLeadStatus`, `useRecordConsent`, `useSendLeadEmail`, `useSendLeadSms`, `useConvertLead`

**Stack:** réutilise patterns existants (`useContractorLeads`, `LeadKanbanView`, layout `/pro/leads`) — adapté au scope partenaire.

**Edge functions:** validation Zod sur tous les inputs, `verify_jwt = false` par défaut, `getClaims()` en code, `corsHeaders` partout.

---

## Livrables (ordre d'implémentation)

1. Migration commissions + `partner_type` + ajustement existing partners
2. Migrations CRM (4 tables + RLS + triggers)
3. Edge function `record-lead-consent` + `update-lead-status` + `log-lead-activity`
4. Edge function `generate-partner-leads` + `save-partner-lead`
5. Edge functions `send-partner-email` + `send-partner-sms` (avec gating serveur)
6. Edge function `schedule-partner-reminder` + `convert-lead-to-contractor`
7. Pages CRM + Kanban + Fiche lead + Drawer
8. Page prospection + générateur de listes
9. Page rappels + widget today
10. Update landing `/partenaires-certifies` + simulateur + textes commissions
11. Webhook STOP Twilio + opt-out flow

---

## Critères de succès

- Partenaire peut: générer prospects → obtenir permission → contacter → suivre pipeline → convertir
- Boutons SMS/Email **physiquement désactivés** sans consentement valide (UI + serveur)
- `lead_consent_logs` audit complet et immuable
- Affiliés: 10%/24mo, Certifiés: 20%/24mo + 5% à vie
- Commissions résiduelles auto-suspendues si <10 conversions/an (job futur, hors scope phase 1)
- Aucune commission existante (30%/10%) ne reste en base
