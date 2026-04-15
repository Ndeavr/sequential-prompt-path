

# Plan: ModuleOperationalSimulationAndQAFlow

## Summary
Build a complete operational simulation and QA module enabling admins to run end-to-end validation of the contractor recruitment funnel (extract → email → CTA → signup → payment → profile → activation) with real-time timeline tracking, error surfacing, and step-level retry.

## Phase 1 — Database (1 migration)

Create 8 tables with RLS (admin-only):

- `simulation_scenarios` — reusable scenario definitions with step_order_json, severity, default_environment
- `simulation_runs` — execution instances with status, health_score, critical_failures_count
- `simulation_steps` — ordered steps per run with status, duration_ms, expected/actual result, retry_count
- `simulation_events` — granular event log per step
- `simulation_errors` — errors with severity, context, resolution tracking
- `simulation_email_events` — email delivery/open/click tracking per run
- `simulation_payment_events` — Stripe session/webhook status per run
- `simulation_profile_events` — profile completion before/after per run

Seed data: 6 default scenarios (FullFunnelContractor, ExtractOnly, ExtractToEmail, ExtractToSignup, PaymentRecovery, WebhookIntegrityAudit).

Enable Realtime on `simulation_steps` for live timeline updates.

## Phase 2 — Hook

Create `src/hooks/useQASimulation.ts`:
- `useSimulationRuns` — list/filter/search runs
- `useSimulationRun` — single run with steps, events, errors
- `useSimulationScenarios` — list scenarios
- `useLaunchSimulation` — create run + execute steps sequentially with mock logic
- `useRetryStep` — retry a single failed step
- `useCancelRun` — cancel active run

All simulation logic runs client-side with mock results (no real emails/payments). Each step inserts into `simulation_steps` with pass/fail + duration.

## Phase 3 — Admin Pages (3 pages)

1. **PageAdminQASimulation** (`/admin/qa-simulation`) — Overview dashboard with:
   - HeroSectionOperationalSimulation
   - WidgetCriticalFailures, WidgetFunnelDropoffSummary, WidgetConversionPathIntegrity
   - PanelSimulationRunLauncher (scenario select, environment select, launch button)
   - TableSimulationRuns (filterable by status, scenario, date)

2. **PageAdminQASimulationRun** (`/admin/qa-simulation/run/:runId`) — Single run detail:
   - BannerSimulationEnvironment
   - PanelSimulationResultSummary (health score, pass/fail counts)
   - TimelineSimulationExecution (vertical timeline of steps with CardSimulationStepStatus)
   - TableSimulationEvents + TableSimulationErrors
   - PanelSimulationManualOverride (retry failed step, cancel run)

3. **PageAdminQASimulationTemplates** (`/admin/qa-simulation/templates`) — Scenario management:
   - List/edit scenarios, step order, severity levels

## Phase 4 — Components (~18 components)

All in `src/components/qa-simulation/`:

- **Hero**: HeroSectionOperationalSimulation
- **Panels**: SimulationRunLauncher, SimulationScenarioSelector, SimulationResultSummary, EmailSequencePreview, PaymentWebhookStatus, ProfileCreationStatus, SimulationManualOverride
- **Cards**: SimulationStepStatus (with pass/fail/running/skipped states + duration)
- **Timeline**: SimulationExecution (vertical step-by-step with real-time updates)
- **Tables**: SimulationRuns, SimulationEvents, SimulationErrors
- **Widgets**: FunnelDropoffSummary, CriticalFailures, ConversionPathIntegrity
- **Banner**: SimulationEnvironment (test/staging/production indicator)
- **Modal**: SimulationRunDetails

## Phase 5 — Mock Simulation Engine

The `useLaunchSimulation` hook executes steps sequentially with simulated delays:

1. **Extract** — validates mock prospect data structure, inserts step as passed
2. **Email** — validates template rendering with mock variables, checks CTA URL validity
3. **CTA Click** — validates target route exists in router config (no 404)
4. **Signup** — validates auth flow mock (creates test record in simulation_events)
5. **Payment** — validates Stripe session creation mock + webhook receipt mock
6. **Profile** — validates completion percentage calculation + activation flag

Each step: records duration_ms, expected vs actual result, and any errors with context. Final step computes health_score (0-100) based on pass rate weighted by criticality.

## Phase 6 — Route Registration

Add 3 routes to `router.tsx` under admin guard:
- `/admin/qa-simulation`
- `/admin/qa-simulation/run/:runId`
- `/admin/qa-simulation/templates`

## Technical Details

- All tables use UUID PKs, jsonb for payloads, timestamptz
- RLS: admin-only (uses `has_role` function)
- Realtime on `simulation_steps` for live timeline
- Mobile-first glassmorphism design matching existing admin pages
- French-first labels
- No real external calls — all simulation is mock/safe by default
- Step retry is idempotent (resets step status, re-executes)

## Files

- 1 migration (8 tables + seed scenarios + RLS)
- 1 hook file
- 3 page files
- ~18 component files
- `router.tsx` update (3 routes)

