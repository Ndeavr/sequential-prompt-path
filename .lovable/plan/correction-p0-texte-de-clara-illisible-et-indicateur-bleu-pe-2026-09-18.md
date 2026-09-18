&nbsp;

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

Oui. Quand Clara pose une question avec 2 à 6 réponses plausibles, demander à l’utilisateur de retaper la réponse ajoute une friction inutile.

&nbsp;

Pour ton exemple, juste sous la question :

&nbsp;

Votre balcon est en quel matériau ?

&nbsp;

Bois Béton Fibre de verre Je ne sais pas

&nbsp;

Un tap doit envoyer immédiatement la réponse dans la même conversation, exactement comme si l’utilisateur l’avait écrite.

&nbsp;

Envoie ceci à Lovable :

&nbsp;

> UX PRIORITAIRE — réponses rapides contextuelles dans Clara

&nbsp;

Lorsqu’une question Clara possède un nombre limité de réponses possibles, afficher automatiquement des choix cliquables sous le message assistant.

&nbsp;

L’utilisateur ne doit pas avoir à retaper une réponse évidente.

&nbsp;

Exemple actuel :

&nbsp;

Clara : « Est-ce que votre balcon est en bois, en béton ou en fibre de verre ? »

&nbsp;

Afficher :

&nbsp;

[ Bois ]  [ Béton ]  [ Fibre de verre ]  [ Je ne sais pas ]

&nbsp;

Comportement

&nbsp;

Au tap :

&nbsp;

envoyer immédiatement cette valeur comme message utilisateur;

&nbsp;

l’afficher dans la conversation;

&nbsp;

conserver exactement le même conversation_id;

&nbsp;

lancer le prochain tour Clara;

&nbsp;

désactiver les anciens choix pour éviter les doubles réponses;

&nbsp;

ne jamais créer de nouvelle session;

&nbsp;

ne pas obliger à appuyer ensuite sur Send.

&nbsp;

&nbsp;

Règle Clara

&nbsp;

Générer des quick replies lorsqu’une question présente :

&nbsp;

oui / non;

&nbsp;

2 à 6 options;

&nbsp;

matériau;

&nbsp;

type de propriété;

&nbsp;

niveau d’urgence;

&nbsp;

fourchette de budget;

&nbsp;

disponibilité;

&nbsp;

taille/catégorie;

&nbsp;

préférence clairement limitée.

&nbsp;

&nbsp;

Toujours conserver une sortie lorsque nécessaire :

&nbsp;

[ Autre ] ou [ Je ne sais pas ]

&nbsp;

Si l’utilisateur choisit Autre, placer le focus automatiquement dans le champ texte.

&nbsp;

Important

&nbsp;

Ne pas essayer de détecter les choix uniquement en parsant le texte final de Clara.

&nbsp;

Faire retourner au composant Clara une structure facultative, par exemple :

&nbsp;

message

quick_replies[]

input_mode

&nbsp;

Clara décide donc elle-même quand une question possède des réponses fermées.

&nbsp;

Si quick_replies est vide, garder l’input texte normal.

&nbsp;

UI

&nbsp;

Les choix doivent être :

&nbsp;

gros et faciles à toucher sur mobile;

&nbsp;

wrap automatiquement sur plusieurs lignes;

&nbsp;

contraste élevé;

&nbsp;

cohérents avec le design premium UNPRO;

&nbsp;

utilisables au clavier;

&nbsp;

accessibles;

&nbsp;

sans provoquer de scroll horizontal.

&nbsp;

&nbsp;

Une fois sélectionné :

&nbsp;

état visuel sélectionné;

&nbsp;

empêcher le double tap;

&nbsp;

conserver le choix dans l’historique;

&nbsp;

poursuivre immédiatement.

&nbsp;

&nbsp;

Tests

&nbsp;

Tester au minimum :

&nbsp;

Réparer un balcon → Clara : matériau ? → tap Bois → Clara poursuit sans saisie manuelle.

&nbsp;

Puis au moins 5 questions consécutives avec mélange de :

&nbsp;

quick replies;

&nbsp;

saisie libre;

&nbsp;

Autre;

&nbsp;

Je ne sais pas;

&nbsp;

refresh;

&nbsp;

back/forward.

&nbsp;

&nbsp;

Acceptance: aucune question à choix limité ne doit obliger l’utilisateur à retaper une réponse proposée par Clara.

&nbsp;

&nbsp;

&nbsp;

Et j’irais même un peu plus loin : les boutons ne devraient pas être de simples liens décoratifs, mais de vraies réponses conversationnelles. Autrement dit, quand tu touches « Bois », l’historique doit montrer ensuite ton message « Bois », puis Clara continue normalement. Cela garde la conversation compréhensible et exploitable par la mémoire.