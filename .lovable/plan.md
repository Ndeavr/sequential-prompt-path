## Market Validation Audit — Homeowner → Contractor Revenue Path

**Test scenario:** Homeowner in Laval, category *Isolation entretoits*, budget résidentiel typique, urgence normale.

### 1. Contractor pool for Laval + Isolation entretoits

Strict match (serves Laval **AND** has `isolation-entretoits` category assigned):

| # | Business | AIPP | accepting | booking | verified | Eligible? |
|---|---|---|---|---|---|---|
| 1 | Isolation Solution Royal | 0 | ❌ | ❌ | pending | No |
| 2 | Pros Rénovation | 47 | ❌ | ❌ | verified | No |

**Qualified (city+category): 2 · Recommendation eligible: 0 · Ranking: empty.**

### 2. Ranking evidence

`v_contractor_recommendation_score` returns both at score 11 (recrue plan, multipliers 1.0), but the eligibility layer requires `booking_enabled=true` + `is_accepting_appointments=true` + `verification_status ∈ (verified, pending)`. Both candidates fail booking_enabled → filtered out → **zero ranked results**.

### 3. Automated matching path — BROKEN

`supabase/functions/match-lead/index.ts` lines 175-179 selects columns that do not exist on `contractors`:
- `company_name` → actual: `business_name`
- `service_areas` → actual: separate table `contractor_service_areas`
- `specialties`, `sub_specialties` → actual: `specialty` (text) + `contractor_category_assignments`
- `min_job_value`, `max_job_value`, `languages` → do not exist

Result: query fails silently, `scored=[]`, lead marked `no_match`. Table `matches` currently has **0 rows** (confirmed). Automated homeowner→contractor matching has never fired in production.

### 4. Direct booking path (bypass matching)

`src/hooks/useAppointments.ts` inserts directly into `appointments` with `homeowner_user_id` + `contractor_id`. This works because RLS allows homeowners to create their own rows. Notification triggers via `notify-appointment-created`.

### 5. Notification path

`supabase/functions/notify-appointment-created` reads `appointments → leads(owner_profile_id)`. When appointment is created **without** a lead (direct booking), the homeowner notification is skipped. Contractor notification still fires if `contractors.user_id` is present.

### 6. Step-by-step PASS / FAIL

| Step | Result | Evidence |
|---|---|---|
| Homeowner Alex qualification | PASS | Alex sessions active, qualification graph reaches booking phase |
| Lead row creation | FAIL | 0 rows in `leads` — no code path writes a `lead_type='contractor'` lead from Alex |
| Recommendation engine (Laval + isolation) | FAIL | 0 eligible contractors |
| Contractor ranking | FAIL | Empty ranking |
| Automated match creation | FAIL | `match-lead` selects non-existent columns → 0 matches ever created |
| Appointment creation (direct path) | PASS | `useAppointments` insert succeeds; 2 test appointments already exist |
| Appointment creation (matched path) | FAIL | Blocked by missing `matches` row |
| Contractor notification | CONDITIONAL PASS | Works only if `contractors.user_id` set; skips when appointment has no lead_id |
| Homeowner confirmation notification | FAIL | `notify-appointment-created` requires `appointment.leads.owner_profile_id`; nil for direct bookings |
| Contractor dashboard visibility | PASS | `useContractorDashboardData` reads appointments by `contractor_id` — verified |
| Contractor response (accept/decline) | PASS | `contractor-manage-appointment` operates on `appointments.status` |

### 7. Root causes, files, tables, fixes

| # | Failure | Root cause | File | Table | Fix |
|---|---|---|---|---|---|
| A | No leads written | Alex/booking funnel writes directly to `appointments`, never to `leads` | `src/hooks/useAppointments.ts`, `src/pages/homeowner/PageHomeownerBookingFunnel.tsx` | `leads` | On homeowner intent capture, insert a `leads` row (`lead_type='contractor'`, city, project_category) before calling `match-lead` |
| B | `match-lead` returns 0 | Selects non-existent columns | `supabase/functions/match-lead/index.ts` (lines 175-186) | `contractors`, `contractor_service_areas`, `contractor_category_assignments` | Rewrite scorer to join real tables: `business_name`, service areas via `contractor_service_areas`, categories via `contractor_category_assignments`, filter `booking_enabled AND is_accepting_appointments AND verification_status IN ('verified','pending') AND account_status='active'` |
| C | Empty eligible pool in Laval-isolation | Only 2 pros in the category and neither is booking-enabled | — | `contractors` (Isolation Solution Royal, Pros Rénovation) | Recruit isolation contractors in Laval; verify + activate the 2 existing; broaden radius via `contractor_service_areas.radius_km` |
| D | Homeowner never notified on direct booking | Notification path assumes lead exists | `supabase/functions/notify-appointment-created/index.ts` line 32, 44 | `appointments`, `notifications` | Fallback: read `appointments.homeowner_user_id` directly when `leads` join is null |
| E | Matched-path booking cannot start | Requires `match.response_status='accepted'` but no matches ever created | `supabase/functions/create-appointment-from-match/index.ts` line 94 | `matches` | Depends on fix B |

### 8. Revenue Readiness Score — **34 / 100**

| Layer | Score | Notes |
|---|---|---|
| Homeowner intake | 55/100 | Alex captures intent, but data never lands in `leads` |
| Matching | 5/100 | Automated matcher is dead code (schema mismatch) |
| Recommendation | 25/100 | View works, but eligible pool is too thin per (city × category) |
| Appointment creation | 60/100 | Direct-insert path works; matched path blocked |
| Contractor notification | 55/100 | Fires when `user_id` set + lead exists; degrades to silent on direct booking |
| Contractor visibility | 75/100 | Dashboard reads appointments cleanly |
| End-to-end conversion | 10/100 | Only path that reaches a contractor is manual public-search + direct-book |

Weighted average (equal weights): **~41**. Weighted for revenue impact (matching + conversion count double): **~34/100**.

### 9. If 100 homeowners arrive tomorrow

Assumptions (based on current 11 recommendation-eligible pros, category distribution: 4 rénovation, 2 plomberie, 2 électricité, 1 HVAC, 1 toiture, 1 peinture, 0 isolation-eligible, 0 carrelage-eligible):

| Path | Reachable homeowners | Opportunities delivered |
|---|---|---|
| Automated `match-lead` | 100 → 0 (function broken) | **0** |
| Homeowner picks pro in public search → direct book | ~40 land on public search; ~50% find a bookable pro in their city+category | **~15-20** |
| Alex handoff to booking (no lead created) | Alex qualifies ~60, but no lead + no matcher → funnel dies | **~0** |
| Homeowners in Laval + isolation specifically | 100% blocked | **0** |

**Realistic opportunities delivered to contractors: 15-20 out of 100 (~15-20% capture rate).** The 80-85% loss is concentrated in: (a) matcher schema bug, (b) thin category × city inventory, (c) no lead write-through from Alex.

### Recommended fix order (revenue-first, no changes yet — approval required)

1. **Fix B** — rewrite `match-lead` scorer against real schema. Unlocks the entire automated funnel. **Highest ROI.**
2. **Fix A** — write `leads` row from Alex booking phase so match-lead has input.
3. **Fix D** — homeowner notification fallback on direct booking.
4. **Fix C (ops)** — activate the 2 isolation contractors in Laval + recruit 3-5 more per top city×category dead zone.
5. **Fix E** — auto-flows once B is live.

Approve to proceed with build (Fix B → A → D as the first migration + edge deploy).
