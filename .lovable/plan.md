# Réparer le parcours Clara (P0 + P1)

Objectif : rendre le parcours réel fonctionnel de bout en bout — comprendre, enregistrer la maison, agir — sans refonte visuelle, sans nouvelle architecture, sans donnée simulée.

## Ce qui a été vérifié dans le code actuel

- Le minuteur d'inactivité vocal existe déjà dans `OverlayAlexVoiceFullScreen.tsx` (indice visuel puis pause réelle). Il n'a **pas** d'état terminal : une conversation terminée reste « écoutante » et se réarme à chaque changement d'état. Les phrases de relance viennent aussi de `useAlexSilenceControl.ts`, `useAlexConversationControl.ts` et du prompt agent — trois sources à aligner.
- `alex-best-match-select` renvoie des **entrepreneurs fictifs** (`mock-c1`, noms générés) lorsqu'aucun entrepreneur réel n'est trouvé. C'est la cause directe de recommandations non fondées et du message générique « je vais envoyer votre demande ».
- Les briques existent déjà et seront réutilisées : `alex-no-match-handle` (cas sans entrepreneur), `create-appointment-from-match` (rendez-vous authentifié), `send-otp` / `verify-otp` / `PhoneOtpForm`, `AddressVerifiedInput`, fonctions propriété existantes.
- Le téléversement passe par la file unique `claraMediaQueue` → `alexUploadService` → analyse visuelle. Les entrées caméra/galerie existent. La panne exacte reste à reproduire avant correction.
- Les règles de contraste existent sous `.home-light`. La cause exacte du texte blanc sur blanc de la capture doit être reproduite avant correction (probablement un état ou une surface hors de cette portée).

## 1. Fin de conversation vocale (P0)

- Ajouter un état terminal explicite à la machine vocale existante : `completed`, `cancelled`, `timed_out` en plus des états actuels.
- Une seule relance d'inactivité par tour actif, puis arrêt. Plus jamais de boucle.
- À l'état terminal : arrêt du micro, du TTS, des minuteurs, des relances ; conservation du transcript et des références canoniques ; aucune reprise automatique.
- Phrases de clôture réelles selon l'issue (rendez-vous confirmé, demande enregistrée, projet sauvegardé).
- Aligner les trois sources de relance sur la même règle.

## 2. Enregistrement maison avant action réelle (P0)

- Clara qualifie librement en anonyme. Le dossier maison n'est exigé qu'au moment de créer une demande réelle, un projet réel ou un rendez-vous.
- Transition annoncée dans la conversation, puis réutilisation des écrans existants : téléphone + OTP, adresse validée, consentement, création ou association de la propriété.
- Aucune seconde inscription, aucune propriété ni projet en double.
- Retour exact au même point : même conversation, mêmes photos, même projet, mêmes identifiants. Reprise annoncée par Clara, sans reposer de questions.

## 3. Routage après jumelage (P0)

- Supprimer la solution de repli fictive de `alex-best-match-select` : plus aucun entrepreneur inventé.
- Entrepreneur réel et admissible → proposition de rendez-vous d'estimation avec disponibilités réelles, revalidation serveur, création via la fonction existante.
- Entrepreneur admissible mais sans disponibilité lisible → demande de disponibilité réelle, jamais d'heure inventée.
- Aucun entrepreneur admissible → parcours sans-jumelage existant, avec le projet qualifié complet.
- Entrepreneur non admissible (territoire, spécialité, licence/conformité) → exclusion ferme, poursuite du jumelage ou repli sans-jumelage.

## 4. Photos (P0)

- Reproduire d'abord la panne réelle (caméra et galerie, mobile et ordinateur) avant toute modification.
- Corriger le chemin existant : sélection → aperçu image → envoi avec progression → stockage → référence canonique → analyse → identifiant d'analyse conservé → contexte du projet mis à jour → persistance après rafraîchissement.
- Aperçu image affiché comme image, jamais « Document joint ».
- Messages d'erreur réels pour caméra refusée et envoi échoué, avec réessai et retrait.
- Stockage, RLS, propriété et provenance inchangés.

## 5. Lisibilité (P1)

- Reproduire l'état exact de la capture, puis corriger le contraste des messages de Clara dans tous les états : repos, parole, analyse, pièces jointes, transition d'inscription, projet, jumelage, rendez-vous.

## Détails techniques

- Conversation canonique inchangée : `alex_sessions`, `alex_messages`, fonction `clara-session`. Références conservées : conversation, propriété, projet, analyses visuelles, analyses de soumissions, vérifications, jumelage, rendez-vous, entrepreneur.
- Aucune nouvelle table, route, fonction ou architecture de session. Réparation des modules existants uniquement.
- Aucun changement Stripe en production, aucun débit, aucun envoi SMS ou courriel non sollicité.
- Si un moteur réel ou une donnée admissible manque, Clara affiche l'état réel et la prochaine action possible — jamais un résultat simulé.

## Tests

Parcours complet : fin de session vocale sans relance en boucle ; inscription + OTP + adresse + consentement + propriété avec retour au même point ; entrepreneur trouvé → rendez-vous ; aucun entrepreneur → demande réelle ; photo (ordinateur, mobile, rafraîchissement) ; reprise après authentification. Plus la suite de tests existante, les types et le build.

## Limites connues

La validation matérielle réelle (caméra et clavier sur appareil Android/iPhone physique) ne peut pas être exécutée ici et sera signalée telle quelle.
