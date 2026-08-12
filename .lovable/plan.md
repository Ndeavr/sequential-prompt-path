# UNPRO — Boucle autonome de conversion vers le premier 1 $

Correction de stratégie : l'acquisition primaire est **automatique** (courriel/SMS conformes → landing personnalisée → profil d'entreprise prêbâti → 1 $ → objectifs Alex → plan personnalisé → profil complété). La file « À contacter manuellement » devient la **couche de récupération**, activée seulement après que l'automatisation a eu sa chance, et priorisée par signaux d'intention.

Nord : produire de vrais paiements de 1 $ automatiquement, puis utiliser l'humain pour récupérer les meilleurs non-convertis.

## 1. Audit d'état actuel (à faire AVANT tout changement)

Aucune hypothèse. Chaque affirmation doit venir d'une requête ou d'une lecture.

- Cartographier les événements réellement écrits aujourd'hui : `acquisition_events`, `sms_logs`/`acq_sms_logs`, logs courriel, `billing_checkout_sessions`, `v_activation_funnel`, `v_prospect_funnel`, `v_campaign_funnel`, `crm_action_log`.
- Mesurer les taux réels par transition sur les 30 derniers jours et par cohorte (métier × ville × canal × variante) : envoyé → livré → cliqué → landing vue → profil vu → CTA 1 $ → session Stripe → payé → objectifs complétés → profil ≥ 70 % → plan accepté.
- Identifier la **première transition nulle ou faible** ; c'est la seule à corriger en premier.
- Auditer le rendu du profil d'entreprise (`/pro/:slug`, `PageProLandingNuclearClose`, `src/features/contractorProfile/*`) : desktop, mobile, données incomplètes, erreurs console, temps de rendu, champs vides visibles.
- Vérifier la couverture des données par source (VÉRIFIÉ / DÉCLARÉ / INFÉRÉ) : logo, identité, catégories, territoires, années, RBQ/NEQ, site, signaux Google Business, note et nombre d'avis, photos.

Livrable : rapport de goulot unique + tableau de couverture des données.

## 2. Taxonomie canonique du tunnel (source unique)

Un seul vocabulaire d'événements, écrit par toutes les fonctions Edge et le front :

`outreach_queued`, `outreach_sent`, `outreach_delivered`, `outreach_failed`, `link_clicked`, `landing_viewed`, `landing_engaged` (scroll ≥ 50 % ou ≥ 15 s), `profile_viewed`, `profile_section_expanded`, `correction_requested`, `cta_activate_clicked`, `checkout_created`, `checkout_abandoned`, `payment_succeeded`, `goals_started`, `goals_completed`, `plan_recommended`, `plan_accepted`, `profile_completion_updated`, `recommendation_eligible`.

Chaque événement porte : `prospect_id`, `contractor_id?`, `token`, `message_variant`, `landing_variant`, `profile_variant`, `trade`, `city`, `channel`, `ts`. Vue matérialisée de conversion par étape et par cohorte.

## 3. Règles d'optimisation automatique (déterministes)

Le système corrige la première transition faible, une à la fois :

