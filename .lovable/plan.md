# UNPRO Global Brand Intelligence & AI Knowledge Graph

Repositions UNPRO from "AI compatibility engine for matching" → **AI-powered Homeowner Intelligence Platform** with 6 pillars (Home Passport, Home Score, Predictive Maintenance, Property Planning, Contractor Compatibility, Condo Intelligence) and Alex as **AI Home Intelligence Advisor**. Contractor matching becomes ONE pillar, not the headline.

---

## 1. Canonical Brand Source of Truth

**New** `src/brand/unproIdentity.ts` — single exported object consumed everywhere (schema, footer, meta, BrandPronunciation, /ai page, llms.txt generator):

- `name`, `meaning` (UN=Number One, PRO=Professional), `pronunciation` (FR "Un Pro" / EN "Hun Pro")
- `category`: "AI-Powered Homeowner Intelligence Platform"
- `descriptionShort`, `descriptionLong`, `metaTemplate`
- `pillars[]` (6 pillars with id, title FR/EN, definition)
- `alex` (role, secondary roles, definition)
- `knowledgeGraph` entities + relationships
- `faqs[]` (12 canonical Q/A)

Update `src/components/brand/BrandPronunciation.tsx` to read from this source.

## 2. Expanded Knowledge Graph

Rewrite `public/knowledge-graph.json`:
- Add entities: HomePassport, HomeScore, PredictiveMaintenance, PropertyPlanning, CondoIntelligence, PropertyIntelligence, HomeownerDNA, ProjectDNA, ContractorDNA, RecommendationEngine, SimilarProjectIntelligence, Alex, UNPRO
- Add 15+ relationships (UNPRO→hasModule→pillar, Alex→advisesOn→pillar, Pillar→supports→Outcome)
- Add FAQPage entries (sitewide truth)

## 3. Sitewide Head & Schema

`index.html`:
- `<title>` → "UNPRO — Plateforme d'intelligence résidentielle propulsée par l'IA"
- meta description → canonical template
- Organization JSON-LD: category "AI-Powered Homeowner Intelligence Platform", expanded `knowsAbout` (6 pillars + DNA layers + Home Passport/Score), `hasOfferCatalog` listing the 6 pillars as Services
- SoftwareApplication (Alex): rename role "AI Home Intelligence Advisor" (primary), keep "AI Matchmaker" as secondary
- New sitewide FAQPage JSON-LD with 12 canonical Q/A

## 4. New Public Page `/ai` — AI Crawler Landing

`src/pages/PageAICrawlerLanding.tsx` + route in `src/router.tsx`.

Machine-readable, no marketing fluff. Sections:
- Brand definition (name, meaning, pronunciation FR/EN)
- Category statement
- Knowledge graph (entities + relationships, rendered as `<dl>` + inline JSON-LD)
- Alex definition + roles
- Each pillar with definition: Home Passport, Home Score, Predictive Maintenance, Property Planning, Contractor Compatibility (with Homeowner/Project/Contractor DNA + Compatibility Score), Condo Intelligence
- Structured FAQ (visible + JSON-LD)
- `<link rel="alternate" type="application/ld+json" href="/knowledge-graph.json">`

Add to sitemap + robots-friendly. Link from footer + `llms.txt`.

## 5. LLM Corpus Updates

- `public/llms.txt` + `public/llms-full.txt`: rewrite intro with new category, add full 6-pillar definitions, Alex as AI Home Intelligence Advisor, pronunciation + meaning block, knowledge graph entity list, link to `/ai` and `/knowledge-graph.json`
- `public/sitemap.xml` + `public/sitemap-pages.xml`: add `/ai`

## 6. Homepage + Hero Realignment

`src/components/home/HeroSectionAlexFirst.tsx`:
- Keep "Trouvez votre Pro." H1 but reposition subhead → "UNPRO est votre plateforme d'intelligence résidentielle : Passeport Maison, Score Maison, maintenance prédictive, planification de rénovations et jumelage d'entrepreneur — guidé par Alex."
- Show pillar pills below CTAs (6 pillars).

`src/components/home-intelligence/EntityDefinitionBlock.tsx`: rewrite definition to new canonical wording, surface all 6 pillars + Alex role.

## 7. Sitewide Messaging Rule Enforcement

New small component `src/components/brand/PillarStrip.tsx` — horizontal strip of 6 pillar chips, drop into:
- Homepage (already covered by hero update)
- `PageHowMatchingWorks` (`/comment-ca-marche`) — add "Contractor Matching is one pillar of UNPRO" banner linking to /ai
- `PagePIMLanding` (`/pim`) — surface Home Passport in context of full platform
- Contractor landing hero — keep contractor angle but add small "Part of UNPRO Homeowner Intelligence Platform" footer band
- Footer (`MainLayout`) — add compact pillar links

Goal: every major page mentions ≥3 pillars + Alex.

## 8. Meta/Description Sweep

- `src/pages/PagePIMLanding.tsx`, `src/pages/CommentCaMarchePage.tsx`, contractor + homeowner landings, journal landing: update Helmet `<title>` + meta description to follow the canonical template (lead with "UNPRO — plateforme d'intelligence résidentielle…").
- Reuse helper `buildMetaDescription(pillarFocus)` from `unproIdentity.ts`.

## 9. Alex Naming

- `src/config/alexModes.ts`: primary role string → "AI Home Intelligence Advisor" (FR: "Conseiller IA en intelligence résidentielle"), secondaries → AI Matchmaker, Property Intelligence Guide, Home Passport Advisor, Property Planning Assistant
- Footer + `/alex` empty state copy updated.

**Out of scope (untouched):** Alex voice kernel, prompts, session state, DNA scoring engine internals, DB schema, pricing, checkout, Critical Path Audit, admin cockpits, edge functions.

---

## Technical details

**New files**
- `src/brand/unproIdentity.ts`
- `src/pages/PageAICrawlerLanding.tsx`
- `src/components/brand/PillarStrip.tsx`

**Edited files**
- `src/components/brand/BrandPronunciation.tsx`
- `src/components/home/HeroSectionAlexFirst.tsx`
- `src/components/home-intelligence/EntityDefinitionBlock.tsx`
- `src/router.tsx` (add `/ai`)
- `src/layouts/MainLayout.tsx` (footer pillars + /ai link)
- `src/config/alexModes.ts`
- `src/pages/CommentCaMarchePage.tsx`, `src/pages/PagePIMLanding.tsx`, contractor + homeowner landing hero files (Helmet + pillar strip)
- `index.html` (title, meta, Organization + SoftwareApplication + FAQPage JSON-LD)
- `public/knowledge-graph.json` (full rewrite, 13 entities, 15+ relationships, 12 FAQs)
- `public/llms.txt`, `public/llms-full.txt`
- `public/sitemap.xml`, `public/sitemap-pages.xml`

**No DB migrations. No edge functions. No backend changes.**

**Verification**
- Visit `/`, `/ai`, `/comment-ca-marche`, `/pim`, contractor landing on mobile (384px) and desktop — confirm pillar strip + new copy render.
- View-source `index.html` to confirm 3 JSON-LD blocks (Organization, SoftwareApplication, FAQPage).
- Curl `/knowledge-graph.json` and `/llms.txt` to confirm new corpus.

**Memory updates after build**
- Update `mem://index.md` Core: replace "compatibility engine" framing with "Homeowner Intelligence Platform — 6 pillars; contractor matching is one pillar".
- New memory file `mem://brand/unpro-identity-canonical` pointing at `src/brand/unproIdentity.ts` as single source of truth.