# P0 — Correction des 9 régressions (aucune reconstruction)

Chaque correctif reste dans les composants, fonctions et tables déjà existants. Aucune nouvelle route, aucun parcours parallèle, aucune table doublon.

## Ce qui a été vérifié avant ce plan

- Les tables publiques `aipp_*` n'ont **aucun** droit de lecture accordé à `anon`/`authenticated` (vérifié en base). La fonction `aipp_is_published` est bien sécurisée et exécutable : le blocage vient des droits manquants sur les tables, pas de la fonction.
- Sur 948 fiches de prospects, 945 ont un statut de téléphone « non vérifié » : la règle actuelle n'autorise l'appel que pour deux statuts positifs, ce qui bloque en pratique presque tous les appels légitimes.
- Les forfaits payants ont bien un prix annuel en base (1 430 $, 2 870 $, 5 750 $, 9 590 $) mais **aucun identifiant de prix annuel Stripe** : d'où l'affichage incohérent et le risque d'un montant affiché différent de Stripe.
- Le bouton « Mon entreprise n'est pas listée » existe déjà mais n'apparaît que dans certains états de recherche.
- Les événements d'envoi passent par deux fonctions internes sécurisées; les tables d'événements n'ont aucun droit accordé, ce qui fait échouer les écritures directes des webhooks.

## Les 9 correctifs

1. **Champ entreprise (devis personnalisé)** — l'option « Mon entreprise n'est pas listée » devient visible dès que l'utilisateur a saisi un nom, avec ou sans résultats, pendant et après la recherche. Le choix débloque immédiatement « Continuer », avec mention « déclaré, non vérifié ».
2. **Boutons Appeler (Action Mode affilié + CRM admin)** — l'appel manuel est permis lorsqu'un numéro est présent, non invalide, non supprimé, sans opposition ni révision de conformité. Seuls les cas absent / invalide / non conforme restent bloqués, avec la raison exacte affichée. Les envois SMS et courriel gardent leur règle stricte actuelle (preuve LCAP obligatoire).
3. **Journal de prospection** — accorder les droits d'écriture au rôle serveur uniquement sur les tables d'événements, faire passer tous les webhooks (SMS, courriel, clics) par les fonctions sécurisées existantes, et remonter l'erreur au lieu de l'avaler silencieusement. Aucune écriture publique n'est ouverte.
4. **Calculateur de rénovation** — validation de la superficie selon le type de projet avant sauvegarde : message d'erreur précis hors plage absurde, demande de confirmation explicite pour une superficie inhabituelle mais réaliste, et aucun prix affiché tant que la valeur n'est pas validée.
5. **Profils publics** — accorder la lecture publique, strictement limitée aux profils publiés, sur services, lieux, médias, avis, sources et scores. Les brouillons restent invisibles.
6. **Paiement** — après un changement mensuel/annuel ou un code promo invalide ou épuisé, l'écran recrée toujours un module de paiement valide, ou affiche une erreur explicite avec un bouton « Retirer le code ». Plus jamais d'écran de paiement vide.
7. **Prix annuel** — jamais 0 $/an pour un forfait payant : le prix annuel provient du catalogue, sinon il est calculé selon la règle existante (−20 %, arrondi au dollar inférieur); si aucun prix annuel n'est réellement facturable chez Stripe, le choix annuel est masqué. Le montant affiché correspond toujours au montant facturé.
8. **Offre gratuite** — l'admissibilité est décidée d'abord à partir des services réellement sélectionnés (catégories normalisées). Lavage de planchers, nettoyage de céramique, nettoyage de sous-sol et nettoyage de cuisine restent admissibles; l'exclusion rénovation ne s'applique qu'en dernier recours. Ajout de ces cas aux tests.
9. **Traçabilité** — journal d'audit sur chaque changement de statut touché par ces correctifs (permission d'appel, événement de prospection, admissibilité, paiement).

## Détails techniques

- Front : `PageContractorPricingIntake.tsx`, `PageAffiliateActionMode.tsx` + `useActionMode.ts`, `ManualContactQueue.tsx` / `ManualContactPanel.tsx`, `PageRenovationEstimator.tsx`, `PageCheckoutNativeScrollable.tsx`, `usePlanCatalog` / `contractorPlanEligibility.ts`.
- Partagé : `_shared/contactPermissions.ts` (statut inconnu ≠ blocage d'appel), `_shared/outreachEvents.ts`, `_shared/localServiceCategories.ts` + miroir `src/lib/localServices/categories.ts`.
- Edge Functions existantes uniquement : `twilio-sms-status`, `twilio-status-events`, `track-outreach-click`, webhooks Resend, `crm-recovery-action`, `create-subscription-intent`. Aucune nouvelle fonction.
- Migration unique, additive : `GRANT SELECT` public sur les tables `aipp_*` avec politiques limitées aux profils publiés; `GRANT` serveur sur les tables d'événements de prospection; aucun `DROP`.

## Tests et vérification

- Tests de régression par scénario : entreprise non listée, appel autorisé/bloqué avec raison, enregistrement envoyé/livré/échec/cliqué, superficie hors plage, sections publiques lisibles, bascule mensuel/annuel, promo invalide, prix annuel jamais nul, quatre services de nettoyage admissibles.
- États chargement/erreur et rendu mobile 390 px vérifiés au navigateur.
- Parcours complets rejoués : invitation → profil → devis → promo → paiement; action affilié/admin → appel; envoi → événement; profil public → toutes les sections.
- Rapport final : fichiers modifiés, migration appliquée, résultats des tests, typecheck et compilation.
