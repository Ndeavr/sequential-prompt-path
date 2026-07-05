## Pivot stratégique : UNPRO devient un moteur de diagnostic IA

Transformer l'entrée entrepreneur d'un onboarding ("Inscrivez-vous") vers un tunnel de diagnostic ("Découvrez pourquoi l'IA ne vous recommande pas"). Le scan devient le produit d'appel, l'activation 1$/7j devient la conversion.

---

### Phase 1 — Tunnel Scan IA (public, sans compte)

**Route** : `/scan-ia` (landing + funnel unifié)

1. **Landing publicitaire** (`/scan-ia`)
   - H1 : "L'IA recommande-t-elle votre entreprise ?"
   - Sous-titre + CTA unique "Voir mon score"
   - Design cinematic dark, aligné brand tokens existants

2. **Étape scan** — champ unique (nom / site / Google)
   - Réutilise `aipp-real-scan` + `Firecrawl` déjà en place (mémoire AIPP Real Scan)
   - Loading humanisé 3-5s ("Analyse en cours…")

3. **Rapport instantané SANS gate email**
   - Score global /100 + 6 sous-scores (Visibilité, Confiance, Conformité, Preuves, Avis, Site)
   - Bloc **Opportunités** : nb demandes en attente + valeur $ (via `contractor_market_opportunity`)
   - Bloc **Menaces** : concurrents mieux classés (via `ai_recommendation_rank`)

4. **Choc de valeur — "Ce que voit Alex"**
   - Simulation live d'une question homeowner ("Qui recommandes-tu pour isoler…")
   - Affiche le concurrent recommandé + raison
   - Punchline : "Votre entreprise n'apparaît pas encore."

5. **Activation 1$/7j** — Stripe checkout inline
   - Nouveau price `founder_trial_1_7d` (à créer via Stripe)
   - Post-paiement → création compte + accès dashboard

---

### Phase 2 — Data layer

**Nouvelles tables** (migration Supabase, RLS, GRANTs) :

- `contractor_ai_score` : overall + trust + visibility + review + compliance + proof + activity, `computed_at`
- `contractor_market_opportunity` : city, category, waiting_homeowners, estimated_revenue, estimated_ltv, pressure_score
- `ai_recommendation_rank` : city, category, contractor_id, rank, score, computed_at
- `scan_ia_reports` : anonymes (pré-compte), rattachables post-checkout via `session_token`

**Edge functions** :
- `scan-ia-run` : orchestre Firecrawl + scoring déterministe (réutilise `aipp-real-scoring-engine`)
- `scan-ia-market-context` : renvoie opportunités + menaces pour city×category
- `scan-ia-alex-simulation` : génère la réponse Alex simulée (Gemini 2.5 Flash)

---

### Phase 3 — Nouveau Dashboard Entrepreneur

Route existante `/entrepreneur/dashboard` — remplacer les cartes actuelles par :

1. **Intelligence Marché** — table Demandes en attente par ville×catégorie
2. **Revenus disponibles** — valeur marché estimée $
3. **Position IA** — classement #X / N
4. **Actions prioritaires** — liste ordonnée avec impact +points (photos, RBQ, garanties…)
5. **Voix Alex** — bloc conversationnel qui contextualise le score (nouveau prompt : "Votre score IA est de X%. Deux entreprises sont recommandées avant vous à Y…")

---

### Phase 4 — Alex : nouveau discours entrepreneur

Mettre à jour `mem://ai/alex/system-prompt-active` avec la variante entrepreneur :
- Ne dit plus "Complétez votre profil"
- Dit : score actuel + qui est recommandé avant + action à plus fort impact
- Ton : sharp, factuel, orienté ROI

---

### Fichiers créés / modifiés

**Nouveaux**
- `src/pages/scan-ia/PageScanIALanding.tsx`
- `src/pages/scan-ia/PageScanIARun.tsx`
- `src/pages/scan-ia/PageScanIAReport.tsx`
- `src/pages/scan-ia/PageScanIAActivation.tsx`
- `src/components/scan-ia/ScoreRadial.tsx`, `SubScoreGrid.tsx`, `MarketOpportunityCard.tsx`, `ThreatCard.tsx`, `AlexSimulationBlock.tsx`, `ActivationCheckoutInline.tsx`
- `src/components/contractor-dashboard/PanelMarketIntelligence.tsx`, `PanelRevenueAvailable.tsx`, `PanelAIRank.tsx`, `PanelPriorityActions.tsx`, `PanelAlexVoice.tsx`
- `supabase/migrations/<ts>_scan_ia_engine.sql`
- `supabase/functions/scan-ia-run/index.ts`
- `supabase/functions/scan-ia-market-context/index.ts`
- `supabase/functions/scan-ia-alex-simulation/index.ts`

**Modifiés**
- `src/app/router.tsx` — routes `/scan-ia/*`
- `src/pages/entrepreneur/PageContractorDashboard.tsx` — remplacer cartes
- `supabase/functions/create-checkout-session/index.ts` — support price `founder_trial_1_7d`

---

### Livraison

Phase 1 + 2 dans ce build (tunnel scan + data layer + activation Stripe).
Phase 3 + 4 (dashboard + Alex prompt) en build suivant, une fois le tunnel validé en preview.

---

### Questions avant build

1. **Stripe 1$/7j** — dois-je créer un nouveau product/price via l'outil Stripe, ou tu me passes un `price_id` existant ?
2. **Sources de vérité marché** — pour `waiting_homeowners` et `estimated_revenue`, je peux :
   (a) brancher sur les tables existantes `unified_predictions` + `projects` si peuplées,
   (b) sinon, seed déterministe par city×category (basé sur `city_service_demand_grid`) le temps que le volume réel arrive.
   Je pars sur (b) avec fallback (a) automatique — OK ?
3. **Route dashboard** — je remplace le contenu de `/entrepreneur/dashboard` ou je crée `/entrepreneur/dashboard-v2` puis switch ?
