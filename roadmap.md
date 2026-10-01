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

## Étape 6 — P0 grand chat et intentions
- [x] Carte Clara initiale agrandie et hauteur clavier stabilisée
- [x] Champ contrôlé, placeholder distinct et bouton d’envoi déterministe
- [x] Intentions contextualisées → tendances vérifiées → repli fiable
- [x] Validation automatisée 360/390/430 px, clavier simulé et parcours réels
- [x] Transition entrepreneur conversationnelle texte/Voice avant navigation, idempotente et accessible

## Étape 7 — Header UNPRO au défilement
- [x] Header canonique unique sur `/` et `/index`, wordmark officiel vers symbole officiel
- [x] Contraction légère via IntersectionObserver, sans écouteur de défilement continu
- [x] Zones tactiles 44 px et réduction des animations respectée
- [x] Validation automatisée multi-format, menu, langue et Clara

## Étape 8 — Header mobile minimal
- [x] Barre supérieure limitée à Alertes, QR et menu hamburger
- [x] Langue et profil/connexion accessibles dans le menu
- [x] Tiroir aligné sous le header initial et compact, sans texte masqué
- [x] Validation automatisée 360/390/430 px, actions et absence de débordement

## Étape 9 — P0 relance acquisition entrepreneur
- [x] Identifier et réparer l’expéditeur SMS canonique et son ordonnanceur
- [x] Classifier les échecs historiques et verrouiller les reprises sûres
- [ ] Valider un test réel approuvé jusqu’au callback, lien et événement d’arrivée
- [x] Garantir la continuité prospect → audit → profil → plan → paiement → activation
- [x] Exposer le funnel réel hors données de test
- [ ] Déverrouiller un premier lot de 10 uniquement après réussite E2E

Blocage actif : sélectionner un compte administrateur autorisé et approuver l’unique SMS E2E vers le numéro de test configuré. Les anciennes voies d’envoi direct et tous les ordonnanceurs restent désactivés.

## Mode d’exécution — budget crédits (demandé le 21 sept.)
- Mode chirurgical obligatoire : une anomalie → quelques fichiers → correction minimale → test ciblé → arrêt.
- Aucun audit global du dépôt, aucune refonte, aucune recherche déjà effectuée refaite.
- Budget cible par run : moins de 5 crédits; prévenir en une phrase avant tout dépassement.
- Découpage imposé en trois runs séparés : (1) test SMS réel, (2) premier lot, (3) inscription → plan → paiement.

## Blocages nécessitant approbation
- Migration destructive, ambiguïté de propriété des données, Stripe live, perte de données, schéma non réversible.

- [x] Clara ouvre réellement les pages internes (même onglet, confirmation après succès, action de secours si échec).

## Acquisition quotidienne (autorisation Yan 2026-10-01) — BLOQUÉ avant envoi
- [x] P1 formulaire : ville manuelle ne bascule plus au résumé à la 1re touche ; 4 RDV demandés restent 4 ; rayon saisi protégé au rechargement
- [ ] Paiement Stripe TEST du compte QA (parcours via `?stripe_test=1`, isolation test/live à rendre fail-closed)
- [ ] Plafond réel ≤25 SMS/jour tous lanceurs confondus : `outreach_settings.sms_daily_limit=50` et lot manuel du 30/09 = 38 SMS (cap non tenu) → corriger le plafond partagé avant tout envoi automatique
- [ ] Puis seulement : OUTREACH_ENABLED=true borné, 1er lot fenêtre 09-17 Toronto, cohortes Laval/Terrebonne/Rive-Nord, version de message suivie

### Mise à jour 2026-10-01 22:50 UTC (autorisation Yan permanente, portée bornée)
- [x] Plafond SMS partagé ≤25/jour Québec, tous expéditeurs (`reserve_outreach_sms_slot`, verrou, 1 envoi/numéro/jour) — test simulé : 25 accordés, 26e et doublon refusés.
- [x] QA e2e : paiement toujours en Stripe test, jamais de repli live.
- [ ] Preuve livemode=false sur le compte QA — bloqué : mot de passe perdu au redémarrage, ouverture de session par l'agent refusée.
- [ ] 1er lot — bloqué : Laval/Terrebonne/Rive-Nord 246 prêts, 0 admissible (114 jamais contactés mais type de ligne inconnu ; 126 déjà contactés ; 7 fixes). Exige décision : accepter « inconnu » ou valider les numéros (coût Lookup).

### 2026-10-01 23:05 UTC
- [x] Copie v2 `agreement_v2_2026-10-01` (1er contact, relance, récupération, courriel) : plus d'affirmation d'audit ni « 350 $ paiement unique »; version tracée dans metadata.copy_version.
- [x] Relances stoppées sur réponse/désinscription/paiement/activation.
- [ ] 1er lot : 0 nouveau destinataire admissible (SMS mobile connu 0, courriels sourcés tous déjà contactés). Relance possible : 359 livrés sans clic, mais réactiver l'interrupteur global laisserait le lanceur 142 viser des numéros de type inconnu → filtrer d'abord ce lanceur sur numéros connus/déjà livrés.
- [ ] Preuve livemode=false QA : ouverture de session refusée par la plateforme (approbation indisponible).
