# Premier contact conforme — audit contrôlé

## Résultat

Aucun envoi. Aucun appel fournisseur, paiement, migration, déploiement ni modification des données de production. Audit distant SELECT uniquement; tous les appels de QA sont interceptés ou simulés.

## Preuves de production (23 octobre, vers 21:50 UTC)

- `OUTREACH_ENABLED=false`; `recruitment_controls.global_enabled=false`, `autonomous_enqueue_enabled=false`, plafond par canal 25 inchangé.
- `outreach_autopilot_gate.gated=true`, score 30, raisons `no_recent_e2e_pass,operational_score_below_95`.
- Score calculé le 21 octobre : messaging 30. Derniers diagnostics : Resend rouge `RESEND_AUTH_ERROR` (-50), Twilio jaune `WEBHOOK_STALE` (-20). Le minimum des piliers plafonne le global à 30. Ces diagnostics sont anciens, pas une preuve de panne actuelle.
- Dernier `acq_e2e_test_runs` : 8 juillet, `click_redirect` échoué (`status=200`), livraison courriel non confirmée. Le code courant utilise déjà la résolution anonyme plutôt que le seul statut HTTP du SPA : ne pas refaire cette correction.
- Le véritable évaluateur de gate consulte `outreach_e2e_full_runs`, pas ce vieux selftest. Aucun évaluateur ni test hébergé mutateur exécuté.
- Cinq preuves courriel valides et non expirées, aucune suppression exacte dans `suppression_index`, une preuve par destination; toutes auto-captured, **aucun reviewer humain**. Deux sources company_website, trois government_registry (non admissibles à la revue implicit_public_conspicuous selon la règle actuelle). Ce contrôle ne constitue pas un dédoublonnage complet de tous les journaux d'envoi.

## Code existant et lacune ciblée

Les diagnostics Resend restricted/send-only et SMS au repos sont déjà corrigés dans la source actuelle; aucun second correctif identique. Aucun score artificiellement relevé.

Le selftest actuel accepte toute `redirect_url` non vide après résolution sans charger la cible : faux positif reproductible. Correctif **staged seulement** dans `20261023-outreach-click-qa.staged.patch` : même handler, lien synthétique vers la fixture QA existante, correspondance exacte puis chargement et marqueur `Fixture QA UNPRO`. Aucune fonction active modifiée. Il ne valide pas un vrai clic humain ni un paiement, ne remplace pas le véritable E2E et ne doit pas servir à ouvrir une gate.

Autres obstacles d'envoi constatés dans la source, non réparés par ce patch :
- `send-verified-batch` transmet un lien direct et un identifiant horodaté au sender email; preuve d'un claim atomique/quota/idempotence fournisseur et contrôle CASL email complet non établie.
- `outreach-resend-send` ne présente pas de contrôle d'autorisation applicatif/master gate/CASL/suppression à son entrée; domaine déclaré verified en dur. Ne jamais l'appeler directement pour contourner la chaîne.
- `emailHtml` parle encore d'une entente calculée plutôt que de l'activation de base 350 $; aucune adresse postale CASL dans ce gabarit. Adresse réelle et traitement exact de désabonnement non vérifiés, aucune adresse inventée.

## Vérifications exécutées

- `npm run verify:source` : PASS, branche de travail inclut lovable-sync 3d2283543c43; aucun fetch/commit manuel.
- Vitest : **71/71 PASS, 7 suites** : staged click (8), prelaunch evidence (19), idle provider (3), E2E honesty (16), worker gate (8), webhook fail-closed (11), expiration billing (6).
- Patch reconstruit contre la source actuelle dans les tests; mauvaise cible/403/SPA vide/landing 500 rejetés; fixture exacte passe avec `auto_open_gate=false`, aucune gate ouverte.
- Stripe SDK local : signature TEST authentique validée, forgée/absente rejetées; événement expired/unpaid, aucune vente ni droit revendiqué. Aucun appel Stripe.
- Playwright 390×844 et 1280×1800 : `/r/synthetic123` → résolution interceptée → `/entrepreneurs/activation-350?source=qa&ref=synthetic`; prix/CTA 350 $ visible, attribution conservée, aucun débordement ni erreur JavaScript. Captures `/tmp/browser/outreach-click/` inspectées. Services externes bloqués, Clara réelle/vidéo/auth/paiement/livraison non validés. Le rendu intercepté affiche certains textes anglais et un message de reprise indisponible : ne pas qualifier le parcours commercial complet de PASS.
- Compilation automatique : `build OK` à 21:52:10 UTC; aucune compilation/typecheck manuelle. `git diff --check` PASS.

## Prochaine action et limites

Effectuer la revue humaine documentée des deux sources officielles admissibles, confirmer adresse postale/opt-out/claim email et terminer QA hébergée réellement isolée avant autorisation de déploiement. Aucun test hébergé actuel exécuté : ils écrivent des fixtures, envoient via fournisseurs, créent un Checkout TEST et évaluent la gate sur le backend partagé. Les mocks locaux ne lèvent jamais ces verrous. Le master switch ne s'ouvre pas naturellement après les tests; il reste false.

Patch/test commit observé : `7891fb02894c86d4c2d62fadab6c813becfbf5fc`; la présente documentation est enregistrée séparément automatiquement. Système non approuvé pour envoi (Autonomous QA Auditor).