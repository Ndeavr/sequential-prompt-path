# A — PROMPT LOVABLE FINAL

## 1. CONTEXT

La continuité canonique est figée sur `alex_sessions` + `alex_messages`. Les raccords P1 conservent déjà les références réelles de projet, propriété, analyses, entrepreneur, jumelage, rendez-vous, devis et paiement. La page `/` rend actuellement `PageHomeLight` → `HeroHomeownerLight` → `ClaraConversationBox`; cette boîte utilise déjà AI Elements, `clara-session`, le texte en continu, la voix et les pièces jointes.

## 2. OBJECTIVE

Build **ONE CLARA = ONE COMPOSER = ONE CONTINUOUS EXPERIENCE** sur la page d’accueil existante, sans modifier l’autorité conversationnelle ni reconstruire les systèmes métier.

## 3. USERS

- Propriétaire anonyme ou connecté
- Entrepreneur anonyme ou existant
- Gestionnaire, partenaire, affilié ou professionnel détecté dans la conversation
- Utilisateur mobile prioritaire, puis ordinateur

## 4. DELIVERABLES

- Remplacer la mise en scène actuelle de la home par une surface presque noire, très respirante et centrée sur Clara.
- Conserver le vrai logo, FR/EN, profil et menu minimal.
- Afficher exactement :
  - « Montrez-moi. Parlez-moi. Je m’occupe du reste. »
  - « Qu’est-ce que vous voulez réparer, vérifier ou améliorer? »
- Transformer `ClaraConversationBox` en unique boîte évolutive avec texte, ajout, caméra, microphone et envoi.
- Supprimer de l’état initial toute grille, segmentation propriétaire/entrepreneur et carte promotionnelle.
- Ouvrir une zone contextuelle seulement après compréhension suffisante.

## 5. LOGIC

- Conserver `clara-session` comme seule continuité et ne créer aucun nouveau store de conversation.
- Piloter la présentation par un état d’interface dérivé des intentions et références canoniques : `IDLE`, `LISTENING`, `ANALYZING`, `PHOTO`, `DOCUMENT`, `QUOTE`, `CONTRACTOR`, `PROJECT`, `MATCH`, `APPOINTMENT`.
- Ne jamais stocker une copie des données métier dans la conversation; conserver seulement les identifiants validés existants.
- Poser une seule question utile à la fois, réutiliser les faits connus et livrer une valeur avant l’authentification.
- Déclencher l’authentification uniquement au moment de sauvegarder ou poursuivre une action nécessitant un compte, puis reprendre la même conversation et les mêmes références.
- Respecter le contrat linguistique existant de Clara; le contrôle FR/EN reste disponible sans introduire une seconde personnalité.

## 6. DATA

Réutiliser exclusivement les références canoniques existantes :

`conversation_id → active_property_id → active_project_id → active_lead_id → selected_match_id → appointment_id`

`conversation_id → verification_run_ids / quote_analysis_ids / visual_analysis_ids`

`conversation_id → contractor_id → pricing_quote_id → checkout_session_id`

Aucune nouvelle table, migration, route métier, fonction serveur, donnée fictive ou recalcul de prix côté client.

## 7. UI/UX

- Fond noir ou presque noir, contraste élevé, immense respiration, typographie premium, aucun tableau de bord ou cyberpunk.
- Boîte Clara blanche/glossy ou fortement contrastée, glow discret, présence abstraite par onde/lumière/orbe sans avatar humain.
- Utiliser les composants AI Elements déjà installés pour conversation, messages, saisie, pièces jointes et état d’analyse.
- Garder les réponses de Clara sans bulle colorée; utiliser une bulle utilisateur fortement contrastée.
- Faire disparaître les petits exemples dès la première interaction.
- Faire évoluer la même boîte sans saut de page visuel : ajout de photos, jusqu’à trois soumissions, champs entrepreneur, résumé de projet, recommandation et rendez-vous.
- Afficher les résultats réels dans une zone contextuelle adjacente seulement quand ils deviennent utiles; empiler cette zone sous Clara sur mobile.
- Respecter clavier mobile, caméra native, microphone contextuel, zones sûres iOS, focus, retour navigateur, réduction des animations et absence de débordement horizontal.

## 8. COMPONENTS

