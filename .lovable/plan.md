## Démo ISR — Sélection intelligente du plan UNPRO (1$ test)

Page protégée de démonstration live pour Isolation Solution Royal (ISR) qui simule le flow Alex → Plan → Checkout Stripe à 1$ via code privé.

### Routes (React Router)
- `/demo/isroyal-alex-plan-test` — page principale (Alex + questions + plans + promo + checkout)
- `/demo/isroyal-alex-plan-test/success?session_id=…` — confirmation post-paiement
- `/demo/isroyal-alex-plan-test/cancel` — paiement annulé

Aucune nav publique vers ces routes. Lien direct uniquement.

### Base de données

Nouvelle table `public.demo_contractor_plan_tests`:
```text
id uuid pk default gen_random_uuid()
created_at timestamptz default now()
company_name, legal_name, website, phone_primary, phone_secondary text
selected_capacity, selected_territory, selected_project_type,
  selected_objective, wants_ai_priority text
recommended_plan text
normal_price_cents, demo_price_cents int
promo_code text, promo_valid bool default false
stripe_session_id text
payment_status text default 'not_started'
flow_status text default 'started'
raw_answers jsonb, metadata jsonb
```

GRANTS: `service_role` ALL, `authenticated` SELECT/INSERT/UPDATE pour propre run + admin. RLS:
- INSERT: tous (anon + authenticated) — démo publique mais code requis pour 1$
- SELECT: admin uniquement (`has_role(auth.uid(),'admin')`)
- UPDATE: service_role only (edge function)

### Edge function `create-isr-demo-checkout`
Input: `{ plan, promo_code, contractor_name, demo_run_id? }`

Guardrails serveur (refus 400 sinon):
- `plan === "Signature"`
- `promo_code === "ISR_SIGNATURE_TEST"`
- `contractor_name === "Isolation Solution Royal"`

Crée Stripe Checkout Session:
- mode: `payment`
- line_items: `price_data` inline `{ currency: "cad", unit_amount: 100, product_data: { name: "UNPRO Signature — ISR Demo" } }` (jamais de prix client-side)
- metadata complète (contractor_name, legal_name=9480-0976 Québec inc., website=isroyal.ca, demo_flow, selected_plan=Signature, promo_code, source)
- success_url / cancel_url avec `{CHECKOUT_SESSION_ID}`
- Insert/Update `demo_contractor_plan_tests`: `flow_status='checkout_started'`, `payment_status='checkout_started'`, `stripe_session_id`

Réutilise secret existant `STRIPE_SECRET_KEY`. Import Supabase: `https://esm.sh/@supabase/supabase-js@2.49.1`. Stripe: `https://esm.sh/stripe@18.5.0`.

### Edge function `confirm-isr-demo-checkout`
Input: `{ session_id }`. Vérifie `stripe.checkout.sessions.retrieve(session_id)`, si `payment_status === "paid"` → update demo row: `payment_status='paid'`, `flow_status='paid'`. Retourne snapshot pour la page success.

### UI — Page principale

Stack visuel premium UNPRO (Cinematic Dark `#050816`, glass blur 24px, radii 28/18/999, Inter -0.04em, easing `(.22,1,.36,1)`).

```text
┌──────────────────────────────────────┐
│ HERO                                 │
│ "Démo ISR — Sélection intelligente"  │
│ subtitle Alex                        │
├──────────────────────────────────────┤
│ CARD ISR (sticky)                    │
│ - Isolation Solution Royal           │
│ - 9480-0976 Québec inc.              │
│ - isroyal.ca · 514-249-9522 / 941-3141│
│ - Spécialiste de l'entretoit         │
│ - Laval / Montréal / RN / Lanaudière │
├──────────────────────────────────────┤
│ ALEX ORB + CONVERSATION              │
│  Q1 → Q2 → Q3 → Q4 → Q5 (pills)      │
├──────────────────────────────────────┤
│ PLANS GRID (Pro/Premium/Élite/Sig.)  │
│ Signature highlighted post-reco      │
│ Badge "Recommandé pour ISR"          │
├──────────────────────────────────────┤
│ PROMO + PAYMENT (révélés post-reco)  │
│ "Activer Signature pour 1$"          │
└──────────────────────────────────────┘
```

