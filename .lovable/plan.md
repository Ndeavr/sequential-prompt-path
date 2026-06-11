
# Module « Vision IA 5 Ans » — Onboarding Entrepreneurs UNPRO

Nouveau bloc émotionnel et différenciateur inséré dans le flow d'onboarding entrepreneur, juste après l'import Google Business Profile et avant le score AIPP. Inclut un système d'A/B testing pour mesurer l'impact sur la conversion.

## Position dans le funnel

```text
Import GBP → Analyse IA → [Vision IA 5 Ans] → Score AIPP → Compatibilité UNPRO → Recommandation plan
```

## Livrables

### Pages / routes
- `/entrepreneur/vision-5-ans/:companyId` — écran cinématique standalone (accessible aussi via SMS)
- Intégration inline dans `ProSetupWizard` comme nouvelle étape entre import et AIPP

### Composants (`src/features/visionIA/`)
- `VisionIAModule.tsx` — orchestrateur principal
- `VisionIAHero.tsx` — titre + sous-texte
- `VisionTimeline.tsx` — timeline horizontale Aujourd'hui → 1 an → 3 ans → 5 ans avec animations
- `ScenarioCard.tsx` — 3 cartes (No Change / Croissance Naturelle / Optimisé UNPRO)
- `AIObservationsCard.tsx` — Forces ✅ / Opportunités ⚠
- `CTAReportFull.tsx` — bouton "Voir mon rapport complet"
- `VisionLoadingState.tsx` — état génération IA (premium, narratif)

### Edge Functions
- `future-analysis-agent` — déclenchée sur event `company_imported`
  - Lit signaux (avis, site, SEO, social, ancienneté, territoire, concurrence)
  - Appelle Lovable AI (`google/gemini-3-flash-preview`) avec prompt structuré → 3 scénarios + forces/faiblesses
  - Écrit dans `company_future_analysis`
  - Déclenche envoi SMS via pipeline outbound existant
- `vision-5-ans-generate` — endpoint synchrone pour régénération manuelle admin

### Table Supabase
`company_future_analysis` :
- `company_id`, `contractor_id`
- `current_score`, `current_visibility`, `current_authority`
- `scenario_no_change`, `scenario_growth`, `scenario_unpro` (jsonb)
- `strengths`, `weaknesses`, `opportunities` (jsonb)
- `timeline_data` (jsonb : projections 1/3/5 ans)
- `ab_variant` (text : copy variant utilisée)
- `generated_at`, `ai_model_used`, `confidence_score`

### SMS — 3 variants A/B
Branchés sur `dynamic-sms-personalization` existant, avec rotation via `ab_test_variants` :
1. « Nous avons demandé à l'IA d'analyser… »
2. « Si ChatGPT analysait votre entreprise aujourd'hui… »
3. « L'IA a identifié plusieurs signaux de croissance… »

## A/B Testing

### Variants testés
1. **Copy hero** — 3 versions du titre/sous-texte (émotionnel vs analytique vs urgence)
2. **Ordre scénarios** — Pire→Meilleur vs Meilleur→Pire vs UNPRO en premier
3. **CTA principal** — « Voir mon rapport complet » vs « Activer ma trajectoire IA » vs « Découvrir mon plan »
4. **SMS** — 3 versions (ci-dessus)

### Infra
- Réutilise `ab_test_variants` + `experiment_assignments` + `experiment_events` (tables existantes)
- Helper `useVisionIAVariant(companyId)` qui assigne déterministiquement et logge l'exposure
- Métriques trackées : view, scenario_hover, cta_click, sms_link_click, conversion vers plan

### Dashboard admin
- Nouvelle section dans `/admin/operations` : « Vision IA — A/B Performance »
  - Conversion par variant (copy, ordre, CTA, SMS)
  - Significativité statistique
  - Bouton "Promote winner"

## Logique IA (prompt structuré)

Input signaux : `reviews_count`, `reviews_avg`, `reviews_frequency`, `reviews_response_rate`, `website_quality`, `seo_local_score`, `ai_visibility_score`, `social_signals`, `years_in_business`, `territory_density`, `local_competition`.

Output Zod schema :
```ts
{
  current: { score, visibility, authority },
  scenarios: {
    no_change: { summary, risks[], projections_5y },
    natural_growth: { summary, gains[], projections_5y },
    unpro_optimized: { summary, gains[], projections_5y }
  },
  strengths: string[],
  opportunities: string[],
  timeline: { y1, y3, y5 }
}
```

## UI/UX

- Mobile-first, fond cinematic dark (`#050816`), tokens existants
- Timeline animation : Framer Motion stagger, transform-only (respect mémoire flicker)
- 3 cartes scénarios : glass-strong, hover translateY(-2px)
- Pas de chime audio (respect Alex sonic identity)
- Loading state narratif : « Analyse de votre territoire… », « Projection 5 ans en cours… »

## Contraintes respectées

- French-first (fr-CA)
- Pas de « 3 soumissions », pas de « réseau d'entrepreneurs »
- Positionnement registre intelligent / source citable
- Production Reliability : `reportOutcome()` sur tous les agents, `FailureCode` canonique
- Pas de leak technique (erreurs IA → fallback narratif)
- Reliability state machine pour `future-analysis-agent`

## Tâches

1. Migration `company_future_analysis` + grants + RLS
2. Edge function `future-analysis-agent` (Lovable AI + reliability wrapper)
3. Composants React `src/features/visionIA/*`
4. Intégration `ProSetupWizard` (nouvelle étape)
5. Route `/entrepreneur/vision-5-ans/:companyId` (landing SMS)
6. Hook `useVisionIAVariant` + tracking events
7. Migration : 3 variants SMS dans `ab_test_variants`
8. Section admin `/admin/operations` — Vision IA A/B
9. Trigger sur `company_imported` event → enqueue agent

## Hors scope

- Refonte score AIPP existant
- Pricing
- Alex voice script (utilise infra existante)

Confirmer pour passer en build mode.
