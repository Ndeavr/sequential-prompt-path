A — PROMPT LOVABLE FINAL

1. CONTEXT
- Problème confirmé dans le flux entrepreneur voice-sales.
- Le popup `ModalHeyButWaitUpgrade` affiche une offre Fondateurs à prix inférieur (`799 $/mois`) après sélection Élite.
- `PageContractorPlanOnboarding` calcule ce downgrade avec `selectedPlan.monthly_price * 0.8`.
- Le récapitulatif et le checkout continuent ensuite avec `planCode=elite`, donc Stripe et le pricing backend restent à `999 $`.
- Résultat actuel: popup ≠ résumé ≠ intention pricing. Trust cassé.

2. OBJECTIVE
Implémenter un fix conversion-first:
- Supprimer toute réduction surprise après sélection d’un plan.
- Transformer Fondateurs en couche prestige/exclusivité, jamais en rabais caché.
- Forcer une seule source de vérité pour le plan sélectionné entre UI, résumé, taxes et checkout.
- Bloquer techniquement tout plan Fondateurs mensuel inférieur au plan de base.

3. USERS
- Entrepreneur en onboarding.
- Alex conseiller UNPRO.
- Admin / support qui doit éviter les incohérences de paiement.

4. DELIVERABLES
- Désactiver le popup downgrade `Hey, attendez!` dans le flux de sélection.
- Remplacer la logique Fondateurs après sélection par une expérience avant ou pendant le choix du plan.
- Ajouter une structure canonique `selectedPlan` côté frontend pour transporter:
  - `planCode`
  - `variantCode`
  - `displayName`
  - `billingInterval`
  - `basePriceCents`
  - `addOnPriceCents`
  - `stripePlanCode`
  - `isFounderPrestige`
- Brancher le récapitulatif uniquement sur cette sélection canonique.
- Router le checkout uniquement avec le code canonique résolu.
- Ajouter des garde-fous pour empêcher `foundersPrice < regularPrice` dans ce contexte.

5. LOGIC
Implement Option A immédiatement.

Flow cible:
```text
Voir les plans
  → Afficher Pro / Premium / Élite / Signature
  → Afficher Élite Fondateur comme prestige séparé, pas comme rabais
  → Sélection utilisateur
  → selectedPlan canonique
  → Récapitulatif
  → Taxes backend
  → Stripe intent/session
```

Règle produit:
```text
Si plan sélectionné ∈ Pro, Premium, Élite, Signature:
  Interdire popup avec prix inférieur
  Autoriser seulement:
    - annualisation
    - add-on prestige
    - statut Fondateur
    - territoire prioritaire
    - visibilité IA renforcée
    - prix verrouillé 10 ans
    - paiement unique Fondateur
```

6. DATA
- Ne pas créer de table au premier fix.
- Utiliser `plan_catalog` comme source backend existante pour checkout natif.
- Garder `CONTRACTOR_PLANS` comme fallback marketing seulement.
- Aligner les codes Fondateurs existants:
  - `founder_elite_10y`
  - `founder_signature_10y`
- Vérifier que le flux n’utilise plus de pseudo-variant `founders` avec `planCode=elite` quand le prix affiché diffère.

7. UI/UX
- Supprimer la modal bleue “Hey, attendez!”.
- Remplacer par un bloc prestige non intrusif avant checkout:
  - “Statut Fondateur Élite”
  - “Territoire prioritaire”
  - “Visibilité IA renforcée”
  - “Prix verrouillé 10 ans”
  - “Badge Fondateur vérifié”
  - “Paiement unique” ou “supplément prestige”, jamais rabais.
- CTA:
  - “Activer Élite — 999 $/mois”
  - “Réserver Élite Fondateur” si disponible.
- Texte interdit:
  - “offre exclusive pour vous” après sélection
  - “799 $/mois” comme downgrade
  - prix barré inférieur/surprise après engagement.

8. COMPONENTS
Modifier:
- `src/pages/voice-sales/PageContractorPlanOnboarding.tsx`
  - Supprimer `showFoundersModal` comme étape post-sélection.
  - Supprimer le calcul `monthly_price * 0.8`.
  - Utiliser une sélection canonique.
  - Diriger Élite/Signature directement vers lead packs ou vers choix prestige affiché avant sélection.

- `src/components/voice-sales/ModalHeyButWaitUpgrade.tsx`
  - Ne plus l’utiliser dans ce flow.
  - Option safe: convertir en modal upsell prestige sans prix inférieur, ou laisser inutilisée.

- `src/components/voice-sales/CardPlanFounders.tsx`
  - Repositionner comme carte prestige: prix supérieur, paiement unique ou 10 ans.
  - Supprimer savings, line-through et tout signal de rabais.

- `src/components/voice-sales/PanelInlineCheckout.tsx`
  - Remplacer les props éparpillées par `selectedPlan` canonique.
  - Afficher uniquement le prix issu de cette sélection.
  - Ne plus afficher “(Fondateurs)” si le `planCode` reste `elite`.
  - Si Fondateur réel: afficher le vrai code/prix Fondateur.

- `src/pages/checkout/PageCheckoutNativeScrollable.tsx`
  - Garder le backend pricing comme source de vérité.
  - Ajouter un état d’erreur clair si un code Fondateur one-time est envoyé au checkout subscription.

- `supabase/functions/create-contractor-checkout/index.ts`
  - Ajouter validation serveur stricte: aucun plan mensuel Fondateur à prix inférieur à son plan de base.
  - Conserver les plans Fondateurs comme one-time uniquement.

9. ACTIONS
- Create canonical plan selection helper.
- Refactor voice-sales selection flow.
- Remove downgrade modal trigger.
- Reposition founder as prestige option.
- Sync inline summary with canonical selection.
- Validate checkout route/code mapping.
- Verify taxes derive from backend pricing only.
- Add guardrails in server checkout function.

10. CONSTRAINTS
- Ne pas casser `/checkout/native/:planCode`.
- Ne pas modifier `src/integrations/supabase/client.ts` ni `types.ts`.
- Ne pas introduire de réduction Fondateurs implicite.
- Ne pas recalculer Stripe price côté client.
- Ne pas créer de checkout avec un prix client-supplied.
- Utiliser tokens sémantiques Tailwind existants dans l’UI.

11. SUCCESS
Terminé quand:
- Le popup `799 $/mois` ne peut plus apparaître après sélection Élite/Signature.
- Un utilisateur qui choisit Élite voit Élite à `999 $/mois` partout.
- Un utilisateur qui choisit Fondateur voit un vrai plan prestige distinct, jamais un rabais surprise.
- Résumé UI, taxes, Payment Element et checkout backend utilisent le même `planCode` canonique.
- Aucun chemin ne peut afficher `Plan Élite (Fondateurs)` tout en chargeant `elite` standard sans cohérence explicite.

12. TASKS
1. Refactor `PageContractorPlanOnboarding` pour supprimer le downgrade modal et créer une sélection canonique.
2. Refactor `CardPlanFounders` en carte prestige sans rabais ni prix barré.
3. Refactor `PanelInlineCheckout` pour consommer une source unique de sélection.
4. Ajouter garde-fous dans `create-contractor-checkout` contre tout prix Fondateurs inférieur au plan de base.
5. Vérifier les routes `create-stripe-checkout-session`, `create-subscription-intent`, `calculate-checkout-pricing` et le checkout natif pour confirmer résumé = taxes = Stripe.
6. Ajouter un test manuel ciblé: Élite sélectionné → résumé 999 → checkout 999; Fondateur sélectionné → code/prix Fondateur distinct.