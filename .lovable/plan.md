# Phase 2 — Déploiement Smart Context Engine sur 4 surfaces

Tu as dit "Tous" → on étend `SmartFieldShell` / `SmartBubble` / `SmartRecommendationCard` / `SmartGoalSelector` aux 4 surfaces stratégiques restantes.

## 1. Plans (sélection plan entrepreneur)
- Retrofit `src/pages/contractor/PageContractorPlans.tsx` (et composants `PlanCard` associés).
- Gate `SmartGoalSelector` si `useGoalProfile()` vide avant d'afficher la grille de plans.
- Sur chaque carte : badge "UNPRO recommande" sur le tier retourné par `recommend("plan.tier", { goal, capacity })`.
- Bulles sur : prix, nb de rendez-vous, exclusivité, accès XL (`access.xl_projects`).
- Ajout registry entries : `plan.tier`, `plan.appointments_per_month`, `plan.exclusivity`, `plan.upsell_xl`.

## 2. Dashboard entrepreneur
- Retrofit `src/pages/contractor/PageContractorDashboard.tsx` (widgets KPI principaux).
- Wrap chaque KPI critique (taux d'acceptation, temps de réponse, conversion, revenu projeté) avec `SmartBubbleTrigger` à côté du titre.
- Ajout `SmartRecommendationCard` "Opportunité" en haut si goal défini + signal détecté (ex: réponse > 15min → reco baisser temps de réponse).
- Nouveau composant `WidgetSmartOpportunities` qui itère `getRecommendationsForDashboard(profile, goal)`.
- Registry entries : `dashboard.acceptance_rate`, `dashboard.response_time`, `dashboard.conversion_rate`, `dashboard.projected_revenue`.

## 3. Profil entrepreneur
- Retrofit `src/pages/contractor/PageContractorProfile.tsx` + steps `SetupStep*` restants (photos, services, bio, certifications).
- Wrap chaque champ stratégique avec `SmartFieldShell` :
  - `profile.photos_before_after` (déjà au registry)
  - `profile.services_offered`
  - `profile.bio_length`
  - `profile.certifications`
  - `profile.years_experience`
  - `profile.languages`
- Ajout indicateur AI visibility par champ (high/medium/low) influençant l'AIPP score.
- Sticky progress bar en bas : "Profil 72% — +8% si vous ajoutez 3 photos avant/après".

## 4. Automation (réglages)
- Retrofit `src/pages/contractor/PageAutomationSettings.tsx` (ou créer si absent — vérifier `useAutomation.ts`).
- `SmartFieldShell` sur chaque toggle/setting :
  - `automation.auto_accept_bookings`
  - `automation.calendar_sync` (déjà au registry comme `operations.calendar_sync` → renommer ou aliaser)
  - `automation.sms_followup`
  - `automation.review_request`
  - `automation.no_show_protection`
  - `automation.quote_auto_send`
- Chaque toggle affiche moneyImpact ("+12% conversion") + warning si désactivé.
- Banner `SmartRecommendationCard` en haut listant les 3 automations à activer en priorité selon le goal.

## 5. Registry & moteur
- Étendre `src/features/smartContext/registry.ts` avec ~25 nouvelles entrées (4 plans + 6 dashboard + 8 profil + 7 automation).
- Étendre `src/services/smartRecommendationEngine.ts` avec les `case` correspondants (logique déterministe goal × capacity × current value).
- Ajouter helper `getRecommendationsForSurface(surface, ctx)` retournant top-3 recos triées par impact.

## 6. Admin (overrides live)
- Page `/admin/smart-context` (`PageAdminSmartContext.tsx`) : liste des entrées registry, édition du payload (`what`, `why`, `moneyImpact`, `alexScript`), toggle `active`, écrit dans `smart_context_overrides`.
- Table de filtrage par surface (plans / dashboard / profil / automation / territory).

## 7. Alex integration (minimal phase 2)
- Étendre `alexUiActionDispatcher.ts` avec actions :
  - `smart.highlight_field(fieldId)` → scrollIntoView + glow
  - `smart.open_bubble(fieldId)` → trigger SmartBubble open
  - `smart.suggest_value(fieldId, value)` → pre-fill input
- Hook `useSmartContext` expose `askAlex(id)` qui pousse `alexScript` dans la session courante.

## Détails techniques

### Fichiers créés
- `src/components/smart-context/WidgetSmartOpportunities.tsx`
- `src/components/smart-context/SmartProfileProgressBar.tsx`
- `src/pages/admin/PageAdminSmartContext.tsx`
- `src/features/smartContext/recommendationsBySurface.ts`

### Fichiers édités
- `src/features/smartContext/registry.ts` (+25 entrées)
- `src/services/smartRecommendationEngine.ts` (+25 cases)
- `src/components/smart-context/SmartBubble.tsx` (ajout `useImperativeHandle` pour `smart.open_bubble`)
- `src/components/smart-context/index.ts`
- `src/lib/alexUiActionDispatcher.ts` (+3 actions smart.*)
- `src/features/smartContext/useSmartContext.ts` (ajout `askAlex`)
- `src/app/router.tsx` (route `/admin/smart-context`)
- Pages plans / dashboard / profil / automation (retrofit non-destructif)

### Base de données
- Aucune nouvelle table. Réutilise `smart_context_overrides`, `contractor_goal_profiles`, `smart_context_cache` créées en phase 1.
- Migration minimale : seed initial de ~10 overrides exemples (optionnel).

### Contraintes
- Zéro régression sur les formulaires existants (wrapping uniquement).
- Tout en fr-CA, ton "Concierge Décisif", style Cinematic Dark.
- Glass `rgba(255,255,255,0.04)` + blur 24px, easing `cubic-bezier(.22,1,.36,1)`.
- Pas de re-render coûteux : `useSmartContext` mémoïsé.

## Question
Confirme et je build Phase 2 d'un coup, ou je commence par 1 surface précise en priorité ?