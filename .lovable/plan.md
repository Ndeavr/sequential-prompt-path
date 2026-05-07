# Plan — Chip bleue « Je suis un entrepreneur » + Flow de conversion Alex contractor

## Partie 1 — Chip bleue sur la home (livraison immédiate)

### 1. `src/components/home/HeroSectionAlexFirst.tsx`
Au-dessus de la barre de chips existante, ajouter **une chip bleue mise en avant** (style premium, glow bleu, icône maillet/briefcase) :

- Label : « Je suis un entrepreneur »
- Style : fond `linear-gradient(135deg, hsl(222 100% 58%), hsl(232 100% 42%))`, texte blanc, halo bleu, légèrement plus grande que les chips grises, full-width centrée sur mobile
- Icône : `Briefcase` (lucide-react)
- onClick : `navigate("/contractor-ai-growth")`
- Ajouter `useNavigate` de react-router-dom

Placement : juste sous la barre d'input, AVANT la rangée de chips grises. Visible immédiatement sans scroll.

## Partie 2 — Flow Alex Contractor Conversion `/contractor-ai-growth`

### Stratégie de réutilisation
Plusieurs briques existent déjà (`PageContractorVoiceFirstLanding`, `PageContractorPlanOnboarding`, `PageContractorCheckout`, `useVoiceSales`, `AlexVoiceContext`, `useLiveVoice`, score reveal engine, `EmbeddedStripeCheckout` via Payment Element). On ne reconstruit PAS ces moteurs — on les orchestre dans une nouvelle expérience chat-first cinématique.

### Route + page
- Ajouter `/contractor-ai-growth` dans `src/app/router.tsx` → `PageContractorAIGrowth` (lazy)
- Page racine : `src/pages/contractor-growth/PageContractorAIGrowth.tsx`
- Composant principal : `src/components/contractor-growth/ContractorGrowthExperience.tsx` (state machine 10 étapes)

### Composants à créer
Sous `src/components/contractor-growth/` :
- `ContractorGrowthExperience.tsx` — orchestrateur state machine
- `StepHeroPainSelection.tsx` — orb + 8 cartes de douleurs (chips premium dark)
- `StepAlexConversation.tsx` — chat full-screen, démarre voix Alex automatiquement (réutilise `useAlexVoice` / `useLiveVoice`)
- `DynamicQuestionCards.tsx` — max 5 questions adaptatives (estimates/sem, métier, région autocomplete, frustration, ambition)
- `StepLiveAnalysis.tsx` — orb cinématique + 6 textes rotatifs sur 4-8s (Framer Motion)
- `StepScoreReveal.tsx` — réutilise `useScoreRevealEngine` ; affiche AI Visibility 42/100, Conversion 78/100, Missed Revenue $/an, Territory Competition
- `StepPlanRecommendation.tsx` — 1 seul plan (carte glass) calculé via `usePlanCatalog` + `useAppointmentPricing`
- `StepObjectionHandling.tsx` — bulles Alex pré-objections
- `StepEmbeddedCheckout.tsx` — Stripe Payment Element inline (réutilise pattern `PageContractorCheckout` + edge `create-checkout`)
- `StepActivationSequence.tsx` — checklist animée 7 lignes (✔ creating profile, ✔ AIPP, ✔ territory, ...)
- `StepSuccessState.tsx` — Profile Activated + 3 CTA (Dashboard, Compléter AIPP, Importer données)

### State machine
Hook `useContractorGrowthFlow` (`src/hooks/useContractorGrowthFlow.ts`) :
```
hero → conversation → questions(1..5) → analyzing → score 
  → plan → objections → checkout → activating → success
```
Persister la progression dans `sessionStorage` pour reprise.

### Backend

**Migration SQL** :
```sql
create table public.contractor_activation_events (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid references public.contractors(id),
  user_id uuid references auth.users(id),
  company_name text,
  email text,
  phone text,
  selected_plan text,
  territory text,
  trade text,
  monthly_value numeric,
  stripe_customer_id text,
  stripe_session_id text,
  payment_status text default 'pending',
  activation_status text default 'pending',
  created_at timestamptz default now(),
  activated_at timestamptz
);
alter table public.contractor_activation_events enable row level security;
create policy "owner reads own activation" on public.contractor_activation_events
  for select using (auth.uid() = user_id);
create policy "service writes" on public.contractor_activation_events
  for insert with check (true);
-- Realtime
alter publication supabase_realtime add table public.contractor_activation_events;
```

**Edge functions** :
- `contractor-growth-checkout` — crée Stripe Checkout Session (Payment Element, plan dynamique, mode subscription), insère `contractor_activation_events` avec `payment_status='pending'`
- `contractor-growth-activate` — appelée après confirmation Stripe : crée/active row `contractors`, AIPP profile, attache territoire ; met à jour `activation_status='activated'`
- `contractor-growth-notify-admin` — envoie email admin (via `send-transactional-email` existant) + insère notification in-app + broadcast realtime

Tous avec `verify_jwt = false` (checkout côté guest possible) + ajout `supabase/config.toml`.

### Voix Alex
- Verrouillée FR, voice id `UJCi4DDncuo0VJDSIegj` (per memory: contractor master message)
- Auto-start à l'entrée de l'étape `conversation` via `openVoice("contractor_growth", contextHint)`
- Phase context envoyée à l'agent ElevenLabs via `sendContextualUpdate` à chaque transition

### UX / Performance
- Mobile-first, dark premium #060B14, glassmorphism, halos bleus
- Framer Motion pour orb breathing, reveals, transitions
- Lazy load des étapes lourdes (analysis, checkout)
- Tous les états : loading / thinking / success / failed payment / retry / timeout / network / abandoned / returning

### Analytics
- Tracker chaque transition via `trackFunnelEvent` (déjà existant) avec funnel = `contractor_growth`
- Hot leads exposés dans `/admin/sales-command-center` existant

## Critères de succès
- Chip bleue visible sur `/` sans scroll, navigue vers `/contractor-ai-growth`
- Un entrepreneur peut : landing → choisir douleur → parler à Alex (voix) → 5 questions max → analyse cinématique → score → plan recommandé → checkout Stripe inline → activation animée → success — tout dans la même expérience, sans redirection externe
- Admin reçoit notification email + in-app + realtime sur paiement réussi
- Profil contractor + AIPP créés automatiquement
- Aucune régression sur les routes `/entrepreneur/*` existantes

## Tâches (ordre d'exécution)
1. Ajouter chip bleue `HeroSectionAlexFirst.tsx`
2. Migration `contractor_activation_events` + RLS + realtime
3. Edge functions `contractor-growth-checkout` / `-activate` / `-notify-admin` + `config.toml`
4. Hook `useContractorGrowthFlow`
5. Composants `ContractorGrowthExperience` + 10 steps
6. Page + route `/contractor-ai-growth`
7. Branchement voix Alex contractor (UJCi4DDncuo0VJDSIegj, FR)
8. Test E2E mobile + desktop, états d'erreur, retry paiement
