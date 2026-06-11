# MISSION 48H — Premier Entrepreneur Payant UNPRO

Objectif unique : **1 paiement entrepreneur en < 48h**. Tout le reste est gelé.

Une grosse partie de l'infra existe déjà (founder_plans + useFounderPlans + create-founder-checkout, launch-war-room, agents pipeline, Alex contractor mode, AIPP scoring). Cette vague **assemble** un funnel direct et visible plutôt que de reconstruire.

---

## 1. SYSTEM_MODE = FIRST_CUSTOMER_48H

- Étendre `launch_mode_state` (déjà existant) avec un flag `first_customer_48h_active boolean` + `target_deadline timestamptz`.
- Helper `src/lib/launch/firstCustomer48h.ts` : `isFirstCustomer48hActive()`, `getTimeRemaining()`.
- Quand actif : bandeau prioritaire visible sur `/`, compteur places fondatrices partout, Alex bascule en mode "Conseiller Croissance IA".

## 2. Bandeau prioritaire — Homepage

- Composant `BannerFirstCustomer48h.tsx` injecté en haut de `PageHomeIntentUNPRO` (route `/`).
- Gradient distinct (or/cuivré sur fond cinematic dark — différent des autres sections).
- Copy exact fourni par l'utilisateur ("Entrepreneurs du Québec / Recevez des rendez-vous exclusifs...").
- 2 CTA : **Activer mon profil** → `/pro/activate` · **Voir mon score IA** → `/pro/score`.
- Mobile-first, dismissible session-only.
- Track `founder_banner_view`.

## 3. `/pro/score` — Score IA instantané

- Page publique `PageProScoreInstant.tsx`.
- Form ultra court : Entreprise, Site web, Ville, Téléphone, Email, Métier.
- Submit → edge function `pro-score-instant` qui :
  - Insère un `outbound_prospect` (réutiliser table existante) + crée un `aipp_score` row.
  - Calcule un score réel via le moteur AIPP existant (`aipp-real-scoring-engine`) si site web fourni, sinon **score déterministe simulé intelligent** (hash métier+ville → 5 dimensions 60-90).
  - Retourne 5 dimensions : Visibilité IA, Confiance numérique, Autorité locale, Profil entrepreneur, Potentiel de croissance.
- Vue résultat `ScoreRevealCard` :
  - 5 jauges animées.
  - Bloc **Opportunités détectées** (5 puces).
  - CTA géant **Activer mon profil UNPRO** → `/pro/activate?prefill=<token>`.
- Jamais "fonctionnalité à venir". Toujours afficher un score.
- Events : `score_started`, `score_completed`.

## 4. `/pro/activate` — Activation conversationnelle (Alex)

- Page `PageProActivate.tsx` qui **ouvre Alex en mode contractor immédiatement** (pas de formulaire).
- Réutilise `PanelContractorAdvisorAlex` + `resolveAlexMode` (déjà contractor mode).
- Si `?prefill=<token>` : précharge entreprise/ville/métier dans `alexCheckoutState`.
- Script Alex (prompt update côté `alexModes.ts` greetingFr contractor + nouveau prompt rule `alex_first_customer_48h`) :
  1. "Quelle est votre spécialité principale ?"
  2. "Quelle ville souhaitez-vous dominer ?"
  3. "Quel type de projet est le plus rentable ?"
  4. Résumé "Voici ce que j'ai trouvé…"
  5. "Je peux activer votre profil maintenant" → bouton inline **Activer (149$/mois)** déclenche `create-founder-checkout` avec `planSlug = 'fondateur-149'`.
- Fallback formulaire 6 champs (Entreprise/Nom/Tel/Email/Métier/Ville) si Alex échoue (voice/chat health).
- Events : `activation_started`, `checkout_started`.

## 5. Offre Fondateur 149$/mois

- Ajouter (via insert) row `founder_plans` slug `fondateur-149` : price=14900, max_spots=25, features listées.
- `FOUNDING_SPOTS = 25` lu depuis DB. Compteur temps réel (`useFounderPlans` a déjà realtime).
- Affiché : bandeau, page score, page activate, bloc preuve sociale.
- Format : "X places restantes / 25".

## 6. Stripe Checkout direct

- Réutiliser `create-founder-checkout` (existe). Vérifier qu'il accepte le slug `fondateur-149` et redirige vers `/pro/welcome`.
- Pas d'étape intermédiaire. Activation → Stripe Checkout → `/pro/welcome`.
- Webhook : à la confirmation paiement (stripe-webhook existant), créer `contractors` row + maj `launch_mode_state.first_customer_acquired_at` + event `founder_paid`.

## 7. `/pro/welcome` — Page succès

- Page `PageProWelcome.tsx` (cinematic dark).
- Message "Bienvenue parmi les entreprises fondatrices UNPRO. Alex commence maintenant l'analyse de votre profil."
- Checklist 4 étapes : Analyse IA / Vérification entreprise / Optimisation profil / Activation recommandations (états animés).
- Déclenche `agent-orchestrator` pipeline (Découverte → Enrichissement → Score → Message) sur le `contractors.id` créé.
- CTA secondaire : "Ouvrir mon tableau de bord".

