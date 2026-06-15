# Plan — UNPRO Operating System Skill Pack

Create 11 workspace skills that auto-activate via description/trigger matching to make Lovable behave as an autonomous UNPRO product team.

## Skills to create

Each skill = directory `.agents/skills/<slug>/SKILL.md` with YAML frontmatter (`name`, `description`) + body. After all 11 are written, each is activated with `skills--apply_draft`.

| # | Slug | Triggers on |
|---|---|---|
| 1 | `unpro-operating-system` | create, build, implement, feature, page, dashboard, workflow, automation, database, contractor, homeowner, alex, unpro |
| 2 | `unpro-database-architect` | database, schema, supabase, table(s), relationship, migration |
| 3 | `homeowner-intelligence-engine` | homeowner, passport, house, property, pim, inspection, quote, invoice |
| 4 | `alex-ai-orchestrator` | alex, assistant, chat, voice, conversation |
| 5 | `contractor-intelligence-engine` | contractor, entrepreneur, company, business, onboarding, subscription |
| 6 | `automation-architect` | automation, agent, workflow, scraper, email, sms, pipeline |
| 7 | `revenue-maximizer` | pricing, plans, subscription, payment, stripe, conversion, sales |
| 8 | `mobile-ux-enforcer` | ui, ux, mobile, design, screen, layout |
| 9 | `unpro-content-intelligence` | article, blog, seo, geo, aeo, content, faq |
| 10 | `autonomous-qa-auditor` | review, audit, check, validate, fix |
| 11 | `unpro-god-mode` | major build requests — composes skills 1-10 |

## Frontmatter shape

```yaml
---
name: <slug>
description: <one line: what + when it triggers, includes the trigger keywords so retrieval matches>
---
```

Bodies follow the exact instructions provided in the user message (Master priorities, DB rules, Alex flow, contractor promise, automation states, revenue-first stack, mobile-first rules, content as Housing Intelligence Reports, QA checklist, God Mode composition).

## Execution

1. Write 11 `SKILL.md` drafts under `.agents/skills/<slug>/` in parallel.
2. Call `skills--apply_draft` for each to activate workspace-wide.
3. Confirm activation; user can manage them in Settings > Skills.

## Out of scope

No code, DB, or UI changes — skills only. No edits under `.workspace/skills/` directly (drafts go through `apply_draft`).
