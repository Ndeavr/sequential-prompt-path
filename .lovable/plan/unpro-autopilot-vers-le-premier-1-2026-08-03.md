# UNPRO Autopilot — Vers le premier 1 $

## Ce que les données de production disent (vérifié aujourd'hui)

- 250 prospects actifs. 172 SMS livrés, 86 non livrés, **4 clics au total, 0 inscription, 0 paiement**.
- Causes de non-livraison : `30006 ligne fixe` (69), `30034 A2P` (14), autres (3). **85 prospects ont un courriel** — c'est le levier de récupération immédiat.
- Les 4 clics historiques n'ont produit aucun événement `landing_viewed` : le traçage post-clic a été déployé après ces clics. Test live effectué à l'instant sur un vrai jeton : `clicked` + `landing_viewed` sont désormais bien enregistrés. Le traçage est fonctionnel.
- `crm-automation-tick` fonctionne mais **n'était planifié dans aucun cron**. Exécution réelle lancée à l'instant : 5 seconds SMS + 5 courriels de récupération envoyés avec succès.
- Anti-doublon actuel dans `crm-recovery-action` : uniquement « même jour ». Insuffisant pour un cron continu.

## Ce qu'il reste à construire

### 1. Rendre la récupération autonome (P0)
- Ajouter un garde-fou de 7 jours par (prospect, action) dans `crm-automation-tick`, lu depuis `crm_action_log`.
- Planifier `crm-automation-tick` en cron `*/30 * * * *` avec `dry_run:false`, `limit_per_rule:8` (plafond ~16 actions/heure, sûr pour la réputation).
- Ajouter une règle manquante : `undelivered_landline` → courriel prioritaire (69 prospects concernés dès maintenant).

### 2. Next Best Action IA (P1)
Étendre `v_crm_prospects` (ou une vue `v_crm_next_action`) avec 4 colonnes déterministes :
- `activation_probability` (0-100) — dérivée de l'étape atteinte, fraîcheur, canal disponible, qualité du numéro.
- `estimated_value_cents` — valeur du plan probable selon catégorie et ville.
- `blocked_reason` — texte court canonique (`ligne_fixe`, `livré_sans_clic`, `clic_sans_inscription`, …).
- `next_best_action` — action exécutable, alignée sur les actions supportées par `crm-recovery-action`.

### 3. Mode Opérateur + Tableau de revenus (P1)
- `/admin/crm` : liste « Aujourd'hui » triée par `activation_probability × estimated_value`, avec un bouton d'action unique par ligne.
- `/admin/launch-control` : bandeau Revenu (Aujourd'hui / Hier / 7 j / 30 j), activations payées, récupérations en attente, taux clic→paiement.

### 4. A/B testing des messages (P2)
Les tables `ab_test_variants` / `ab_test_assignments` existent déjà. Brancher `second-touch-outreach` et `crm-recovery-action` : assigner une variante par prospect, enregistrer clic et paiement par variante, afficher le gagnant dans le CRM.

### 5. Revue quotidienne automatique (P2)
Cron quotidien produisant un résumé écrit : envoyés, livrés, clics, paiements, principaux blocages, action recommandée pour demain — visible dans `/admin/launch-control`.

## Détails techniques

- Fichiers : `supabase/functions/crm-automation-tick/index.ts`, `supabase/functions/crm-recovery-action/index.ts`, `supabase/functions/second-touch-outreach/index.ts`, `src/pages/admin/PageAdminCRM.tsx`, `src/pages/admin/PageAdminLaunchControl.tsx`, `src/hooks/useCrmOperations.ts`.
- Migrations : mise à jour de la vue `v_crm_prospects` (colonnes de scoring), nouvelle vue `v_revenue_scoreboard`.
- Cron ajouté via l'outil d'insertion (contient la clé anon), pas via migration.
- Aucun système SEO, sitemap, corpus IA ou contenu n'est touché.

## Terminé quand

- Le cron de récupération tourne toutes les 30 minutes sans doublons.
- Chaque prospect affiche probabilité, valeur, blocage et prochaine action.
- Le tableau de revenus affiche des chiffres réels et le premier 1 $ est visible dès l'encaissement.
