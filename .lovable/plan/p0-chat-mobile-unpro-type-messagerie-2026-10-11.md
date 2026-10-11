# P0 — Chat mobile UNPRO type messagerie

## Résultat
Transformer la surface Clara active de `/` et `/index` en un cadre mobile stable de type messagerie, réutilisé par l’onboarding entrepreneur intégré, sans modifier la logique métier ni créer un second chat.

## État vérifié
- La route active rend `PageHomeLight → HeroHomeownerLight → ClaraConversationBox`; `ClaraContractorFlow` vit déjà dans ce même fil.
- Le gestionnaire global `useKeyboardAwareViewport` publie la hauteur et l’offset réels de `VisualViewport` avec nettoyage des écouteurs.
- La carte utilise encore une colonne flex, trois commandes positionnées au-dessus du fil et une marge compensatoire; ce montage peut recouvrir ou réduire les messages.
- Le menu média est positionné dans la carte `overflow-hidden`, sans portail; augmenter son z-index ne peut pas empêcher sa coupure.
- Le suivi du dernier message respecte déjà la lecture manuelle et l’identité stable des messages; ces acquis seront conservés.

## Correctifs
1. **Cadre unique à trois rangées**
   - Structurer `ClaraConversationBox` en `auto / minmax(0, 1fr) / auto` : barre compacte, fil central, compositeur.
   - Déplacer les commandes histoire, dossier et nouvelle conversation dans la rangée haute; regrouper les actions secondaires dans un menu accessible sur petit écran.
   - Garder voix, médias, saisie, micro et envoi dans la rangée basse mesurée; seule la zone centrale défile et se réduit.
   - Retirer les marges, pseudo-bandeaux, hauteurs concurrentes et réserves artificielles qui compensent actuellement les commandes flottantes.

2. **Clavier et continuité**
   - Conserver un seul propriétaire global de `VisualViewport`, incluant `height`, `offsetTop`, `resize`, `scroll`, orientation et nettoyage.
   - Supprimer le gestionnaire local inutilisé et toute compensation Clara redondante; ne jamais compenser la barre Publish de l’éditeur.
   - Conserver le même composant et le même état quand le grand titre marketing disparaît au premier engagement; ne jamais autofocusser la saisie à l’arrivée.
   - Maintenir le texte révélé, les transcriptions voix et les choix pendant clavier, rotation et changement texte↔voix, sans remontage ni rejeu.

3. **Menus et voix accessibles**
   - Migrer le menu média et les commandes secondaires vers les composants portalisés existants.
   - Contraindre chaque menu à la hauteur visible avec collision, hauteur maximale et défilement interne; vérifier ouverture vers le haut et vers le bas.
   - Garder l’indicateur vocal dans le chat, compact, avec pause/arrêt accessibles et sans masquer le fil ou le compositeur.

4. **Finition premium fonctionnelle**
   - Réutiliser les tokens UNPRO : contrastes lisibles, surfaces sobres, bordures fines, ombres discrètes et animations courtes avec mouvement réduit.
   - Compacter les espaces décoratifs en conversation, retirer halos excessifs et grands vides, préserver le logo et des cibles tactiles d’au moins 44 px.
   - Présenter suggestions et choix entrepreneur comme des options légères dans la zone centrale, sans débordement horizontal.

## Validation obligatoire
- Étendre les tests ciblés pour garantir les trois rangées, l’unique zone défilante, l’absence de compensations concurrentes, les menus portalisés et la conservation du même fil onboarding/voix.
- Étendre le smoke navigateur à 360×740, 390×844 et paysage : clavier simulé ouvert/fermé, réponse longue en croissance, suggestions multiples, scroll manuel, retour au dernier message, chaque menu, médias, voix interrompue et restauration.
- Vérifier séparément le preview local et le site publié, avec mesures et captures; ne publier qu’après checks propres et autorisation de publication compatible avec les blocages de sécurité en cours.
- Exécuter tests ciblés, types, lint critique et compilation, puis vérifier le journal du harnais.
- Rapporter séparément : Android Samsung/Gboard réel, iOS réel et audio fournisseur. Les marquer **non exécutés** si aucun appareil/service réel n’est accessible; aucune émulation ne sera présentée comme preuve matérielle.

## Garde-fous
- Aucun changement aux prix, paiements, acquisition, données, permissions, routes ou logique de Clara.
- Aucun nouveau composant de conversation, moteur vocal ou parcours d’onboarding.
- Ne pas déclarer le P0 terminé sur la seule base du build ou d’un test DOM simulé.
