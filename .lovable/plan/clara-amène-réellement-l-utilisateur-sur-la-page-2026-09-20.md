# Clara amène réellement l'utilisateur sur la page

Aujourd'hui Clara annonce « Je vous ai ouvert la page » avant de savoir si le changement d'écran a réussi, et le bouton « Ouvrir le formulaire » proposé dans la conversation n'ouvre rien : il est renvoyé comme un simple message texte. Sur mobile, le clavier reste ouvert et le déplacement se perd.

## Ce qui va changer

1. **Une seule fonction d'ouverture.** Clara et le bouton « Ouvrir le formulaire » utilisent exactement le même chemin d'ouverture interne, dans le même onglet (jamais de fenêtre ou d'onglet séparé). Les liens vers des sites externes gardent l'ouverture dans un nouvel onglet.
2. **Parler après, pas avant.** Le message « Je vous ai ouvert le formulaire » n'est écrit qu'une fois l'écran réellement changé. Si l'ouverture échoue : « Je n'ai pas réussi à ouvrir le formulaire. Touchez ici pour continuer. » avec un bouton qui fonctionne.
3. **Bouton d'ouverture fiable.** Quand Clara connaît la destination, elle affiche sous sa réponse un bouton d'action réel (ex. « Ouvrir le formulaire ») relié à la même ouverture, au lieu d'une réponse rapide textuelle inerte.
4. **Mobile.** Avant d'ouvrir : fermeture du clavier, puis la nouvelle page s'affiche en haut, pleine largeur, sans fenêtre superposée coupée.
5. **La conversation survit.** La session Clara et tout le contexte déjà recueilli restent en mémoire; un petit bouton Clara flottant permet de rouvrir le chat depuis le formulaire sans perdre ce qui est saisi.
6. **Retour arrière.** Le bouton Retour du navigateur ramène au chat dans le même état : mêmes messages, aucune nouvelle conversation.
7. **Clara n'explique plus où aller.** Quand la destination existe, elle y amène.

## Détails techniques

- Nouvelle fonction partagée `openClaraDestination(navigate, destination)` dans `src/services/clara/claraNavigation.ts` : blur du champ actif (fermeture clavier), `navigate(path, { state: { fromClara, claraIntent, claraContext } })`, puis vérification que `window.location.pathname` correspond bien à la destination (contrôle après un tick); retourne `{ ok: boolean }`. Aucun `window.open` / `target="_blank"` pour les chemins internes; helper distinct conservé pour les URL externes.
- `ClaraConversationBox.tsx` : supprimer le `setTimeout(600)` qui navigue à l'aveugle. Ordre nouveau — réponse Clara affichée sans phrase d'ouverture → tentative d'ouverture → sur succès, ajout du message canonique de confirmation; sur échec, message d'échec + action visible. Le texte de confirmation/échec est écrit une seule fois dans l'historique canonique (`alex_messages`), pas dupliqué.
- Les réponses rapides qui correspondent à une destination (« Ouvrir le formulaire », etc.) sont converties en action de navigation via un champ `action` porté par le message, au lieu de repasser par `send()`.
- `rewriteGuidance` ne doit plus injecter « je vous y amène » quand aucune ouverture n'a été tentée ou réussie.
- Continuité : `claraSession` reste inchangé; la page de destination monte le bouton flottant Clara existant (`GlobalAlexOverlay` / `AlexGlobalOrb`) avec réouverture du chat hydraté depuis la session canonique. Le retour navigateur réutilise cette hydratation (`hydrated` + `state.messages`) — pas de nouvelle session forcée.
- Le scroll en haut est déjà assuré par `useScrollRestoration`; on ajoute seulement le blur préalable côté Clara.
- Instrumentation : `clara_navigation_attempted`, `clara_navigation_succeeded`, `clara_navigation_failed` (intent + chemin, sans donnée personnelle).
- Tests : extension de `src/test/clara-navigation-guidance.test.ts` — destination réelle du routeur, aucune annonce d'ouverture sans succès, message d'échec + action, bouton CTA passant par la même fonction, aucun `window.open` sur chemin interne. Vérification mobile 390 px sur le parcours « Je veux devenir affilié ».

Aucune nouvelle table, route, fonction serveur ni parcours parallèle.
