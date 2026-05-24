## UNPRO Global Empty-State Conversion System

Replace every "no provider available" dead-end with a single premium conversion module that captures account creation, preserves the project, and reinforces UNPRO's AI matching intelligence.

### 1. New shared copy + component

**`src/lib/noMatchCopy.ts`** (new) — single source of truth.
- `getProNoun(service)` → `peintre | couvreur | électricien | plombier | spécialiste CVAC | paysagiste | notaire | inspecteur | gestionnaire | professionnel` (fallback).
- `getCityFragment(city?)` → `"à Laval"`, `"dans le secteur de Montréal"`, or `"dans votre secteur"`.
- `buildNoMatchTitle({ service, city })` → `"Aucun {noun} disponible ne correspond actuellement à vos critères {cityFragment}."`
- `buildNoMatchBullets({ isAuthed, hasEstimate })` → returns the 4 ✓ value props (alerts, save project, AI broaden, priority recommendations).
- `buildAlexVoiceLine({ service, city })` → `"Je peux élargir la recherche ou vous prévenir dès qu'un {noun} compatible devient disponible {cityFragment}."`
- Banned-phrase list exported for lint/test (`"Nous n'avons pas encore"`, `"Aucun partenaire"`, `"Service indisponible"`, `"Rien trouvé"`, `"Pas de résultats"`).

**`src/components/conversion/NoMatchConversionCard.tsx`** (new) — premium card used everywhere.
Props: `{ service, city?, hasEstimate?, onAlex?, variant?: "card" | "inline" | "page" }`.
- Title (dynamic, from helper).
- 4 ✓ bullets (account benefits, swapped to "Activer les alertes intelligentes" when `useAuth().user` is present).
- Status row: `Projet sauvegardé` (if hasEstimate), `Recherche intelligente active` (pulse/glow via existing `animate-pulse` + token glow), `Notification prioritaire`.
- Primary CTA `Créer mon compte UNPRO` → `/signup?next=<current>` (hidden if authed; replaced by `Activer les alertes intelligentes` calling waitlist).
- Secondary CTA `Se connecter` → `/login?next=<current>` (hidden if authed).
- Tertiary CTA `Parler à Alex` → calls `onAlex` or opens Alex orb event.
- Social proof line: `"Des centaines de propriétaires utilisent UNPRO chaque semaine pour trouver le bon professionnel."`
- Pure design-system tokens (`bg-card`, `border-border`, `text-foreground`, `bg-primary`, glass + subtle glow). Mobile-first.

### 2. Rewrite existing surfaces to use the new module

| File | Change |
|---|---|
| `src/components/alex-conversation/CardNoMatchFallback.tsx` | Replace body with `<NoMatchConversionCard variant="inline" service={ctx.service} city={ctx.city} hasEstimate={!!ctx.estimate} />`. Accept optional context props (read from `copilotConversationStore` if not provided). |
| `src/components/alex/no-match/BannerNoMatchPrimary.tsx` | Keep banner shape, swap message generator to `buildNoMatchTitle` + add the AI/alerts subline. Remove `AlertTriangle` (use `Sparkles`). |
| `src/pages/PageNoMatchFallback.tsx` | Render `<NoMatchConversionCard variant="page" />` with service/city pulled from `useNoMatchRecovery` context; keep existing waitlist flow as the authed CTA target. |
| `src/services/alexNoMatchService.ts` | Rewrite `getNoMatchCopy` and `getAlexVoiceResponse` to use `buildAlexVoiceLine` + premium framing (no "nous n'avons pas encore", no "partenaire vérifié"). |
| `src/features/alex/voice/alexCorePrompt.ts` (line ~68 "Si aucun pro disponible") | Replace fragment with the new positioning: compatibility filtering + offer to broaden / notify. |
| `src/components/contractor/LeadDecisionCard.tsx` line 74 | Soften `"aucun autre entrepreneur disponible"` → `"Recherche intelligente en cours pour un autre professionnel compatible."` |

Admin-only `EmptyState` strings (AdminLeads, AdminQuotes, AdminDocuments, AdminAlerts, AdminAppointments, AdminContractors, AdminScreenshot*, AdminOutreach*) are **out of scope** — they are internal staff UI, not user-facing conversion surfaces.

### 3. Auth + estimate detection

- Inside the card, use existing `useAuth()` hook to swap CTAs.
- Estimate detection: read `sessionStorage` keys already used by the painting calculator / growth diagnostic (`unpro:lastEstimate` convention — add a tiny `getSavedEstimate()` helper in `noMatchCopy.ts` reading the keys we already write).

### 4. Alex proactive line

- Expose `getAlexNoMatchProactive(service, city)` from `noMatchCopy.ts`.
- Wire into `useNoMatchRecovery` so the existing TTS path speaks the new line on `detected` step.

### 5. Verification

- `rg` for the banned phrases inside `src/` (excluding admin) returns zero hits after the refactor.
- Mount `/alex/no-match` and the painting calculator no-match branch on mobile viewport (384px) to confirm CTAs stack, pulse animation runs, and signup deep-link preserves `next`.

### Out of scope

- Admin dashboards' generic empty states.
- New backend tables / edge functions (existing `alex-no-match-handle` and `useNoMatchRecovery` are reused).
- New routes.

### Technical notes

- Files created: 2 (`noMatchCopy.ts`, `NoMatchConversionCard.tsx`).
- Files edited: 6 listed above.
- No DB migration. No new dependencies.
- All colors via semantic tokens; pulse via Tailwind `animate-pulse` + `shadow-[0_0_24px_hsl(var(--primary)/0.35)]`.
