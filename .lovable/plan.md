# Sprint Crédibilité + Offre Fondateur

Objectif : premier entrepreneur payé 1$. Le funnel fonctionne — corriger uniquement crédibilité + conversion.

## 1. Score AIPP réel et justifié

**Problème** : les 6 sous-scores (Visibilité 49, Confiance 43, Réputation 65, Contenu 53, Conversion 22, AEO 78) s'affichent sans preuve.

**Correction (composant score preliminary uniquement)** :
- Sur chaque carte de sous-score, afficher 2–4 facteurs bruts issus de `contractor_aipp_audits.evidence_snapshot` (ex : `✓ 312 avis Google · ✓ 4.8★ · ✗ 0 vidéos · ✗ RBQ manquante`).
- Si un signal est absent dans l'evidence : afficher `Non détecté automatiquement` en gris, et **ne pas** compter le sous-score comme validé.
- Aucun score n'est affiché si `confidence_level = low` — remplacer par "Analyse partielle — complétez pour obtenir votre score réel".
- Réutiliser `aipp-real-scoring-engine` (déjà en place). Aucune nouvelle logique de calcul.

## 2. Extraction — vérité stricte

**Problème** : l'écran "Analyse" coche RBQ/Images/Services/Zones, puis l'écran suivant les affiche vides.

**Correction** :
- La checklist d'analyse (Analyse en cours…) lit l'état réel de chaque champ de `contractors` / `contractor_import_snapshots` après le run, pas un `true` codé en dur.
- Chaque ligne devient : `✓ Détecté` (valeur non vide) / `— Non détecté` (gris, jamais rouge).
- Aucun signal n'est marqué ✓ tant que la donnée n'a pas atterri en base.

## 3. "Alex complète mon profil" — vraie action

**Problème** : le toast "Alex peut compléter ça pour vous" ne fait rien.

**Correction** :
- Le bouton appelle une edge function `alex-autocomplete-profile` qui, pour le `contractor_id` courant, exécute en séquence les pipelines **déjà existants** :
  - `aipp-pipeline-run` (crawl + Google Business + logo + photos + catégories + villes)
  - Lookup RBQ (`rbq-status`) et NEQ (`extract-neq`) si numéro détecté sur site
  - Merge dans `contractors` en respectant `contractor-identity-resolution` (jamais écraser un champ marqué `human_validated`)
- UI : bouton passe en "Alex analyse votre site…" avec les 8 étapes cochées en temps réel via realtime sur `contractor_aipp_audits` / `contractors`.
- Résultat visible : la barre `Complétez votre profil` passe de 14 % → 70 %+ en direct, sections RBQ/Services/Zones/Logo se remplissent.
- Aucune promesse si l'edge échoue : toast d'erreur discret + rollback UI, pas de faux ✓.

## 4. Offre Fondateur 1 $ / 7 jours

**Nouvelle table** `founder_activation_slots` (limite dure de 10 slots) :
- champs : `slot_number` (1–10), `contractor_id nullable`, `claimed_at`, `stripe_subscription_id`, `status` (`open` | `reserved` | `active` | `expired`)
- fonction SQL `claim_founder_slot(contractor_id)` avec `SELECT ... FOR UPDATE SKIP LOCKED` pour éviter la double-attribution.
- Vue publique `v_founder_slots_public` : renvoie seulement `remaining` (int) et `total` (10).

**Prix / Stripe** :
- Réutiliser `create-activation-checkout` existant (déjà 1 $). Étendre pour :
  - vérifier `claim_founder_slot` avant de créer la Checkout Session
  - créer une subscription Stripe : 1 $ maintenant, puis prix `Premium` (599 $) après 7 jours de trial (`trial_period_days: 7`)
  - Metadata : `founder_slot_number`, `contractor_id`.
- Webhook `stripe-webhook` : sur `checkout.session.completed`, marque le slot `active` et déclenche `launch-agent-activation`.

**Affichage écran plans** (remplacement en place, pas de nouvelle page) :
- Si `remaining > 0` : masquer les 3 cartes 149/349/599, afficher une seule carte Fondateur :
  - "Offre Fondateur · Valeur normale 599 $/mois · Aujourd'hui **1 $ pendant 7 jours**"
  - Compteur live `X / 10 places restantes` (polling 10 s ou realtime sur la vue).
  - CTA `Activer mon profil Fondateur — 1 $` → `create-activation-checkout`.
- Si `remaining = 0` : fallback sur la grille 149/349/599 actuelle (aucun changement).

## 5. Raccourci vers paiement à 70 %+

- Sur l'écran `Complétez votre profil`, un `useEffect` observe le pourcentage global.
- Dès que `completion_pct ≥ 70` **et** que `remaining > 0`, afficher un CTA sticky :
  `Profil prêt à 78 % — activez pour 1 $` → route paiement.
- Ne pas rediriger automatiquement (respect utilisateur), un seul clic.

## Détails techniques

Fichiers touchés :
- `src/pages/contractor-onboarding/…` (checklist analyse, écran score, écran complétion, écran plans) — présentation uniquement.
- `src/components/aipp/PreliminaryScoreCard.tsx` (nouveaux "facteurs" par sous-score).
- `src/features/founderMode/FounderOfferCard.tsx` (nouveau, remplace la grille quand `remaining > 0`).
- `src/hooks/useFounderSlots.ts` (lecture `v_founder_slots_public`, realtime).
- `src/hooks/useAlexAutocomplete.ts` (invoque `alex-autocomplete-profile`, écoute realtime).
- `supabase/migrations/*` : table `founder_activation_slots` + seed 10 lignes + vue publique + fonction `claim_founder_slot` + GRANTs + RLS (SELECT anon sur la vue, RPC uniquement pour l'edge en service_role).
- `supabase/functions/alex-autocomplete-profile/index.ts` (orchestre les pipelines existants).
- `supabase/functions/create-activation-checkout/index.ts` (extension slot + trial 7j).
- `supabase/functions/stripe-webhook/index.ts` (activation slot).

Non touchés : parcours, design des pages existantes, moteur de scoring, Alex voice, orchestrateurs.

## Succès

- Aucune coche verte n'apparaît sans donnée réelle en base.
- Chaque sous-score AIPP montre ses facteurs.
- Cliquer "Alex complète" fait passer le profil à ≥ 70 % en moins de 30 s.
- Écran plans montre `Fondateur 1 $ · X/10` tant que des slots existent.
- Un entrepreneur peut passer de clic SMS → payé 1 $ en moins de 2 min.
