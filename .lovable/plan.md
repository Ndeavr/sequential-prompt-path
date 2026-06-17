# Repositioning: Contractor Matching → Home Intelligence

Shift the category UNPRO occupies in Google/Gemini's understanding. Contractor matching becomes a downstream feature; home intelligence becomes the headline category.

## 1. Homepage hero rewrite

File: `src/components/home-orb/HeroOrbMockup.tsx` (current `/` via `PageHomeSimple`)
- H1 → "Votre maison a une question. Alex trouve la réponse."
- Subtitle → "Téléversez une photo ou décrivez votre situation. Alex identifie les problèmes potentiels, explique les risques, estime les coûts et recommande les prochaines étapes."
- Primary CTA → "Analyser ma situation" (opens Alex with photo/text intake)
- Secondary CTA → "Voir un exemple" (links to a demo analysis — reuse `/diagnostic` or `/exemple-analyse`)

## 2. New homepage section: AI Home Intelligence

New component: `src/components/home-intelligence/SectionAIHomeIntelligence.tsx`
Mounted on `PageHomeSimple` directly under the hero.

Title: "L'intelligence artificielle pour votre maison."

5 cards (icon + title + body):
1. Identifier un problème — "Fissure, infiltration, isolation, moisissure, toiture, ventilation, humidité."
2. Comprendre les risques — "Ce qui peut attendre. Ce qui doit être corrigé rapidement."
3. Estimer les coûts — "Ordres de grandeur basés sur des milliers de situations similaires."
4. Trouver la bonne solution — "Réparation, entretien, rénovation ou expert."
5. Trouver le bon professionnel — "Seulement lorsque nécessaire."

Cinematic dark base, glass cards, master easing, no gradient clichés (per design memory).

## 3. Entity definition block

New component: `src/components/home-intelligence/EntityDefinitionBlock.tsx`
Placed above footer on `/`, `/pourquoi-unpro`, and the new `/ia-maison` cluster pages.

Heading "Qu'est-ce que UNPRO?" + the FR copy from the brief. Rendered as semantic `<section>` with `id="entity-definition"` so it's anchorable. Mirror copy into a JSON-LD `Organization` description (see §6).

## 4. Search-and-replace tagline

Replace every UI occurrence of "Trouver, comparer et évaluer des entrepreneurs" (and close variants) with:

> "Identifier les problèmes, comprendre les risques et prendre de meilleures décisions pour votre propriété."

Sweep: `src/**/*.tsx`, `src/**/*.ts`, `index.html`, `public/llms.txt`, `src/lib/seoSchema.ts`. Spot-check meta descriptions per route. Out of scope: blog post bodies and admin-only copy.

## 5. SEO cluster `/ia-maison`

Parent page: `src/pages/ia-maison/PageIaMaisonHub.tsx` — H1 "L'intelligence artificielle pour votre maison", intro, links to 10 child pages, FAQ, JSON-LD `CollectionPage` + `FAQPage`.

10 child pages under `src/pages/ia-maison/`, each routed and added to sitemap:
- `/ia-peut-elle-detecter-fissure-fondation`
- `/ia-peut-elle-detecter-infiltration-eau`
- `/ia-peut-elle-detecter-moisissure`
- `/ia-peut-elle-analyser-soumission`
- `/ia-peut-elle-estimer-cout-renovation`
- `/ia-peut-elle-detecter-probleme-isolation`
- `/ia-peut-elle-identifier-risque-toiture`
- `/ia-peut-elle-recommander-entrepreneur`
- `/ia-maison-quebec`
- `/quest-ce-que-lintelligence-residentielle`

Use a shared template `PageIaMaisonArticle.tsx` driven by a content map (`src/data/iaMaisonCluster.ts`) so each page ships:
- Unique H1 phrased as the question
- 500–800 word answer block (Quebec angle, risk, cost, contractor insight, FAQ — per Content Intelligence skill)
- `Article` + `FAQPage` + `BreadcrumbList` JSON-LD
- CTA to Alex ("Analyser ma situation")
- Internal links to 3 sibling cluster pages + parent

