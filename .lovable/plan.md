# Forfaits entrepreneurs — grille unique et parcours de paiement fiable

## Décision tarifaire retenue (source unique)

| Forfait | Mensuel | Annuel (−20 %, arrondi au dollar inférieur) |
|---|---|---|
| Recrue | 0 $ | — (activation gratuite, jamais de paiement) |
| Départ | 149 $ | 1 430 $ |
| Croissance | 299 $ | 2 870 $ |
| Pro | 599 $ | 5 750 $ |
| Élite | 999 $ | 9 590 $ |

Montants en CAD, taxes en sus, calculées au paiement selon l'adresse de facturation.
Recrue est affiché publiquement comme entrée gratuite.

Retirés de l'offre publique : **Présence** et **Signature** (conservés en base, marqués inactifs, aucune nouvelle souscription possible). Les entrepreneurs déjà sur ces forfaits gardent leur accès et leur prix, et voient une invitation à choisir un des forfaits actuels.

## Ce qui ne va pas aujourd'hui

- La base contient 14 lignes de forfaits pour un même public, dont 6 actives : Présence 49 $ et Signature 1 499 $ sont encore offertes, Recrue est inactive et porte un prix de 149 $.
- Aucun prix annuel réel n'existe pour Départ, Croissance, Pro, Élite : l'annuel est déduit ailleurs par des règles improvisées (×10 mois), ce qui ne correspond pas à −20 %.
- Plusieurs écrans affichent leurs propres grilles figées au lieu de lire le catalogue.

## Ce que je vais faire

1. **Une seule grille officielle.** Mise à jour du catalogue en base : Recrue à 0 $ et activable, Départ / Croissance / Pro / Élite avec leur prix mensuel et leur prix annuel exact, Présence et Signature marqués anciens et inactifs. Aucune donnée ni aucun tarif de paiement existant n'est supprimé.
2. **Une seule règle annuelle.** Suppression de toutes les autres règles de rabais (15 %, 16,7 %, ×10 mois). L'annuel vient uniquement du catalogue.
3. **Tous les écrans lisent la même source.** Inscription, recommandation de forfait, cartes de forfaits, page de facturation, messages de limite atteinte, paiement : plus aucune grille écrite en dur.
4. **Recrue ne passe jamais par le paiement.** Le choisir active le compte immédiatement.
5. **Changements de forfait.** Montée en gamme immédiate avec ajustement au prorata, baisse planifiée à la fin de la période payée, bascule mensuel ↔ annuel, blocage propre si l'entrepreneur est déjà sur le forfait choisi.
6. **États d'échec visibles.** Si le service de paiement ou la confirmation automatique échoue, l'entrepreneur voit un état clair (« Paiement en cours de confirmation », « Paiement refusé », « Service de paiement indisponible ») avec l'action à faire — jamais un écran vide ni un faux succès.
7. **Invitation à migrer** pour les comptes Présence / Signature, sans perte d'accès.

## Vérification

Vous avez choisi de tester sans toucher au service de paiement réel : aucun produit ni tarif ne sera créé, et aucun paiement ne sera effectué. Je valide donc de bout en bout avec un simulateur de paiement :

- inscription → recommandation de forfait → choix mensuel/annuel → paiement → confirmation → abonnement actif ;
- Recrue gratuit sans paiement ;
- montée en gamme, baisse planifiée, bascule mensuel/annuel ;
- paiement refusé, paiement annulé, confirmation en attente puis confirmée, service indisponible ;
- double clic sur le bouton de paiement (aucun double abonnement) ;
- affichage mobile 390 px et bureau.

Rien n'est publié en production.

## Détails techniques

- Source unique : `public.plans` (audience `contractor`) + `plan_features`. Mise à jour par migration : `recrue` → `monthly_price=0`, `active=true`, `billing_interval='free'`, `tier_rank=0` ; `depart/croissance_v2/pro_v2/elite_v2` → `yearly_price` = 143000 / 287000 / 575000 / 959000 ; `presence` et `signature_v2` → `active=false`, `legacy=true`. Aucun `DELETE`, aucun changement de RLS, aucune mutation Stripe.
- `src/config/contractorPlans.ts` devient uniquement de la copie marketing (sans prix). `usePlanCatalog` cesse de dériver `yearlyPrice = monthly × 10` et expose `supportsYearly` d'après le catalogue.
- Nettoyage des grilles en dur : `PageEntrepreneurPlans`, `GrowthPlanCards`, `StepPlanRecommendation`, `PlanChoiceStrip`, `ScreenPlan`, `PageOnboardingPayment`, `ProBilling`, `CardAlexRecommendedPlan`, `planPricingBreakdown`, `planRules`.
- Garde existante `src/dev/legacyPlanGuard.ts` étendue à `presence` et `signature` comme codes non souscriptibles.
- `create-checkout-session` : refuse tout code inactif/legacy (409 explicite), refuse Recrue (activation directe), exige un tarif actif pour l'intervalle demandé, idempotence conservée.
- Simulateur de paiement : adaptateur derrière l'appel de paiement, activé seulement en test/dev, pilotant les scénarios succès / refus / annulation / confirmation différée / indisponibilité. Aucun impact sur le code de production.
- Tests Vitest sur la résolution de forfait, la règle annuelle (−20 % arrondi bas), l'exclusion des forfaits legacy et les états d'échec ; parcours Playwright sur l'aperçu local ; typecheck, lint, build.

## Limite assumée

Sans environnement de paiement de test, la confirmation automatique réelle (webhook) et un vrai passage en caisse ne peuvent pas être prouvés. Je valide la logique et les états d'interface par simulation et je le signalerai clairement dans le rapport final.
