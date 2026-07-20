## Problème
Sur `/admin/brand-pronunciation`, cliquer **Écouter FR** ou **Écouter EN** affiche toujours :
> Prévisualisation impossible : Aucun audio retourné

## Cause
L'edge function `elevenlabs-tts` retourne un **flux MP3 binaire** (`Content-Type: audio/mpeg`), mais le client `PageAdminBrandPronunciation.playPreview` appelle `supabase.functions.invoke(...)` et lit `data.audioContent` / `data.audio` — champs JSON qui n'existent pas dans cette fonction. Le blob binaire est mal désérialisé, `b64` est `undefined`, l'erreur est levée.

## Correctif (frontend uniquement, 1 fichier)
Aligner la prévisualisation admin sur le même pattern que `useAlexVoicePreview` (fetch direct → blob → `URL.createObjectURL`) :

1. `src/pages/admin/PageAdminBrandPronunciation.tsx` — remplacer `playPreview` :
   - `fetch("${VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts", …)` avec `apikey` + `Authorization: Bearer <VITE_SUPABASE_PUBLISHABLE_KEY>`
   - Body : `{ text: speechText, language: lang }` (déjà passé par `getSpeechText`)
   - Si `!resp.ok` : lire `.text()` et afficher le message
   - Sinon : `await resp.blob()` → `new Audio(URL.createObjectURL(blob))` → `play()`
   - Révoquer l'URL sur `onended`/`onerror` + `setPlayingLang(null)`

Aucun changement backend, aucun changement de schéma, aucun autre fichier touché.

## Vérification
- Ouvrir `/admin/brand-pronunciation`
- Cliquer **Écouter FR** → audio "Bienvenue chez Un Pro…" joue (voix Sophia FR)
- Cliquer **Écouter EN** → audio "Welcome to Hun-pro…" joue
- Aucun toast d'erreur ; le bouton retourne à l'état idle après lecture