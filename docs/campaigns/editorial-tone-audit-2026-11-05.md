# Editorial tone audit — 2026-11-05

Rule: `docs/EDITORIAL_RULES.md`.

## Inspected (rg over src/, supabase/functions prompts)
Combined-savings campaign data/renderer (/vision, /en/vision, both articles, /communique, /en/press-release), /impact, home metadata, contractor simulator fine print, Clara pronunciation rules (prompts, TTS sanitizer, brand identity).

## Changed
- `src/data/combinedSavingsCampaign.ts` (FR/EN)
  - Hero label: "Scénario de planification, pas des économies mesurées ni une prévision validée." → "Un objectif ambitieux, construit sur un scénario clair."
  - Section title: "Un modèle transparent, pas un compteur de résultats" → "Comment on arrive à 100 millions $"
  - Démarche: "Aucun programme de mesure opérationnel ni résultat validé…" → "Concrètement : comparer des dépenses documentées à une référence pertinente, soustraire les coûts UNPRO et suivre la part réellement répercutée dans les prix."
  - FAQ: "Les économies réelles mesurées sont inconnues." → "C'est notre objectif pour 2027–2036. Nous ajusterons nos projections à partir des résultats observés."
  - Removed repeated "ni un rabais garanti", "ni une promesse de rendement", "pas une garantie de recommandation…", "jusqu'à zéro", "pas un engagement contractuel".
- `src/pages/PageCombinedSavings.tsx`: removed the "Économies réellement mesurées : inconnues." line.
- `src/pages/PageImpactCounter.tsx`: methodology "peuvent être nulles / ni des résultats obtenus" → "varient selon le projet; nous ajusterons ce scénario à partir des résultats observés."
- `docs/campaigns/combined-savings-2027-2036.md`: methodology guidance reconciled with the rule.

- FAQ "Les 100 millions $ ont-ils déjà été économisés? Non. …" → "Où en est l’objectif de 100 millions $? C’est notre objectif pour 2027–2036…" (FR/EN).

## Preserved (material / truthful)
Formula 4 000 × 2 500 $ × 10 = 100 M$, 60/40 split, "not counted twice", 1 000 $ per business across all projects (not per homeowner), time ≠ cash, 3 000 vs 4 000 distinction, compliance-first section, heat-pump simulator fine print (user-run simulation), all 350 $ activation terms and appointment entitlements, legal/consent pages.

## Pronunciation
Already enforced: prompts (`alex-french-voice.ts`, `alexResponseEngine.ts`), `prepareAlexSpeechText.ts` (fixes "une pro"), `unproIdentity.ts` forbidden list. No change needed.

## Limitations
- DB-stored content (journal articles, SEO pages, AEO blocks, outbound templates) not edited: no safe bulk content edit without backend writes; not audited row by row.
- External ads/posts (Facebook etc.) not edited; the 100M Facebook post is already benefit-led.
- Not yet deployed.
