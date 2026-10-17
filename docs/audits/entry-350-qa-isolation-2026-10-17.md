# QA isolée — activation entrepreneur 350 $ — 17 octobre 2026

## Décision

**Aucun déploiement et aucune publication.** La QA locale passe, mais ne constitue pas un E2E hébergé authentifié complet. Aucun paiement, message, appel Stripe ou changement de données de production. Aucune infrastructure payante créée. Le verrou commercial reste inchangé.

Source inventoriée : `e1d898ce7ca02403ed2299728d35a8d53840f470`, vérifiée par `verify:source`. Les réparations ci-dessous sont locales, non déployées. Migration 0023 existante : aucune recréation ni modification.

## Environnement et portée

- Deux identités entièrement synthétiques, un visiteur anonyme, sessions HMAC locales ; aucun compte client ni session de production utilisé.
- PGlite éphémère : vrais rôles PostgreSQL, GRANT, SET ROLE, RLS et SQL du résolveur provenant des migrations 0014/0023.
- Créateurs Checkout et handler webhook existants exécutés après transformation locale ; SDK Stripe 17.7.0 vérifie de vraies signatures HMAC avec secrets aléatoires locaux.
- Auth, création de session Stripe, transports et RPC périphériques sont des adaptateurs. Le RPC local d'activation reproduit les effets inspectés, mais n'est pas une restauration complète du backend hébergé.
- Aucun secret d'environnement lu par le harness ; aucun réseau fournisseur. `livemode=true` ne représente que des événements synthétiques confinés à cette base éphémère, pas un paiement LIVE.
- Inventaire backend strictement en lecture seule : résolveur, privilèges, RLS et comportement d'activation inspectés ; aucune mutation distante.

## Défauts prouvés et réparations minimales

1. **Invité : abonnement perpétuel indu.** Le webhook passait `entry_pack_350` au RPC, lequel crée un abonnement actif payé. Le résolveur priorise cet abonnement : expiration et révocation du droit d'entrée deviennent inopérantes. Reproduction locale avant réparation : code retourné `entry_pack_350` au lieu de `presence`. Le webhook passe désormais `p_plan_id=null` pour cette offre ponctuelle uniquement. Les autres offres ne changent pas.
2. **Personnalisé avec jeton : chute dans l'activation invitée.** Après l'activation personnalisée réussie, `activation_token` déclenchait aussi la branche invitée. La QA a observé une tentative de création de compte/entrepreneur déjà existant et une télémétrie invitée. La branche exclut désormais `entry_activation_350` ; test spécifique empêchant cette chute.
3. Garde de paiement strict déjà réparée dans ce chantier : payé strictement, mode ponctuel, CAD, sous-total 35000, total couvrant le contrat fiscal existant. Les anciens comportements hors offres 350 restent conservés.

## Résultats exécutés

Dernière exécution : **87/87 tests réussis dans 8 fichiers**, dont **15 scénarios d'intégration isolée**. Commande :

```text
bunx vitest run src/test/entry-350-qa-isolation.test.ts src/test/entry-350-paid-collection.test.ts src/test/entry-350-recovery.test.ts src/test/entry-350-presence-entitlement.test.ts src/test/entry-350-webhook-confirmation.test.ts src/test/payment-return-guards.test.ts src/test/checkout-guards.test.ts src/test/entry-activation-350.test.tsx
```

Contrôles : deux créations ponctuelles ; propriétaire/autre/anonyme ; signatures absentes/invalides/mauvais secret TEST ; paiement gratuit/non payé/mode/devise/montant incorrect ; réception asynchrone ; replay sans prolongation ; panne partielle et reprise des deux circuits ; 12 mois et expiration ; remboursement/litige idempotents ; priorité d'un abonnement valide ; attribution et URL d'annulation ; refus EXECUTE anonyme ; visibilité privée des droits et refus de modification des rôles.

Contrats Checkout observés dans les handlers, sans modification de prix : personnalisé 35000 + TPS/TVQ = **40241 cents** dans les fixtures ; invité **35000 cents**, sans taux configurés dans ce handler. Aucune remise configurée. La parité exacte avec les réponses Stripe API historiques 2018-02-28 et les taux réellement appliqués reste non vérifiée par cette QA locale.

- Smoke Checkout existant : **13/13 contrôles**, fournisseurs simulés.
- Smoke écrans personnalisés : **63 contrôles**, 360/390/1280 px, vrais composants et routeur de test, données simulées, aucune requête externe transmise. Captures inspectées à 360 et 390 px ; ajustement, reprise, état activé et attribution conservés. Le tarif 777 $ et la capacité affichés sont des fixtures QA, jamais des preuves de prix/engagement réel.
- Ces captures montrent le forfait ajusté, pas un Checkout 350 connecté de bout en bout.
- Tentative invitation avec routeur complet à 360 px : **échec non masqué**. Redirections répétées vers `https://localhost/`, interceptées, page vide ; aucune requête fournisseur transmise. Aucun test invitation 390 achevé. La vérification complète des deux parcours mobiles n'est donc pas acquise.
- Dernier signal automatique de compilation après modifications : consulter `build-errors.log` ; un défaut de typage du test a été réparé et le signal suivant était `build OK`. Aucun build manuel ni déploiement.

## Fichiers du prolongement QA

- `supabase/functions/stripe-webhook/index.ts` : deux protections de branche ci-dessus.
- `src/test/support/entry350Qa.ts` : SQL éphémère, transport/adaptateurs et signatures locales.
- `src/test/entry-350-qa-isolation.test.ts` : scénarios des deux circuits.
- `package.json`, `bun.lock` : SDK Stripe de test.
- `AGENTS.md`, `supabase/AGENTS.md`, `roadmap.md`, ce rapport : contraintes et état vérifié.
- Les changements de garde de paiement et leurs tests/audit du chantier précédent sont conservés.

## Blocage et une action exacte

**Blocage : absence de stack gratuite isolée Auth + PostgREST + Edge avec le schéma/RLS complet et le routeur des deux parcours.** L'environnement actuel partage le backend de production ; les adaptateurs ne prouvent ni enforcement hébergé, ni OTP/claim, ni parcours invitation jusqu'au Checkout et retour.

**Action nécessaire : rendre disponible une stack QA locale/éphémère gratuite, entièrement isolée, avec Auth/PostgREST/Edge et schéma/RLS courant sans données client, puis y exécuter les deux parcours sans paiement et avec Stripe stub signé.** Ne pas remplacer cette validation par un test de production ou un paiement TEST. Publication et envois restent interdits en attendant.