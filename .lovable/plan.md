

# Alex Premium Female Voice Identity — Full Rebuild

## Summary

Alex is currently a masculine voice identity using ElevenLabs voice `mVjOqyqTPfwlXPjV5sjX` with masculine pronouns and "Homme intelligent" persona throughout the system prompt, TTS functions, and client-side session context. This plan switches Alex to a premium female identity using voice `XB0fDUnXU5powFXDhCwa` (Charlotte — already proven on the Nuclear Close landing), rewrites the entire system prompt and personality layer, updates TTS settings, and aligns all touchpoints.

---

## Technical Details

### Block 1 — Voice Config + TTS Settings (Shared Module)

Update `supabase/functions/_shared/alex-french-voice.ts`:

- Change `ALEX_VOICE_CONFIG.voiceId` from `mVjOqyqTPfwlXPjV5sjX` to `XB0fDUnXU5powFXDhCwa`
- Update voice settings to match user spec:
  - stability: 0.43 (was 0.65)
  - similarity_boost: 0.78 (was 0.80)
  - style: 0.28 (was 0.08)
  - use_speaker_boost: true (unchanged)
- Update profile_a/profile_b accordingly
- Update all comments referencing "masculine" or "Alex masculine voice"
- Rewrite `ALEX_VOICE_SYSTEM_PROMPT` entirely with feminine identity, new personality rules, new conversation feel, premium speech design, trust language, emotional intelligence mode, revenue mode, homeowner/contractor/condo flows, wow moments, memory system, closing language

### Block 2 — TTS Edge Functions (Voice ID Swap)

Update hardcoded voice IDs in:

- `supabase/functions/alex-tts/index.ts` — `PRIMARY_VOICE_ID` and `FALLBACK_VOICE_ID`
- `supabase/functions/alex-voice-speak/index.ts` — fallback voice ID
- `supabase/functions/alex-voice-get-config/index.ts` — config response voiceId
- `supabase/functions/voice-get-config/index.ts` — fallback config voice_id
- `supabase/functions/test-alex-voice/index.ts` — assertion checks
- `supabase/functions/alex-voice-test/index.ts` — fallback voice ID

### Block 3 — Client-Side Session Context

Update `src/hooks/useLiveVoice.ts`:

- Rewrite `buildSessionContext()` for both FR and EN:
  - FR: Feminine persona — "Tu es Alex d'UNPRO. Femme intelligente, calme, élégante..." with new personality rules
  - EN: "You are Alex from UNPRO. Calm, sharp, warm, confident..." matching the spec
- Update default greeting from generic to personality-driven: "Bonjour. Quel projet avance aujourd'hui?" (contextual variants)

### Block 4 — Voice Overlay UX Polish

Update `src/components/voice/OverlayAlexVoiceFullScreen.tsx`:

- Update `buildGreeting()` to use new personality-driven greetings instead of generic "Que puis-je faire pour vous?"
  - With name: "Bonjour {name}. Quel projet avance aujourd'hui?"
  - Without name: "Bonjour. Décrivez votre besoin."
  - With contextHint: "Bonjour. Je vois que vous regardez {hint}. On avance ensemble."
- Update status text labels to match feminine personality
- Update orb visual states descriptions in comments

### Block 5 — Guardrail + Persona Components

Update `src/hooks/useAlexVoicePersona.ts` and `src/components/alex-voice-persona/GuardrailVoiceConsistency.tsx`:

- Change gender references from masculine to feminine
- Update `sanitizeAlexResponse()` forbidden phrases if any masculine-specific patterns exist
- Ensure identity guardrails enforce feminine pronouns: "ravie", "certaine", "prête"

### Block 6 — Nuclear Close Landing Alignment

Update `supabase/functions/pro-landing-tts/index.ts`:

- Charlotte (`XB0fDUnXU5powFXDhCwa`) is already the FR voice here — now it becomes the same as main Alex
- Remove the concept of "separate female voice for nuclear close" since Alex IS female everywhere

### Block 7 — Memory Updates

- Rewrite `mem://ai/alex/voice-persona-male` → rename to `mem://ai/alex/voice-persona-female` with new identity
- Update `mem://ai/alex/voice-identity-and-behavior` with feminine persona
- Update memory index to reflect the change

---

## Files Modified

| Action | File |
|---|---|
| Rewrite | `supabase/functions/_shared/alex-french-voice.ts` — voice ID, TTS settings, full system prompt |
| Modify | `supabase/functions/alex-tts/index.ts` — voice ID swap |
| Modify | `supabase/functions/alex-voice-speak/index.ts` — voice ID fallback |
| Modify | `supabase/functions/alex-voice-get-config/index.ts` — config voiceId |
| Modify | `supabase/functions/voice-get-config/index.ts` — fallback voiceId |
| Modify | `supabase/functions/test-alex-voice/index.ts` — assertion voice ID |
| Modify | `supabase/functions/alex-voice-test/index.ts` — fallback voice ID |
| Modify | `supabase/functions/pro-landing-tts/index.ts` — align with unified Alex voice |
| Rewrite | `src/hooks/useLiveVoice.ts` — session context prompts (FR + EN) |
| Modify | `src/components/voice/OverlayAlexVoiceFullScreen.tsx` — greetings + status labels |
| Modify | `src/hooks/useAlexVoicePersona.ts` — gender references |
| Modify | `src/components/alex-voice-persona/GuardrailVoiceConsistency.tsx` — feminine guardrails |
| Update | `mem://ai/alex/voice-persona-female` (new, replaces male) |
| Update | `mem://ai/alex/voice-identity-and-behavior` |

No database migration needed — voice config in `voice_configs` table and `alex_voice_profiles` table can be updated via existing admin tools or a simple data update migration if desired.

