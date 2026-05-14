# Site-Wide Contractor Mode (Alex-Triggered)

## Goal
When Alex auto-starts on `/entrepreneur`, the entire site instantly switches into **Contractor Mode**: voice persona, hero, navigation, bottom nav, quick actions, and copy all adapt — and stay that way across pages until the user manually exits.

## Trigger
- Auto: any visit to `/entrepreneur` (or `/pro`, `/je-suis-entrepreneur`, `/pro-landing`) sets mode = `contractor` immediately on mount, before Alex starts.
- Alex voice config also flips to `getVoiceConfigFor("contractor")` at the same instant — first message becomes *"Bonjour. Je suis Alex d'Un Pro. Voyons ensemble comment faire évoluer votre entreprise."*

## Persistence
- `localStorage["unpro_active_mode"] = "contractor"` (survives reload, cross-page, cross-tab).
- If user is authenticated → also patch `contractor_intake_sessions.mode = 'alex'` and write `persistent_user_memory` flag `is_contractor = true`.
- Exit: explicit "Je ne suis pas entrepreneur" link in footer + auto-clear if user navigates to `/role` and picks Homeowner.

## Surfaces that adapt

### 1. Hero / Homepage (`/`, `/index`)
- Headline → "Plus de contrats grâce à l'IA"
- Sub → "Recevez des rendez-vous qualifiés. Votre profil IA travaille 24/7."
- Primary CTA → "Voir mon potentiel gratuit" → `/entrepreneur`
- Secondary CTA → "Parler à Alex" (voice)
- Hide homeowner quick actions (Problème maison / Analyse soumission / Vérifier un pro)

### 2. Quick actions under orb
Replace homeowner grid with:
- Voir mon AIPP
- Mes rendez-vous
- Activer mon profil
- Mon plan recommandé

### 3. Bottom nav (`MobileBottomNav` / `AlexBottomSheetLauncherUNPRO`)
Contractor tabs:
- Accueil → `/entrepreneur`
- Leads → `/leads`
- Alex (orb center)
- AIPP → `/entrepreneur/aipp-import`
- Compte → `/account`

### 4. Top nav / header
- Swap "Trouver un pro" / "Soumissions" links for "Tableau de bord" / "Leads" / "Mon plan"
- Persistent slim badge: `● Mode Pro` (clickable to exit)

### 5. Voice config
- `AlexVoiceContext` reads `useActiveMode()` → on `contractor`, force `getVoiceConfigFor("contractor")` for `firstMessage`, prompt addendum, voice tuning. No greeting fallback.

## Architecture

### New
- `src/contexts/ActiveModeContext.tsx` — provides `mode: "homeowner" | "contractor" | "condo_manager"`, `setMode()`, `clearMode()`. Reads/writes localStorage. Listens to `storage` event for cross-tab sync.
- `src/hooks/useActiveMode.ts` — convenience hook.
- `src/components/layout/ContractorModeBadge.tsx` — slim "● Mode Pro · Quitter" pill in header.
- `src/components/home-orb/HeroOrbMockup.tsx` — branch headline/subtext/CTAs/quick actions on `mode === "contractor"`.

### Modified
- `PageEntrepreneurDiagnosticLanding.tsx` — `useEffect(() => setMode("contractor"), [])` on mount.
- `AlexVoiceContext.tsx` (or wherever `firstMessage` is resolved) — pass `mode` to `getVoiceConfigFor()`.
- `App.tsx` / `providers.tsx` — wrap tree in `<ActiveModeProvider>`.
- Bottom nav + top nav components — branch tab list on `mode`.
- Existing `/pro`, `/je-suis-entrepreneur`, `/pro-landing` route components — also call `setMode("contractor")` on mount (consistency with screenshot 2 which shows the entrepreneur CTA).

### DB (no schema changes needed)
- Reuse `contractor_intake_sessions.mode` (already exists, set to `'alex'`).
- Optional: write `persistent_user_memory.facts.is_contractor = true` if the table/hook exists for authed users — non-blocking patch.

## Out of scope
- No new edge functions, no Stripe changes, no auth changes.
- No condo_manager mode in this pass.
- No redesign of contractor dashboards — only the adaptation layer + nav/hero/quick-actions branching.

## Success
- Land on `/entrepreneur` → Alex auto-starts with contractor greeting in <1s.
- Navigate to `/` → still see contractor hero, contractor bottom nav, "● Mode Pro" badge.
- Reload anywhere → mode persists.
- Click "Quitter mode pro" → instant revert to homeowner UI everywhere.

## Files
**Create:** `src/contexts/ActiveModeContext.tsx`, `src/hooks/useActiveMode.ts`, `src/components/layout/ContractorModeBadge.tsx`
**Edit:** `src/app/providers.tsx`, `src/components/home-orb/HeroOrbMockup.tsx`, `src/contexts/AlexVoiceContext.tsx`, `src/pages/entrepreneur/PageEntrepreneurDiagnosticLanding.tsx`, contractor landing pages (`/pro`, `/pro-landing`, `/je-suis-entrepreneur`), bottom nav + top nav components.
