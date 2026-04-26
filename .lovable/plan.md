# 🎯 Alex Chat UX — Conversion Engine Fix

## 1. CONTEXT

The active mobile chat is `AlexCopilotConversation` driven by `copilotConversationStore`. Today it:
- Sends the user straight to a pro recommendation after one message (no qualification, no value teaser).
- Has a **decorative `+` button** in the composer (no upload action wired).
- Has **no quick-reply buttons** in Alex bubbles.
- Never tells the user data will be saved, never invites profile creation.
- Lacks a question-count guardrail and an `alex_session_state` model (intent / project_type / property_type / occupancy / answers_count / uploaded_files / project_saved).
- Has no painting-domain branch (Intérieur → Complet → Cottage → Habitée → useful summary).

Note: I searched the repo — the literal string `open_upload` is **not** in the source. It's surfacing because Alex (LLM/voice prompt) emits a tool/function name as plain text. Fix = render real upload chips for known intents, and never expose tool tokens in bubbles (sanitizer).

## 2. OBJECTIVE

Turn Alex into a **conversion concierge** that delivers value in ≤ 3 user turns, with a **real upload button**, contextual CTAs, and explicit memory of what's being saved.

## 3. DELIVERABLES

### A. New / updated files
- `src/stores/copilotConversationStore.ts` — add `session` state machine + `answersCount`, `uploadFile`, `quickReplies` per message, painting flow, profile-save prompts, sanitizer for tool tokens.
- `src/components/alex-copilot/AlexCopilotConversation.tsx` — wire the `+` button to a real file picker, render thumbnails, render quick-reply chips, micro/voice icon hidden when voice unavailable.
- `src/components/alex-copilot/ChatQuickReplies.tsx` *(new)* — 2–4 contextual chips under each Alex bubble.
- `src/components/alex-copilot/ChatPhotoThumb.tsx` *(new)* — uploaded-photo chip with thumbnail.
- `src/components/alex-copilot/ProfileSavePrompt.tsx` *(new)* — inline "Créer mon profil / Continuer sans profil" card, shown once after the value-summary turn for guests.
- `src/services/alexCopilotEngine.ts` *(new)* — pure deterministic engine: `decideNext(session, userText) → { alexText, quickReplies, action }`. Owns the painting flow + 3-question guardrail + profile-save trigger.
- `src/services/alexUploadService.ts` *(new)* — handles file selection, type/size validation (jpg/png/webp/heic, ≤ 10 MB), Supabase Storage upload to `property-photos`, fallback to in-memory session if guest.
- `src/utils/sanitizeAlexText.ts` *(new)* — strips forbidden tokens (`open_upload`, `tool:*`, `<function…>`, JSON blobs) before rendering.

### B. Database (one migration)
- New table `public.project_files` (id, user_id, project_id nullable, storage_path, mime, bytes, kind, created_at) + RLS (user owns rows; admins read all).
- RLS already exists on `property-photos` storage; add policy for authenticated users to insert under `userId/…` if missing.

## 4. LOGIC — ALEX SESSION STATE MACHINE

```ts
interface AlexSession {
  intent: "paint" | "humidity" | "roof" | "estimate" | "find_pro" | "verify" | "quote_compare" | "unknown";
  projectType?: string;        // "peinture intérieure complète"
  propertyType?: string;       // "cottage"
  occupancyStatus?: string;    // "habitée"
  surface?: string;
  city?: string;
  answersCount: number;        // user turns
  uploadedFiles: { id; url; name; mime }[];
  isLoggedIn: boolean;
  projectSaved: boolean;
  profilePromptShown: boolean;
  nextBestAction: "ask" | "summarize" | "ask_photo" | "save_profile" | "match_pro" | "book";
}
```

**Guardrail** — `decideNext()`:
- If `answersCount >= 3` AND `nextBestAction === "ask"` → switch to `summarize` (project résumé + complexité + next step + 3 quick replies).
- Never ask two questions in a row without surfacing value.
- After the first useful collection turn, append the line: *"Je vais conserver ces informations dans votre dossier projet pour éviter de vous les redemander."*

**Painting branch** (Peinture maison → Intérieur → Complet → Cottage → Habitée):
After "Habitée" (or equivalent answer detection), Alex emits **exactly**:
> Parfait. J'ai assez d'information pour créer un premier dossier projet.
> Projet : peinture intérieure complète d'un cottage habité.
> Complexité : élevée, surtout à cause des meubles, escaliers, plafonds et protection des surfaces.
> Prochaine étape recommandée : ajouter une photo d'une pièce principale pour estimer la préparation et orienter vers le bon peintre.

Quick replies under that bubble: **Ajouter une photo · Estimer sans photo · Sauvegarder mon projet**.

**Profile save trigger** (guests only, fires once, after the first summary):
> Pour sauvegarder ce projet et éviter de recommencer, créez votre profil gratuit.
CTAs: **Créer mon profil** (→ `/auth?next=…&context=alex_save`) · **Continuer sans profil**.

## 5. UPLOAD FLOW (real, working)

