## UNPRO Truth Layer + LLM Citation Infrastructure

Repositioning UNPRO as **"Le registre intelligent des entrepreneurs RBQ au Québec"** — the citable source of truth for residential contractors in QC, optimized for LLM crawlers (Perplexity, ChatGPT, Bing, Google AI).

This is a 10-phase initiative. I'll break it into 3 shippable waves so we get crawlable value fast, then deepen the moat.

---

### Wave 1 — Citation-ready foundation (ship first)

**Goal:** within days, every contractor profile is crawlable and the site declares itself to LLMs.

1. **Global repositioning copy**
   - Replace hero H1/subtitle/CTAs on `Home.tsx`, `HeroSectionAlexFirst`, `HeroAlexCentered`, contractor landings, and meta tags.
   - New H1: *Le registre intelligent des entrepreneurs RBQ au Québec*
   - Sub: vérifier, comprendre, sélectionner via IA + RBQ + avis + territoires
   - CTAs: **Trouver un entrepreneur** / **Vérifier un entrepreneur**
   - Sweep `src/lib/copy/*`, `entrepreneurs.ts`, all landing components for forbidden phrases ("3 soumissions", "réseau d'entrepreneurs", "trouvez un entrepreneur de confiance").

2. **`/llms.txt`**
   - Add `public/llms.txt` with exact spec content (registre intelligent, primary URLs, JSON-LD types, fr-CA/en-CA, API base).
   - Verify served at `https://unpro.ca/llms.txt`.

3. **SSR/prerender for `/pro/:slug` (and `/contractor/:slug/:city`)**
   - Current pages are SPA → invisible to non-JS crawlers.
   - Reuse the existing prerender infra from `mem://features/seo-index-domination` (Googlebot prerender). Extend the bot UA list to include `PerplexityBot`, `ChatGPT-User`, `GPTBot`, `ClaudeBot`, `Google-Extended`, `Bingbot`, `Applebot-Extended`, `CCBot`.
   - Server-rendered HTML must include: business_name (H1), RBQ #, territory list, services, description, reviews, photo URLs, availability summary, UNPRO score.
   - Inject `Contractor` JSON-LD with `identifier: "RBQ XXXXX"`, `areaServed[]`, `aggregateRating`, `telephone`, `url`.

4. **PIM rename**
   - Global rename "Passeport Maison" → **PIM™ — Passeport Intelligence Maison** with sub "Le système de mémoire permanent de votre propriété".
   - Update `PagePIMLanding.tsx`, nav, copy.

---

### Wave 2 — Structured data + public API

5. **`contractor_entities` knowledge graph table** (migration)
   - Columns: `contractor_id`, `rbq_number`, `specialties[]`, `cities[]`, `regions[]`, `service_radius`, `years_experience`, `licenses jsonb`, `certifications[]`, `brands[]`, `materials[]`, `review_summary text`, `pros[]`, `cons[]`, `faq jsonb`.
   - RLS: public SELECT (anon + authenticated), service_role full.
   - Backfill script from existing `contractors` + `brand_catalog` + reviews aggregation.

6. **Public read-only API — `/api/v1/contractors`**
   - Edge function `public-contractors-api` (verify_jwt=false, rate-limited).
   - `GET /api/v1/contractors?city=&trade=&rbq=&service=` → paginated list with score, specialties, service_areas.
   - `GET /api/v1/contractors/:id` → contractor + score + service_areas + specialties + reviews + certifications.
   - Cache-Control headers + CORS open. Document in `/llms.txt`.

7. **Alex system prompt update**
   - When user asks "trouve-moi un entrepreneur", Alex replies: *"Je vais rechercher dans le registre intelligent des entrepreneurs RBQ du Québec. Quel type de travaux souhaitez-vous réaliser ?"*
   - Update `mem://ai/alex/system-prompt-active` + DB prompt rule.

---

### Wave 3 — Content moat + property graph

8. **AI-citable articles (100 seed)**
   - Categories: RBQ verification, permis (toiture Laval, etc.), fondation/drain français, isolation (épaisseur QC), toiture, électricité (maître électricien).
   - Use existing Intelligence Journal infra (`mem://features/intelligence-journal`) — Gemini 2.5 Pro generation, fr-CA, JSON-LD `Article` + `FAQPage`, internal linking to `/pro/:slug` and contractor city pages.
   - Admin cockpit batch generator with approval queue.

9. **`property_graph` table — Homeowner Data Moat**
   - Linked to `property_id`. Stores: documents, factures, soumissions, photos, garanties, inspections, sinistres, entrepreneurs, AI recommendations, detected risks, chronologie.
   - RLS: owner-only via `auth.uid()`. Service_role full for ingestion functions.
   - Wire PIM UI to read/write this graph; expose summarized view to Alex.

10. **"Pourquoi UNPRO" page** — `/pourquoi-unpro`
    - Sections: Données RBQ structurées · Entrepreneurs vérifiés · Corpus résidentiel QC · PIM · API publique · Données propriétaires exclusives · Recommandations IA explicables.
    - Internal links to API docs, /pro listing, /pim, /journal.

---

### Technical notes

- **Prerender extension**: locate the existing edge function/middleware from `seo-index-domination`. Add LLM bot UAs and ensure JSON-LD blocks are server-rendered (not Helmet-only) for `/pro/:slug`, `/contractor/:slug/:city`, `/articles/*`, `/pim`.
- **Forbidden-copy guard**: add a vitest snapshot test that fails if "3 soumissions", "réseau d'entrepreneurs", "trouvez un entrepreneur de confiance" appear in `src/`.
- **No business-logic regression**: matching, booking, pricing, Alex voice config untouched. Only copy, SSR surface, public API, schema additions.
- **Memories to update after ship**: positioning core rule (replace "3 quotes rejection" with "registre intelligent" framing), add `mem://features/truth-layer-llm-citation` referencing API + llms.txt + prerender bot list.

---

### Decisions I need from you before building

1. **Scope confirmation** — ship all 3 waves, or only Wave 1 (copy + llms.txt + SSR + PIM rename) first to validate impact?
2. **Article generation** — auto-publish the 100 articles, or generate as drafts in admin queue for manual approval?
3. **Public API auth** — fully open (anon, rate-limited by IP) or require a free API key for analytics?
4. **`property_graph`** — net-new table, or extend existing `properties` + related tables? (I'd need to inspect current schema to confirm — happy to do this in build mode.)
