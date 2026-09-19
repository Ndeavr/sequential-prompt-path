# Phase 2 — Médias réels dans Clara (photo, vidéo, documents)

## Objectif
Clara accepte plusieurs fichiers à la fois — photos, vidéos, documents — avec une progression réelle, la reprise après erreur, et une analyse honnête de ce qui est réellement analysable.

## Ce qui existe déjà (vérifié)
- Le « + » de Clara accepte images, PDF, Word, un seul fichier à la fois sauf en mode soumissions, 10 Mo max.
- Le bouton appareil photo ouvre la caméra arrière du téléphone (photo seulement).
- Les photos partent vers l'analyse visuelle réelle; les soumissions vers l'analyse comparative réelle; les fichiers connectés sont enregistrés dans l'espace privé du propriétaire.
- Aucun envoi de vidéo n'est possible aujourd'hui, et aucune barre de progression réelle n'existe : l'écran affiche seulement « Analyse en cours… ».

## Limite assumée (aucune simulation)
Le moteur d'analyse disponible lit des images, pas un flux vidéo ni le son. Clara acceptera donc la vidéo, en extraira des images clés dans le navigateur, analysera ces images, et le dira exactement ainsi : « J'ai examiné X images tirées de votre vidéo. Je n'analyse pas le son. » Jamais « j'ai analysé la vidéo ».

## Ce qui sera construit

### 1. File d'attente média unique
Un seul gestionnaire de fichiers pour Clara : chaque fichier ajouté obtient son propre état visible — en attente, envoi 0→100 %, analyse, terminé, échec. Rien n'est perdu quand Clara répond, quand on change d'écran de la conversation ou quand on ajoute un autre fichier pendant un envoi.

### 2. Menu « + » complet sur mobile
Prendre une photo, choisir une photo, prendre une vidéo, choisir une vidéo, joindre un document. Aperçu de chaque fichier avant envoi, possibilité de retirer ou d'ajouter, envoi groupé.

### 3. Envoi réel avec progression et reprise
- Images : compression avant envoi (côté navigateur) pour rester sous la limite.
- Vidéos : limite explicite affichée, extraction d'images clés, envoi de la vidéo dans l'espace privé.
- Progression réelle par fichier; en cas d'échec, un bouton « Réessayer » relance seulement le fichier concerné, sans recommencer les autres ni redemander l'analyse déjà réussie.
- Chaque fichier reste rattaché à la conversation canonique de Clara et au dossier du propriétaire quand il est connecté.

### 4. Résultat honnête et action suivante
Après analyse, Clara affiche le résultat structuré (Observé / Probable / À vérifier) et propose les suites déjà branchées : ajouter au dossier maison, trouver un entrepreneur, envoyer un autre média. Si une analyse échoue, Clara le dit et propose la reprise — jamais de résultat inventé.

### 5. Visiteur non connecté
Les médias d'un visiteur restent visibles dans sa conversation; à la connexion, ils sont rattachés à son compte sans double envoi.

## Détails techniques
- Nouveau service `src/services/clara/claraMediaQueue.ts` : file d'attente, états, progression, retry, idempotence par empreinte de fichier. Aucun doublon d'architecture — il réutilise `alexUploadService`, `analyzeImageVisually`, `runQuoteAnalysis`, `appendClaraMessage` / `rememberClaraReferences`.
- Extraction d'images clés vidéo côté navigateur via `<video>` + `canvas` (3 à 5 images réparties), sans nouvelle dépendance ni nouveau moteur.
- `alexUploadService` étendu : types vidéo (`video/mp4`, `video/quicktime`, `video/webm`), limite de taille distincte pour la vidéo, progression réelle via l'API de téléversement du stockage, `kind: "video"` dans les fichiers de projet.
- Bucket : réutilisation de `property-photos` (privé, RLS déjà en place) avec le chemin `{userId}/clara/...`; création d'un bucket vidéo seulement si la limite de taille du bucket existant l'impose — avec approbation avant toute création.
- `ClaraConversationBox.tsx` : `accept` élargi aux vidéos, `multiple` toujours actif, menu « + » avec les cinq entrées, liste des pièces jointes avec progression et retry.
- `ClaraContextPanel.tsx` : nouveau mode `VIDEO` affichant les images extraites et le texte de limite.
- Journalisation existante : `media_upload_started / completed / failed`, `video_analysis_started / completed` via le journal de workflow déjà en place. Aucun secret journalisé.

## Ce qui n'est pas touché
Auth, RLS, Stripe, calendrier, routes, tables existantes, voix, onboarding entrepreneur/affilié.

## Vérification
- Tests ciblés : file d'attente (progression, échec, reprise, idempotence), extraction d'images clés, refus des formats/tailles hors limites, rattachement à la session canonique.
- Suite complète, typage, construction.
- Essai mobile 390 px : 3 photos en une fois, une vidéo, un PDF, une coupure réseau simulée puis reprise.
- Rien n'est publié sans votre accord.

## Bloqueur possible à signaler
Si la limite de taille du stockage refuse les vidéos utiles, je vous le dirai avec l'action minimale requise (relever la limite du bucket) avant toute modification.