`AlexCopilotConversation` composer:
- Replace decorative `<Plus>` with a real `<label htmlFor="alex-file-input">` + hidden `<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment">`.
- On change → `alexUploadService.handleFile(file)`:
  1. Validate (type, ≤ 10 MB).
  2. If `isLoggedIn` → upload to `property-photos/{userId}/alex/{uuid}.{ext}` via `supabase.storage`, insert row in `project_files`.
  3. Else → keep `Blob` URL in session memory.
  4. Push a `user` message with the **thumbnail chip** (ChatPhotoThumb) into the chat.
  5. Trigger `decideNext({ event: "photo_uploaded" })` → Alex confirms reception + advances to estimate / pro match.

**Forbidden:** never emit "open_upload" / "déposez la photo sans bouton" / raw JSON. Quick reply **Ajouter une photo** triggers the same hidden input via `document.getElementById('alex-file-input').click()`.

## 6. QUICK REPLIES (contextual, 2–4 max)

`ChatQuickReplies` reads `message.quickReplies: { id, label, action }[]` and renders pill buttons. Mapped per `nextBestAction`:
- `ask_photo` → Ajouter une photo · Estimer sans photo
- `summarize` → Voir estimation · Trouver un peintre · Sauvegarder le projet · Ajouter une photo
- `match_pro` → Voir le pro · Voir d'autres options · Réserver
- `save_profile` → Créer mon profil · Continuer sans profil

Tap → either dispatches an action (`open_upload`, `save_profile`, `request_alternative`, `book_now`) **or** sends a synthetic user message into the engine. **No tool token ever rendered as text.**

## 7. MOBILE COMPOSER CLEANUP

- Left: 📎 **Ajouter une photo** (real, wired).
- Center: text input.
- Right: ➤ Send.
- 🎤 Mic: shown **only if** `useAlexVoice().isAvailable === true` AND mic permission grantable; otherwise hidden (no greyed teaser, no fake tooltip).

## 8. SANITIZER

`sanitizeAlexText(raw)` runs on every Alex bubble before render:
- Strips lines matching `/^(open_upload|tool:|action:|<function|```json)/i`.
- Removes embedded `{ "tool": ... }` blocks.
- Collapses multiple blank lines.

## 9. DATA — Migration

```sql
create table public.project_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid null,
  storage_bucket text not null default 'property-photos',
  storage_path text not null,
  mime text not null,
  bytes int not null,
  kind text not null default 'photo',  -- photo | quote | document
  source text not null default 'alex_chat',
  created_at timestamptz not null default now()
);
alter table public.project_files enable row level security;
create policy "owners read"  on public.project_files for select using (auth.uid() = user_id);
create policy "owners write" on public.project_files for insert with check (auth.uid() = user_id);
create policy "owners update" on public.project_files for update using (auth.uid() = user_id);
create policy "owners delete" on public.project_files for delete using (auth.uid() = user_id);
```
Storage policy on `property-photos` (insert/read for `auth.uid()::text = (storage.foldername(name))[1]`) — add only if missing.

## 10. ANALYTICS

Add `trackCopilotEvent` calls: `value_summary_shown`, `photo_upload_started`, `photo_upload_succeeded`, `photo_upload_failed`, `profile_save_prompt_shown`, `profile_save_clicked`, `quick_reply_clicked`.

## 11. CONSTRAINTS

- Strict FR-CA copy.
- Mobile-first; safe-area aware.
- No regression to existing pro-recommendation card flow — just gated behind the new state machine (only emitted when `nextBestAction === "match_pro"`).
- No new external dependency.

## 12. SUCCESS CRITERIA

✅ Alex never asks > 3 questions before producing a summary + CTA.
✅ The `+` button opens the OS file picker on mobile, accepts photos, shows a thumbnail in the chat, and persists to `project_files` for logged-in users.
✅ The painting flow ends with the exact required summary + 3 quick replies.
✅ "Je vais conserver…" appears the first time Alex collects qualifying info.
✅ Guests see the profile-save prompt exactly once, after the first summary.
✅ No occurrence of `open_upload` / raw tool tokens in any rendered bubble.
✅ Mic icon hidden if voice unavailable.

## 13. TASKS

1. **Migration** — create `project_files` + RLS + (conditional) storage policy on `property-photos`.
2. **`alexCopilotEngine.ts`** — implement `AlexSession`, intent detection (paint / humidity / roof…), `decideNext`, painting branch, 3-question guardrail, profile-save trigger.
3. **`alexUploadService.ts`** — file validation, Supabase Storage upload, guest fallback, return `{ url, mime, bytes, path }`.
4. **`sanitizeAlexText.ts`** — token/JSON stripper + unit-safe.
5. **`copilotConversationStore.ts`** — embed `session`, replace mock `sendMessage` to call engine; add `uploadPhoto`, `executeQuickReply`, `dismissProfilePrompt`.
6. **`ChatQuickReplies.tsx`**, **`ChatPhotoThumb.tsx`**, **`ProfileSavePrompt.tsx`** — render layer.
7. **`AlexCopilotConversation.tsx`** — wire upload input, render quick replies + thumbs + profile prompt, conditional mic.
8. **Voice availability flag** — extend `useAlexVoice()` (or read existing) to expose `isAvailable` for mic visibility.
9. **Analytics events** — wire all new `trackCopilotEvent` calls.
10. **QA pass** — painting flow end-to-end, photo upload (logged in + guest), profile prompt (guest only, once), no tool tokens visible, mic hidden when voice down.
