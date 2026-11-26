# Pionnier 2026 — préparation, non publié

## Livré en source
- Modèle partagé FR/EN : 350 CAD première année; références régulières 50/mois (600/12 mois), 500/an payé d’avance; économies 250/150. 12 mois, 0 RDV par défaut; droits et offres distincts inchangés.
- Affichage partagé sur entrepreneurs, offres actives, activation/récapitulatif et `/plus-de-contrats`; Clara répond sur Pionnier/renouvellement en FR/EN. Aucun modèle d’envoi ni worker modifié.
- Badge historique Pionnier 0001–1000 sur le renderer GOLD partagé (profil/téléphone/espace pro); permanent après remboursement, distinct de licence et de GOLD actif. Aucun numéro réel attribué.
- Le bouton Pionnier apparaît seulement lorsque le serveur atteste l’ouverture, le checkout pris en charge et une place disponible. Il reprend l’activation existante avec `pioneer=2026`; le formulaire transmet uniquement `pioneerOffer`, jamais un montant. L’ancienne Présence IA 350 et Fondateur 1995 restent distinctes.

## Migration préparée, PAS appliquée
Appliquer d’abord le SQL GOLD existant, puis `migration.sql`, uniquement après prévol cible/sauvegarde validé. Trois colonnes de configuration, un indicateur historique et un numéro réservé sur les tables existantes; aucune table ou moteur supplémentaire. Client sans écriture; audit admin; lecture publique des seuls champs de membre. Configuration initiale draft/checkout non pris en charge.

La réservation utilise le verrou GOLD commun et les réservations checkout existantes, avant tout objet Stripe payable. Numéros uniques par mode, 0001 exclu des réservations ordinaires; attribution seulement après événement LIVE signé traité, prix CAD350 non remisé, paiement/activation/vérification confirmés et session liée au numéro réservé. TEST exclu des badges et du compteur LIVE; remboursement exclu des ventes, numéro jamais recyclé. Les réservations dont l’état Stripe est inconnu restent bloquantes; seules les transitions d’expiration/non-création déjà attestées par le mécanisme canonique libèrent une place non attribuée.

`checkout.patch` adapte uniquement `create-checkout-session` hors répertoire auto-déployé. Le webhook canonique et ses signatures restent inchangés; le SQL lit ses journaux et les métadonnées Stripe signées. Aucun produit/prix Stripe manuel ou nouvel abonnement. Mensuel/annuel restent tarifs réguliers sans nouveau bouton de paiement; leur catalogue/consentement Stripe n’est pas vérifié.

## Preuves et limites
- Lecture production : tables GOLD/config absentes. Pilote connu : une correspondance de profil, zéro activation vérifiée et zéro paiement LIVE admissible dans les journaux examinés. Premier membre non établi; 0001 réservé **dans la logique préparée**, pas une vente. Prochain numéro prévu 0002; compteur production **inconnu**, jamais 999 inventé.
- Tests PostgreSQL locaux : date/cap, réservations, idempotence, TEST, remboursement, badge historique et RLS. PGlite sérialise les requêtes : contention multi-session hébergée non prouvée.
- Checkout proposé reconstruit depuis le patch, Stripe simulé avec vérification HMAC réelle : prix/taxes/0 RDV, refus des montants client et des offres incompatibles, signature invalide, replay. Aucun appel fournisseur réel ni transaction Stripe TEST hébergée.
- Rendu navigateur local : FR 390 px et EN 1280 px, inventaire synthétique indisponible, pas de bouton de paiement nouveau, pas d’erreur de page ni débordement horizontal.
- 64 tests ciblés passés ensemble, y compris le contrôle pilote 0001. Une première exécution a révélé les contextes de requêtes manquants dans deux fixtures UI; fixtures corrigées puis suites relancées avec succès. Compilation automatique OK. Les appels et paiements fournisseur restent simulés.
- Stripe impose un minimum d’expiration de 30 minutes : la création Pionnier est refusée lorsqu’il reste moins de 30 minutes jusqu’à la fermeture, plutôt que laisser un checkout payable après la date. Une session existante valide reste utilisable jusqu’à sa date limite. Cette limite doit être acceptée ou résolue avant lancement.

## Blocages de publication
Prévol/sauvegarde non validés; SQL non installé; patch checkout non déployé; premier membre non démontré; Stripe TEST réel et concurrence indépendante non vérifiés. Ne pas activer les colonnes de release avant déploiement et vérification isolée. Aucun abonnement automatique ni renouvellement 500 sans consentement enregistré; aucun nouvel envoi ou paiement LIVE de test. Aucune publication effectuée.