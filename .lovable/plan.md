# Clara — point d'entrée unique et orchestrateur de tous les parcours

## Ce qui existe déjà (vérifié dans le projet)

- Conversation canonique : `alex_sessions` + `alex_messages`, fonction `clara-session` (actions `start`, `append`, `brief`, `context`, `promote`) et hook de continuité déjà branchés sur la page d'accueil.
- Détection d'intention : `src/services/alexIntentClassifier.ts` couvre déjà diagnostic photo, comparaison de soumissions, vérification d'entrepreneur, recherche, rendez-vous, design, parcours entrepreneur. Il ne couvre pas l'affilié, ni la vidéo.
- Moteurs réels déjà en place : `diagnostic-analyze` (photos), `alex-analyze-image`, `design-generate`, `media-orchestrator` (génération/édition d'images), `analyze-quote-document` et `analyze-quote-comparative`, `verify-contractor`, `aipp-verify-rbq`, `aipp-verify-neq`, `affiliate-onboarding-activate`, parcours entrepreneur (profil, services, plan personnalisé, Stripe), matching et rendez-vous.
- Composeur Clara : upload photo + document + caméra. Aucun support vidéo nulle part dans le projet.

Conclusion : il ne faut rien reconstruire. Le travail consiste à **brancher** ces moteurs derrière un routeur d'intention unique, à ajouter la mémoire de workflow suspendu/repris, et à combler deux vrais trous (affilié conversationnel, vidéo).

## Limite technique à assumer

Le moteur IA disponible analyse des **images**, pas des flux vidéo. Clara pourra accepter une vidéo, l'enregistrer, en extraire des images clés et les analyser — et elle le dira exactement ainsi. Elle n'affirmera jamais avoir « analysé la vidéo » ni le son.

## Phases

### Phase 1 — Routeur unique + mémoire de workflow (fondation)
- Étendre le classificateur existant avec `affiliate_onboarding`, `video_problem_analysis`, `contractor_verification`, `quote_comparison` (les autres existent déjà), sans jamais exposer la classification à l'utilisateur.
- Ajouter à la session canonique l'état de workflow : intention active, sous-workflow, étape, données obtenues/manquantes, fichiers, workflow suspendu, prochaine action. Stocké dans le contexte de `clara-session` (aucune nouvelle table, aucune deuxième mémoire).
- Suspension/reprise : changer d'intention empile l'étape en cours et y revient exactement après le sous-workflow.
- Journal d'événements (`intent_detected`, `workflow_started/paused/resumed`, …) via la table d'événements existante.
- Voix et texte partagent le même état (le pont voix canonique existe déjà).

### Phase 2 — Médias : multi-upload réel, photo et vidéo
- Menu « + » : prendre/choisir une photo, prendre/choisir une vidéo, document. Aperçu, suppression, ajout, envoi groupé, progression réelle, reprise après erreur, aucun upload perdu au changement d'état.
- Vidéo : validation de taille, envoi vers le stockage privé, extraction d'images clés, analyse de ces images, résultat rattaché à la session.
- Analyse structurée imposée : Observé / Probable / À vérifier / Niveau d'urgence descriptif, jamais de certitude inventée.
- Succès partiel : média conservé, ré-analyse possible sans réenvoi.
- Actions de suite dans la même conversation : comment réparer, trouver un entrepreneur, ajouter au dossier maison, envoyer une autre photo.

### Phase 3 — Onboarding affilié et entrepreneur dans la conversation
- Affilié : une question à la fois, préremplissage, reprise d'un dossier incomplet sans doublon, activation via la fonction serveur existante, code et lien affiliés réels, commissions lues en production.
- Entrepreneur : identification de l'entreprise via les sources existantes, confirmation, préremplissage, services rattachés au métier réel (Prioritaire / Accepté / Non recherché), territoire, disponibilités, éligibilité serveur, plan personnalisé, paiement ou activation gratuite selon les règles réelles.
- Reprise exacte de l'étape après une parenthèse (design, question, authentification).

### Phase 4 — Vérification d'entrepreneur et comparaison de soumissions
- Vérification : extraction automatique depuis carte d'affaires, lien, document ; désambiguïsation explicite quand plusieurs entreprises correspondent ; fiche lisible (identité, licence, présence, réputation, documents, points à vérifier) ; statuts Verified / Declared / Inferred / Pending ; signaux factuels sans accusation ; aucune certification implicite.
- Comparaison : extraction structurée de chaque soumission, normalisation de la portée avant le prix, tableau adapté au métier, écarts en dollars/pourcentage et coût unitaire seulement si la quantité est fiable, éléments manquants, questions à poser avant signature, clauses importantes.
- Les deux workflows s'appellent l'un l'autre sans redemander les documents, et reviennent au tableau.
- Sauvegarde persistante de la comparaison, documents privés (RLS), rattachement au dossier maison et aux analyses photo/vidéo antérieures quand c'est réellement supporté.

### Phase 5 — Dossier maison, matching, rendez-vous, tests bout en bout
- Ouverture du dossier propriétaire avec retour exact au point de la conversation après authentification.
- Matching réel : recommandation et créneaux si disponibles, sinon enregistrement honnête de la demande. Toute affirmation de Clara correspond à une action serveur réussie.
- Tests A à M du cahier de charges exécutés réellement, plus mobile 390 px.

## Détails techniques

- Aucune nouvelle table de conversation : extension du contexte de `clara-session` et du classificateur existant.
- Les modules lourds (vision, design, comparaison, onboarding, calendrier) restent chargés à la demande ; le premier rendu de `/` reste léger.
- RLS et auth inchangés : sessions, uploads, propriétés, designs, analyses et dossiers restent cloisonnés par utilisateur ; aucune URL de stockage privée exposée.
- Aucun changement Stripe en mode réel, aucun envoi SMS/courriel automatique, aucune publication sans votre accord.
- Les neuf correctifs de l'audit Clara et le cycle de vie voix déjà livrés sont protégés par les tests existants.

## Critère d'arrêt

Chaque phase est terminée seulement quand le parcours fonctionne réellement de bout en bout avec des données de production : aucun faux bouton, faux upload, faux score, fausse analyse ni workflow mort. Si un blocage externe apparaît, je vous indiquerai le service, ce qui fonctionne, ce qui manque, la clé ou permission requise et l'action minimale de votre côté.

## Livraison proposée

J'exécute la Phase 1 immédiatement après approbation, puis j'enchaîne les phases suivantes en continu, en vous signalant seulement les vrais bloqueurs.
