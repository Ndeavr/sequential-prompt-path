# Logos officiels UNPRO — remplacement global et publication contrôlée

## 1. Contexte

- Travailler exclusivement sur le projet UNPRO existant au HEAD actuel `5ec0afe…`, choisi comme point de départ autoritatif.
- Conserver l’architecture de marque existante : `BRAND` comme source unique et `UnproLogo` / `UnproIcon` comme composants réutilisables.
- Utiliser uniquement les 10 fichiers officiels joints, sans redessiner, recolorer, étirer ni recadrer la marque.
- Ne modifier aucun prix, texte commercial, parcours, route, permission, paiement, attribution affiliée ou structure de données.

## 2. Objectif

Remplacer toutes les anciennes marques UNPRO, sélectionner automatiquement la bonne variante selon le fond et l’espace disponible, éliminer les doublons, puis publier uniquement après validation complète de l’interface et des six protections P0.

## 3. Livrables

1. **Actifs officiels consolidés**
   - Copier les variantes retenues dans la structure existante `public/assets/brand/` avec des noms sémantiques stables.
   - Préserver transparence, proportions, netteté et marges internes originales.
   - Cartographier les variantes claires, foncées, bleues et l’icône carrée dans `BRAND`.
   - Supprimer seulement les anciens fichiers dont l’absence de référence est prouvée.

2. **Composants canoniques corrigés**
   - Mettre à jour `UnproLogo` et `UnproIcon`, sans créer de composant parallèle.
   - Afficher le wordmark blanc sur fond sombre, noir, photo ou bleu UNPRO.
   - Afficher le wordmark sombre/noir sur fond blanc ou clair.
   - Réserver l’icône seule aux favicons, icônes d’application, petits espaces mobiles et conteneurs carrés.
   - Empêcher tout affichage simultané du wordmark complet et d’une icône séparée.
   - Conserver le choix explicite `tone` et le choix automatique du thème existant.

3. **Remplacement global**
   - Rebrancher les en-têtes, menus mobiles, auth, onboarding, tableaux de bord, profils publics, pages affiliées, activation/paiement, admin/CRM, chargements et états vides sur la source canonique.
   - Remplacer les URL de logo codées en dur dans les données structurées et métadonnées par la source canonique lorsque le contexte le permet; garder la copie statique de `index.html` synchronisée.
   - Mettre à jour les gabarits courriel existants avec l’actif officiel hébergé sur `https://unpro.ca`, sans créer un second stockage et sans envoyer de courriel.
   - Laisser intact le système distinct des logos d’entrepreneurs et partenaires.

4. **Favicon, PWA et partage**
   - Régénérer favicon, Apple Touch, Android/PWA et maskable depuis l’icône officielle, avec redimensionnement proportionnel et marge sûre.
   - Synchroniser `index.html` et `manifest.webmanifest`.
   - Vérifier les métadonnées sociales existantes; ne pas remplacer l’image de partage éditoriale par un simple logo si elle demeure valide.

## 4. Garde-fous P0

Avant et après la modification, vérifier sans modifier leur logique :

- permissions RPC et rôles;
- attribution affiliée, y compris alias et persistance;
- routes d’activation payée;
- enregistrement des sessions/transactions Stripe;
- choix du rôle avant connexion et restauration après auth;
- statuts publics de vérification professionnelle.

Ajouter seulement des tests de non-régression de marque ou de résolution d’actifs si la couverture existante ne peut pas détecter une image cassée ou un doublon.

## 5. Validation

1. Exécuter le typecheck, le lint ciblé des fichiers touchés, les tests ciblés P0, la suite automatisée complète et le build de production.
2. Vérifier les références : aucun ancien logo actif, aucun chemin cassé, aucun actif officiel dupliqué ou combiné incorrectement.
3. Vérifier par navigateur à 390 px et sur bureau :
   - accueil et navigation mobile;
   - connexion et onboarding;
   - profil public entrepreneur;
   - route affiliée connue et route inconnue;
   - activation sans déclencher d’envoi ou paiement;
   - principaux tableaux de bord avec session autorisée;
   - surfaces claires et sombres.
4. Contrôler le DOM, les images chargées, les proportions, le contraste, les chevauchements, les changements de mise en page, les erreurs console et le badge QA mobile.
5. Vérifier que les favicons et chaque icône déclarée dans le manifeste répondent correctement.

## 6. Publication conditionnelle

- Lire le scan de sécurité actuel et relancer un scan s’il est absent ou périmé.
- Ne publier que si tous les contrôles sont verts et qu’aucun constat critique ne bloque la livraison.
- Après déclenchement de la publication, attendre le déploiement puis tester en production : accueil, profil public, affilié, activation et connexion.
- Si un contrôle échoue, réparer puis rejouer le contrôle; si le blocage est externe, arrêter sans publier et nommer précisément le blocage.

## 7. Succès

- Une seule source officielle de marque et aucun ancien logo actif.
- Variante correcte sur chaque fond, sans doublon, déformation ni image cassée.
- Mobile, bureau, thème clair et thème sombre validés.
- Six protections P0 inchangées et tests verts.
- Production publiée et smoke-testée uniquement après validation.
- Rapport final avec SHA réel, statut de publication, pages contrôlées et éventuels constats non bloquants.
