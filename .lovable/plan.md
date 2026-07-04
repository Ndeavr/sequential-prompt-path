# Navigation & Conversion Architecture

Goal: every page routes to one of 4 actions — **Talk to Alex**, **Create Project**, **Activate Profile**, **Book Appointment**. Zero dead ends, zero "coming soon", zero orphan test routes.

---

## 1. Canonical CTA System

**New file `src/config/ctaRegistry.ts`** — single source of truth:

```ts
export type CanonicalCTA = "alex" | "create_project" | "activate_profile" | "book";
export const CTA_DEST = {
  alex:              { href: "/alex",              label: "Parler à Alex" },
  create_project:    { href: "/project/new",       label: "Créer mon projet" },
  activate_profile:  { href: "/entrepreneurs",     label: "Activer mon profil" },
  book:              { href: "/recommendations",   label: "Prendre rendez-vous" },
};
```

**New component `src/components/cta/PrimaryCTA.tsx`** — renders one canonical CTA button with analytics tag `cta_click:{name}:{page}`.

**New component `src/components/cta/PageCTAFooter.tsx`** — sticky bottom-of-page block (above dock) enforcing "at least one visible CTA" on every page. Injected by `PageShell` when the page doesn't declare its own CTA via prop `cta={...}`.

**Update `src/layouts/PageShell.tsx`** — add required prop `cta: CanonicalCTA | CanonicalCTA[]` (default `"alex"`). Dev-mode assertion warns if a page omits it. Renders `PageCTAFooter` automatically unless `hideCta` set.

---

## 2. Route Map — Keep / Add / Redirect / Remove

### Add canonical routes (aliases to existing pages)
| New route | Renders |
|---|---|
| `/entrepreneurs` | existing `PageContractorLandingAcquisition` |
| `/partenaires` | new `PagePartnersLanding` (realtors/notaries/managers/condo boards) |
| `/project-created` | new `PageProjectCreatedSuccess` (demand context + CTA "View Project") |
| `/recommendations` | new `PageRecommendations` (top match, score, why, book CTA) |
| `/waiting` | keep — enrich with queue position, market value, invite-contractor CTA |
| `/activation-success` | new `PageActivationSuccess` (cities, categories, waiting count, revenue opp) |
| `/projects`, `/quotes`, `/home-passport` | dashboard tabs — add real routes if missing |

### Redirect (add to `LEGACY_REDIRECTS` in `src/config/routeRegistry.ts`)
```
/home              → /
/matches           → /recommendations
/coming-soon       → /
/test, /test/*     → /
/demo (bare)       → /
/v2, /v3           → /            (variants no longer public)
/conversation      → /alex
/homeowner         → /
/contractor        → /entrepreneurs
/professional      → /entrepreneurs
/start             → /
/pim, /ai, /go, /aipp-check       → keep (real landings)
```

### Remove from router (delete `<Route>` lines)
- `/demo/isroyal-alex-plan-test*` (move under `/admin` if still needed internally)
- Any orphan `/*-test`, `/*-preview`, `/scratch/*` routes

### Fallback route hardening
`FallbackRoutePage` already redirects unknown nav paths to `/`. Extend to **also** redirect any path containing `test|demo|scratch|coming-soon|placeholder` unless explicitly allowlisted.

---

## 3. Unified Homeowner Flow

**Entry (all three converge):**
- Voice → `/alex` orb tap
- Chat → `/alex` text input
- Manual → `/project/new` form

All three call new hook **`useCreateProject()`** in `src/hooks/useCreateProject.ts` which:
1. Calls edge function `create-project-unified` (new) which inserts `projects` + `demand_signals` + upserts `profiles` (homeowner_account). Demand-signal failure is caught, logged, never blocks project insert.
2. Navigates to `/project-created?id={projectId}`.
3. On that page: fetch demand context (category, city, waiting count via existing `demand_signals` aggregates), then show CTA "View Project" → `/projects/:id`, plus secondary CTA "Continue with Alex" → `/alex?project={id}`.

**Matching branch** — after project created, background job returns:
- matches exist → CTA on `/project-created` becomes "Voir mes recommandations" → `/recommendations?project={id}`
- no matches → CTA becomes "Suivre ma demande" → `/waiting?project={id}`

---

## 4. Unified Contractor Flow

`/entrepreneurs` (existing) → Alex-guided OR Manual → business search (Company / GMB import via existing `business-import`) → profile draft → AI optimization (existing scoring) → plan selection (`/entrepreneur/plan`) → Stripe → **`/activation-success`**.

