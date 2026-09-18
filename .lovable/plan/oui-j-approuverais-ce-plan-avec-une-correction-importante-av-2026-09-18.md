&nbsp;

# Oui. J’approuverais ce plan, avec une correction importante avant exécution : paused doit réellement couper la session vocale fournisseur, pas seulement changer l’UI.



# Sinon, même si l’application affiche « En pause », l’agent externe peut continuer à considérer la session active et recommencer à parler — exactement le problème actuel.



# Ajoute ceci avant Approve :



# > P0 — PAUSE = SILENCE TECHNIQUE RÉEL



# Le nouvel état paused ne doit pas être uniquement un état visuel.



# Lors du passage :



# listening / awaiting_user → paused



# exécuter réellement :



# arrêter/couper le microphone;



# arrêter SpeechRecognition/VAD local;



# couper immédiatement tout TTS;



# annuler tous les timers et callbacks;



# empêcher tout nouvel événement audio de modifier le chat;



# terminer ou suspendre réellement la session temps réel du fournisseur vocal, selon l'API disponible.





# Si le fournisseur ne possède pas de véritable fonction pause, terminer sa session Voice est préférable à la laisser ouverte.



# Important : terminer une session Voice ne termine PAS la conversation Clara.



# Il faut distinguer :



# canonical Clara conversation_id

# ≠

# temporary voice-provider session_id



# Au toucher de :



# En pause — toucher pour reprendre



# créer/reprendre le transport Voice nécessaire, mais reconnecter immédiatement celui-ci à la même conversation Clara canonique, avec :



# même conversation_id;



# même current_step;



# même question en attente;



# mêmes références métier;



# aucun nouveau Bonjour;



# aucune répétition de question déjà répondue.





# Source du « Il semble que vous ne soyez plus là »



# Identifier précisément :



# application | prompt agent | provider inactivity behavior | SDK



# et fournir la preuve dans le rapport.



# Si c'est une règle/configuration du fournisseur, la désactiver à sa source.



# Ne pas simplement essayer de couvrir sa voix avec un changement d'état frontend.



# Inactivité



# Pour ONE CLARA, privilégier le silence :



# première ouverture sans parole : éventuellement une seule relance;



# conversation déjà commencée : aucune phrase du type “vous êtes toujours là ?”;



# après inactivité suffisante : pause silencieuse.





# Une notification visuelle suffit :



# En pause — toucher pour reprendre



# Test décisif



# Laisser le téléphone complètement silencieux pendant 2 minutes.



# Après passage en pause :



# aucune nouvelle parole;



# aucun appel audio;



# aucun message ajouté;



# aucun microphone actif;



# aucun timer qui redémarre Voice;



# aucune activité réseau Voice persistante injustifiée.





# Puis toucher Reprendre.



# Clara doit poursuivre exactement au même endroit, pas recommencer.







# Un autre détail que je changerais



# Le 1,2–1,8 seconde de silence pour déterminer la fin d'une phrase peut être un peu agressif. Une personne peut naturellement hésiter :



# > « Mon balcon est… [pause] …en fibre de verre. »







# Je demanderais à Lovable de mesurer le VAD/endpointing réellement utilisé par le fournisseur avant de fixer une valeur arbitraire. Le critère devrait être : assez rapide pour être naturel, mais sans couper les pauses normales.



# Et personnellement, après une conversation déjà commencée, je supprimerais même le « Je vous écoute » vocal après 8–10 secondes. L'orbe peut simplement indiquer visuellement qu'elle écoute. Si rien ne vient, elle se met en pause sans rien dire.



# C'est beaucoup plus proche du comportement recherché : Clara parle quand elle a quelque chose d'utile à dire; sinon elle sait se taire.P0 — Cycle de vie de Clara Voice : finir, se taire, se mettre en pause

Objectif : la voix a un début, une fin et une pause claire. Un silence n'est jamais traité comme une erreur, et Clara ne commente jamais l'absence de l'utilisateur.

## Ce que l'inspection montre aujourd'hui

