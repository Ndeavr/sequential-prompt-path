# 350 $ sur l'Audit IA — bouton de paiement réel, testé avec un compte entrepreneur

## Ce qui existe déjà (réutilisé, rien de parallèle)
- La carte « Sécuriser ma présence — 350 $ » et son bouton de paiement.
- Le paiement de 350 $ côté serveur (montant fixé serveur, jamais transmis par la page).
- Le crédit +350 $ créé seulement après confirmation du paiement par Stripe, sans doublon.
- Aujourd'hui, la carte apparaît seulement sur la page du forfait personnalisé, pas sur l'Audit IA.

## Ce qui sera fait
1. **Audit IA** : sous le score, après le forfait recommandé et sa valeur, afficher la carte 350 $ une seule fois. Le bouton principal est « Sécuriser ma présence — 350 $ », avec un lien discret « Pas maintenant ». La carte n'apparaît jamais avant que le score ne soit affiché.
2. **Lien avec le bon dossier** : la carte transmet l'entrepreneur, le devis s'il existe et l'affilié s'il y en a un. Si la personne n'est pas connectée, elle passe par la connexion, puis revient sur l'Audit IA.
3. **Retours** : après le paiement, l'entrepreneur arrive sur Facturation avec son crédit visible. S'il annule, il revient sur l'Audit IA avec un message calme, et son dossier reste intact.
4. **Activation après paiement** : le serveur qui reçoit la confirmation Stripe ajoute déjà le crédit. Il va aussi marquer le compte comme actif et laisser une notification dans le tableau admin (pas d'SMS ni de courriel automatique).

## Test avec un compte entrepreneur (mobile 390 px)
- Connexion avec un compte entrepreneur de test → Audit IA → score affiché → carte 350 $ → bouton.
- Vérifier la vraie session de paiement Stripe en mode test : 350,00 $ CAD, offre `fallback_credit_350`, entrepreneur, utilisateur et affilié bien reliés.
- Finaliser avec une carte de test Stripe (aucun vrai débit) → crédit +350 $, compte actif, notification admin.
- Renvoyer la même confirmation Stripe → aucun deuxième crédit.
- Annulation → retour à l'audit, dossier intact.
- Si seul le mode réel est disponible, je m'arrête à la page de paiement Stripe et je vous indique la seule étape qui demande votre autorisation.

## Détails techniques
- `PageAiRecommendationAudit.tsx` : afficher `FallbackCredit350Card` quand le score est chargé (`returnPath=/entrepreneurs/audit-ia`), avec un garde « une fois par session ».
- `stripe-webhook` (branche `fallback_credit_350`) : mettre `account_status`/`activation_status` à jour de façon idempotente et insérer dans `admin_notifications`.
- Tests : vitest ciblé (visible seulement après le score, une seule fois) + script Playwright à 390 px.
