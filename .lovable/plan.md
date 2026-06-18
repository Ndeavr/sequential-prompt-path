# UNPRO Brand, Alex Positioning & Compatibility Engine Overhaul

Goal: eliminate ambiguity around UNPRO (pronunciation, meaning, moat), reposition Alex as the AI Matchmaker, and surface the DNA Matching system as the visible moat — for humans, crawlers, and LLMs.

Scope is intentionally **presentation + schema + copy + one new component**, plus a single new public page that explains the DNA system. Existing DNA engines (`src/services/dnaEngine`, `homeowner_dna_profiles`, `contractor_dna_profiles`, `dna_fit_results`, match engine) already exist — we surface them, we don't rebuild them.

## 1. New reusable component

`src/components/brand/BrandPronunciation.tsx`
- Props: `variant: "inline" | "card" | "footer"`, `lang?: "fr" | "en"`
- Renders: `UNPRO` + "Prononcé : « Un Pro » (FR) / « Hun Pro » (EN)" + "Signifie : Le #1 Professionnel"
- Used on: Home, Footer, About, `/pourquoi-unpro`, contractor + homeowner landings, new `/comment-ca-marche` page.

## 2. Homepage hero rewrite (FR-first, EN secondary)

Edit `src/components/home/HeroSectionAlexFirst.tsx` (and any sub-copy file it pulls from):
- H1: **« Trouvez votre Pro. »**
- Sub: « Alex analyse votre projet, vos préférences, votre budget, votre urgence et votre compatibilité pour identifier l'entrepreneur le plus susceptible de réussir. »
- Support: « Pas trois soumissions. Pas dix appels. Une seule recommandation intelligente. »
- Primary CTA: **Parler à Alex** → `/alex`
- Secondary CTA: **Comment fonctionne le matching** → `/comment-ca-marche`

Keep all existing visual system (Cinematic Dark, orb, glass tokens) — copy-only change.

## 3. Global copy sweep (find/replace, FR + EN)

Replace across `src/pages/**`, `src/components/**`, `src/seo/**`, `public/llms*.txt`:
- « Comparer des entrepreneurs » → « Trouver votre meilleur match »
- « Demander des soumissions » → « Démarrer le matching »
- « Obtenir plusieurs soumissions » → « Découvrir votre score de compatibilité »
- "Compare contractors" → "Find your best match" (EN)
- "Request quotes" / "Get multiple bids" → "Start matching" / "Discover your compatibility score"

Will use `rg` to enumerate hits before editing; only touch user-facing strings, never variable names or DB columns.

## 4. Alex repositioning copy

- `src/config/alexModes.ts` + Alex intro lines: tag Alex as **« Le Matchmaker IA d'UNPRO »** (alt: Conseiller Habitation IA, Guide d'Intelligence Résidentielle).
- One-line definition surfaced on Home, `/alex` empty state, footer, schema: *« Alex aide les propriétaires à découvrir l'entrepreneur le plus susceptible de réussir sur leur projet précis. »*
- Do **not** touch the voice kernel, prompts, or session state — copy/labels only.

## 5. New public page: `/comment-ca-marche`

`src/pages/PageHowMatchingWorks.tsx` + route in `src/app/router.tsx`. Explains the 6 DNA layers as the visible moat:

```text
Homeowner DNA → Project DNA → Contractor DNA
       ↓             ↓             ↓
        → Trust DNA + Availability DNA + Success DNA →
                        ↓
              Compatibility Score (0-100)
                        ↓
            Recommandation + Projets similaires
```

Sections:
1. Hero: « Le Score de Compatibilité » + example 96 %
2. The 6 DNAs (cards, plain-language bullet list per memory)
3. "Projets similaires aux vôtres" sample block (3 stat cards)
4. Pronunciation + meaning block (`BrandPronunciation` card variant)
5. CTA: « Parler à Alex »

Reuses existing `MainLayout`, glass tokens, `landing-warm` for public visibility consistency.

## 6. Contractor & Homeowner landing copy

- Contractor landings (`src/pages/contractor/*` hero blocks): H1 **« Devenez le professionnel que l'IA recommande. »** + « UNPRO ne recommande pas l'entrepreneur avec le plus gros budget pub. UNPRO recommande celui le plus susceptible de réussir. »
- Homeowner landing variants: H1 **« Le meilleur entrepreneur n'est pas celui qui a le plus d'avis. »** + « C'est celui qui correspond le mieux à votre projet. Alex identifie ce match. »

## 7. Schema + LLM corpus

- `index.html` Organization JSON-LD: add `alternateName: ["Un Pro", "Hun Pro", "The #1 Professional"]`; rewrite `description` to the official compatibility-engine definition.
- `src/components/home-intelligence/EntityDefinitionBlock.tsx`: update copy to match (Compatibility Engine framing, Alex = AI Matchmaker).
- `public/llms.txt` + `public/llms-full.txt`: add **Pronunciation**, **Meaning**, **Alex role**, **Knowledge Graph** (entities + relationships from the request), **Compatibility Score**, **Similar Project Intelligence** sections. Add `/comment-ca-marche` to `public/sitemap.xml` and `public/sitemap-pages.xml`.
- `src/seo/components/SchemaStack.tsx` (or wherever Organization schema is centralized): same `alternateName` + description update so per-route schema stays consistent.

## 8. Knowledge graph asset

`public/knowledge-graph.json` — static JSON-LD `@graph` with the 11 entities and 6 relationships from the brief, linked from `llms.txt` and from a `<link rel="alternate" type="application/ld+json" href="/knowledge-graph.json">` on Home and `/comment-ca-marche`.

## Out of scope (explicitly not touched)

- Voice kernel, Alex prompts, voice config (`alexVoiceConfig.ts`).
- DNA engine logic, matching engine, scoring weights, DB schema.
- Pricing, checkout, outbound, admin cockpits.
- Critical Path Audit work from previous turns.

## Technical notes

- All new copy is fr-CA first per Core memory; EN strings live only where the page already has an EN variant.
- No DB migration. No edge function changes.
- Public pages stay on `landing-warm`; app surfaces stay on `alex-immersive` — wrap new page root accordingly to respect the UI Readability rule.
- Verification: `rg` audit that "3 soumissions" / "comparer des entrepreneurs" / "Get 3 quotes" no longer appear in user-facing strings, plus a Playwright pass on `/`, `/comment-ca-marche`, contractor landing at 384×706 to confirm hero copy and pronunciation block render.

## Files touched (estimate)

- Created: `src/components/brand/BrandPronunciation.tsx`, `src/pages/PageHowMatchingWorks.tsx`, `public/knowledge-graph.json`
- Edited: `src/components/home/HeroSectionAlexFirst.tsx`, `src/components/home-intelligence/EntityDefinitionBlock.tsx`, `src/app/router.tsx`, `index.html`, `src/seo/components/SchemaStack.tsx`, `public/llms.txt`, `public/llms-full.txt`, `public/sitemap.xml`, `public/sitemap-pages.xml`, `src/config/alexModes.ts`, contractor + homeowner landing hero files, MainLayout footer.
