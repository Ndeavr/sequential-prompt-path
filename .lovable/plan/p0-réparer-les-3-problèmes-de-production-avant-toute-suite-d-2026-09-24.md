# P0 — Réparer les 3 problèmes de production avant toute suite du parcours

Ordre strict : A → B → C, puis régression complète. Aucune nouvelle fonctionnalité. Aucune architecture parallèle.

## État vérifié avant le plan
- Clara : un déploiement ancien du service de conversation refusait les actions « historique » et « reprise » (erreur `unknown_action`, écran blanc). Le service à jour est maintenant en ligne et répond correctement. Les journaux récents ne contiennent aucune autre erreur. La cause des ~16 échecs signalés reste donc **à confirmer** : ce déploiement ancien l'explique probablement, mais pas forcément en totalité.
- Affiliés : l'activation enregistre la preuve d'acceptation avec `partner_id: null`. Ce champ accepte le vide et un index unique `(user_id, role, terms_version)` existe. L'erreur exacte en base n'est **pas encore capturée**. Au moins 1 affilié créé dans les 30 derniers jours n'a aucune preuve d'acceptation.
- Blocage du défilement : la page d'accueil verrouille la page pendant le chat, et la voix Clara ajoute une classe `alex-overlay-active` sur la page. Le nettoyage à la navigation n'est pas encore vérifié.

## P0-A — Sessions Clara
1. Rejouer le vrai parcours et consigner chaque requête au service de conversation (action, statut, message d'erreur) : visiteur anonyme puis utilisateur connecté, démarrer → messages → navigation → reprise → nouveau message → actualisation → historique → nouvelle conversation.
2. À chaque 4xx/5xx : relever l'erreur exacte côté serveur et en base, puis corriger la cause : jeton périmé, `session_id` manquant, contrainte, RLS ou doublon.
3. Idempotence : envois en double fusionnés grâce au `client_message_id` existant ; les démarrages simultanés réutilisent la même requête en cours. Aucune erreur masquée : un échec reste visible dans les journaux et l'interface se rétablit.
4. Test ciblé : routage des actions, et le client n'appelle aucune action inconnue du serveur.

## P0-B — Page figée après une navigation Clara (390 px)
1. Reproduire : accueil → Clara → parcours entrepreneur → `/entrepreneurs/audit-ia` ; relever `overflow`/`position`/`touch-action` sur `html` et `body`, les classes posées sur la page et les couches invisibles qui captent le toucher.
2. Cause racine : tout verrou posé par le chat d'accueil, la voix, le menu ou les panneaux doit être retiré à la fermeture, au démontage et au changement de page. Ramener ces verrous à une seule source, liée au cycle de vie de chaque composant ; supprimer les verrous en double.
3. Aucun défilement forcé : la page de destination défile nativement.
4. Test Playwright : 3 allers-retours sans rechargement (entrepreneur + propriétaire), défilement complet jusqu'en bas, aucune couche ne capte le toucher.

## P1 — Activation affiliée à l'étape des conditions
1. Capturer l'erreur exacte (journaux de la fonction avec le message de la base, ou reproduction avec un compte test).
2. Corriger la vraie incompatibilité (contrainte, droits, colonne ou cible du conflit) par une migration si nécessaire. L'acceptation des conditions reste obligatoire.
3. Activation idempotente : aucun affilié ni consentement en double ; une reprise termine une activation incomplète.
4. Réconciliation : lister les affiliés sans preuve d'acceptation. Aucune preuve ne sera créée à leur place. Ces comptes resteront incomplets et termineront l'activation à leur prochain passage, avec un vrai clic d'acceptation. Aucune suppression.
5. Test : nouvel affilié test → inscription → profil → conditions → activation → tableau de bord, puis nouvelle tentative pour prouver l'idempotence.

## Régression (390 px, tests réels)
Les 10 scénarios demandés : conversation anonyme, conversation connectée, persistance après navigation, Clara → Audit IA, défilement complet, parcours propriétaire, affilié → conditions → activation, nouvelle tentative, réinitialisation, actualisation/reprise. Puis relecture des journaux : aucune erreur de session, aucun verrou restant, aucune erreur d'activation.

## Livrables du rapport
Cause racine de chacun des 3 problèmes, fichiers et fonctions modifiés, changements en base et règles d'accès, tests réellement exécutés avec leur résultat, blocages externes restants. Le parcours Audit IA → 350 $ → Stripe ne reprend qu'après tout cela.

## Détails techniques
- Fichiers probables : `supabase/functions/clara-session/index.ts`, `src/services/clara/claraSession.ts`, `src/components/home-light/ClaraConversationBox.tsx`, `src/components/voice/OverlayAlexVoiceFullScreen.tsx`, règles home de `src/index.css`, `supabase/functions/affiliate-onboarding-activate/index.ts`.
- Vérifications : tests ciblés vitest, `tsgo`, compilation, Playwright 390×844, journaux des fonctions.
- Aucun message automatique envoyé ; comptes test uniquement ; aucune donnée légitime supprimée.
