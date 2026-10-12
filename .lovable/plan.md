# Test du paiement 350 $ avec le compte QA digimarketing@gmail.com

## Constat
- L'écran « Accès administrateur requis » fonctionne normalement : ce compte a seulement le rôle propriétaire. Aucun changement de droits n'est prévu.
- Ce compte servira à tester le parcours entrepreneur → offre 350 $ → Stripe en mode TEST → activation.

## Étapes
1. **Marquer le compte comme QA** pour que le paiement passe obligatoirement par Stripe TEST. On utilise le marqueur `e2e_test` déjà reconnu par le serveur, qui bloque le paiement si le mode test n'est pas disponible. Le compte reste exclu des campagnes. Ce marquage sera une modification ciblée et réversible des données de ce seul compte.
2. **Vérifier avant le paiement** : le compte n'est pas encore entrepreneur actif et aucune activation 350 $ n'existe déjà. Si ce n'est pas le cas, on s'arrête et on vous le signale.
3. **Votre geste** (le seul nécessaire) : sur votre téléphone, déjà connecté à ce compte, ouvrez `unpro.ca/entrepreneur/devis-personnalise`, remplissez l'entreprise et l'objectif, puis touchez « Activer mon profil — 350 $ ». Sur la page Stripe TEST, utilisez la carte de test `4242 4242 4242 4242`, n'importe quelle date future et n'importe quel code de sécurité. Aucune vraie carte.
4. **Vérification de mon côté**, en lecture seule :
   - la session Stripe est en mode test, à 350 CAD plus TPS/TVQ, en paiement unique ;
   - les informations rattachées au paiement identifient bien le compte et l'entrepreneur ;
   - le webhook signé n'a été traité qu'une fois ;
   - le devis est passé à « payé » et l'activation est inscrite ;
   - la Présence IA dure 12 mois ;
   - l'accès à /pro fonctionne sans recommencer l'inscription.
5. **Cas négatifs** :
   - annulation sur la page Stripe : aucune activation ;
   - retour direct sur la page de succès sans paiement : aucune activation ;
   - nouveau clic sur le bouton : redirection vers /pro, sans double paiement.
6. **Rapport** : tableau réussi / échoué pour chaque point, avec les identifiants Stripe test. Un paiement test réussi n'est pas une vente : le compteur de ventes réelles reste à 0 $.

## Hors périmètre
- Aucun droit admin ajouté, aucune campagne, aucun SMS.
- Aucun changement au verrou de prospection ni au paiement en mode réel.
