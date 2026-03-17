# UNPRO — Autonomous Growth Engine

> Architecture document for the self-reinforcing growth flywheel.

## Mission

The Autonomous Growth Engine continuously generates SEO content, transformation pages, homeowner insights, contractor exposure, and project opportunities — operating as a growth flywheel with zero manual content creation.

## Core Autonomous Loop

```
Home Problem Graph
       ↓
  SEO Pages (problem × city × profession)
       ↓
  Visitors (organic search traffic)
       ↓
  Homeowner Insights (intent detection → tools)
       ↓
  Design AI (visualize renovation)
       ↓
  Project Creation (design → project brief)
       ↓
  Contractor Matching (URS scoring)
       ↓
  Completed Projects (work done, reviewed)
       ↓
  Transformation Feed (before/after published)
       ↓
  Authority Score Signals (recalculated)
       ↓
  More SEO Content (loop restarts)
```

---

## Sub-Engines

### 1. Content Expansion Engine
- **Source**: `home_problems` × `cities` × `service_categories`
- **Output**: `home_problem_city_pages` + `seo_pages`
- **Mode**: Hybrid — auto-generates to review queue, admin approves
- **AI**: Uses Lovable AI to generate localized FAQ, tips, cost ranges
- **Frequency**: Daily via `automation_agents` scheduler

### 2. City Expansion Engine
- **Logic**: For each problem, generate pages for cities where contractors exist
- **Table**: `home_problem_city_pages` (already exists)
- **Trigger**: When new contractor is verified in a new city

### 3. Transformation Discovery Engine
- **Detects**: High-demand problems (traffic) + completed projects = suggest transformation
- **Output**: `growth_events` with type `transformation_opportunity`
- **Admin**: Review and publish via operations hub

### 4. Homeowner Insight Engine
- **On SEO page visit**: Detect intent from URL pattern
- **Offer**: Home Score check, photo analysis, Design AI, contractor search
- **Powered by**: Intent-Driven CTA Engine (already exists)

### 5. Design AI Activation
- **SEO pages**: Include CTA "Visualize this renovation"
- **Pre-fill**: room_type, problem_type, solution_style from page context
- **Links**: `/design?context={problem_slug}&room={room_type}`

### 6. Project Creation Engine
- **From**: Design → Project Brief → `projects` table
- **Already exists**: `project_briefs` table with `ready_for_matching`
- **Extension**: Auto-trigger matching when brief is ready

### 7. Authority Score Signals
- **Events**: project_completed, review_submitted, transformation_published
- **Feed into**: `contractor_aipp_scores` recalculation
- **Agent**: `contractor-trust-agent` (already registered)

### 8. Traffic Intelligence
- **Track**: Page views, problem searches, conversion events
- **Table**: `growth_engine_metrics` (new)
- **Use**: Prioritize content expansion by demand signal

### 9. Transformation Promotion Engine
- **Criteria**: High engagement, high rating, strong before/after
- **Auto-promote**: Homepage, SEO pages, contractor profiles
- **Table**: `growth_events` with type `transformation_promoted`

### 10. Knowledge Graph Evolution
- **New nodes**: When new problems/solutions detected
- **Admin approval**: Via `growth_events` with type `graph_node_suggested`

---

## Database Tables

### Existing (reused)
| Table | Role in Growth Engine |
|-------|----------------------|
| `home_problems` | Source of problem ontology |
| `home_problem_city_pages` | Generated problem×city pages |
| `cities` | Geographic expansion targets |
| `contractors` | Supply-side signals |
| `seo_pages` | Published SEO content |
| `automation_agents` | Scheduler for background workers |
| `automation_jobs` | Job queue for content generation |
| `automation_runs` | Execution tracking |
| `design_projects` / `design_versions` | AI transformations |
| `project_briefs` | Design→Project conversion |
| `projects` | Active renovation projects |
| `contractor_aipp_scores` | Authority scoring |
| `adaptive_frequency_scores` | Agent frequency optimization |

### New Tables
| Table | Purpose |
|-------|---------|
| `growth_events` | Flywheel events log (all engine activities) |
| `growth_engine_metrics` | Traffic/conversion intelligence snapshots |

---

## Background Workers (Automation Agents)

| Agent Key | Category | Frequency | Purpose |
|-----------|----------|-----------|---------|
| `content-expansion` | build | daily | Generate problem×city pages |
| `city-expansion` | strategic | weekly | Expand to new cities with contractors |
| `transformation-discovery` | optimization | daily | Detect transformation opportunities |
| `traffic-analyzer` | optimization | daily | Analyze traffic → expansion signals |
| `transformation-promoter` | optimization | weekly | Promote high-quality transformations |
| `authority-recalculator` | trigger | daily | Recalculate contractor scores |
| `graph-evolution` | strategic | weekly | Suggest new problem graph nodes |

---

## Edge Function

### `autonomous-growth-engine`
Actions:
- `expand_content` — Generate problem×city pages with AI
- `analyze_traffic` — Snapshot traffic metrics
- `discover_transformations` — Find opportunities
- `promote_transformations` — Auto-promote best content
- `expand_cities` — Generate pages for new cities
- `recalculate_authority` — Update contractor scores
- `get_dashboard` — Return growth metrics for admin

---

## Admin Dashboard

### Growth Engine Dashboard (`/admin/growth-engine`)
- **Flywheel visualization**: Animated loop showing all engines
- **Metrics cards**: Pages generated, traffic growth, conversions, transformations
- **Engine status**: Each sub-engine with status, last run, next run
- **Recent events**: `growth_events` timeline
- **Expansion opportunities**: Suggested cities/problems to cover
- **Top performers**: Problems, cities, contractors by engagement

---

_Last updated: 2026-03-17_