| Transition faible | Action automatique |
|---|---|
| livré → clic | tester variantes de MESSAGE (objet/accroche/preuve/CTA), dans les gardes CASL + anti-doublon 24 h |
| clic → engagement/landing | tester variantes de LANDING (proposition de valeur, preuve, position de l'offre 1 $) |
| landing → profil | P0 : corriger rendu/erreurs/lenteur du profil |
| profil → checkout | renforcer CTA 1 $, confiance, garanties, rareté du territoire |
| checkout → payé | diagnostiquer Stripe/auth/redirection/mobile |
| payé → objectifs/profil | optimiser l'onboarding Alex (une question à la fois, valeur avant effort) |

Garde-fous : aucune décision sous **n ≥ 200 livraisons ou 40 clics par variante**, maximum une variante changée par cohorte à la fois, journal de chaque changement.

## 4. Profil d'entreprise — actif de conversion P0

Il doit prouver qu'UNPRO comprend déjà l'entreprise.

- Provenance affichée par champ : **Vérifié** (registre/RBQ/NEQ/Google), **Déclaré** (fourni par l'entrepreneur), **Inféré** (déduit — étiqueté clairement). Rien d'inventé.
- Enrichissement à partir des sources existantes uniquement : logo, identité légale et commerciale, catégories de service, territoires, années d'activité, accréditations, site web, signaux Google Business, note et nombre d'avis, résumé IA du sentiment des avis **ancré sur des avis réels existants**, spécialités, statut de confiance/vérification, photos si légitimement disponibles, score de préparation à la recommandation + explication.
- Dégradation élégante : aucun champ vide affiché ; blocs manquants deviennent des invitations à compléter, jamais des trous.
- Bouton proéminent « Corriger / compléter » → flux d'appropriation qui améliore la qualité des données et enregistre `correction_requested`.
- Responsive strict mobile d'abord, conforme aux règles de lisibilité existantes (scope thème sombre, WCAG AA).

## 5. Après le 1 $ — Alex, une question à la fois

Aucun tableau de bord générique. Alex qualifie séquentiellement :
objectif de croissance → types de projets → valeur/budget de projet idéal → territoires/villes → capacité/rendez-vous souhaités → exclusions → urgence → préférence d'exclusivité.

Chaque réponse met à jour la valeur affichée en temps réel (revenus potentiels, rendez-vous nécessaires, places restantes).

## 6. Moteur de plan personnalisé

Une seule recommandation par défaut, alternatives inspectables. Basé sur l'architecture existante 49 / 79 / 149 / 299 / 599 / 1499 $ plus : territoire, concurrence par catégorie, capacité déclarée, places restantes, score de visibilité. Réutiliser le moteur monotone canonique existant (`_shared/planRecommendation.ts`) — jamais de plan plus cher pour un score plus faible.

## 7. Complétion de profil guidée

Score et liste de contrôle après paiement : logo, description, services, territoires, accréditations, photos, confirmation du résumé d'avis, différenciateurs, critères de client/projet idéal. Les données existantes sont préremplies : l'entrepreneur **confirme ou corrige**, il ne repart pas de zéro. Le score débloque l'éligibilité à la recommandation.

## 8. Modules de service inspirés du benchmark (phase ultérieure)

Nous ne clonons pas Search Atlas. Modules de valeur à intégrer dans les plans : audit/optimisation de fiche Google, surveillance des avis + résumé et réponses IA, visibilité locale et cartes de chaleur, citations et cohérence des coordonnées, schéma/entités, audit technique et on-page du site, pages locales de contenu, visibilité dans les réponses IA/LLM. Différenciation préservée : marketplace de recommandation + rendez-vous exclusifs garantis + intelligence entrepreneur.

## 9. Laboratoire de conversion (Admin)

Nouvelle page `/admin/conversion-lab` sur données de production : lignes = variante message × variante landing × variante profil × cohorte (métier/ville) ; colonnes = livrés, cliqués, engagés, profil vu, checkout 1 $, payés, objectifs complétés, % complétion profil, plan accepté, activés, MRR. Tests A/B contrôlés avec taille d'échantillon minimale, arrêt manuel, historique des décisions.

## 10. File manuelle — repositionnée en récupération

Ordre d'éligibilité : cliqué/non payé → checkout/non payé → payé/objectifs incomplets → forte interaction profil/non payé → répondu/intéressé → livré/sans clic **après** la seconde relance automatique. Les affiliés ne reçoivent jamais de prospect neuf de haute qualité avant l'automatisation, sauf dérogation explicite d'un admin. Le reste de la mécanique déjà livrée (assignations, résultats structurés, actions en un clic) est conservé tel quel.

## 11. Détails techniques

- Migrations : table d'événements canoniques ou normalisation de `acquisition_events` + vues de conversion ; tables de variantes (`conversion_variants`, `conversion_assignments`) ; colonnes de provenance sur les champs de profil ; `profile_completion_score`.
- Fonctions Edge modifiées : outreach (variante message), résolution de token (variante landing), profil (provenance + enrichissement), `create-activation-checkout` (événements), `stripe-webhook` (paid → goals), nouvelle `conversion-optimizer-tick` (détecte la transition faible, applique la règle, journalise).
- Front : profil d'entreprise, flux Alex post-paiement, checklist de complétion, `/admin/conversion-lab`.
- Intact : automatisations d'outreach canoniques, gardes CASL, opt-out, anti-doublon 24 h, journaux d'audit, idempotence.

## 12. Tests

- E2E production sur un vrai prospect : outreach → clic → landing → profil → 1 $ → objectifs → plan → complétion.
- Rendu du profil : desktop, mobile, données minimales, données riches, données corrompues.
- Non-régression : conformité CASL, opt-out, doublon 24 h, monotonicité des plans, RLS affilié.
- Vérification que chaque transition émet exactement un événement (pas de double comptage).

## 13. Critères de complétion (durs)

1. Chaque transition du tunnel produit des événements réels et un taux de conversion mesuré.
2. Le goulot actuel est identifié par données, pas par supposition, et corrigé.
3. Le profil d'entreprise rend correctement sur mobile et desktop, même avec données partielles, avec provenance visible et chemin « Corriger / compléter ».
4. Un paiement de 1 $ réel arrive via le chemin automatique, sans intervention humaine.
5. Après paiement, Alex complète les objectifs et recommande exactement un plan cohérent.
6. Le laboratoire de conversion affiche les données réelles par variante et cohorte.
7. La file manuelle ne contient que des prospects ayant déjà reçu leur chance automatique.
