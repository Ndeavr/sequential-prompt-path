# Calibration finale du prix entrepreneur — un seul montant, du plan au paiement

## Ce que l'inspection confirme déjà

- Le plafond caché de 1 499 $ n'est **plus appliqué** : `max_monthly_cents` est devenu un simple repère administratif renvoyé à titre informatif.
- Le montant facturé au paiement est déjà **relu côté serveur** dans le dossier de l'entrepreneur (`recommended_monthly_price`) et injecté tel quel chez Stripe, avec un contrôle qui refuse la transaction si le montant affiché à l'écran diffère de plus d'un cent.
- Le prix au rendez-vous provient déjà de la grille par métier × marché, avec repli sur la moyenne du métier puis sur la valeur de projet déclarée.

## Ce qui reste incohérent et doit être corrigé

1. **Un dernier tarif universel subsiste** : quand aucune grille métier n'existe, le calcul retombe sur un tarif unique de 90 $ par rendez-vous, identique pour le lavage de vitres et la toiture. À remplacer par un repli économique dérivé du métier réel (valeur moyenne de contrat × taux de fermeture × part UNPRO), et refus explicite de vendre du volume quand aucune base fiable n'existe.
2. **Un multiplicateur de marché reste borné entre 0,85 et 1,45** et s'applique au total sans être compréhensible commercialement. Il reste dans le calcul, mais disparaît de l'interface client.
3. **L'interface montre encore des notions internes** : sous-total, multiplicateur marché, ajustement. À remplacer par quatre lignes lisibles : abonnement, rendez-vous exclusifs, visibilité IA, options.
4. **Budget maximum** : vérifier et verrouiller le comportement attendu — un budget ne réduit jamais le prix d'un volume, il réduit le volume livrable. L'écran doit dire « Votre budget de X $/mois permet environ N rendez-vous exclusifs », jamais afficher une réduction.
5. **Moteurs parallèles résiduels** : un second calculateur et un second chemin de paiement existent encore (page injoignable, table de devis distincte). À neutraliser pour qu'aucun autre montant ne puisse jamais atteindre Stripe.

## Ce que l'entrepreneur verra

```text
Votre plan mensuel                                1 248 $/mois

Abonnement UNPRO — forfait Croissance                299 $
12 rendez-vous exclusifs en toiture, Montréal        852 $
   (81 $ par rendez-vous, rabais de volume −5 % inclus)
Visibilité IA                                         97 $
```

Aucun plafond, aucun multiplicateur, aucun « ajustement » affiché. Si l'entrepreneur a fixé un budget, une phrase le précède : « Votre budget de 1 500 $/mois permet 14 rendez-vous exclusifs par mois dans votre marché. »

## Détails techniques

- `compute-pricing-quote` : supprimer `volume_per_appointment_cents` comme repli de prix unitaire ; le remplacer par le repli économique déjà présent (`average_project_value × close_rate × share`, borné par la grille métier), et renvoyer le statut `unavailable` si aucune base n'existe — auquel cas le plan propose l'abonnement seul, sans volume vendu.
- Retirer complètement `max_monthly_cents` du calcul et du `breakdown` ; conserver uniquement les planchers (`min_monthly_cents`, plancher territorial validé) et la validation de marge.
- `price_identity` : conserver la traçabilité complète côté serveur (utile en admin et pour l'audit), mais l'affichage client ne lit plus que quatre lignes commerciales.
- `priceBreakdown.ts` : nouvelle fonction `buildCommercialLines()` (abonnement / rendez-vous inclus + prix unitaire + rabais / visibilité IA / options). `buildBreakdownLines()` reste, réservée à l'écran admin.
- Mode budget : confirmer dans `solveBudget` qu'aucun ajustement négatif n'est produit, seulement une réduction du nombre de rendez-vous, et supprimer la ligne « Budget mensuel choisi » de l'écran client au profit de la phrase explicative.
- Continuité du montant : ajouter un test d'intégration qui calcule un devis, lit le montant affiché, et vérifie que la fonction de paiement produit exactement le même `unit_amount` — y compris en annuel.
- Neutraliser le chemin parallèle : la page calculateur orpheline et `pricing-create-checkout` sont retirés du code appelable, afin qu'un seul moteur puisse produire un montant facturable.

## Vérifications (5 cas économiques)

| Cas | Profil testé | Attendu |
|---|---|---|
| 1 | Petit service local (tonte, 250 $/contrat) | Rendez-vous peu chers, prix mensuel proche de l'abonnement, jamais 88 $/RDV |
| 2 | Peinture (3 000 $/contrat) | Prix au rendez-vous cohérent avec la marge du métier |
| 3 | Isolation (5 400 $/contrat, subventions) | Volume recommandé limité par la capacité déclarée |
| 4 | Toiture / rénovation majeure (18 000 $+) | Rendez-vous nettement plus chers, total élevé assumé |
| 5 | Très gros volume (100 RDV exclusifs demandés) | Vrai prix affiché avec rabais de volume explicite, aucun plafond, marge validée ou volume refusé |

Chaque cas vérifie aussi : objectif de contrats ≠ nombre de rendez-vous, somme des lignes = total, et montant identique entre le plan affiché et le paiement.
