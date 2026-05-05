# Forfait → Alex Fit Check → Onboarding

## Objectif
Sur la landing entrepreneur, les 3 cartes de plan (Recrue / Pro / Élite) ne sont pas cliquables. Les rendre actionnables et ajouter une étape **"Est-ce le bon plan pour vous?"** où Alex pose 3-4 questions de qualification, confirme (ou recommande mieux), puis envoie vers le checkout existant.

## Flow utilisateur
```
Landing /entrepreneurs
   │  (clic carte plan)
   ▼
/entrepreneur/plan?plan=pro&validate=1
   │  Alex: "Avant de confirmer Pro, 3 questions rapides…"
   │   1. Combien de RDV par mois visez-vous?
   │   2. Valeur moyenne d'un contrat?
   │   3. Combien de villes desservez-vous?
   │   4. Objectif principal? (présence / RDV / territoire)
   ▼
Recommandation Alex
   • Si choix utilisateur == reco → "Parfait, Pro est bon pour vous"
   • Si reco supérieure → upsell doux "Élite serait plus rentable, voici pourquoi"
   • Si reco inférieure → downsell honnête
   ▼
Bouton: Confirmer ce plan → phase lead_packs → checkout (existant)
```

## Changements

### 1. `SectionPlansPreviewV2.tsx`
- Rendre chaque carte cliquable (`button` wrapper, focus ring premium)
- `onClick` → `navigate('/entrepreneur/plan?plan=' + p.code + '&validate=1')` + `onTrackCta('plan_card_' + p.code, 'plans')`
- Ajouter chevron `→` discret à droite, hover scale subtil
- CTA "Voir tous les forfaits" inchangé

### 2. `PageContractorPlanOnboarding.tsx`
- Lire `useSearchParams()` : `plan` + `validate`
- Ajouter une nouvelle phase `"fit_check"` au type `FlowPhase`
- Au mount, si `plan` présent → présélectionner `selectedPlanId` (mapper `code` → plan.id depuis catalog), `setPhase("fit_check")`
- Header sous-titre: "Validation du plan"

### 3. Nouveau composant `PanelPlanFitCheck.tsx` (`src/components/voice-sales/`)
- 4 questions séquentielles (une à la fois, style chat-card avec choix rapides)
  - RDV/mois: <5 / 5-15 / 15-30 / 30+
  - Valeur moyenne: <2k / 2-5k / 5-10k / 10k+
  - Villes: 1 / 2-3 / 4+
  - Objectif: présence / RDV / conversion / territoire
- Au submit: appel local à `recommendPlan()` (déjà dans `src/services/planRecommendationService.ts`)
- Affiche **CardFitVerdict**:
  - Badge "Choix confirmé" / "Recommandation Alex: passez à X" / "Recrue suffit pour vous"
  - 3 raisons (via `getRecommendationReasons`)
  - 2 boutons: "Garder [plan choisi]" (primaire) / "Passer à [reco]" (si différent)
- Au choix → `setSelectedPlanId(finalPlanId); setPhase("lead_packs")` (réutilise pipeline existant)

### 4. Tracking
Events: `plan_card_clicked`, `fit_check_started`, `fit_check_q{1..4}_answered`, `fit_check_recommendation_shown`, `fit_check_kept_choice`, `fit_check_switched_plan`

## UI/UX
- Mobile-first, dark cinematic (cohérent avec landing)
- Une question visible à la fois, transitions framer-motion (fade+slide 8px)
- Réponses = pills tappables larges (h-12), pas de dropdowns
- Verdict card = gradient primary/10, icône Sparkles, texte court direct
- Bouton "Garder mon choix" toujours dispo (no forced upsell)

## Hors scope
- Pas de changement au checkout, lead packs, founders modal, voix Alex
- Pas de nouvelle table DB (qualification stockée en state local + tracking events)
