# Correction P0 — texte de Clara illisible et indicateur bleu permanent

## Diagnostic vérifié dans le code

La réponse de Clara est bien générée, reçue et insérée dans la page. Le problème est uniquement l'état visuel final.

1. **Texte assistant quasi invisible**
   `MessageContent` (composant AI Elements, `src/components/ai-elements/message.tsx`) applique à chaque message assistant la couleur globale du thème (`text-foreground`). Sur `/`, le thème est sombre : cette couleur est presque blanche. Or la boîte Clara est un panneau blanc. Résultat : texte blanc sur fond blanc. La correction existante dans `src/index.css` (`.home-clara-conversation [class*="text-foreground"]`) a la même force que la règle du composant, donc elle ne gagne pas de façon fiable.

2. **Les trois barres bleues restent toujours actives**
   Ce n'est pas un loader lié à l'état : `home-clara-presence` (`ClaraConversationBox.tsx` ligne 299) est un élément décoratif permanent avec une animation infinie (`clara-wave`), affiché en continu, même au repos et après la fin de la réponse. Il est donc perçu comme un traitement qui ne se termine jamais.

3. **Indicateur « Analyse en cours… »**
   Le composant `Shimmer` rend son texte en `text-transparent` avec un dégradé basé sur la couleur de fond sombre du thème : sur le panneau blanc, il est lui aussi difficilement lisible.

L'état `busy` est bien remis à `false` dans le bloc `finally` du flux, y compris en cas d'erreur. Le champ de saisie se réactive donc déjà ; le blocage ressenti vient de l'indicateur visuel permanent. Ceci sera vérifié par un vrai test de 5 échanges consécutifs avant de déclarer la correction terminée.

## Corrections

### 1. Lisibilité définitive du texte
- Forcer, dans le contexte de la boîte Clara uniquement, une couleur de texte sombre lisible pour les messages assistant, en s'assurant que la règle prime sur celle du composant AI Elements (portée plus précise, pas de `!important` global).
- Garantir `opacity: 1` sur le message assistant final et retirer tout héritage de transparence.
- Conserver la bulle utilisateur bleue avec son texte clair (contraste vérifié).
- Adapter la couleur du texte « Analyse en cours… » et des messages d'erreur au panneau clair.

### 2. Indicateur de traitement réellement lié à l'état
- L'élément décoratif des trois barres reçoit un état : animé uniquement pendant `busy`, statique et discret au repos.
- Il est marqué `aria-hidden` (déjà le cas) et ne doit plus suggérer un traitement en cours après la réponse.
- Aucun masquage cosmétique : c'est l'état qui pilote l'animation.

### 3. Finalisation explicite du tour de conversation
- À la fin du flux : message assistant persisté, texte final appliqué, `busy = false`, mode remis à sa valeur utile, champ de saisie réactivé, focus rendu au champ pour permettre immédiatement le message suivant.
- Même comportement garanti dans le chemin d'erreur.

### 4. Test de régression
Nouveau test ciblé qui vérifie, après un premier tour simulé :
- le message assistant est présent et visible ;
- aucune classe de transparence ou d'animation de streaming ne subsiste sur le message final ;
- l'indicateur de traitement n'est plus en état actif ;
- le champ de saisie est réactivé ;
- un deuxième message peut être envoyé dans la même conversation (même identifiant de session).

### 5. Vérification réelle
- Parcours mobile 390 px : 5 échanges consécutifs, lecture des messages, absence d'erreurs console/réseau, aucun débordement horizontal.
- Contrôle du contraste réel du texte assistant et de la bulle utilisateur.

## Portée
- Fichiers touchés : `src/components/home-light/ClaraConversationBox.tsx`, `src/index.css`, un fichier de test.
- Aucune modification du moteur de conversation, de la session canonique, des raccords P1, de Stripe, des données ou du backend.
- Aucune publication automatique.
