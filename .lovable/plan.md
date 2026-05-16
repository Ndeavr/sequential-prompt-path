## Problème

Le Voice Lab affiche "Lecture impossible — fallback voix par défaut." Les tests FR/EN ne jouent jamais l'audio.

**Cause racine** : `supabase.functions.invoke()` tente de parser la réponse en JSON par défaut. L'edge function `alex-voice-test` retourne du binaire MP3 (`audio/mpeg`), donc le `Blob` reconstruit côté client est corrompu — `audio.onerror` se déclenche systématiquement.

Bonus : l'edge function utilise `@supabase/supabase-js@2.99.0` au lieu de la version verrouillée `2.49.1` (mémoire projet : règle anti-microtask Deno).

## Fix

### 1. `src/pages/admin/PageVoiceLab.tsx`
Remplacer `supabase.functions.invoke` par un `fetch` direct vers l'edge function qui récupère la réponse en `Blob` brut (pattern documenté dans elevenlabs-tts).

```ts
const resp = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/alex-voice-test`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ voice_id, language, test_text, stability, similarity_boost, style, speed }),
  }
);
if (!resp.ok) throw new Error(`TTS ${resp.status}`);
const blob = await resp.blob();
```

Ajouter aussi un `await audio.play().catch(...)` propre + log du `voiceId` dans la console si erreur (debug).

### 2. `supabase/functions/alex-voice-test/index.ts`
- Aligner l'import Supabase sur `https://esm.sh/@supabase/supabase-js@2.49.1` (règle mémoire).
- Aucune autre modif logique nécessaire (la fonction renvoie déjà `audio/mpeg` correctement).

### 3. Vérification
- Redéployer l'edge function.
- Tester Sophia FR, Sophia EN, Clara FR depuis `/admin/alex/voice-lab` → l'audio doit jouer sans toast d'erreur.

## Hors scope
Aucune modification de la prod Alex, des overrides ElevenLabs, ou de `alexVoiceConfig.ts`. Fix purement Voice Lab admin.