- La phrase « Il semble que vous ne soyez plus là » **n'existe nulle part dans le code du projet**. Elle est donc prononcée par l'agent vocal lui-même (comportement configuré côté fournisseur), pas par l'application. Retirer un message côté écran ne la ferait pas disparaître : la première tâche est de confirmer sa source réelle avant de corriger.
- Il n'existe **aucun minuteur d'inactivité** côté application, et l'état « en pause » **n'existe pas** dans la machine à états vocale (`idle → … → speaking → awaiting_user`, plus erreurs et fermeture). Rien ne peut donc calmer la session après un long silence.
- La fermeture nettoie déjà plusieurs minuteurs, la voix de secours et la session, mais le minuteur de relance d'ouverture n'y est pas annulé, et l'arrêt de la session n'est déclenché que si elle est considérée active.
- La continuité ONE CLARA (même conversation, transcriptions conservées) est déjà en place et doit rester intacte.

## Travail proposé

### 1. Confirmer la source de la phrase (avant toute correction)

Lire la configuration réelle de l'agent vocal et les règles de comportement stockées. Si la phrase vient de l'agent, corriger sa consigne : un silence n'est jamais commenté, jamais nommé, jamais répété. Si elle vient d'une règle en base, la remplacer. Aucune correction cosmétique tant que la source n'est pas prouvée.

### 2. Ajouter un vrai état « en pause »

Ajouter `paused` à la machine à états, avec les transitions autorisées et la reprise. La pause ne ferme pas la conversation : même fil, mêmes transcriptions, même identifiant.

### 3. Minuteur d'inactivité unique et prévisible

Un seul minuteur actif à la fois, remis à zéro à chaque parole, chaque réponse et chaque changement d'état :

- ouverture sans aucune parole : une seule courte relance (« Je vous écoute. ») après environ 8–10 s;
- toujours rien 15–20 s plus tard : passage automatique en pause, silencieux;
- après une réponse de Clara : silence prolongé → pause directe, sans relance répétée.
Jamais deux relances, jamais de nouvelle boucle après la pause.

### 4. Écran de pause apaisé

L'orbe se calme et affiche simplement :

```text
En pause — toucher pour reprendre
```

Toucher l'orbe reprend la même conversation, sans salutation ni question déjà posée.

### 5. Fermeture immédiate et complète

Sur le bouton X : micro coupé, écoute coupée, voix coupée, tous les minuteurs annulés (dont celui de relance d'ouverture, oublié aujourd'hui), rappels en attente neutralisés, session terminée sans condition. Aucune parole, aucun son, aucun minuteur ne survit à la fermeture.

### 6. Interruption naturelle et fin de tour

Vérifier le comportement réel d'interruption pendant que Clara parle et la détection de fin de réponse (~1,2–1,8 s de silence). Corriger seulement ce qui est mesuré comme fautif, sans réécrire la couche vocale qui fonctionne.

### 7. Ouvertures/fermetures répétées

Une seule session vocale active en permanence. Vérifier par cycle ouvrir/fermer répété qu'aucun écouteur ni minuteur ne s'empile.

## Détails techniques

- Fichiers visés : `src/stores/alexVoiceLockedStore.ts` (état `paused`, transitions, fermeture), `src/components/voice/OverlayAlexVoiceFullScreen.tsx` (minuteur unique, écran de pause, nettoyage complet), `src/hooks/useLiveVoice.ts` (arrêt inconditionnel, interruption), configuration de l'agent vocal (consigne « ne jamais commenter un silence »).
- Aucune nouvelle table, aucune nouvelle route, aucune seconde couche vocale, aucune duplication de conversation.
- Les correctifs ONE CLARA récents (reprise canonique, transcriptions vocales dans le chat, restauration après rechargement) restent intacts et couverts par leurs tests.
- Nouveaux tests de régression : un seul minuteur actif, pause après inactivité sans relance répétée, fermeture qui coupe tout, réouverture sans nouvel identifiant de conversation.

## Tests réels

Sur mobile Android, en conditions réelles : parole normale, pause de 3 s au milieu, silence de 30 s, fermeture pendant que Clara parle, interruption de Clara, passage en arrière-plan, écran verrouillé puis retour, cinq cycles ouvrir/fermer, réseau lent ou perdu.

## Critères de réussite

- Clara ne parle jamais seule en boucle et ne commente jamais un silence.
- Une inactivité mène à la pause, pas à un avertissement répété.
- Le X arrête tout immédiatement : aucun micro, aucune voix, aucun minuteur restant.
- Aucun nouvel identifiant de conversation; les transcriptions précédentes restent dans le chat.