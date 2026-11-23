# UNPRO — intégration des vidéos originales (18 novembre 2026)

## Source et limites

Quatre fichiers MP4 originaux ont été fournis par le fondateur dans ChatGPT après l'échec de l'intégration des liens abrégés Facebook. Les liens Facebook précédemment communiqués ne pouvaient pas être reliés de façon certaine aux quatre fichiers; **aucune association vidéo ↔ lien Facebook individuel n'est affirmée**.

L'archive préparée `UNPRO_videos_site.zip` contient 4 MP4 optimisés ou conservés selon leur poids, 4 images JPG de couverture, `VIDEO_MANIFEST.json` et `README.txt`.

## Placement actuel (source active `lovable-sync`)

| Vidéo originale | Fichier dans `public/videos/unpro` | Page |
|---|---|---|
| `ElevenLabs_Untitled_project.mp4` (présentation panoramique) | `unpro-presentation.mp4` + `.jpg` | Accueil `/`, après les parcours Clara |
| `pub_unpro_vertical_v2.mp4` (soumissions / bons mandats) | `unpro-bons-projets.mp4` + `.jpg` | `/entrepreneurs`, après « Comment ça marche » |
| `ElevenLabs_UNPRO_—_PUBLICITÉ_VIDEO_«_ACCOTÉ,_ACCOTÉ!_»PROJET_.mp4` (humour) | `unpro-accote-accote.mp4` + `.jpg` | `/entrepreneurs` |
| `UNPRO_Pub_Facebook_Reel_Competence-1.mp4` (compétence) | `unpro-competence.mp4` + `.jpg` | `/entrepreneurs` |

Les MP4 originaux conservés pèsent ~3,3 à 5 Mo chacun; la vidéo horizontale a été réencodée de ~46 Mo à ~3,1 Mo en H.264/AAC, 1280×720, pour le web.

## Étape de livraison indispensable

Le connecteur GitHub autorise les changements textuels, mais ne transporte pas directement les fichiers binaires MP4 provenant de cette conversation vers le dépôt. Le code du lecteur est dans la PR #241, **mais les huit fichiers média doivent encore être importés**.

À partir de l'archive `UNPRO_videos_site.zip`, copier `public/videos/unpro/*` dans ce même dossier du projet Lovable existant et committer ces fichiers sur la branche de la PR #241 ou sur la source active selon le processus de revue. **Ne pas fusionner ni publier tant que les fichiers ne sont pas effectivement en place.**

## Vérifications minimales à la mise en ligne

1. Quatre MP4 + quatre JPG disponibles en HTTP 200 aux URLs `/videos/unpro/...` ; mêmes noms/casse exacts.
2. Lecture sur mobile Android/iOS et desktop, sans autoplay; affichage des bonnes couvertures et ratios; `controls` et `playsInline`.
3. Accueil : une vidéo horizontale. Page entrepreneurs : trois capsules verticales. Aucun impact sur les CTA Clara, inscription ni Stripe.
4. Un échec de lecture déclenche le lien de secours vers la page Facebook UNPRO, sans lecteur vide.
5. Événement `unpro_video_played` lors d'une lecture. Aucun résultat commercial ou recommandation IA tiers garanti.

La suite complète de tests du projet comporte actuellement des échecs préexistants hors vidéo; ne pas attribuer ces échecs à cette fonctionnalité sans preuve. La PR reste en brouillon.