#### Composants à créer
- `src/pages/demo/PageIsrDemoPlanTest.tsx`
- `src/pages/demo/PageIsrDemoSuccess.tsx`
- `src/pages/demo/PageIsrDemoCancel.tsx`
- `src/components/demo-isr/IsrIdentityCard.tsx`
- `src/components/demo-isr/IsrAlexConversation.tsx` (questions séquentielles, state local)
- `src/components/demo-isr/IsrPlanGrid.tsx` (4 cartes statiques, Signature highlight)
- `src/components/demo-isr/IsrSignaturePanel.tsx` (détails + promo + bouton)
- `src/components/demo-isr/IsrAdminPeek.tsx` (visible si admin: 10 dernières runs)
- `src/config/isrDemoConfig.ts` (questions, options, logique reco, copies)

#### Alex flow
- Greeting auto au mount: "Bonjour Danny. Je vais analyser les objectifs d'Isolation Solution Royal pour recommander le bon plan UNPRO."
- 5 questions one-by-one (pills cliquables, pas de voix — UI conversationnelle textuelle simulée pour éviter d'exposer le moteur Alex réel)
- À chaque réponse: insert/upsert `demo_contractor_plan_tests` (un `demo_run_id` en localStorage)
- Logique reco: si `capacity ∈ {25, 50+}` OU `territory==='Tous'` OR `objective ∈ {'Dominer mon territoire','Maximiser le revenu par mois'}` OR `wants_ai_priority==='Oui'` → Signature. Sinon Signature aussi (jamais downgrade — par règle produit "no downgrade après intent").
- Réveille panel paiement après reco
- Si user hésite: ligne anti-downgrade *"Vu les objectifs ISR, je ne recommande pas de réduire le plan…"*

#### Promo
- Input + bouton "Appliquer". Validation client immédiate (`ISR_SIGNATURE_TEST`) + serveur dans edge function
- Succès: "Code appliqué: Signature activé à 1$ pour cette démo." Prix 1 799$ → 1$ (strike-through)
- Erreur: "Code invalide pour cette démo."
- Bouton "Activer Signature pour 1$" désactivé tant que promo non validée

#### Conversion copy
- Au-dessus du bouton: "Ce test active uniquement une transaction démo à 1$. Le plan Signature réel demeure 1 799$/mois."
- Sous le bouton: "Rendez-vous exclusifs garantis. Pas des leads partagés."

### Page success
Appelle `confirm-isr-demo-checkout` avec `session_id`. Affiche carte glass:
- "Signature activé — Démo ISR complétée"
- Bloc récap (Company / Plan / Paiement / Status / Next step)
- CTA primaire "Voir le profil ISR" → `/isolation-solution-royal`
- CTA secondaire "Retour à la démo" → `/demo/isroyal-alex-plan-test`

### Page cancel
- "Paiement annulé" + CTA "Reprendre la démo"
- Update demo row → `payment_status='cancelled', flow_status='cancelled'`

### Admin peek (sur la page principale uniquement)
Si `has_role(uid,'admin')`: petite section en bas listant 10 dernières runs (date, promo_valid, plan, payment_status, session_id tronqué). Sinon caché.

### Sécurité / règles strictes
- Prix 1$ **jamais** envoyé depuis le client — toujours hardcodé dans l'edge function
- Promo validée serveur (pas seulement client)
- Aucune mention "Lovable", aucun prompt interne visible
- Pas de founder discount, pas de plan legacy, pas de slug `_acq`
- Identité ISR statique côté UI (pas de fetch — évite tout mismatch RBQ/NEQ/téléphone)
- Logs: chaque tentative checkout (succès ou refus) loggée dans `demo_contractor_plan_tests` + console edge

### Fichiers / artefacts
- **Migration**: `demo_contractor_plan_tests` (table + GRANTS + RLS)
- **Edge fn**: `supabase/functions/create-isr-demo-checkout/index.ts`
- **Edge fn**: `supabase/functions/confirm-isr-demo-checkout/index.ts`
- **Pages**: 3 pages sous `src/pages/demo/`
- **Composants**: 5 sous `src/components/demo-isr/`
- **Config**: `src/config/isrDemoConfig.ts`
- **Router**: ajout des 3 routes dans `src/app/router.tsx`

### Hors scope (volontaire)
- Pas de voix Alex réelle (ElevenLabs) — UI conversationnelle textuelle pour démo contrôlée et stable
- Pas de webhook Stripe — confirmation via retrieve session côté `success` (suffisant pour démo 1$)
- Pas de réutilisation immédiate de la table par d'autres entrepreneurs — la migration pose les bases, l'extension sera un follow-up
