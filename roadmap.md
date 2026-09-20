# Roadmap — ONE CLARA continuity

## Étape 1 — Autorité conversationnelle (bloquant) — FAIT
- [x] Autorité canonique définitive : `public.alex_sessions` + `public.alex_messages`
- [x] Preuve live : création → écriture (idempotente) → rafraîchissement → reprise → authentification → second appareil
- [x] `alex_conversation_sessions` = pont de compatibilité temporaire uniquement

## Étape 2 — P0
- [x] P0-1 jeton de conversation persistant par navigateur
- [x] P0-2 une seule mécanique de session pour la boîte Clara d'accueil
- [x] P0-3 restauration réelle des messages + contrôle d'appartenance serveur
- [x] P0-4 promotion après OTP/OAuth (montée globale dans les providers)
- [x] P0-5 aucun prix annuel calculé côté client dans le paiement entrepreneur

## Étape 3 — P1 — FAIT
- [x] P1-6 conversation → projet (référence project_id/lead_id dans la conversation)
- [x] P1-7 réclamation idempotente des analyses de soumissions et vérifications (visitor_id conservé)
- [x] P1-8 propriété active / Passeport rattaché (refus serveur si autre compte)
- [x] P1-9 jumelage → rendez-vous conserve project_id/lead_id/match_id/appointment_id
- [x] P1-10 entrepreneur → devis personnalisé → Stripe (contractor_id + pricing_quote_id + checkout_session_id)

## Étape 4
- [ ] Tests de régression + console + réseau + DB
- [x] ONE CLARA UI (une seule boîte extensible)
- [ ] Nettoyage P2

## Étape 5 — P0 mobile Clara
- [x] Mode conversation adaptatif : hero/header/carte/clavier
- [x] Composer compact, réponses rapides temporaires et scroll intelligent
- [x] Photos volumineuses optimisées avant validation, états compacts et reprise
- [x] Validation automatisée 360/390/412/430 px, bureau et continuité Voice
- [ ] Validation matérielle Chrome Android, Samsung Internet et iPhone (appareils non disponibles dans l’environnement)

## Blocages nécessitant approbation
- Migration destructive, ambiguïté de propriété des données, Stripe live, perte de données, schéma non réversible.
