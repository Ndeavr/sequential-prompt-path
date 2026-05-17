## Goal

When a photo upload fails, Alex must never expose technical errors or dead-end the user. Instead, Alex briefly absorbs the friction, pivots to a guided symptom-based diagnostic, and keeps momentum toward booking.

## Scope

Single file change: `src/stores/copilotConversationStore.ts` — the `uploadPhoto` failure branch (lines 271–288). All copy, intent-aware fallback questions, and recovery flow live there. No UI/orb/design changes. No backend changes.

## Behavior

On `uploadAlexFile()` failure:

1. **Suppress the technical error string.** Never render `result.error`. Forbidden phrases (FR/EN): "upload failed", "envoi échoué", "réessayer", "réseau", "non supporté", "actualiser", stack traces.
2. **Emit one calm Alex bubble** that:
   - Acknowledges briefly ("Je n'arrive pas à recevoir la photo pour le moment.")
   - Reassures ("Ce n'est pas grave — je peux quand même analyser la situation avec vous.")
   - Pivots to a symptom question, adapted to the last detected intent if available, otherwise generic.
3. **Speak the bubble** (set `speak: true` so the voice layer reads it — preserves voice-first momentum).
4. **Reset upload state to `idle`** immediately (not `error`) so the orb doesn't show a broken state.
5. **Keep the conversation open** — no modal, no retry button as primary CTA. The hidden file input stays available if the user chooses to try again on their own.
6. **Track** `photo_upload_failed_graceful` analytics event with the original error (kept in analytics only, never shown to user).

## Intent-aware fallback questions

Read the most recent Alex message's `intent` from `get().messages` (last bubble with `intent` field) and pick the matching question pool. If no intent or `unknown`, use the generic pool. Language follows existing FR-first rule.

| Intent (existing AlexIntent) | Fallback question (FR) |
|---|---|
| `roofing` / `toiture` keywords | "Est-ce qu'il y a une infiltration active, une tache au plafond, ou des bardeaux visibles au sol?" |
| `hvac` / `chauffage` / `climatisation` | "C'est plutôt trop froid, trop chaud, un bruit inhabituel, ou aucun air qui sort?" |
| `plumbing` / `plomberie` | "Est-ce une fuite active, un drain bouché, une pression faible, ou pas d'eau chaude?" |
| `electrical` / `électricité` | "Est-ce un disjoncteur qui saute, une prise morte, une lumière qui clignote, ou une odeur de brûlé?" |
| `insulation` / `isolation` | "Est-ce des courants d'air, du froid près des murs, ou des barrages de glace au toit?" |
| `humidity` / `moisissure` | "Est-ce de la condensation aux fenêtres, une odeur de moisi, ou des taches sur les murs?" |
| generic / unknown | "Décrivez-moi simplement : quel est le problème, où il se situe, depuis quand, et si c'est urgent. Je vais trouver le bon entrepreneur." |

Map by scanning the last 5 messages' `intent` field and text for the keyword cluster. Implement as a small pure helper `pickFallbackQuestion(session, messages): { text, intent }` colocated in the store file (or in `alexConversationEngine.ts` if cleaner — single export, no other engine changes).

## Copy (canonical)

**FR generic:**
> "Je n'arrive pas à recevoir la photo pour le moment. Ce n'est pas grave — je peux quand même analyser la situation avec vous et trouver le bon professionnel. {symptom_question}"

**EN generic (only if `language === "en"`):**
> "I can't receive the photo right now. That's okay — I can still help. {symptom_question}"

## Validation

- Manually trigger an upload failure (e.g. by mocking `uploadAlexFile` to return `{ ok: false, error: "Network error 500" }`) and confirm:
  - No technical string appears in the chat.
  - Alex speaks the graceful bubble.
  - Orb state returns to `idle` (not `error`).
  - A symptom question matching the last intent is rendered.
- Confirm analytics event `photo_upload_failed_graceful` fires with the raw error.
- Verify no other call sites of `uploadPhoto` regress.

## Non-goals

- No new permission flows, no orb redesign, no new edge functions, no changes to `alexConversationEngine` response pools beyond optionally adding the helper, no changes to the live voice pipeline.
