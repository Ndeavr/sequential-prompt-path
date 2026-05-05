# Alex Contractor Advisor + AIPP Plan Engine

## Stratégie : réutiliser, ne pas dupliquer

L'infrastructure backend nécessaire existe déjà. Pas besoin de recréer des migrations ni de nouvelles edge functions critiques.

| Besoin du prompt | Existe déjà |
|---|---|
| `api_import_contractor_profile` | `extract-business-card`, `aipp-real-scan`, `contractor-activation-enrich` |
| `api_calculate_aipp_score` | `aipp-v2-analyze`, `aipp-run-audit`, `compute-contractor-score` |
| `api_recommend_contractor_plan` | `compute-plan-recommendation` |
| `api_create_contractor_checkout` | `create-contractor-checkout` (Stripe live, plans Recrue→Signature) |
| `api_activate_contractor_profile` | `activate-contractor-plan` |
| Tables `contractors`, AIPP reports | déjà présentes (mémoire pricing-engine + activation flow) |

Le travail est donc : **un layer Alex front-end** qui orchestre ces APIs en flow conversationnel, plus une nouvelle edge function de routage légère.

---

## 1. Détection intention entrepreneur

Étendre `alexConversationEngine.ts` :
- Ajouter `detectContractorIntent(text)` (mots-clés : entrepreneur, m'inscrire, rendez-vous, score, rejoindre UNPRO, plus de clients, AIPP).
- Quand détecté : `intent = "contractor_onboarding"`, réponse fixe :
  > "Parfait. Je vais bâtir votre profil entrepreneur, analyser votre visibilité actuelle et vous montrer le meilleur plan pour obtenir plus de rendez-vous qualifiés."
- Pousser immédiatement un nouveau type d'action `contractor_intake` dans `useAlexVisualStore`.

## 2. Nouveaux types d'actions inline (visualStore)

Ajouter à `src/features/alex/visual/types.ts` :
```ts
type AlexAction.type =
  | "contractor_intake"           // mini form: phone | website | RBQ | business card
  | "contractor_profile_card"     // affiche profil importé + AIPP
  | "contractor_growth_dashboard" // Situation / Objectifs / Plan
  | "contractor_checkout"         // CheckoutPanel
```

Mettre à jour `AlexActionRenderer.tsx` pour router vers les nouveaux composants.

## 3. Composants à créer (`src/features/alex/contractor/`)

- **ContractorIntakePanel.tsx** — 4 entrées (téléphone, site web, RBQ, carte d'affaires via `<UploadZone>` réutilisé). Une seule suffit. Bouton "Analyser".
- **BusinessCardUploadZone.tsx** — wrapper de `UploadZone` qui appelle `extract-business-card`.
- **ContractorProfileCard.tsx** — logo, nom, téléphone, RBQ, note Google, services, villes. Inconnu → badge "À vérifier".
- **AippScoreCard.tsx** — score circulaire, tier, forces/faiblesses/quick wins.
- **ContractorGrowthDashboard.tsx** — 3 sections (Situation actuelle / Objectifs éditables / Plan recommandé dynamique).
- **GrowthPathTable.tsx** — étapes Compléter profil / Connecter calendrier / Activer plan, impact AIPP, statut.
- **PlanRecommendationTable.tsx** — 5 plans avec colonne mise en surbrillance + raison.
- **CheckoutPanel.tsx** — wrapper qui invoque `create-contractor-checkout` (existant) et redirige vers Stripe.

Tous mobile-first, dark theme cohérent.

## 4. Orchestration conversationnelle

Dans `useAlexConversation.ts`, ajouter `handleContractorFlow(input)` :

```text
intent contractor_onboarding détecté
  → push action "contractor_intake"
user soumet (phone | website | rbq | card)
  → invoke extract-business-card OU aipp-real-scan
  → push "contractor_profile_card" + "contractor_growth_dashboard" (section Situation seulement)
  → Alex parle: "Voici votre situation actuelle. Combien de rendez-vous voulez-vous par mois?"
user remplit objectifs (max 4 questions: rdv, métiers, villes, dispo)
  → invoke compute-plan-recommendation
  → mettre à jour dashboard avec sections Plan recommandé + GrowthPathTable
  → Alex parle phrase de conversion ("Votre meilleur prochain mouvement est le plan Premium…")
user clique "Activer mon profil"
  → invoke create-contractor-checkout → window.location = url
retour Stripe success
  → invoke activate-contractor-plan
  → Alex parle: "Votre profil est activé…"
```

## 5. Nouvelle edge function (légère) : `alex-contractor-import`

Routeur unique côté serveur pour simplifier le client. Reçoit `{ phone? website? rbq? business_card_base64? }` et :
1. Si carte → délègue à `extract-business-card`.
2. Sinon → délègue à `aipp-real-scan` (website/phone) puis enrich.
3. Calcule/retourne le score AIPP via `aipp-v2-analyze`.
4. Retourne le profil unifié + `aipp_report` au format attendu par le prompt.

Cela évite 3 round-trips depuis le client et garde la logique de fallback côté serveur.

## 6. Garde-fous (règles critiques)

- Aucun avis/RBQ inventé. Si `extract-business-card` ou `aipp-real-scan` ne retourne pas un champ → afficher "À vérifier" (jamais "0" ou valeur fictive).
- Plan recommandé toujours dérivé de `compute-plan-recommendation` (jamais hardcodé côté client).
- Phrase de conversion adaptée selon `recommended_plan`.
- Mémoire respectée : prix Recrue=149, Pro=349, Premium=599, Élite=999, Signature=1799 ; PK Stripe live déjà configurée.
- Français par défaut, fallback EN unique déjà géré.

## 7. Fichiers touchés

**Créés**
- `src/features/alex/contractor/ContractorIntakePanel.tsx`
- `src/features/alex/contractor/BusinessCardUploadZone.tsx`
- `src/features/alex/contractor/ContractorProfileCard.tsx`
- `src/features/alex/contractor/AippScoreCard.tsx`
- `src/features/alex/contractor/ContractorGrowthDashboard.tsx`
- `src/features/alex/contractor/GrowthPathTable.tsx`
- `src/features/alex/contractor/PlanRecommendationTable.tsx`
- `src/features/alex/contractor/CheckoutPanel.tsx`
- `src/features/alex/contractor/contractorStore.ts` (state Zustand : profil, AIPP, objectifs, plan)
- `supabase/functions/alex-contractor-import/index.ts`

**Modifiés**
- `src/features/alex/visual/types.ts` (+ 4 types d'action)
- `src/features/alex/visual/AlexActionRenderer.tsx` (routage nouveaux types)
- `src/features/alex/services/alexConversationEngine.ts` (`detectContractorIntent`, réponse FR)
- `src/features/alex/hooks/useAlexConversation.ts` (`handleContractorFlow`, sous-routes intake → AIPP → plan → checkout)

## 8. FASTEST WIN (Phase 1 livrée d'abord)

1. ContractorIntakePanel + BusinessCardUploadZone (entrée).
2. `alex-contractor-import` edge function (backend unifié).
3. AippScoreCard + ContractorProfileCard (situation visible).
4. PlanRecommendationTable (recommandation).
5. CheckoutPanel branché sur `create-contractor-checkout` (revenu).

GrowthPathTable + dashboard interactif complet en Phase 2 (même conversation).

## Critères de succès

- Un entrepreneur dit "je veux des rendez-vous" → flow démarre en < 2 s.
- Carte d'affaires uploadée → profil + score AIPP visible en < 10 s.
- Plan recommandé affiché avec raison claire.
- Checkout Stripe ouvre et active le profil au retour.
- Aucune donnée inventée. Mobile-first. FR par défaut.
