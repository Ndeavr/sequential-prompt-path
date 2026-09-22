# Offre de repli 350 $ — crédit UNPRO

Quand un entrepreneur refuse ou reporte son forfait personnalisé, Clara propose une seule fois de sécuriser sa présence pour 350 $. Ce montant devient un crédit UNPRO applicable à tout achat admissible (rendez-vous, forfait, options), jamais des frais perdus.

## Ce qui existe déjà et sera réutilisé

- Le devis personnalisé et la page de plan personnalisé (offre principale, inchangée).
- Le paiement Stripe existant du tunnel entrepreneur et son webhook, qui détecte déjà les événements dupliqués.
- Le portefeuille entrepreneur (solde en compte) et le journal de transactions déjà en base.
- La file de suivi des abandons (leads entrepreneurs) et l'alerte admin unique par dossier.
- Le détecteur d'objections de Clara et les événements du tunnel entrepreneur.

Aucune nouvelle table de crédit, aucun second système Stripe.

## Décisions retenues

- L'ancienne offre d'entrée « jusqu'à 5 rendez-vous pour 350 $ » est retirée du parcours entrepreneur; son code reste en place pour les liens déjà envoyés.
- Le crédit s'applique à tout achat UNPRO admissible, selon des règles validées côté serveur.
- Test de bout en bout en mode Stripe TEST seulement.

## Parcours

1. Plan personnalisé recommandé (inchangé, toujours en premier).
2. Clara répond à l'objection (prix, hésitation, saisonnalité, leads partagés).
3. Si l'entrepreneur reste non prêt : offre de repli 350 $, une seule tentative.
4. « Pas maintenant » : décision respectée, dossier enregistré pour suivi.
5. Suivi admin / affilié à partir de la file existante.

Clara déclenche l'offre sur une vraie intention détectée (« je vais attendre », « c'est trop cher », « je veux commencer plus petit », « pas maintenant », « je vais y penser »…) ou sur un refus explicite du plan — jamais avant la présentation du plan, jamais deux fois.

## Bloc affiché

Carte premium, mobile d'abord, sous le plan et dans le fil Clara :

```text
Pas prêt pour un plan complet ?
Sécurisez votre présence UNPRO — 350 $
✓ Aucun crédit perdu
✓ 350 $ disponibles pour vos futurs rendez-vous
✓ Votre profil demeure actif
✓ Commencez à bâtir votre historique UNPRO
[ Sécuriser ma présence — 350 $ ]   Pas maintenant
```

Aucun compte à rebours, aucune fausse rareté, aucun rabais fictif. CTA secondaire discret. Le bloc ne masque pas Clara et ne déborde pas sur petit écran.

## Après paiement

Le crédit est accordé uniquement par le serveur, à la confirmation Stripe : solde +350 $, transaction enregistrée avec l'identifiant de paiement, l'origine et la trace d'audit. Un webhook reçu deux fois ne crédite qu'une fois. Un paiement échoué n'accorde rien et laisse le bouton disponible pour réessayer. Le solde apparaît immédiatement dans le compte entrepreneur avec la mention « Votre crédit sera appliqué automatiquement à vos futurs achats admissibles. »

## Détails techniques

**Base de données (une migration)**
- Index unique partiel sur le journal de transactions pour la clé `stripe_session_id` des crédits de repli → idempotence stricte.
- Contrainte : montant de crédit de repli = 35000 cents exactement; aucun montant inférieur possible.
- Correction de sécurité : la politique « Contractors manage own wallet » (actuellement ALL) est réduite à la lecture seule; toute écriture passe par le service role. Lecture des transactions limitée à l'entrepreneur propriétaire; admins via `has_role`.

**Paiement**
- `create-checkout-session` reçoit un mode `fallback_credit_350` : session Stripe unique de 350 $ CAD, métadonnées `offer=fallback_credit_350`, `contractor_id`, `quote_id`, `prospect_id`, affilié/UTM. Le montant est fixé côté serveur, jamais transmis par le frontend.
- `stripe-webhook` : nouveau cas dans `checkout.session.completed` pour cette offre → création/mise à jour du portefeuille (+35000), insertion de la transaction avec `balance_after_cents`, écriture au journal d'activation, fermeture du lead d'abandon lié au devis.

**Clara (texte + voix)**
- Nouveau type d'objection « pas prêt / trop cher / plus tard » dans le détecteur existant.
- Bloc de prompt partagé côté serveur (même fichier partagé que la promesse de rendez-vous) injecté dans Clara texte et Clara voix : règle du minimum 350 $, formulation du crédit, une seule tentative, respect du refus. Session partagée : aucune question déjà répondue n'est reposée.

**Suivi et analytics**
- Statuts portés dans la file de leads existante : `plan_offered`, `plan_declined`, `fallback_350_offered`, `fallback_350_checkout_started`, `fallback_350_paid`, `fallback_350_declined`, `followup_required` — sans doublon de prospect.
- Événements du tunnel : `fallback_350_shown`, `_clicked`, `_checkout_created`, `_payment_success`, `_payment_failed`, `_declined`, avec devis, entrepreneur, affilié et source.
- Vue admin : refus de plan, taux d'exposition, clic, paiement, revenu récupéré, crédits consommés ensuite, passage ultérieur à un forfait.

**Retrait de l'ancienne offre d'entrée**
- Les surfaces du tunnel entrepreneur qui affichent « jusqu'à 5 rendez-vous pour 350 $ » cessent de la proposer; les pages accessibles par lien direct restent fonctionnelles.

## Tests

1. Plan accepté → comportement actuel intact, aucune offre de repli.
2. « Je préfère attendre » → Clara reconnaît, propose 350 $, paiement test, webhook, crédit +350 $, solde visible.
3. Paiement échoué → aucun crédit, message clair, nouvelle tentative possible.
4. Webhook envoyé deux fois → un seul crédit de 350 $.
5. Refus du 350 $ → données conservées, lead visible admin/affilié, aucune relance agressive.
6. Texte puis voix → contexte conservé, aucune répétition, une seule tentative de repli.
7. Mobile 390 px et petit Android → carte, CTA, chat et confirmation utilisables sans coupure.

Plus tests automatisés : minimum 350 $ inviolable, idempotence du crédit, aucune écriture de solde depuis le frontend.
