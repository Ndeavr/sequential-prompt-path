# Feature Freeze Rule

**Effective:** Revenue War Room V1 deployment onward.

## Rule

No new dashboards, AI modules, homeowner features, or animations may ship until **all four thresholds** are green in `/admin/outreach-command-center`:

| Metric              | Target |
|---------------------|--------|
| SMS delivered rate  | ≥ 90 % |
| Click rate          | ≥ 5 %  |
| Registration rate   | ≥ 2 %  |
| Paid activations 7d | ≥ 3    |

Bugs, revenue-critical fixes, and the outreach engine itself are the only exceptions.

## Enforcement

- `<FeatureFreezeBanner>` reads live `v_outreach_command_funnel` + `v_first_revenue_snapshot`.
- Banner shows current values vs target; frozen state stays until every threshold passes.
- Purely informational — no route blocking. Discipline enforced by the team, not the code.

## Success condition

UNPRO acquires contractors automatically:

```
Scraping → Priority Scoring → Winning Template → SMS → Landing → Registration → Payment → Activation
```

with complete visibility of every failure point. Once green, the freeze lifts and standard feature work resumes.
