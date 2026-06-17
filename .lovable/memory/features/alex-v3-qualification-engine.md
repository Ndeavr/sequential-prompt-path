---
name: Alex V3 Universal Qualification Engine
description: Hard-gates contractor recommendations behind a 0-100 qualification score >= 70 with mandatory property+problem+sub_type+urgency, per-trade decision trees, address-first identification, strict service-specialty validation, and Homeowner Qualification Graph moat
type: feature
---
Alex must qualify before recommending. ZERO exceptions.

## Hard gates (enforced in `alex-qualify-turn` + `serviceSpecialtyValidator`)
- `qualification_score >= 70`
- `property.confirmed && property.address` present (address-first, never city-first)
- `problem.category && problem.sub_type` present
- `urgency` present
- `matching_confidence >= 0.70`
- `service_category === contractor.specialty` (alias-aware via CATEGORY_ALIASES); mismatch → block + log

## Score weights (deterministic, `src/lib/alexQualification/scoringEngine.ts`)
property 25 / problem 10-20 / urgency 15 / property_type 10 / photos 10 / quotes 10 (or 5 if explicitly none) / budget 5 / compatibility 5

## Flow priority (one question per turn)
1. problem.category 2. property.address 3. problem.sub_type (category-specific tree) 4. urgency 5. property.type 6. quotes (if category invites) 7. photos (if category invites) 8. budget (optional)

## Per-trade trees
`CATEGORY_TREES` in `src/lib/alexQualification/categoryDecisionTrees.ts` — roofing, foundation, electrical, plumbing, hvac, insulation, mold, windows, kitchen_reno, landscaping. Each owns its sub_type question + quote/photo invite flags.

## Recommendation copy (always)
"Après analyse de votre projet, voici le professionnel qui correspond le mieux à votre situation." — never "Je vous recommande XYZ."

## Tables
`alex_qualification_sessions` (graph, score, ready_for_match) / `alex_qualification_turns` (audit) / `homeowner_qualification_graph` (long-term moat: property × problem × outcome × satisfaction).

## Feature flag
`alex_v3_qualification_engine` in `alexFeatureFlags.ts` (default ON, localStorage override for instant revert).