## 8. Alex — Conseiller Croissance IA (contractor mode)

- Renommer le label persona contractor : `alexModes.ts` → titre affiché "Conseiller Croissance IA" (pas "Assistant IA").
- Mettre à jour `greetingFr` contractor : "Bonjour. J'ai analysé votre présence numérique. Puis-je vous montrer ce que les moteurs IA comprennent actuellement de votre entreprise ?"
- Ajouter règle prompt `mem://ai/alex/system-prompt-active` (extension contractor) : diagnostic d'abord, valeur ensuite, activation en fin → toujours conclure par **Activer mon profil** / **Plus tard**.
- Détection contractor élargie : ajouter mots-clés `contracteur, soumission, contrat, client, compagnie, entreprise` au `alexPersonaRouter` (déjà partiellement présent — vérifier).
- Pas vendeur, pas "voulez-vous acheter". Toujours "Souhaitez-vous que je procède ?"

## 9. `/admin/founders` — Dashboard war room

- Page `PageAdminFounders.tsx` sous `/admin/founders`.
- Table : Entreprise / Métier / Ville / Score IA / Date / Statut / Plan / Paiement.
- Statuts : `lead | started | activated | paid | onboarding | live`.
- Source : join `outbound_prospects` × `aipp_scores` × `contractors` × `stripe_payments`.
- KPI top : 25 analyses / 10 activations / 5 checkouts / **1 payé** (cibles 48h) — barre de progression.
- Realtime sur founder_plans + nouveaux paiements.
- Lien depuis `/admin/launch-war-room`.

## 10. Pipeline agents IA (visible, vrai)

- Étape `agent_tasks` : `discovery → enrichment → ai_scoring → personalized_message → ready_for_contact`.
- Règle stricte : un agent ne peut écrire `completed` que si `output_data IS NOT NULL` (trigger DB).
- UI dans `/admin/founders` colonne agents avec badges queued/running/completed/failed.

## 11. Bloc preuve sociale homepage

Sous le bandeau : 4 cartes "Pourquoi les entrepreneurs rejoignent UNPRO" — Rendez-vous exclusifs / Compatibilité intelligente / Pas de compétition malsaine / Intelligence propriétaire.

## 12. Analytics events

Centraliser dans `src/utils/trackFirstCustomerEvent.ts` :
`founder_banner_view, score_started, score_completed, activation_started, checkout_started, checkout_completed, founder_paid`.
Écrits dans `platform_events` + `experiment_events`.

## 13. Success criteria (visible admin)

Widget objectif 48h dans `/admin/founders` :
- 25 analyses IA / 10 activations / 5 checkouts / **1 payé**
- Compteur deadline.

---

## Détails techniques

**Tables / migrations**
- `ALTER TABLE launch_mode_state ADD first_customer_48h_active boolean DEFAULT false, ADD target_deadline timestamptz;`
- Trigger sur `agent_tasks` : refuser `status='completed' AND output_data IS NULL`.
- Vue `v_admin_founders` joignant prospects + scores + contractors + paiements.
- Insert row `founder_plans` slug `fondateur-149` (149$/mois, 25 spots).

**Edge functions (nouvelles)**
- `pro-score-instant` — calcule + persiste score IA (réel ou simulé déterministe).
- Réutilisation : `create-founder-checkout`, `agent-orchestrator`, `aipp-real-scoring-engine`, stripe webhook existant.

**Nouvelles pages**
- `src/pages/pro/PageProScoreInstant.tsx` (`/pro/score`)
- `src/pages/pro/PageProActivate.tsx` (`/pro/activate`)
- `src/pages/pro/PageProWelcome.tsx` (`/pro/welcome`)
- `src/pages/admin/PageAdminFounders.tsx` (`/admin/founders`)

**Nouveaux composants**
- `BannerFirstCustomer48h.tsx`
- `ScoreRevealCard.tsx`
- `FoundingSpotsCounter.tsx`
- `SocialProofContractorBlock.tsx`
- `AdminFoundersTable.tsx`, `AdminFoundersKpis.tsx`

**Fichiers modifiés**
- `src/app/router.tsx` (4 routes)
- `src/pages/PageHomeIntentUNPRO.tsx` (bandeau + preuve sociale)
- `src/config/alexModes.ts` (greeting + label "Conseiller Croissance IA")
- `src/features/alex/intent/alexPersonaRouter.ts` (mots-clés)
- `src/integrations/supabase/types.ts` (auto-sync après migrations)

**Contraintes respectées**
- fr-CA, Cinematic Dark sur surfaces dashboard, Warm Neutral sur pages publiques.
- Pas de `text-gray-*`. Tokens `--text-*`.
- Aucun "fonctionnalité à venir".
- Pas de modification des pages propriétaires, SEO, ou modules non liés à l'acquisition.
- Aucune destruction des moteurs existants — uniquement assemblage.

---

## Hors scope (refusé pour cette vague)
- Optimisations SEO, pages propriétaires, vagues 2-3 placeholder pages, refonte Alex, nouvelles fonctionnalités condo, etc.

Pret pour build ?
