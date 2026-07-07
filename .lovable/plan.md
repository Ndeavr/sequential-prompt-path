# Purge legacy positioning — Passeport Maison everywhere

The screenshot shows `/index` (rendered by `PageHomeUnicorn.tsx`) still displaying:

> "Votre maison devrait se souvenir de tout. UNPRO conserve l'historique des rénovations, garanties, inspections et décisions importantes."
> "Intelligence résidentielle · Québec · fr-CA"

That block, plus dozens of sibling occurrences of `souvenir` / `mémoire` / `intelligence résidentielle` / `residential intelligence` / `remember everything`, still ships across pages, footer, SEO, LLM feeds, brand identity and Alex prompts. The site still reads like a marketplace with Passeport bolted on.

This plan does a **surgical global find-and-replace** driven by the canonical `src/lib/copy/passportPositioning.ts` module, plus targeted rewrites where the legacy phrase is baked into a paragraph.

## 1. Canonical replacement vocabulary

Add to `src/lib/copy/passportPositioning.ts` (single source of truth):

- `PASSPORT_TAGLINE_LONG` (Option A): *"En avez-vous assez de toujours repartir de zéro ? Votre Passeport Maison conserve l'historique de votre propriété afin de vous aider à planifier les entretiens futurs, anticiper les dépenses importantes et prendre de meilleures décisions."*
- `PASSPORT_TAGLINE_SHORT` (Option B): *"Votre Passeport Maison — l'historique de votre propriété. Les décisions de demain."*
- `PASSPORT_FOOTER_BLOCK` (Option C): *"UNPRO – Votre Passeport Maison. Conservez l'historique de votre propriété. Planifiez les entretiens futurs. Prenez de meilleures décisions."*
- `PASSPORT_CATEGORY_LABEL`: `"Passeport Maison · Québec · fr-CA"` (replaces "Intelligence résidentielle · Québec · fr-CA")
- `PASSPORT_CATEGORY_FR`: `"Plateforme Passeport Maison"` (replaces "Plateforme d'intelligence résidentielle")
- `PASSPORT_CATEGORY_EN`: `"Home Passport Platform"` (replaces "residential intelligence platform")

## 2. Files to rewrite

### Homepage / hero (the circled block)
- `src/pages/PageHomeUnicorn.tsx` line ~780 → replace the "Votre maison devrait se souvenir de tout…" paragraph and the "Intelligence résidentielle · Québec · fr-CA" caption with `PASSPORT_TAGLINE_LONG` + `PASSPORT_CATEGORY_LABEL`. Also update the `description` JSON-LD at line ~719.
- `src/components/layout/SiteFooterIntelligence.tsx` line ~94 → same tagline swap using `PASSPORT_FOOTER_BLOCK`.
- `src/pages/PageHomeCopilot.tsx` — already uses Passeport copy; only ensure meta description pulls from `PASSPORT_TAGLINE_LONG` (removes duplicated string).

### Global head / SEO / feeds
- `index.html` — `<title>`, `og:title`, `twitter:title`, JSON-LD Q&A: swap "plateforme d'intelligence résidentielle propulsée par l'IA" → `"UNPRO — Passeport Maison : plateforme d'intelligence pour propriétaires"`. Update the two FAQ answers referring to "Conseiller IA en intelligence résidentielle".
- `public/llms.txt`, `public/llms-full.txt`, `public/knowledge-graph.json`, `public/robots.txt` — replace every "intelligence résidentielle" / "residential intelligence" with Passeport-first framing, and remove the "se souvient / s'oublie / souvenirs" narrative sentences (llms-full lines 90, 1997, 2145, 2175).
- `src/lib/seoSchema.ts` line 29 — swap English description to "Home Passport platform helping homeowners…".
- `src/brand/unproIdentity.ts` — update `categoryFr`, both descriptions and the `tagFr: "La propriété se souvient de tout."` (→ `"Votre Passeport Maison."`).

### Alex prompts + guard
- `src/features/alex/voice/alexCorePrompt.ts`, `src/features/alex/voice/alexSystemPromptV2.ts` — replace any "intelligence résidentielle" / "se souvient" phrasing in Alex's self-description with Passeport-first wording (identity stays FR-only, opening unchanged).
- `src/content-guard/rules.ts` — replace the existing "Conseiller IA en intelligence résidentielle" rule with block patterns for the legacy vocabulary:
  - `"se souvenir de tout"`, `"maison qui n'oublie"`, `"home memory"`, `"remember everything"`, `"intelligence résidentielle"`, `"residential intelligence"`, `"La propriété se souvient"`.
  This locks the new positioning: any future drift fails the guard.

### PIM / Intelligence hub / other pages
- `src/pages/PagePIMLanding.tsx`, `src/pages/PageIntelligenceHub.tsx`, `src/pages/PageMemoryCenter.tsx`, `src/pages/PageHomeUnicorn.tsx`, `src/pages/QrGeneratorPage.tsx`, `src/pages/PageWhyUnpro.tsx`, `src/pages/ia-maison/PageIaMaisonHub.tsx`, `src/pages/condos/CondoCarnetPage.tsx`, `src/pages/admin/AdminJournalPage.tsx` — swap in-page "intelligence résidentielle" strings for "Passeport Maison" / "historique de propriété" / "planification". Keep section structure; only copy changes.
- PIM section components (`src/components/pim/*.tsx`), condo landing (`src/components/condo-landing/*.tsx`), `src/components/home/HeroSectionAlexFirst.tsx`, `src/components/home-copilot/HomeIntelligenceActionGrid.tsx`, `src/components/alex-voice-engine/PanelAlexContextMemory.tsx`, `src/components/flywheel/flywheelData.ts`, `src/components/visual/intelligence-bg/*` (text labels only), `src/data/iaMaisonCluster.ts`, `src/services/messages/messagingService.ts`, `src/pages/partner/PartnerCrm.tsx`, `src/components/agents/AgentMetricsPanel.tsx`, `src/components/partner/RecordConsentModal.tsx`, `src/pages/PropertyGraphPage.tsx` — same pass: replace legacy vocabulary with Passeport-first terms defined in section 1.

## 3. Do NOT touch

- Alex opening line, voice IDs, session state, backend logic, edge functions.
- SMS `isolationSprintCopy.ts` (already Passeport-aligned).
- Migration files, RLS, pricing.
- Any component that already imports from `passportPositioning.ts` correctly.

## 4. Success criteria

- `rg -in "souvenir|intelligence résidentielle|residential intelligence|remember everything|home memory|maison qui n'oublie"` returns **zero hits in `src/` and `public/`** — except inside `src/content-guard/rules.ts` (guard patterns) and this plan file.
- The `/index` hero block now reads with `PASSPORT_TAGLINE_LONG` + `PASSPORT_CATEGORY_LABEL`.
- Footer, SEO title, og tags, llms.txt, brand identity all speak "Passeport Maison" first.
- Content guard blocks any future reintroduction of the legacy phrases.
