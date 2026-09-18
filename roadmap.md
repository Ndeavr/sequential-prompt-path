# Roadmap — ONE CLARA continuity

## Étape 1 — Autorité conversationnelle (bloquant)
- [ ] Choisir l'autorité canonique (alex_sessions vs alex_conversation_sessions) sur preuve
- [ ] Prouver create → write → refresh → auth → resume → reopen → second device
- [ ] Déclarer l'autre système comme pont de compatibilité temporaire (documenté)

## Étape 2 — P0
- [ ] P0-1 sessionId Clara persistant (plus de UUID régénéré à chaque montage)
- [ ] P0-2 une seule mécanique de session (store + runtime + boîte d'accueil)
- [ ] P0-3 restauration navigateur réelle (messages + identifiant + contrôle d'appartenance serveur)
- [ ] P0-4 promotion après OTP/OAuth : conversation rattachée au compte
- [ ] P0-5 contexte paiement entrepreneur strictement serveur (contractor_id + quote_id)

## Étape 3 — P1
- [ ] P1-6 conversation → projet (référence project_id/lead_id dans la conversation)
- [ ] P1-7 réclamation idempotente des analyses de soumissions et vérifications
- [ ] P1-8 propriété active / Passeport rattaché
- [ ] P1-9 jumelage → rendez-vous conserve project_id/lead_id

## Étape 4
- [ ] Tests de régression + console + réseau + DB
- [ ] ONE CLARA UI (une seule boîte extensible)
- [ ] Nettoyage P2

## Blocages nécessitant approbation
- Migration destructive, ambiguïté de propriété des données, Stripe live, perte de données, schéma non réversible.