**New `PageActivationSuccess`:**
- Query `contractor_service_regions` + `demand_signals` for the contractor's cities × categories.
- Show 3 real numbers: homeowners waiting, estimated $ opportunity, next 3 hot demands.
- CTA "Voir mes opportunités" → `/leads`.

Replace any generic "Payment successful" redirect from Stripe webhook / checkout success URL with `/activation-success`.

---

## 5. Registration Success Router

Replace any "Account Created" terminal page. New **`src/pages/PageRegistrationSuccess.tsx`** at `/welcome`:
- Reads role from session; if unknown, shows 3 role cards (🏠 / 🔨 / 🏢).
- On pick → routes to homeowner onboarding (`/alex`), contractor onboarding (`/entrepreneurs`), or condo (`/condo`).
- Never a dead end.

Update `AuthCallbackPage` and Supabase `emailRedirectTo` to land on `/welcome`.

---

## 6. Dashboards

**Homeowner `/dashboard`** — tabs: `Alex | Projets | Soumissions | Entrepreneurs | Passeport`. Each tab route: `/dashboard`, `/projects`, `/quotes`, `/contractors-mine`, `/home-passport`. Missing pages get real minimal shells with CTA.

**Contractor `/pro`** — tabs: `Aperçu | Leads | Recommandations | Agenda | Profil`. Existing routes `/leads`, `/agenda`, `/profile` remain. Add `/pro/recommendations`.

---

## 7. Layout Guardrail Extension

Extend `PageShell` and `MobileQAOverlay` (already in place from prior work):
- New QA rule: **"no canonical CTA visible"** — scans DOM for `[data-cta-canonical]`; warns if absent.
- New QA rule: **"placeholder text"** — flags visible text matching `/coming soon|bientôt disponible|placeholder|lorem/i`.
- Dev + admin overlay shows a red banner if either fires.

---

## 8. Files Changed

**New**
- `src/config/ctaRegistry.ts`
- `src/components/cta/PrimaryCTA.tsx`
- `src/components/cta/PageCTAFooter.tsx`
- `src/hooks/useCreateProject.ts`
- `src/pages/PageProjectCreatedSuccess.tsx`
- `src/pages/PageRecommendations.tsx`
- `src/pages/PageActivationSuccess.tsx`
- `src/pages/PagePartnersLanding.tsx`
- `src/pages/PageRegistrationSuccess.tsx`
- `supabase/functions/create-project-unified/index.ts`

**Edited**
- `src/config/routeRegistry.ts` — expanded `LEGACY_REDIRECTS`, tightened `FallbackRoutePage` rules
- `src/app/router.tsx` — add new routes, remove test/demo routes, add `/entrepreneurs`, `/partenaires`, `/welcome`, `/project-created`, `/recommendations`, `/activation-success`
- `src/layouts/PageShell.tsx` — required `cta` prop + auto footer
- `src/components/dev/MobileQAOverlay.tsx` — 2 new rules
- `src/pages/PageHomeUnicorn.tsx` — primary CTA "Parler à Alex", secondaries "Uploader photos" / "Uploader soumissions"
- `src/pages/PageWaiting.tsx` — enrich with queue/value/CTA
- `src/pages/AuthCallbackPage.tsx` — route to `/welcome`
- Stripe success URLs in `create-checkout-session` edge function → `/activation-success`

---

## 9. Validation

- Playwright script at 360 / 390 / 430 px:
  - visits `/`, `/entrepreneurs`, `/partenaires`, `/project-created`, `/recommendations`, `/waiting`, `/activation-success`, `/dashboard`, `/pro`, `/welcome`
  - asserts exactly one `[data-bottom-dock]`
  - asserts `[data-cta-canonical]` present
  - asserts no visible "coming soon"/"placeholder"
  - screenshots each viewport
- Curl-check redirects: `/home`, `/matches`, `/coming-soon`, `/test`, `/demo`, `/v2`, `/conversation`, `/homeowner`, `/contractor` all resolve to allowed destinations client-side.

---

## 10. Out of Scope

- No changes to Alex voice/session (`alexSessionState`, voice config).
- No pricing changes.
- No schema changes beyond one edge function; `projects`, `demand_signals`, `profiles` tables already exist.
- No visual redesign — reuses existing tokens, `PageShell`, `SectionBlock`, `CardGlass`.

## 11. Blockers to Confirm

1. **`/partenaires` content** — do you have copy/logos for realtors/notaries/property managers/condo boards, or should I ship a functional shell with generic value props + "Contact us" CTA?
2. **Recommendations data source** — use existing `contractor_scores` + `matches` tables, or is there a preferred RPC?
3. **Waiting page invite flow** — CTA "Invite Contractors" should open share sheet (SMS/email) or route to a form? I'll default to share sheet unless told otherwise.
