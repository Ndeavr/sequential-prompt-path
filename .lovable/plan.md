

## Problem
The `ALEX_VOICE_SYSTEM_PROMPT` in `supabase/functions/_shared/alex-french-voice.ts` (lines 614-779) is 100% English-only. It literally says "ALWAYS speak English" and all example phrases, flows, and micro-phrases are in English. This is why Alex keeps speaking English.

## Solution
Rewrite the entire system prompt to be **French-first (québécois)**, keeping the same structure and business logic but:

1. **Language section**: Default = français québécois naturel. Switch to English ONLY if user speaks English for 2+ consecutive messages.
2. **Identity**: Masculine, québécois, field experience — all self-references in French.
3. **All example phrases in French**: Welcome, clarification, taking charge, result, close, no-match, objection handling, micro-phrases.
4. **Conversation guardrails in French**: Redirect phrase becomes "Bonne question, mais ma spécialité c'est les services résidentiels. Comment je peux vous aider avec votre propriété?"
5. **Business rules remain identical** — just expressed in French.
6. **Redeploy** the `elevenlabs-conversation-token` edge function.

### Key changes in the prompt:

| Current (English) | New (French) |
|---|---|
| "ALWAYS speak English" | "TOUJOURS parler en français québécois naturel" |
| "Hi. I'm Alex from UnPRO" | "Bonjour. C'est Alex d'UNPRO" |
| "I'm on it." | "Je m'en occupe." |
| "Shall we book it?" | "On le réserve?" |
| "I don't have a verified contractor..." | "J'ai pas encore un entrepreneur validé..." |

### Files modified
- `supabase/functions/_shared/alex-french-voice.ts` — lines 614-779 (system prompt only)

### Deployment
- Redeploy `elevenlabs-conversation-token` edge function

