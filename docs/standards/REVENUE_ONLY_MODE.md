# Revenue-Only Mode

**Effective:** From the accepted "GET THE FIRST PAID $1 CONTRACTORS TODAY" directive onward.
**Extends:** `docs/standards/FEATURE_FREEZE.md`.

## Rule

Until at least **2 real `$1` payments per day** are flowing consistently for 3
consecutive days, the agent must refuse every change that is not on the
click → register → OTP → pay → activate path.

Refuse (or defer to a follow-up backlog):

- New pages, redesigns, animations, marketing content
- SEO / sitemap / AI corpus edits
- New dashboards or analytics that don't fix a real blocker in the funnel
- UI polish that does not shorten time-to-payment
- Refactors, migrations, or renames that do not remove a proven revenue blocker

Allowed:

- Any fix that directly removes a step-blocker between scraped and activated
- Any observability that surfaces a blocker with a real DB row as evidence
- Manual overrides (activation, retry, quarantine) that let the operator ship revenue this hour
- Bug fixes on Twilio, Resend, Stripe, activation, or the invitation landing

## Truth source

Every counter, KPI, and "blocker" chip must trace back to a real row in:

- `v_first_dollar_tracker`
- `v_launch_funnel`
- `v_pipeline_funnel_counts`
- `acquisition_pipeline_events`

No mocked, estimated, or interpolated numbers. Ever.

## Definition of Done for today

- ≥ 20 invitations sent (SMS or email)
- ≥ 5 contractor registrations started
- ≥ 3 OTP completions
- ≥ 2 Stripe `$1` payments
- ≥ 2 contractors marked `active`

If any threshold isn't hit, the next action is: open Launch Control
(`/admin/launch-control`), identify the flat counter, open the corresponding
timeline row for the blocked prospect, ship the smallest possible fix.

## Enforcement

- `RevenueWall` component is rendered above every `/admin/*` page.
- Any PR/commit outside this scope requires an explicit override sentence
  from the founder in the request.
