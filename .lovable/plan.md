

## Problem

Alex uses the **native audio** model (`gemini-2.5-flash-native-audio-preview-12-2025`) which handles language switching **internally based on system instructions**, not via the `speechConfig.languageCode` parameter. That parameter is ignored by native audio models — it only works with half-cascade models like `gemini-live-2.5-flash`.

The result: Gemini defaults to English speech recognition, so it hears your French words but transcribes/understands them as English gibberish.

## Solution

Two changes are needed:

### 1. Add explicit language instruction to the system prompt (`alexConfig.ts`)

Add a strong language directive at the very top of `ALEX_SYSTEM_INSTRUCTION`:

```
LANGUE OBLIGATOIRE : Tu DOIS parler et comprendre UNIQUEMENT en français. 
Toute entrée audio est en français québécois. 
Réponds TOUJOURS en français. Ne réponds JAMAIS en anglais sauf si l'utilisateur parle clairement en anglais.
RESPOND IN French. YOU MUST LISTEN FOR French audio input.
```

This bilingual directive (FR + EN) ensures the model locks onto French for both input recognition and output generation.

### 2. Remove `languageCode` from native audio config (`alexConfig.ts` + `useLiveVoice.ts`)

Remove `languageCode: "fr-FR"` from `speechConfig` since it's not supported by native audio models and could cause unexpected behavior.

### Files to modify

| File | Change |
|------|--------|
| `src/services/alexConfig.ts` | Add language lock to system instruction top; remove `languageCode` from `ALEX_LIVE_CONFIG.speechConfig` |
| `src/hooks/useLiveVoice.ts` | Remove `languageCode: "fr-FR"` from the connect config |

### Why this works

Google's docs explicitly state: *"Native audio models can switch between languages naturally. You can restrict the languages it speaks by specifying it in the system instructions."* The `language_code` field is documented only for non-native models.