- Refactorer la home existante et son style, sans nouvelle route.
- Faire de `ClaraConversationBox` la coque unique et composer autour des AI Elements existants.
- Réutiliser les contrôles réels de voix, caméra/upload, analyse visuelle, analyse de soumissions, vérification entrepreneur, onboarding, services, projet, jumelage et rendez-vous.
- Adapter les rendus d’actions existants pour qu’ils apparaissent dans la boîte ou la zone contextuelle, sans dupliquer leurs règles métier.
- Retirer de `/` l’ancienne image de maison, le blueprint, la promesse « trois soumissions » et la capsule promotionnelle initiale; préserver les autres pages.

## 9. ACTIONS

- Texte général → réponse en continu dans la conversation canonique.
- Photo → capture/import réel, analyse existante, provenance et référence `visual_analysis_id`.
- Trois soumissions → séquence progressive 1/2/3, analyse existante et `quote_analysis_ids`.
- Vérification entrepreneur → nom/site/RBQ, mécanisme existant et `verification_run_id`.
- Entrepreneur → identité réelle, services pertinents existants, priorisation, plan personnalisé, mêmes `contractor_id` et `pricing_quote_id`.
- Projet → même `project_id` et `lead_id` après refresh/auth.
- Jumelage → moteur serveur existant uniquement, raisons fondées sur les données disponibles.
- Rendez-vous → disponibilité réelle et revalidation serveur avant confirmation.

## 10. CONSTRAINTS

- Si un moteur métier réel, une donnée admissible ou une disponibilité nécessaire est absente, Clara reste dans la conversation, affiche l’état réel et propose la prochaine action possible. Ne jamais simuler un résultat pour compléter l’UX.

- Ne pas modifier l’architecture canonique sauf bug démontré.
- Ne pas recréer de backend, session, conversation, authentification, paiement, matching ou calendrier.
- Ne pas modifier Stripe live ni exécuter de charge réelle.
- Ne pas lancer de SMS, courriel, appel ou notification automatique.
- Ne jamais inventer licence, conformité, avis, disponibilité, score, entrepreneur ou recommandation.
- Préserver RLS, CASL, provenance, conformité RBQ, idempotence, audit et séparation des autorités métier.
- Ne pas publier automatiquement.

## 11. SUCCESS

- Le premier rendu de `/` reste léger; l’analyse de soumissions, la vision, le matching, l’onboarding et le calendrier sont chargés uniquement lorsqu’ils deviennent nécessaires.
- Aucun des 9 problèmes déjà corrigés dans l’audit Clara ne réapparaît.
- Une seule boîte Clara visible et fonctionnelle sur `/`.
- Aucun ancien panneau Clara concurrent ne s’ouvre depuis la home.
- Le même contexte reprend après refresh, retour/avance, OTP/OAuth, réouverture et second appareil.
- Les dix parcours demandés atteignent leurs systèmes canoniques sans nouvel identifiant inattendu, duplication ou perte de contexte.
- Mobile 390 px et ordinateur passent sans overflow, chevauchement, focus cassé ou texte illisible.
- Console et réseau restent propres; tests ciblés, tests de régression, types, lint critique et build passent.

## 12. TASKS

0. Avant toute modification, inspecter l’implémentation actuelle de `/`, `ClaraConversationBox`, `clara-session`, `alex_sessions`, `alex_messages`, les raccords P1 et les 9 issues déjà corrigées. Ne modifier que ce qui est nécessaire à l’unification visuelle et préserver tous les correctifs existants.
1. Consolider la home et retirer uniquement ses éléments initiaux non conformes.
2. Refactorer la boîte existante en machine de présentation unique, sans nouveau stockage conversationnel.
3. Brancher les modes contextuels sur les moteurs et références P1 existants.
4. Préserver la continuité anonyme → authentifiée dans le même rendu.
5. Ajouter les tests de contrat pour l’unicité de Clara, les modes et la conservation des références.
6. Exécuter les parcours : propriétaire texte, photo, trois soumissions, vérification entrepreneur, entrepreneur anonyme, entrepreneur existant, amélioration maison, anonyme → OTP → reprise, jumelage réel et rendez-vous.
7. Vérifier clavier, caméra, micro, upload, auth, retour, scroll, zones sûres, réseau et console sur mobile et ordinateur.
8. Corriger toute régression non destructive et rollbackable avant la remise.
9. Exécuter ensuite la preuve sur deux appareils avec le même compte, sans créer de donnée fictive ni déclencher une action commerciale réelle.
10. Livrer un rapport distinguant les parcours prouvés en direct, les validations automatisées et tout scénario bloqué par l’absence de données réelles admissibles.
