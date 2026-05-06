# Plan — Accès CRM Partenaire (Inscription, Termes, Approbation, Lead Isolation)

## 1. Migrations Supabase

### 1.1 Rôles partenaire
Étendre `partners.partner_type` valeurs autorisées:
- `affiliate`, `ambassador`, `certified_partner`, `territory_partner`, `partner_admin`

### 1.2 Statut application
```sql
ALTER TABLE partners
  ADD COLUMN partner_application_status text NOT NULL DEFAULT 'pending'
  CHECK (partner_application_status IN ('pending','under_review','approved','rejected','suspended')),
  ADD COLUMN application_submitted_at timestamptz,
  ADD COLUMN application_reviewed_at timestamptz,
  ADD COLUMN application_reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN admin_notes text,
  ADD COLUMN application_data jsonb DEFAULT '{}'::jsonb;
```
Backfill: `partner_status = 'approved'` → `partner_application_status = 'approved'`.

### 1.3 Acceptation des termes
```sql
CREATE TABLE partner_terms_acceptance (
  id uuid PK default gen_random_uuid(),
  partner_id uuid REFERENCES partners(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  role text NOT NULL,
  terms_version text NOT NULL,
  accepted boolean DEFAULT false,
  accepted_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);
```
RLS: SELECT own (partner_id in current partner). INSERT own. No UPDATE/DELETE (immutable).

### 1.4 Audit logs partenaire
```sql
CREATE TABLE partner_audit_logs (
  id uuid PK default gen_random_uuid(),
  partner_id uuid REFERENCES partners(id),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  metadata jsonb DEFAULT '{}',
  ip_address text,
  created_at timestamptz DEFAULT now()
);
```
RLS: SELECT own + admin. INSERT via security-definer function only.

### 1.5 Lead isolation (`partner_leads`)
```sql
ALTER TABLE partner_leads
  ADD COLUMN created_by uuid REFERENCES auth.users(id),
  ADD COLUMN assigned_by uuid REFERENCES auth.users(id),
  ADD COLUMN lead_origin text DEFAULT 'partner_added'
    CHECK (lead_origin IN ('partner_added','admin_assigned','partner_generated','imported_with_permission')),
  ADD COLUMN visibility_scope text DEFAULT 'assigned_partner_only';
```
Remplacer policy SELECT existante:
```sql
DROP POLICY IF EXISTS "..." ON partner_leads;
CREATE POLICY "leads_partner_scoped_select" ON partner_leads FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin')
  OR partner_id = current_partner_id(auth.uid())
  OR created_by = auth.uid()
);
```
INSERT/UPDATE: forcer `partner_id = current_partner_id(auth.uid())`.
Trigger BEFORE INSERT: si `created_by` NULL → `auth.uid()`.

### 1.6 Logs assignation
```sql
CREATE TABLE partner_lead_assignment_logs (
  id uuid PK default gen_random_uuid(),
  lead_id uuid REFERENCES partner_leads(id) ON DELETE CASCADE,
  previous_partner_id uuid,
  new_partner_id uuid,
  assigned_by uuid REFERENCES auth.users(id),
  reason text,
  created_at timestamptz DEFAULT now()
);
```
RLS: admin only.

## 2. Pages

### 2.1 `/partenaire/devenir-partenaire` (publique)
Wizard 3 étapes premium dark:
- **Step 1** Cartes comparatives (Affilié / Ambassadeur / Certifié) avec accès, commissions, exigences
- **Step 2** Formulaire: prénom, nom, téléphone, courriel, ville, entreprise, expérience vente, taille réseau, objectifs, motivation
- **Step 3** Termes spécifiques au rôle (composant `<PartnerTermsByRole role="..."/>` versionné `v1.0`) + checkbox bloquante. Bouton "Soumettre" disabled tant que pas coché.

Submit → edge `submit-partner-application`:
1. Crée user (signup magic link) si pas connecté
2. Insert `partners` (`partner_type=role`, `partner_application_status='pending'`)
3. Insert `partner_terms_acceptance` avec IP/UA via header `x-forwarded-for`
4. Insert `partner_audit_logs` action='application_submitted'
5. Notif admin (email + ligne dans `/admin/partner-applications`)

