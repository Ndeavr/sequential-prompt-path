## Phase 4 — AI Visibility Operating System (Plans ↔ Features ↔ Profiles)

Consolide la stack des plans en une matrice canonique unique, branche les multipliers de visibilité IA, pose le moteur `recommendation_score` unifié et livre les UI de gating + cockpit admin.

---

### 1. Migration SQL (1 seule migration)

**Tables nouvelles**
- `plans` — table canonique unifiée
  - `code` (recrue/pro/premium/elite/signature), `name`, `monthly_price`, `yearly_price`, `one_time_price`
  - `visibility_multiplier` (1.0 → 5.0), `recommendation_multiplier`, `ai_index_priority` (1-100)
  - `territory_radius_km`, `booking_priority`, `appointments_included`
  - `trust_boost`, `seo_boost`, `citation_boost`
- `plan_features` — matrice plan × feature (booléen + limite)
  - `plan_code`, `feature_key`, `enabled`, `limit_value` (nullable, -1 = illimité), `teaser_copy`, `upgrade_target`
- `profile_visibility_history` — timeseries
  - `contractor_id`, `visibility_score`, `ai_citation_count`, `booking_count`, `recorded_at`
- `profile_ai_citation_history` — timeseries citations IA
  - `contractor_id`, `source` (chatgpt/perplexity/gemini/google_aio), `query`, `cited_at`

**Vues**
- `v_contractor_recommendation_score` (SECURITY INVOKER) — formule unifiée :
  `trust*0.25 + ai_visibility*0.20 + activity*0.15 + reviews*0.15 + completeness*0.10 + plan_multiplier*0.15`

**Triggers**
- `trg_recalc_visibility_on_plan_change` (upgrade/downgrade)
- `trg_snapshot_visibility_daily` (via cron pg)
- `trg_log_citation_on_aeo_event`

**Seed**
- 5 plans (recrue/pro/premium/elite/signature) avec multipliers réels
- ~30 feature_flags : `ai_index_priority`, `aeo_blocks_published`, `territory_lock`, `booking_direct`, `route_optimization`, `priority_dispatch`, `visibility_max`, `aipp_max`, `appointments_max`, `properties_max`, `quotes_per_month`, `analytics_advanced`, `priority_support`, etc.

---

### 2. Code TypeScript

**Nouveau (`src/features/planSystem/`)**
- `types.ts` — `Plan`, `PlanFeature`, `FeatureKey`
- `usePlanMatrix.ts` — fetch `plans` + `plan_features` (React Query, staleTime 5min)
- `useFeatureAccess.ts` — `useFeatureAccess('booking_direct')` → `{ allowed, limit, used, teaser, upgradeTarget }`
- `recommendationScoreEngine.ts` — calcul client-side + fetch vue
- `index.ts` — barrel

**Nouveau composant gating réutilisable**
- `src/components/plan-gating/LockedFeatureTeaser.tsx`
  - Props : `featureKey`, `children`, `mode: 'blur'|'replace'|'inline'`
  - Affiche teaser + ROI + CTA upgrade auto-targetté
- `src/components/plan-gating/FeatureUsageBar.tsx` — barre `used/limit` avec warning à 80%

**Refactor (non-cassant, garde compat)**
- `src/config/contractorPlans.ts` → reste source de fallback, ajoute import dynamique de `usePlanMatrix`
- `src/config/planRules.ts` → marqué `@deprecated`, redirige vers `useFeatureAccess`
- `src/hooks/useContractorPlan.ts` → enrichi avec `multipliers` et `featureAccess` map

---

### 3. Admin Cockpit

**Nouveau (`src/pages/admin/PageAdminPlansMatrix.tsx`)** — route `/admin/plans-matrix`
- **Vue 1 : Matrix Plans × Features** (table éditable) — toggle enabled, edit limits
- **Vue 2 : Multipliers Live** — slider sur `visibility_multiplier`, preview impact recommendation_score
- **Vue 3 : Health par Plan** — nb contractors, MRR, visibilité moyenne, AI citations, booking rate
- **Vue 4 : Recalc Manuel** — bouton "Recalculer tous les scores" (trigger function)

Ajout entrée sidebar admin sous "Operations".

---

### 4. Branchements UI existants

- **Dashboard contractor** : injecter `<LockedFeatureTeaser featureKey="route_optimization">` autour des sections Élite+
- **Plans page** : afficher `visibility_multiplier` ("Votre profil 3× plus visible dans l'IA") et `ai_index_priority` ("Priorité #1 dans les citations ChatGPT")
- **Profil entrepreneur public** : badge "Visibilité Signature" avec multiplier
- **Smart Context Engine** : recommendations boostées par `recommendation_multiplier` du plan actif

---

### 5. Stack technique

- React 18 + Vite + TS + Tailwind tokens sémantiques
- Supabase migration + 4 triggers + 1 vue SECURITY INVOKER
- React Query pour cache plans/features (staleTime 5min)
- Aucun edge function nouveau (lecture DB + vue suffit)
- Aucun secret requis
- fr-CA, mobile-first, glassmorphism dark theme cohérent
- Pas de breaking change : anciens hooks marqués deprecated mais fonctionnels

---

### 6. Critères de succès

- ✅ 1 source canonique `plans` + `plan_features` (fin des hardcoded)
- ✅ `useFeatureAccess('xxx')` fonctionne partout, retourne teaser auto
- ✅ `recommendation_score` calculé via vue unifiée avec multipliers
- ✅ Historique visibilité + citations snapshoté quotidiennement
- ✅ Admin peut éditer la matrice et voir l'impact en live
- ✅ Upgrade contractor → recalcul automatique du score
- ✅ Gating UI cohérent sur toutes les surfaces

---

**Livraison en 1 batch.** Confirme et je build.
