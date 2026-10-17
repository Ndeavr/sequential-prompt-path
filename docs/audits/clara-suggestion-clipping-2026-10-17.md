# Clara — suggestions mobiles masquées : correction ciblée

## Source et périmètre

Source de départ vérifiée : `8fa4a481e49e3868f5ffb059a6c18bceb539f3e4`, après les quatre alertes. `npm run verify:source` réussi. Révision intermédiaire enregistrée automatiquement par Lovable : `0994b4ef973342ca18993168ca4a249e51ebf3b7`. Aucun commit manuel, publication ou déploiement. Paiements, webhooks, données, auth, RLS, prix et prospection inchangés.

## Cause reproduite

Sur les vrais composants locaux, à hauteur 768 CSS px, le panneau initial imposait une hauteur de 60dvh. Le header et le composer occupaient deux lignes distinctes, mais la ligne centrale restante était plus petite que salutation + titre + trois suggestions. StickToBottom et le suivi ResizeObserver démarraient même sans vrai message : scrollTop initial de 125 px à 320, 102 à 360 et 85 à 375/390/412. À 360, le haut du premier choix était à 336,92 alors que l'en-tête se terminait à 354,34 : 17,42 px masqués. Pas un problème de z-index : l'en-tête est déjà hors du conteneur défilant.

## Correction

- Suggestions initiales : ligne de grille dimensionnée par son contenu, pas hauteur fixe trop petite; la page reste défilable si le panneau dépasse la fenêtre. Pas de marge artificielle au-dessus.
- Initialisation StickToBottom sans suivi en l'absence de messages; ResizeObserver de suivi monté après de vrais messages seulement.
- Scroll explicite ignoré tant que les suggestions initiales sont présentes; quick replies ne suivent que si de vrais messages existent et que le lecteur est près du bas.
- Révélation subtile du fond, décalée de 120 ms, sans clip-path qui efface les mots. Texte toujours lisible, mouvement réduit respecté. Police fixe .9rem, aucune couleur ajoutée.
- Header et composer restent dans leurs lignes de grille existantes. Aucun composant, API, route ou système parallèle.

## Fichiers

- `src/components/home-light/ClaraConversationBox.tsx`
- `src/index.css`
- `scripts/audit/clara-suggestions-layout.py` : assertions de géométrie réelle, conservées dans le projet.
- `AGENTS.md` : règle de suivi existante précisée.
- `roadmap.md` et ce rapport.

## Vérifications

- **48 scénarios DOM réels réussis**, aux largeurs 320/360/375/390/412/1280 : chargement, refresh, trois choix entièrement dans leur zone de lecture, numéro 01 visible, scrollTop initial=0, clic Playwright réel sur une suggestion, réponse simulée, composer, absence de débordement horizontal.
- Mobile : focus et réduction de la fenêtre à 430 px puis fermeture simulée; scroll haut/bas, header et composer non superposés à la zone centrale.
- 360/390 : clics réels « Je suis entrepreneur » → menu « Changer de parcours » → confirmation propriétaire → message; requête alex-chat simulée avec userRole=homeowner. Le CTA de section sous le chat plein écran reste le blocage antérieur, hors correction ciblée.
- **24/24 tests Vitest réussis** : clara-compact-qualification (5), four-issues-role-resume (3), clara-flow-cursors (1), entry-350-qa-isolation (15). Les erreurs injectées/duplicate des tests SQL sont attendues; aucun appel Stripe ou écriture production.
- Compilation automatique : **build OK**, dernier signal lu `2026-10-17T21:47:29Z`. Aucun build ni typecheck manuel; contrôle TS séparé non exécuté.
- Zéro pageerror dans le dernier test navigateur. Suggestions fournisseur vides/interrompues simulées : fallback saisonnier existant affiché, pas liste vide inventée.

## Captures et limites

Captures inspectées : `/tmp/browser/clipping/fixed-320.png`, `fixed-375.png`, `keyboard-375.png`, `role-switch-390.png`. Ensemble six largeurs : `fixed-{width}.png`; autres : `keyboard-{width}.png`, `role-switch-{360,390}.png`. Traces : `/tmp/browser/clipping/before.log`, `after.log`, `regression.log`. Les noms before-*.png ont été réutilisés par la mesure après : les chiffres before.log sont la preuve géométrique avant; ne pas présenter ces images comme captures avant.

L'aperçu supervisé était vide; test effectué sur Vite local isolé (cache temporaire existant), vrais composants/routeur et CSS. Aucun service externe autorisé : toutes les requêtes hors origine locale sont simulées. Le HUD de diagnostic local avait intercepté Envoyer : pointer-events désactivé dans le test seulement, pas dans l'application. Un premier lanceur bloquant et une relance expirée ont échoué; dernier passage complet 48 scénarios réussi.

Pas de preuve de correction sur unpro.ca : aucune publication demandée/effectuée. Clavier Android physique, navigateur Android réel et données IA réelles non testés; la réduction de fenêtre n'est pas une ouverture de clavier physique. Publication **bloquée** par la QA authentifiée Auth/PostgREST/Edge 350 $ antérieure. Prochain geste : terminer cette QA isolée authentifiée avant toute release; ne pas publier le CSS avec du code Stripe non validé.

Skill appliqué : Mobile UX Enforcer.