# Lancer Alex en VOIX depuis la page d'accueil

## Problème
Sur `/` (composant `HeroSectionAlexFirst`), cliquer sur l'orbe bleue ou le bouton micro ouvre `AlexAssistantSheet` — l'interface CHAT texte. L'utilisateur attend que ces deux contrôles démarrent immédiatement la **session vocale** Alex (overlay plein écran verrouillé déjà existant).

## Cible
- **Orbe principale (150px)** → ouvre la session vocale Alex (full-screen locked overlay).
- **Bouton micro** dans la barre d'input → idem, ouvre la voix.
- **Champ texte + Entrée** + **chips** (Rénover ma cuisine, etc.) → continuent d'ouvrir le chat texte (`AlexAssistantSheet`) avec preset, comme aujourd'hui.
- **Bouton caméra** → inchangé (upload photo).

## Changements

### `src/components/home/HeroSectionAlexFirst.tsx`
1. Importer `useAlexVoice` depuis `@/contexts/AlexVoiceContext`.
2. Récupérer `openAlex` du contexte (renommer en `openVoice` localement pour clarté).
3. Nouveau handler `startVoice()`:
   - Appelle `openVoice("homepage_hero", input.trim() || undefined)` pour transmettre tout texte déjà saisi comme `contextHint`.
   - Le `AlexVoiceContext.openAlex` gère déjà cleanup audio + ouverture de l'overlay vocal verrouillé via `useAlexVoiceLockedStore`.
4. Brancher:
   - `<button onClick={() => openAlex()}>` de l'orbe (ligne 176) → `startVoice()`.
   - `<button onClick={() => openAlex()}>` du micro dans la barre (ligne 253) → `startVoice()`.
5. Conserver:
   - `onSubmit` du formulaire texte → ouvre `AlexAssistantSheet` (chat) avec le texte.
   - `onChipClick` → ouvre `AlexAssistantSheet` (chat) avec preset.
   - Upload photo modal inchangé.
6. Mettre à jour `aria-label` du micro: "Démarrer la conversation vocale avec Alex".

## Notes techniques
- Le composant overlay vocal verrouillé est déjà mondialement monté (via `AlexVoiceProvider`) — aucun nouveau composant à créer.
- La règle Core "Alex Voice Persona Female" + "Voice Connection Stability" reste respectée: on ne touche pas à la config ElevenLabs ni au signed URL.
- Aucune modif backend ou edge function nécessaire.

## Critères de succès
- Tap sur l'orbe sur `/` → l'overlay vocal plein écran s'ouvre, Charlotte (FR) parle.
- Tap sur le micro de la barre → idem.
- Taper du texte + Entrée → ouvre toujours le chat texte (comportement précédent).
- Les chips ouvrent toujours le chat texte avec preset.
