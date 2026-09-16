# Correctif visuel fidèle de la home UNPRO

## 1. CONTEXTE

Le rendu actuel de `/` a été vérifié à 375 px, 412 px, tablette et desktop, puis comparé à la référence jointe.

Constats confirmés :
- `MainLayout` monte encore le dock mobile global sur `/`, y compris les entrées internes liées au rôle connecté.
- La home rend cinq sections éditoriales après le hero, puis la section globale Passeport Maison et le pied de page.
- Le sélecteur FR/EN utilise actuellement une grosse pilule, contrairement à la référence.
- Le module Clara est limité à `max-w-3xl`, séparé en deux blocs et visuellement plus plat que le panneau de verre de référence.
- Le hero utilise déjà le vrai logo UNPRO, le blueprint, la scène architecturale existante et les vrais flux texte, fichier et micro.
- En session neuve, Clara Voice est fermé au chargement. Le micro appelle explicitement `openAlex`; le bouton X appelle déjà la fermeture explicite. Ce contrat sera renforcé par des tests sans refondre le moteur vocal.

## 2. OBJECTIF

Transformer uniquement la présentation de la home existante pour reproduire fidèlement la composition desktop fournie et offrir une adaptation mobile nette, sans modifier Clara, l’authentification, le backend, les données ni les routes.

## 3. USERS

- Propriétaires arrivant sur la home publique, connectés ou non.
- Utilisateurs mobiles, tablette et desktop.
- Utilisateurs clavier ou avec réduction des animations activée.

## 4. DELIVERABLES

- Header public mince : vrai logo bleu, FR/EN textuel, profil cerclé, hamburger.
- Hero presque plein écran avec titre, sous-titre, panneau Clara et capsule de confiance aux proportions de la référence.
- Dock interne complètement absent de `/` et `/index` seulement.
- Sections actuelles et longue section Passeport retirées de cette home; fin du hero prolongée par une transition sombre sobre.
- Clara Voice invisible avant une action explicite, puis refermable complètement par X.
- Tests visuels et fonctionnels sur 375, 412, tablette et desktop.

## 5. LOGIC

- Conserver les handlers actuels : envoi vers `alex-chat`, téléversement via `handleUpload`, micro via `openAlex`.
- Rendre le dock, son espace réservé et les contenus globaux non pertinents conditionnels à la route; aucune modification de leurs usages ailleurs.
- Garder l’overlay vocal global fermé par défaut; vérifier qu’aucun effet de la home ne l’ouvre et que la fermeture remet `isOverlayOpen` à faux.
- Conserver la préférence linguistique existante et les textes FR/EN déjà branchés.

## 6. DATA

Aucun changement de donnée, migration, politique d’accès, fonction serveur, Stripe, Twilio ou instrumentation métier.

## 7. UI/UX

- Inter comme unique famille, titres 700/750, tracking `-0.035em`, interligne compact.
- Fond navy presque noir, maison contemporaine existante assombrie/floutée à droite, blueprint fantôme à gauche, reflet cobalt au sol.
- Titre centré et contenu dans une largeur proche de la référence; rupture mobile contrôlée en quatre lignes françaises.
- Panneau Clara d’environ 900 px sur desktop, rayon 30–36 px, bordure électrique fine, reflets blancs localisés, profondeur et halo bas sans surcharge néon.
- Composition Clara : halo abstrait plus présent, textes à droite sur desktop, saisie horizontale compacte dessous; pile nette sur mobile.
- Champ sans grande sous-carte lourde; pièce jointe, micro et envoi restent dans la zone de saisie.
- Capsule « Rendez-vous exclusifs » petite, centrée et espacée.
- Animations limitées à l’apparition et à une respiration très lente; état statique avec `prefers-reduced-motion`.

## 8. COMPONENTS

Modifier uniquement les surfaces nécessaires :
- `src/pages/PageHomeLight.tsx`
- `src/components/home-light/HeroHomeownerLight.tsx`
- `src/components/home-light/ClaraConversationBox.tsx`
- `src/components/navigation/SmartHeader.tsx`
- `src/layouts/MainLayout.tsx`
- tokens et styles home ciblés dans `src/index.css`
- tests de contrat/régression de la home

Réutiliser `UnproLogo`, `BlueprintOverlay`, la scène architecturale existante et les composants AI Elements déjà installés.

## 9. ACTIONS

1. Retirer de la home les sections après le hero et désactiver la section Passeport globale sur cette route.
2. Exclure le dock mobile et son espace de sécurité sur `/` et `/index`, sans changer les autres pages.
3. Recomposer le header public aux proportions de la référence, avec FR/EN sans pilule.
4. Ajuster la hauteur, les espacements, les ruptures de titre et les couches architecturales du hero.
5. Recomposer le panneau Clara en verre poli et compact, sans changer ses actions réelles.
6. Vérifier l’ouverture exclusivement au clic du micro et la fermeture complète par X.
7. Ajuster CSS et cadrage après comparaison côte à côte avec l’image de référence.

## 10. CONSTRAINTS

- Aucun nouveau projet, route, backend ou flux parallèle.
- Aucun asset généré et aucune intégration directe de la capture de référence.
- Aucun changement aux données, à l’authentification ou au comportement métier de Clara.
- Aucun contrôle interne/admin sur la home publique.
- Aucun faux avis, score, ville, chiffre ou claim.
- Aucun débordement horizontal ni chevauchement.

## 11. SUCCESS

- La composition desktop est immédiatement reconnaissable comme la même direction que la référence.
- À 375 px et 412 px, le header tient sur une ligne et le hero conserve la hiérarchie demandée sans dock ni collision.
- Le panneau Clara reste entièrement utilisable en tablette et desktop.
- Le premier chargement n’affiche aucun panneau Clara Voice.
- Un clic micro ouvre le vrai flux vocal; X le ferme et restaure la home.
- Envoi, fichier, langue, profil et hamburger restent fonctionnels.
- Typecheck, tests ciblés, lint critique et build passent; aucune erreur runtime liée au correctif.

## 12. TASKS

- [ ] Simplifier la home au hero et à sa transition sombre.
- [ ] Masquer dock, espace dock et contenu Passeport sur cette route seulement.
- [ ] Raffiner header, hero, panneau Clara et capsule selon la référence.
- [ ] Ajouter les régressions automatisées de visibilité et d’interaction.
- [ ] Vérifier 375, 412, tablette et desktop avec captures comparatives.
- [ ] Valider envoi, pièce jointe, micro, fermeture Voice, FR/EN, profil et menu.
- [ ] Exécuter les contrôles de qualité et corriger jusqu’à conformité.
