## Goal

Wire the Demand Intelligence Engine into the live homeowner project + Stripe activation flows, and inject demand language into outreach.

---

## #1 — Homeowner project creation → demand signal

### Edit `src/pages/dashboard/ProjectNewPage.tsx`

After the `projects.insert(...)` succeeds (line 74-92), invoke `demand-signal-create` **non-blocking**:

- Read property city via a follow-up query (`properties.select("city, postal_code").eq("id", form.property_id)`).
- Resolve category slug from `selectedCategory.name_fr` (lowercase) or `subcategory`.
- Call `supabase.functions.invoke("demand-signal-create", { body: { project_id, homeowner_id, city, category, subcategory, postal_code, urgency_score } })`.
- Wrap in `try/catch`. On error: `supabase.from("system_events").insert({ event_type: "demand_signal_failed", payload: { project_id, error } })` and continue.
- Read `result.has_match_path`:
  - `true` → existing behaviour, navigate to `/dashboard/projects/:id/matches`.
  - `false` → navigate to new route `/dashboard/projects/:id/waiting`.

### New page `src/pages/dashboard/ProjectWaitingPage.tsx`

- Reads `projectId` from params.
- Fetches `projects` row (title, category) + matching `demand_signals` row (`position_in_queue`, `city`, `category`).
- Renders `<WaitingPositionCard projectId homeownerId city category position />` (already built).
- Wrapped in `DashboardLayout` + `PageHeader("Vous êtes sur la liste prioritaire")`.

### Router

Add route in `src/app/router.tsx` (or matching dashboard router) for `/dashboard/projects/:projectId/waiting` → lazy `ProjectWaitingPage`.

### ProjectMatchesPage fallback (safety net)

In `ProjectMatchesPage.tsx`, when `suggestions.length === 0` after load, also query `demand_signals` for the project and render `<WaitingPositionCard />` instead of the bare "Aucun entrepreneur trouvé" card. Covers cases where a signal exists but the user landed on /matches directly.

### Edge function `demand-signal-create` (verify)

Confirm it returns `{ ok, signal, market, has_match_path }`. If missing `has_match_path`, add it: after computing matches, set `has_match_path = matched_contractor_id !== null`. (Will inspect during build.)

### PII guard

`PageAdminWaitingHomeowners` already uses `market_demand` aggregates (no homeowner PII). Confirm `<DemandRevealPanel>` and public `/pro/demande/:city/:category` only read `market_demand` — no joins onto `demand_signals.homeowner_id`. RLS on `demand_signals` already blocks contractors.

### Success criteria

1. New project with no match writes a `demand_signals` row.
2. `market_demand` row for that city+category is updated (existing trigger).
3. Homeowner lands on `WaitingPositionCard`.
4. Public demand pages still show only aggregates.
5. `/admin/waiting-homeowners` lists the new signal.
6. Edge function failure → project still created, error in `system_events`, user redirected to `/matches` fallback.

---

## #2 — Stripe activation → match-waiting-demand

### Edit `supabase/functions/stripe-webhook/index.ts`

After the `acq_contractors.update({ status: "active" })` (line 142-145) AND after the equivalent `contractors` activation block (the upstream `planId` branch around line 90-100), invoke `match-waiting-demand`:

```ts
await supabase.functions.invoke("match-waiting-demand", {
  body: { contractor_id: contractorId }
}).catch((e) => console.warn("[match-waiting-demand] failed", e));
```

Also call after `activate-contractor-plan` (if that path exists and bypasses the webhook).

### Success criteria

A `checkout.session.completed` for a contractor in a city/category with waiting signals triggers `match-waiting-demand`, signals transition to `matched`, homeowners get notified via existing channels in that function.

---

## #3 — `buildDemandIntro()` in outreach copy

### Edit `supabase/functions/_shared/masterOutreachCopy.ts`

Make the email/SMS builders accept an optional `demandIntro` string and prepend it before the value pitch when present.

### Edit `supabase/functions/_shared/outreachDispatch.ts`

Before composing the message, if the prospect has `city` + primary `category`, call `buildDemandIntro(city, category)` from `demandInjector.ts`. Pass the result into `masterOutreachCopy` builders. Skip silently if it returns null/empty.

This gives every outbound message live demand language ("12 propriétaires attendent un couvreur à Laval…") with zero PII.

---

## Technical notes (non-user)

- `demand-signal-create` already idempotent on `(project_id)` per existing implementation.
- `match-waiting-demand` already secured by service role.
- No new tables — leverages `demand_signals`, `market_demand`, `system_events`.
- No schema changes required for #1 unless `has_match_path` is missing from the edge response (added inline in the function, no migration).

## Build order

1. ProjectNewPage wiring + ProjectWaitingPage + route.
2. ProjectMatchesPage fallback to WaitingPositionCard.
3. stripe-webhook → match-waiting-demand invocation (both branches).
4. outreachDispatch → buildDemandIntro integration.

Approved. Execute exactly in this build order:

1. ProjectNewPage wiring + ProjectWaitingPage + route

2. ProjectMatchesPage fallback to WaitingPositionCard

3. stripe-webhook → match-waiting-demand invocation in all activation branches

4. outreachDispatch → buildDemandIntro integration

Priority rule:

Do not redesign UI.

Do not change schema unless has_match_path is missing from demand-signal-create response.

Do not expose homeowner PII on public demand pages.

Project creation must never fail because demand signal creation failed.

After patching, run a test:

- Create unmatched homeowner project

- Confirm demand_signals row

- Confirm market_demand aggregate update

- Confirm homeowner lands on /waiting

- Confirm /matches fallback renders WaitingPositionCard

- Simulate Stripe activation

- Confirm match-waiting-demand runs

- Confirm outreach copy includes live demand intro when city/category exist

Return:

1. Files changed

2. Exact logic added

3. Any errors found

4. Test results

5. Remaining blockers only