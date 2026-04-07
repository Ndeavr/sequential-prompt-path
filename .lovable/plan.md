
## AdminFlowEntrepreneurActivationComplete — Plan de construction

### Constat existant
Le projet possède déjà : `contractors`, `contractor_scores`, `contractor_media`, `contractor_credentials`, `contractor_subscriptions`, `contractor_services`, `contractor_service_areas`, `activation_steps`, `admin_action_logs`, `profiles`, `plan_catalog`, `plan_definitions`. Beaucoup de tables demandées existent déjà sous d'autres noms.

### Approche : Réutiliser l'existant + créer le manquant

---

### Phase 1 — Schéma DB (Migration)
**Tables à CRÉER** (celles qui n'existent pas) :
- `admin_company_import_jobs` — jobs d'importation admin
- `admin_company_import_sources` — sources importées avec trust_score
- `admin_import_conflicts` — conflits entre sources
- `admin_activation_overrides` — bypass paiement 100%
- `admin_appointment_readiness` — checklist readiness rendez-vous
- `admin_activation_checklists` — items bloquants/non-bloquants

**Tables EXISTANTES à réutiliser** (avec mapping) :
- `contractors` → company + contractor_profiles (déjà complet)
- `contractor_scores` → scoring existant
- `contractor_subscriptions` → subscriptions
- `contractor_media` → media assets
- `contractor_credentials` → credentials
- `contractor_services` → services
- `contractor_service_areas` → service areas
- `admin_action_logs` → activation events (déjà complet)
- `plan_catalog` → subscription_plans
- `profiles` → account links (user_id already in contractors)

**RLS** : Admin-only policies via `has_role(auth.uid(), 'admin')` sur toutes les nouvelles tables.

### Phase 2 — Page Wizard + Composants Core
Créer `PageAdminEntrepreneurActivation` avec wizard en 7 étapes :
1. **Entreprise** — Recherche/création contractor
2. **Importation** — Import données + résolution conflits  
3. **Profil** — Construction profil complet
4. **Score** — Calcul/override AIPP
5. **Plan** — Sélection plan + bypass paiement
6. **Activation** — Checklist readiness + publish
7. **Résumé** — Audit trail + rollback

Composants clés :
- `AdminActivationWizard` — orchestrateur d'étapes
- `StepEntrepriseSearch` — recherche + création
- `StepDataImport` — import + conflits
- `StepProfileBuilder` — formulaires profil
- `StepScoring` — score preview + override
- `StepPlanAssignment` — sélection plan + bypass 100%
- `StepActivation` — checklist + publish + readiness
- `StepSummary` — timeline audit + rollback

### Phase 3 — Edge Functions
- `admin-activation-import` — recherche/import données entreprise
- `admin-activation-score` — calcul score AIPP admin
- `admin-activation-subscribe` — assign plan + bypass paiement
- `admin-activation-publish` — publish profil + readiness
- `admin-activation-rollback` — rollback contrôlé

### Phase 4 — Seed Data + Polish
- 3 cas de démo (neuve, partielle, override+actif)
- Feature flag `admin_activation_v1`
- Responsive mobile-first

### Routing
- `/admin/activation` → PageAdminEntrepreneurActivation (wizard)
- `/admin/activation/history` → historique activations

### Ce qui est exclu (tables déjà gérées ailleurs)
- Stripe réel (bypass uniquement, compatibilité conservée)
- Connecteurs GMB/RBQ réels (mock data, prêt pour branchement futur)
