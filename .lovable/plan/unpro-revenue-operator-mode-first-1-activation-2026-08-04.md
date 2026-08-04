# UNPRO Revenue Operator Mode — First $1 Activation

Operating mode change, not a feature plan. From here on the only KPI is: **one real contractor receives the message, understands the value, activates, and pays $1.** Assume the product already has enough features to earn that dollar. My job is to find and remove the single biggest obstacle to revenue, then re-evaluate.

## 0 — Lock the operating mode (first action)

Write two memory rules so this survives every future session:

- **Core rule:** "UNPRO operates in Revenue Operator mode. Only KPI = first real $1 contractor activation. Assume features are sufficient; identify and remove the single largest revenue blocker instead of building. No new features unless they directly raise today's probability of a paid activation."
- **Constraint memory:** never rebuild existing systems — inspect, reuse, repair; replace only when repair is impossible.

Every future task gets tested against one question: does this increase the probability of the first $1 today? If no, it goes to a backlog file and is not built.

## 1 — Daily loop (the actual work)

Each session runs this loop, and only this loop:

```text
inspect production funnel
  -> rank blockers by lost revenue probability
  -> fix the single largest one
  -> verify with real production data
  -> re-evaluate
```

No parallel feature work. No polish. One blocker at a time.

## 2 — First inspection pass (this session)

Two contradictions in production data must be resolved before anything else, because every decision downstream depends on knowing the truth:

- Aggregate counters report 27 SMS sent but 0 delivered and 0 clicked, while the per-prospect funnel view carries real delivery data. One of the two is lying. Until this is settled, "nobody clicks" cannot be distinguished from "the counter is broken", and I could rewrite a perfectly good SMS for nothing.
- One prospect is recorded as paid but zero are activated. A payment that did not become an active contractor is the single most expensive failure in the system. Trace that one record end to end: Stripe session, webhook delivery, activation write.

Both are diagnostics on existing systems, not new construction.

## 3 — Blocker ranking, in the order revenue is lost

Once the numbers are trustworthy, walk the funnel from the money backwards and fix the first stage that is actually leaking:

1. **Paid but not activated** — worst case, money taken without delivery. Highest priority.
2. **Clicked but not paid** — landing and activation friction. I open the link on a phone as a contractor would and remove every click that isn't required to reach checkout.
3. **Delivered but not clicked** — SMS copy, CTA, sender trust. Rewrite and A/B against the existing template performance table.
4. **Sent but not delivered** — Twilio landline/carrier failures. Route those prospects to email instead of burning them.
5. **Eligible but not sent** — targeting and queue starvation. Rank by likelihood to pay (recent reviews, no website, weak AI readiness, high-demand category and city) and work the top of that list first.

Only the stage that is currently costing the most gets worked. The rest wait.

## 4 — What I will not do

No SEO, sitemap, AI corpus, content, or Alex work. No redesigns. No new admin pages unless a page is the only way to see a blocker. No refactors. Existing tools (Launch Control, CRM, funnel views, orchestrator) get repaired and reused, never rebuilt.

## 5 — Definition of done

Not a green build. Done is: a real contractor gets the SMS, opens the link, activates, pays $1, the webhook fires, the contractor is active in production, and the tracker shows 1 activation. Until that row exists, the work is not finished.

## Technical notes

- Diagnosis first, using `v_prospect_funnel`, `v_pipeline_funnel_counts`, `v_first_dollar_tracker`, `sms_events_v2`, `contractor_funnel_events`, Stripe events, and Twilio callback rows. Real rows only — no estimates.
- Fixes are surgical edits to existing edge functions (`activation-token-resolve`, `create-activation-checkout`, `stripe-webhook`, `second-touch-outreach`, `recruitment-orchestrator`) and the views that disagree.
- Memory writes: one Core rule plus one constraint entry in the project memory index.
