<final-text>
Objectif immédiat: réparer le bouton “Écouter” sur la page admin voix.

1. Diagnostic confirmé
- Le problème n’est pas ElevenLabs ni le backend dans ce cas précis.
- Sur `/admin/alex/voice`, le bouton `Écouter` de `CardVoiceCandidatePreview` appelle seulement `onPreview={() => setSelectedProfileId(p.id)}`.
- Donc le clic sélectionne un profil, mais ne lance aucun test audio.
- Le session replay montre bien les clics, et les logs réseau ne montrent aucun appel `alex-voice-test` au moment du clic.
- Le même défaut existe aussi dans `PanelFrenchPronunciationBench`: le bouton Play est visuel mais n’a pas de vraie logique de lecture.

2. Ce que je vais construire
- Brancher un vrai flux de preview audio sur `/admin/alex/voice`.
- Réutiliser le pipeline déjà existant et plus fiable de `/admin/voice-control`:
  - appel à la fonction `alex-voice-test`
  - récupération du blob audio
  - lecture via `alexAudioChannel`
- Ajouter un état UX clair:
  - `loadingId`
  - `playingId`
  - bouton désactivé pendant chargement
  - stop/replay propre
  - toast d’erreur si le test échoue
- Corriger aussi le banc de prononciation pour que son bouton Play fonctionne réellement.

3. Fichiers à modifier
- `src/pages/admin/alex/PageAdminAlexVoice.tsx`
  - remplacer le faux `onPreview` par un vrai handler async de preview
  - garder `selectedProfileId` pour l’onglet tests, mais séparer sélection et playback
  - suivre l’état du profil en cours de lecture
- `src/components/alex-voice-engine/CardVoiceCandidatePreview.tsx`
  - accepter des props du type `isLoading`, `isPlaying`, `onStop`
  - afficher un état visuel premium cohérent
- `src/components/alex-voice-engine/PanelFrenchPronunciationBench.tsx`
  - connecter le bouton Play à la même logique de test audio
- éventuellement extraire une logique commune dans un hook/service réutilisable
  - ex. `useAlexVoicePreview`
  - pour éviter la duplication avec `AdminVoiceControlPage`

4. Comportement attendu après correctif
- Tap sur “Écouter”:
  - stoppe tout audio en cours
  - appelle `alex-voice-test`
  - joue immédiatement le résultat
  - met à jour l’UI en “lecture”
- Tap sur un autre profil:
  - coupe le précédent
  - joue uniquement le nouveau
- Si erreur:
  - aucun fallback silencieux
  - message clair affiché
- La sélection de profil continue d’alimenter l’onglet “Tests prononciation”.

5. Détails techniques
- Aucune migration backend nécessaire pour ce bug.
- La cause est purement frontend: wiring incomplet.
- Je vais m’aligner sur le pattern déjà fonctionnel de `AdminVoiceControlPage` au lieu d’inventer une nouvelle voie.
- J’ajouterai aussi un petit cleanup du warning `Badge`/`ref` si nécessaire, pour réduire le bruit console, mais ce n’est pas la cause principale de “Not playing”.

6. Validation prévue
- Vérifier `/admin/alex/voice` sur mobile:
  - chaque carte “Écouter” joue vraiment
  - un seul audio à la fois
  - changement de carte = interruption propre
- Vérifier l’onglet “Tests prononciation”
- Vérifier qu’aucun clic n’est silencieux sans feedback
- Vérifier que le flow ne casse pas Alex existant ni `alexAudioChannel`

7. Résultat visé
- Le bouton “Écouter” devient un vrai preview audio production-ready.
- La page admin voix n’est plus un faux sélecteur passif.
- Le test de voix devient déterministe, visible et cohérent avec la logique audio centrale d’UNPRO.
</final-text>