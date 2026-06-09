# Homepage Intelligence Refinement

Targeted copy + UX pass on `PageHomeCopilot` (route `/`). No redesign, no removed sections, no color changes. Preserves Alex, PIM, contractor sections.

## 1. Hero copy (HeroCopilotMobile)
- Title → **"L'intelligence de votre propriété commence ici."**
- Subtitle → **"Alex vous aide à comprendre les problèmes, les coûts, les risques et les solutions possibles avant de prendre une décision."**
- Input placeholder → **"Posez votre question ou décrivez votre situation…"**

## 2. Quick suggestions (chips)
Replace current list with 6 diverse intents:
- Mon sous-sol sent l'humidité
- Est-ce un problème de fondation ?
- Je veux rénover ma cuisine
- Ma thermopompe fait du bruit
- J'ai reçu une soumission
- Ai-je droit à une subvention ?

## 3. Stats ticker (PropertyIntelligenceTicker)
Remove fabricated numbers. Keep 4 labels only, no counts:
- Problèmes analysés
- Projets accompagnés
- Entrepreneurs vérifiés
- Assistance 24/7

(Lightweight label-only chips; restore numbers later when real metrics ship.)

## 4. "Ce qu'Alex peut faire" — NEW strip
Add directly below Hero, above ticker, in `PageHomeCopilot`. New component `AlexCapabilitiesStrip.tsx` (6 icon tiles, mobile 2-col / desktop 6-col, lucide icons, existing tokens):
1. Comprendre un problème (HelpCircle)
2. Analyser une photo (Camera)
3. Estimer un coût (Calculator)
4. Comparer une soumission (FileCheck)
5. Trouver des subventions (BadgePercent)
6. Recommander un professionnel (UserCheck)

Non-interactive tiles (or soft-link to `/diagnostic`). No CTA noise.

## 5. PIM section subtext
In whichever PIM block renders in `SectionsBelowFold`, replace technical subtext with:
> "Conservez rénovations, garanties, inspections, soumissions et documents importants au même endroit."

Keep headline "Votre maison devrait tout se souvenir."

## 6. "Comment fonctionne UNPRO" — 4 steps
Update the how-it-works block in `SectionsBelowFold` to 4 steps:
1. Décrivez la situation
2. Alex analyse
3. Recevez un plan d'action
4. Obtenez la bonne recommandation

## 7. Contractor section copy
Replace headline copy with:
> "Les moteurs IA commencent à influencer les décisions des propriétaires. Assurez-vous que votre entreprise fasse partie des recommandations."

## 8. Floating CTA / Orb spacing fix
- `StickyBottomAlexCTA`: reduce orb visual size ~15% (scale token / size prop), shift up ~10px (bottom offset).
- Add extra bottom padding on hero + capabilities strip so the floating element no longer overlaps content.
- Verify `FloatingMobileCTA` already hides on `/` (HIDDEN_PREFIXES includes `/`), confirmed — no change there.

## Files touched
- `src/components/home-copilot/HeroCopilotMobile.tsx` — copy + placeholder + chips + bottom spacing
- `src/components/home-copilot/PropertyIntelligenceTicker.tsx` — label-only mode
- `src/components/home-copilot/AlexCapabilitiesStrip.tsx` — NEW
- `src/components/home-copilot/SectionsBelowFold.tsx` — PIM subtext, 4-step how-it-works, contractor headline
- `src/components/home-copilot/StickyBottomAlexCTA.tsx` — size -15%, bottom offset +10px
- `src/pages/PageHomeCopilot.tsx` — mount `<AlexCapabilitiesStrip />` between Hero and Ticker

## Out of scope (per RULE ABSOLUE)
- No color/theme changes, no layout rebuild, no removal of existing sections, no Alex/PIM/router/backend changes.