Register all routes in `src/config/routeRegistry.ts` / `routesConfig.ts` and add entries to `scripts/generate-ai-sitemap.ts` (and `public/sitemap.xml` generator if separate). Add cluster to `public/llms.txt` under a new "IA Maison" section.

## 6. Schema updates

`src/lib/seoSchema.ts` → extend `organizationSchema()`:
- `description`: "AI-powered residential intelligence platform helping homeowners identify property issues, understand risks, analyze renovation projects, and connect with verified professionals."
- `alternateName`: ["UNPRO Quebec", "UNPRO Home Intelligence", "Alex Home Assistant"]
- `category` (custom) / `additionalType`: "Home Intelligence Platform"
- `knowsAbout`: ["Home intelligence", "Property risk analysis", "Renovation quote analysis", "RBQ verification", "Residential diagnostics"]

`index.html` → update sitewide `<meta name="description">` and OG description to the new meta copy.

## 7. Meta description swap

Replace, on `/` and `Home.tsx`, the description with:

> "UNPRO aide les propriétaires québécois à identifier les problèmes, comprendre les risques, analyser les soumissions et prendre de meilleures décisions pour leur propriété grâce à Alex, l'assistant IA résidentiel."

Update `<title>` to lead with home intelligence: "UNPRO — L'intelligence artificielle pour votre maison."

## 8. Alex system prompt update

Per `mem://ai/alex/system-prompt-active` — Alex opening is canonical ("Bonjour. Je suis Alex d'UNPRO…"). Update **only the contextual follow-up / intent question** used on homeowner surfaces.

Files:
- `src/config/alexModes.ts` (and any homeowner-mode prompt)
- DB-side prompt rules row for homeowner surface (via `/admin/alex` once in build mode, or migration)

New question after greeting: "Que souhaitez-vous comprendre au sujet de votre propriété aujourd'hui?"

Add example seeds (chips shown under the input):
- Pourquoi mon grenier est-il chaud?
- Cette fissure est-elle inquiétante?
- Cette soumission semble-t-elle raisonnable?
- Est-ce urgent?
- Dois-je faire réparer maintenant?

Behavioral rule added to homeowner prompt: "Only recommend a contractor after the user's situation is understood (problem + risk + urgency captured)." Wire into existing 8-phase concierge flow in `mem://ai/alex/concierge-v2-logic`.

## 9. Memory updates

Add memory `mem://positioning/home-intelligence-category` capturing:
- Category = Home Intelligence Platform (not contractor matching)
- Forbidden phrases: "trouver, comparer et évaluer des entrepreneurs", "marketplace d'entrepreneurs", "réseau d'entrepreneurs"
- Canonical positioning line + Alex opening question
Append to `mem://index.md` Core.

## Out of scope
- Backend matching/booking engines
- Contractor-side pages (`/entrepreneur/*`)
- Admin cockpits
- Article/blog body rewrites

## Success criteria
- Hero, section, entity block live on `/`
- 1 parent + 10 child cluster pages live, sitemapped, with unique JSON-LD
- Organization schema + meta description shipped sitewide
- Alex greets with the new intent question on homeowner surfaces and defers contractor recommendation until situation is understood
- No remaining UI string "trouver, comparer et évaluer"

## Technical notes
- Routes added to `routeRegistry.ts`, `routesConfig.ts`, `App.tsx` lazy imports
- Sitemap generator (`scripts/generate-ai-sitemap.ts`) extended; rerun via `predev`/`prebuild`
- `public/llms.txt` gets an "IA Maison" section listing the 10 cluster URLs
- `prerender` allowlist (per `mem://features/truth-layer-llm-citation`) extended to include `/ia-maison*` so Perplexity/ChatGPT/Claude/Google-Extended see SSR HTML
- Cluster article content authored deterministically from `iaMaisonCluster.ts` map (no LLM call at render time) for stable indexing