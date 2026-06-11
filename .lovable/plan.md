## Restore "Trouver un pro" as prominent featured card

Revert `AlexCapabilitiesStrip.tsx` to a hierarchical layout matching the screenshot:

**Structure:**
1. Section label "CE QU'ALEX PEUT FAIRE" (unchanged)
2. **Featured card** — full-width blue card "Trouver un pro"
   - Background: solid `#2563FF` (brand blue)
   - Top label: "RECOMMANDÉ" (white/80, tracking-wide, 10px)
   - Title: "Trouver un pro" (white, bold, 18px)
   - Subtitle: "Alex vous recommande le bon professionnel selon votre besoin." (white/85, 13px)
   - Icon: `UserCheck` in soft white circle (left)
   - `ArrowRight` (white) on right
   - Radius 20, shadow blue glow
   - Topic: "vous recommander le bon professionnel"
3. **Grid 2×? below** — 5 remaining capabilities as smaller white cards (`grid-cols-2 gap-2`):
   - Comprendre un problème (HelpCircle)
   - Analyser une photo (Camera)
   - Estimer un coût (Calculator)
   - Comparer une soumission (FileCheck)
   - Trouver des subventions (BadgePercent)
   - White bg, `#EFF6FF` icon circle, `#0B1220` text, same shadow/border tokens as current

**Out of scope:** background layers, hero, orb, nav, copy elsewhere.

**File:** `src/components/home-unicorn/AlexCapabilitiesStrip.tsx` only.
