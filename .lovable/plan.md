# Correction production — chat mobile et Clara Voice intégrée

## Objectif
Réparer la carte Clara sur la page d’accueil mobile et faire habiter Clara Voice dans cette même expérience visuelle, sans nouvelle session, table, route, fonction serveur ni moteur vocal parallèle.

## Correctifs
1. **Carte mobile défilable**
   - Transformer uniquement la carte Clara en colonne flexible avec `min-height: 0`.
   - Garder le défilement vertical dans l’historique seulement; maintenir le composer au bas de la carte.
   - Assouplir les hauteurs fixes et l’overflow du hero afin que la page continue vers les modules suivants.
   - Utiliser les unités dynamiques et la safe area; compenser le clavier via `visualViewport` et recentrer le composer au focus.

2. **Voice dans la carte existante**
   - Réutiliser exclusivement `AlexVoiceContext`, `useLiveVoice`, le store vocal et `claraVoiceBridge` existants.
   - Ouvrir la voix de la home en mode intégré explicite, sans takeover plein écran ni historique visuel séparé.
   - Afficher dans la carte les états réels : connexion, écoute, réflexion, parole, pause, fin et erreur, avec reprise/fermeture accessibles.
   - À la fermeture, conserver les messages canoniques et arrêter proprement micro, TTS, timers, provider et callbacks; ne jamais relancer automatiquement.

3. **Continuité multimodale**
   - Préserver le menu `+`, la file média, les photos, vidéos, documents, analyses et références P1 existantes.
   - Conserver un seul `conversation_id`, le même historique chronologique et la déduplication texte↔voix.
   - Maintenir la création de nouvelle conversation, les réponses rapides et les workflows réels.

4. **Accessibilité et instrumentation**
   - Préserver clavier, focus visible, labels, contraste et mouvement réduit.
   - Ajouter les événements demandés au logger existant, sans données privées ni nouvel entrepôt analytique.

## Validation
- Tests ciblés : mode vocal intégré, même session/historique, fermeture sans relance, nouvelle conversation et médias inchangés.
- Tests de mise en page et de scroll à 360, 390, 412 et 430 px, plus bureau.
- Vérifier que le composer reste atteignable, que l’historique seul défile et que la page atteint les modules suivants.
- Exécuter la suite automatisée, les types et le build via le harnais du projet.
- Documenter comme limite externe tout test matériel Chrome Android, Samsung Internet ou iPhone impossible dans l’environnement.

## Garde-fous techniques
- Autorité conversationnelle inchangée : `alex_sessions` + `alex_messages`; `clara-session` reste l’accès canonique.
- Aucun changement Stripe, auth, RLS, données production ou fonctions serveur.
- Aucun résultat simulé; tout moteur indisponible reste expliqué dans la conversation avec la prochaine action réelle.
- Aucun des correctifs P0/P1 précédents ne doit régresser.
