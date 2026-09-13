# P0 — Devis personnalisé : identité réelle de l'audit + recherche d'entreprise

## Constat vérifié

La page `/entrepreneur/devis-personnalise` (`src/pages/contractor-funnel/PageContractorPricingIntake.tsx`) **ignore complètement les paramètres de l'URL**. Elle ne lit ni `audit`, ni `audit_token`, ni `entreprise`, ni `ville`, ni `metier`. Elle démarre toujours à l'étape « Commençons. Quelle est votre entreprise? » avec :

- champ nom : exemple « Plomberie Tremblay inc. »
- champ ville : exemple « Québec »
- liste des métiers dont la première valeur affichée est « Plomberie »

C'est exactement ce que montre l'aperçu. À noter : le bouton d'audit transmet déjà correctement `audit` + `audit_token` (vérifié dans `PageAiRecommendationAudit.tsx`, puis relayé par `PageMatchingProfileWizard.tsx`) — l'URL actuelle de l'aperçu contient bien `audit=e5a88139…`. Le défaut est uniquement côté page de devis, qui n'exploite pas ces valeurs.

## Ce qui sera fait

### 1. Identité réelle, validée par le serveur
La page de devis appellera la fonction serveur existante `matching-profile` (action `get`, avec `audit_id` + `audit_token`) — la même qui valide déjà l'audit pour l'assistant de profil. Aucune nouvelle fonction, aucun nouveau système.

- Tant que la réponse n'est pas revenue : écran de chargement, aucun formulaire rendu.
- Audit valide → nom, métier et ville viennent de l'audit, jamais de l'URL.
- Bandeau : « Nous continuons avec **Isolation Solution Royal** · Laval · Isolation d'entretoit ».

### 2. Suppression de l'étape inutile
Audit valide → l'étape « Quelle est votre entreprise? » n'est plus affichée du tout. Le parcours commence à la première information réellement manquante, avec la formulation demandée : « **Laval détecté — confirmez vos territoires desservis.** » La barre de progression s'ajuste au nombre réel d'étapes.

### 3. Recherche d'entreprise réelle (sans audit)
Réutilisation du composant existant `BusinessNameSearch` (qui interroge déjà la source réelle Google via `business-lookup`), amélioré sans duplication :

- déclenchement dès 3 caractères, anti-rebond 300 ms, annulation des requêtes précédentes, indicateur de chargement ;
- liste mobile lisible : nom, catégorie, ville, site/téléphone quand disponibles ;
- sélection → métier et ville préremplis avec la mention « Détecté — à confirmer » ;
- aucun résultat → bouton « Continuer avec une entreprise non trouvée », et seulement alors les champs manuels ;
- « Continuer » reste bloqué tant qu'aucune entreprise n'est sélectionnée ou saisie manuellement.

### 4. Fin des valeurs de démonstration
Retrait de « Plomberie Tremblay inc. », « Québec » et du métier « Plomberie » affiché par défaut (ajout d'un choix vide « — Sélectionner — »). Sans audit et sans brouillon, écran neutre proposant « Commencer un audit » vers `/entrepreneurs/audit-ia` — jamais de fausse entreprise.

### 5. Reprise après rafraîchissement
Le contexte d'audit est re-résolu côté serveur à chaque chargement, et les réponses déjà saisies sont conservées localement par audit/session : après rafraîchissement, l'entreprise auditée s'affiche toujours et le parcours reprend à la première donnée manquante.

### 6. Preuve exigée
Test dans l'aperçu : lancer un vrai audit sur `/entrepreneurs/audit-ia` avec « isola » → sélectionner Isolation Solution Royal → cliquer « Compléter mon profil » → suivre jusqu'au devis, puis rafraîchir. Captures d'écran fournies montrant l'URL avec `audit_id`, l'entreprise auditée affichée, l'absence de l'étape identité, et la reprise après rafraîchissement.

## Détails techniques

- Fichiers modifiés : `src/pages/contractor-funnel/PageContractorPricingIntake.tsx` (principal), `src/components/contractor/BusinessNameSearch.tsx` (anti-rebond 300 ms, annulation par identifiant de requête, état « aucun résultat », variante d'habillage sombre).
- Aucune migration, aucun changement de schéma/RLS/secret/Stripe, aucune nouvelle route, aucune fonction déployée (l'appel réutilise `matching-profile`, déjà en production).
- Brouillon local : clé `unpro_pricing_intake_draft:<audit_id|session>`, sans données sensibles.
- Vérifications : tests ciblés + suite complète, typecheck, lint, build, parcours 390 px et bureau.

## Limite honnête

Le test de bout en bout lance un vrai audit, donc de vrais appels de recherche d'entreprise (coût d'API réel, aucune donnée fabriquée). Aucun SMS, courriel ni paiement ne sera déclenché.
