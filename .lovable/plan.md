## Goal

Codify the **Alex Behavioral Intelligence Kernel** as the canonical governance doc, then inject its critical *new* deltas into the active runtime so Alex actually behaves this way — not just on paper.

## Scope

Four coordinated changes. No UI/orb work. No voice pipeline changes. No edge-function logic changes beyond text constants.

### 1. New memory: `mem://ai/alex/behavioral-kernel`

Store the full kernel verbatim as the source-of-truth governance doc. Tag as `feature` type (operational behavioral contract). Add an entry to `mem://index.md` under Memories. Add one Core line:

> Alex behavior governed by `mem://ai/alex/behavioral-kernel` — never expose technical errors; always pivot to next useful step; preserve momentum.

### 2. Inject deltas into `src/features/alex/voice/alexCorePrompt.ts` (ALEX_CORE_PROMPT — the live ElevenLabs override)

Append two new sections — these are the *new* rules not yet enforced:

**§ FAILURE RECOVERY (NEW)**
- Jamais exposer : "upload failed", "API error", "network issue", "permission denied", "fonction", "payload", "format non supporté", stack traces, codes d'erreur.
- À la place : absorber, rassurer en une phrase, proposer immédiatement un chemin alternatif.
- Photo échouée → diagnostic guidé par symptômes basé sur l'intention détectée.
- Pro indisponible → collecter détails, ouvrir demande prioritaire, rassurer.
- Voix coupée → continuer naturellement à l'écrit.
- Donnée manquante → estimer ou poser la question utile la plus courte.

**§ CONTINUITÉ VOIX ↔ CHAT (NEW)**
- Voix et texte = même personnalité. Si un canal tombe, continuer dans l'autre sans recommencer.
- Mémoire de session : type de projet, urgence, ville, réponses précédentes, état émotionnel — ne jamais redemander.

### 3. Inject deltas into `src/features/alex/voice/alexSystemPromptV2.ts` (V3 — used by `alex-chat`)

Add the same two sections after `# PHRASES INTERDITES`. Extend the existing forbidden list with the exact technical-leak phrases from the kernel. Keep V2 alias intact.

### 4. Harden `src/utils/sanitizeAlexText.ts` (last-line defense)

Add a `TECHNICAL_LEAK_PHRASES` array and rewrite logic: if any forbidden technical phrase appears in an Alex bubble, replace the whole bubble with the graceful fallback:

> "Je continue avec vous. Décrivez-moi simplement la situation — je vais trouver le bon professionnel."

Phrases to scrub (case-insensitive, FR + EN):
- "upload failed", "envoi échoué", "téléversement échoué"
- "api error", "erreur api"
- "network error", "erreur réseau", "problème réseau"
- "permission denied", "permission refusée"
- "unsupported format", "format non supporté", "non pris en charge"
- "function crashed", "fonction.*crash", "stack trace"
- "invalid payload", "payload invalide"
- "please refresh", "veuillez actualiser", "réessayez plus tard"

Add `sanitizeAlexText` return flag `hadTechnicalLeak` and log via existing console.debug path so we can detect regressions in DEV.

## Validation

- `mem://ai/alex/behavioral-kernel` exists and is referenced in `index.md`.
- `ALEX_CORE_PROMPT` and `ALEX_SYSTEM_PROMPT_V3` both contain the Failure Recovery + Continuity sections.
- Unit-call `sanitizeAlexText("Upload failed. Please refresh.")` returns the graceful fallback, not the original.
- Existing `cleanAlexText` callers stay backward-compatible (no signature change).
- Build passes.

## Non-goals

- Re-pronouncing tone work in TTS (voice config locked).
- Changes to edge functions `alex-chat`, `alex-voice`, `alex-tts`, or any orchestration logic.
- Any UI component changes (orb, panel, overlay all untouched).
- Backend schema or RLS changes.
