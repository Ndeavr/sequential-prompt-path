# P0 — Échelle d'entrée 100 / 200 / 350 / 500 $ par mois

## Objectif
La première entente proposée à un nouvel entrepreneur est toujours 100, 200, 350 ou 500 $ par mois avant taxes, même si ses objectifs justifieraient 1 000 à 1 700 $ ou plus. Le parcours validé 7/7 reste le même, et la façon dont UNPRO calcule l'offre n'est jamais montrée.

## Ce qui est réutilisé (aucun système parallèle)
- Calcul de l'offre : la fonction `compute-pricing-quote` et la table `contractor_pricing_quotes`.
- Paiement : `create-checkout-session`. Elle facture déjà le prix serveur du devis via `quote_id`. Aucun nouveau produit Stripe n'est donc nécessaire.
- Le webhook Stripe existant, les abonnements, les accès au plan, l'attribution et l'exclusion du compte QA.
- Écran `/entrepreneur/plan-personnalise/:id`.
- Les 4 paliers sont un réglage dans la configuration de prix existante. Ce n'est pas un deuxième catalogue de forfaits.

## Paliers
| Prix mensuel | Nom | Plan existant donnant les accès |
|---|---|---|
| 100 $ | Commencer | à confirmer à l'inspection (le plus proche, de rang inférieur ou égal) |
| 200 $ | Développer | idem |
| 350 $ | Accélérer | idem |
| 500 $ | Croissance | idem |

## Choix du palier côté serveur
1. Le moteur actuel calcule son prix complet, sans changement.
2. Il garde ensuite le plus petit palier raisonnable pour commencer : le plus petit palier ≥ le prix du plan d'entrée calculé, plafonné à 500 $. Tout calcul au-dessus de 500 $ donne un palier de départ, jamais le montant complet.
3. Le prix calculé avant ce choix est conservé seulement en interne (`internal_target_cents`), pour une future augmentation (100→200→350→500→offre sur mesure). Il n'est jamais affiché.
4. L'entrepreneur peut choisir un autre palier. Le serveur recalcule alors le devis pour ce palier : le navigateur n'envoie jamais de prix.
5. Les devis déjà payés et les abonnements actifs ne sont pas touchés.

## Garanties
- Aucun nombre de rendez-vous garantis n'est affiché sur un palier d'entrée, sauf si une règle serveur approuvée existe pour ce palier exact. À ce jour, aucune n'est connue : le nombre est donc retiré.
- Texte affiché : « Rendez-vous exclusifs selon votre entente et votre capacité. » et « Rendez-vous exclusifs. Jamais partagés avec d'autres entrepreneurs. »
- La garantie calculée pour l'ancien prix complet n'est jamais reprise sur un palier.

## Écran entente (mobile d'abord)
- Titre « Étape 3 sur 3 — Votre entente de départ », puis le nom du palier.
- « Pour atteindre vos objectifs, nous vous recommandons de commencer avec cette entente. »
- « Vous pourrez augmenter votre capacité au fur et à mesure de vos résultats. »
- Prix : « XXX $ / mois + taxes », puis le détail : prix mensuel + TPS (5 %) + TVQ (9,975 %) = total mensuel, calculé par le serveur.
- Bouton principal « Commencer avec cette entente », lien discret « Voir les autres options » qui ouvre les 4 paliers.
- Aucune mention de capacité, de calcul, de taux de conclusion, de marge ou de coût par rendez-vous.

## Tests
- Un devis QA qui donnait environ 1 700 $ donne maintenant un palier ≤ 500 $.
- Les 4 paliers en Stripe TEST : devis → taxes exactes → session `cs_test` → webhook signé → abonnement → accès → activation, sans doublon.
- Rechargement de la page et reconnexion : le palier choisi est conservé.
- Aucune ancienne garantie ou ancien volume affiché ; QA exclu du revenu ; écran mobile vérifié.
- Tests unitaires du choix de palier et test de l'écran ; vérification des types et build.

## Publication
Un seul changement limité, publié uniquement si tout passe. Ensuite : vérification du parcours en ligne sans frais réels, puis rapport avec SHA, statut de publication et blocage restant s'il y en a un.

## Détails techniques
- `compute-pricing-quote` : ajouter `snapToEntryTier()` après `finalPrice`. Écrire `monthly_price_cents` = palier, `guaranteed_appointments` = null pour les paliers, et ranger le calcul complet dans les métadonnées existantes du devis (ou ajouter une seule colonne nullable si aucune ne convient).
- Ajouter un paramètre `entry_tier_cents` (liste blanche 10000/20000/35000/50000) pour le choix manuel.
- Paliers stockés comme ligne de configuration dans la table de configuration de prix existante (migration traçable avec retour arrière). Aucune valeur codée en dur côté client.
- `create-checkout-session` reste inchangé, sauf une garde : refuser un devis non payé dont le prix ne fait pas partie des paliers, si celui-ci a été créé après le déploiement.
- Le compte QA reste en mode TEST d'office, sans changement.
