## Alex Voice Hotfix — Revert to Premium Natural Concierge

Tighten Alex's voice tuning back to a calm, premium, human concierge. Remove cartoon/over-expressive cadence while keeping warmth and confidence. All other conversation logic, pronunciation rules ("Un Pro"), and Quebec-French understanding stay untouched.

### Changes

**File: `src/config/alexVoiceConfig.ts`**

Update the three tuning profiles to land inside the new spec ranges:

- **HOMEOWNER (default + condo)**
  - `stability`: 0.56 → **0.68** (calmer, less pitch swing)
  - `similarity_boost`: 0.84 → **0.84** (kept, in range)
  - `style`: 0.14 → **0.22** (slight warmth, no cartoon)
  - `use_speaker_boost`: true (kept)
  - `speed`: 1.0 → **1.05** (only +5% faster, natural)

- **CONTRACTOR**
  - `stability`: 0.42 → **0.65**
  - `similarity_boost`: 0.82 → **0.82**
  - `style`: 0.32 → **0.26** (drop cartoon energy, keep warmth)
  - `speed`: 1.10 → **1.06**
  - `promptAddendum`: rewrite to "Conseillère stratégique calme, posée, confiance professionnelle. Chaleur subtile. Jamais excitée, jamais bubbly. Une seule question à la fois, avance vers la valeur."

- **CONDO**: inherits new HOMEOWNER baseline (already does via spread).

**File: `src/features/alex/voice/alexCorePrompt.ts`** (delivery directives)

Add/replace the voice delivery section to enforce:
- "Concierge premium humain. Calme, posée, intelligente, rassurante."
- "Chaleur subtile, jamais enjouée, jamais théâtrale, jamais cartoon."
- "Pas d'emphase sur chaque mot. Phrases courtes, naturelles."
- Inactivity line: `"Je suis toujours là si vous voulez continuer."` (replaces any cheerful re-engagement copy).
- Explicit BAD vs GOOD examples mirrored from spec.

**File: `src/engines/alexReEngagementEngine.ts`** (only if it hardcodes a cheerful inactivity prompt — verify and swap to the neutral line above).

### Out of scope

- ElevenLabs agent dashboard settings (user must keep "Overrides" enabled — already documented).
- Conversation flow, postal code handling, fallback cards, pronunciation lock — unchanged.
- Pricing engine, mobile perf work — unchanged.

### Success criteria

- Alex sounds calm + premium, not animated.
- Re-engagement copy is the soft neutral line.
- All three modes (homeowner, contractor, condo) within target ranges.
- No regressions in existing logic / pronunciation.
