# Contractor funnel rules

- Heat-pump simulator → custom plan continuity goes through `src/lib/heatPumpSimHandoff.ts` (strict URL/local params, recomputed values, confirm before replacing existing plan values); simulated costs and "already activated" stay declared assumptions. Why: carry the visitor's goal without overriding server pricing or entitlements.
- Contractor pricing intake requires declared priorities, preferred/excluded work, service/excluded areas and capacity (src/lib/contractorIntakeQualification.ts) before compute-pricing-quote; financial goal optional, qualitative quotes send 0 value/conversion and carry input_payload.qualification. Why: never invent revenue assumptions to unlock a plan.
