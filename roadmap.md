# Roadmap — P0 contractor acquisition golden path

- [ ] Current mobile P0: active surface, shared viewport repair, real-DOM smoke tests; physical Gboard and authenticated final registration require device/session verification.

- [ ] P0 mobile Clara: keyboard-aware viewport, one scroll owner, shared live voice transcript; targeted tests and mobile browser checks.
- [ ] Publish mobile repair only after checks and security gate pass; existing critical findings remain an external publication blocker.

- [x] Paid number check OFF again (PAID_LOOKUP_ENABLED=false, TWILIO_LOOKUP_ENABLED=0).
- [x] OUTREACH_ENABLED=false kept during repair.
- [x] Hard CASL gate in canonical sender matches stored 10-digit evidence; unknown line types stay excluded.
- [x] One SMS dispatcher cron active (acquisition-queue-worker); all legacy senders inactive.
- [x] Telemetry: otp_requested only after send-otp success; dashboard excludes QA/test SMS and quotes.
- [ ] BLOCKED (auth): authenticated Stripe TEST E2E — needs a non-admin QA account signed into the preview.
- [ ] Controlled outreach — awaits Yan's go after E2E (17 incomplete signups, 14 Rive-Nord email-eligible; 0 SMS-eligible).

- [ ] P0 Réconcilier contractor_prospects ↔ verified_contractor_prospects (dédup téléphone/courriel/domaine/nom) — avant tout nouveau lot
- [ ] Lot SMS V1 nouveaux prospects — bloqué : 0 mobile confirmé + 0 preuve CASL SMS (décision Yan : source avec type de ligne ou Lookup plafonné)
- [ ] Courriel Maple Wood Painting — attend « Envoie Maple Wood » entre 9 h et 17 h

- [x] Activation 350 $ (paiement unique) sur le plan personnalisé + activation par webhook idempotent — fonctions déployées
- [ ] 350 $ : parcours payé en TEST avec le compte QA (connexion requise dans l'aperçu)
- [ ] 350 $ : volume 5/10/20 sans double facturation + consentement d'abonnement explicite
- [ ] 350 $ : 12 mois de Présence IA reliés aux droits (consignés au registre, pas encore aux accès)
- [ ] Tableau de pilotage « premiers 350 $ » (événements réels)
- [ ] Prospection Laval/Terrebonne/Rive-Nord — reste OFF jusqu'à preuve CASL + feu vert de Yan
- [ ] Backlog préservé : affiliés 20 %/5 %, capacité ville/métier, RBQ/CMMTQ/CMEQ, calendrier, Clara voix/mémoire, soumissions, Plus/Gold, SEO/AEO, partenariats, knowledge graph
- [ ] Compteur d'impact accueil (heures/$ épargnés, données serveur réelles) + page /impact avec manifeste