### 2.2 `/partenaire/en-attente`
Affiche statut, date soumission, étapes, bouton "Contacter admin" (mailto). Rafraîchit toutes les 30s.

### 2.3 `/admin/partner-applications`
Tableau: nom, courriel, rôle demandé, ville, statut, date, version termes acceptée, IP. Actions: Approuver / Refuser / Suspendre / Changer rôle / Notes. Drawer détail avec `application_data`, historique audit, terms acceptance.

Approve → `partner_application_status='approved'`, `partner_status='approved'`, INSERT `user_roles(role='partner')`, audit log.

## 3. Guards

### 3.1 Refactor `PartnerGuard` (`src/pages/partner/PartnerGuard.tsx`)
Fetch `partner_application_status` en plus de `partner_status`. Logique:
- Pas authentifié → `/partenaire/login`
- Admin → bypass
- `partner_application_status !== 'approved'` → redirect `/partenaire/en-attente`
- Approved → check rôle pour autorisation route

### 3.2 Permission par rôle (nouveau `src/lib/partnerPermissions.ts`)
```ts
export const PARTNER_PERMISSIONS = {
  affiliate: { crm: false, leads: false, pipeline: false, links: true },
  ambassador: { crm: true, leads: true, pipeline: true, bulkExport: false, automation: false },
  certified_partner: { crm: true, leads: true, pipeline: true, bulkExport: true, automation: true, onboarding: true },
  territory_partner: { /* same as certified + territory */ },
  partner_admin: { /* all */ },
};
export function canAccess(partner, feature) { ... }
```
Wrapper `<RequirePartnerPermission feature="crm">` autour de `/partenaire/crm`, `/partenaire/leads`, `/partenaire/pipeline`.

## 4. UI partenaire (CRM existant)

### 4.1 Lead badges
Dans `LeadDetailDrawer` + `PartnerKanban` cards, ajouter badge selon `lead_origin`:
- `partner_added` → "Ajouté par vous"
- `admin_assigned` → "Attribué par UNPRO"
- `partner_generated` → "Généré par votre lien"

### 4.2 Header CRM
Bandeau permanent: rôle actuel, statut approbation, version termes acceptés, lien "Voir mes permissions".

## 5. Edge functions
- `submit-partner-application` — création + termes + audit
- `approve-partner-application` (admin) — flip status + role insert + audit + email
- `reject-partner-application`, `suspend-partner-application`
- `assign-lead-to-partner` (admin) — UPDATE partner_leads + insert assignment log + audit
- `log-partner-action` — utilitaire appelé par hooks (export, message envoyé, accès CRM)

Toutes incluent `corsHeaders`, validation Zod, JWT verify in-code, service role pour audit.

## 6. Termes (contenu fr-CA)
Composant `PartnerTermsByRole` rend MD/JSX versionné `v1.0`:
- Affilié: anti-spam, pas de pub trompeuse, pas de faux leads, commissions sujettes à validation
- Ambassadeur: + usage pro CRM, permission obligatoire avant message, anti-spam légal QC, interdiction revente listes, interdiction extraction massive, historique enregistré
- Certifié: + qualité minimum, activité annuelle (10 entrepreneurs/an), protection image UNPRO, exclusivités territoire, confidentialité, conformité

## 7. Audit logging triggers
Hook `usePartnerCrm` log côté client via `log-partner-action`:
- `crm_accessed`, `lead_exported`, `message_sent`, `consent_changed`, `lead_assigned`

## 8. Critères de succès
- Aucun accès `/partenaire/crm` sans `partner_application_status='approved'` ET termes signés
- Admin peut approuver/refuser/suspendre depuis `/admin/partner-applications`
- Affiliés voient liens uniquement, pas le CRM
- Ambassadors/Certifiés voient seulement leurs propres leads + leads assignés (RLS testé)
- Logs audit immuables présents pour chaque action sensible
- Page `/partenaire/en-attente` premium affichée pendant l'attente

## 9. Détails techniques
- `current_partner_id(uid)` SECURITY DEFINER déjà existant (sinon créer)
- `terms_version` constante TS `PARTNER_TERMS_VERSION = "2026.05.v1"`
- Pas de DELETE sur audit/terms (RLS deny + révoquer privilege)
- IP captée via header dans edge function, pas côté client
- Migration backfill: tous les `partners` existants approuvés gardent l'accès
