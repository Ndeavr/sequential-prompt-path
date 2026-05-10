## UNPRO Intelligence Journal — Authority Content Infrastructure

A premium long-form publication layer designed to be quoted by journalists, ingested by NotebookLM, retrieved by Perplexity/ChatGPT/Gemini, and trusted by investors. Not a blog. Not SEO spam. An infrastructure thesis published as living documents.

---

### 1. New route & namespace

- `/journal` — Index (cinematic dark hero, manifesto, featured thesis, taxonomy)
- `/journal/:slug` — Long-form reader (2,500–6,000 words)
- `/journal/serie/:serieSlug` — Series hub (e.g. *Property Intelligence Thesis*)
- `/journal/entite/:entitySlug` — Entity pages (Home Passport, Property Memory, AI Operating System…) — semantic graph nodes

Kept separate from `/blog` (existing SEO content) and `/articles` (compressed feed). Journal = flagship authority tier.

---

### 2. Database (one migration)

Tables (all RLS, public read for `status='published'`, admin write):

- `journal_articles` — slug, title, dek, h1, body_md, body_html, summary_short, summary_long, key_takeaways[], quotable_statements[], reading_time_minutes, word_count, status (draft|review|published|archived), tier (flagship|thesis|report|essay), serie_id, hero_image_url, published_at, updated_at, ai_optimized_score, aeo_score
- `journal_series` — slug, title, description, order_index, theme_color
- `journal_entities` — slug, name, category (concept|product|infrastructure|stakeholder|geography), short_definition, long_definition, aliases[], related_entity_ids[]
- `journal_article_entities` — many-to-many w/ relevance_weight (1–10) for entity density graph
- `journal_article_faqs` — question, answer, order_index (powers FAQPage JSON-LD)
- `journal_article_citations` — quote, source, source_url, citation_type (stat|quote|source)
- `journal_article_sections` — anchor_id, heading, level, body_md (enables semantic chunking + ToC + AI ingestion endpoints)
- `journal_internal_links` — from_article_id → to_article_id|to_entity_id, anchor_text (auto-generated semantic graph)

---

### 3. AI-readability endpoints (edge functions)

Built specifically for NotebookLM, Perplexity, ChatGPT browsing, Gemini Deep Research:

- `GET /functions/v1/journal-export-corpus` → returns full corpus as plain Markdown w/ entity headers (one-shot NotebookLM ingestion)
- `GET /functions/v1/journal-article/:slug.md` → clean Markdown view
- `GET /functions/v1/journal-article/:slug.json` → structured JSON (sections, entities, citations, FAQ, takeaways)
- `GET /functions/v1/journal-entities.json` → entity graph with relations
- `GET /functions/v1/journal-sitemap.xml` → priority 1.0 with `<lastmod>`
- `/llms.txt` and `/llms-full.txt` at root — official AI ingestion convention pointing to corpus

---

### 4. AI Content Engine (admin)

`/admin/journal` cockpit (admin-only via `adminGuard`):

- **DraftStudio** — Brief form (topic, angle, target entities, target word count, tier) → calls `journal-generate-draft` edge function (Gemini 2.5 Pro w/ extended reasoning) → returns structured article with: dek, sections, key_takeaways, quotable_statements, FAQ, suggested entities, suggested citations
- **EntityLinker** — auto-detects entity mentions in body, proposes links, builds `journal_article_entities`
- **SemanticTagger** — extracts topics, geo, stakeholders → tags rows
- **AIReadabilityScore** — heuristic + LLM scoring on: heading hierarchy, entity density, quotable density, citation count, terminology consistency
- **PublishGate** — requires score ≥ 80, ≥ 5 entities, ≥ 3 quotable_statements, ≥ 5 FAQ, ≥ 3 citations before allowing publish
- **PressKit generator** — outputs PDF + plain-text quote sheet per article (for journalists)

Generation prompt enforces: Apple/Stripe/a16z voice, no buzzwords, layered reasoning, infrastructure framing, entity reinforcement (Home Passport, Property Memory, AI Operating System, Property Intelligence, Trust Infrastructure, Semi-Autonomous Organization, AI Orchestration).

---

### 5. Reader UX (cinematic premium)

`/journal/:slug` page composition (mobile-first, fr-CA):

- **HeroJournalArticle** — full-bleed dark, dek, reading time, series badge, author "UNPRO Research"
- **JournalTableOfContents** — sticky on desktop, drawer on mobile, anchored to `journal_article_sections`
- **JournalKeyTakeaways** — card grid above-fold (3–5 bullets, screenshot-friendly for press)
- **JournalQuotableBlock** — large pull quotes w/ one-tap copy (press-optimized)
- **JournalEntityChip** — inline entity links → `/journal/entite/:slug`
- **JournalCitationFootnote** — numbered, hover preview
- **JournalSectionDivider** — Roman numeral chapters (Apple whitepaper feel)
- **JournalRelatedThesis** — graph-driven recommendations (same series + shared entities)
- **JournalPressKitBar** — "Copier les citations" / "Télécharger le press kit" / "Citer cet article"
- **JournalAIReadyBadge** — discreet "Optimized for AI retrieval" footer mark

Typography: serif display headings (existing `font-display`), generous spacing, 75ch max line width. Subtle scroll-driven motion via existing framer-motion. Reuses `landing-warm` for public reading surface.

---

### 6. SEO / AEO injection

Per-article in `<head>`:

- Article + BreadcrumbList JSON-LD (extend existing `SectionArticleStructuredData`)
- FAQPage JSON-LD from `journal_article_faqs`
- DefinedTerm JSON-LD per entity mention
- ClaimReview-ready structure for quotable_statements
- `og:type=article`, `article:published_time`, `article:author`
- Canonical, hreflang `fr-CA`
- `<link rel="alternate" type="text/markdown" href=".../slug.md">` for AI crawlers

Sitemap entry priority 1.0. Internal linking: each article must link ≥ 3 other journal articles + ≥ 5 entity pages (enforced at publish gate).

---

### 7. Seeded launch corpus (5 flagship pieces)

Auto-generated via DraftStudio, human-reviewed, published at launch:

1. *La fin du marché des soumissions : pourquoi l'infrastructure remplace la mise en relation*
2. *Home Passport : la mémoire manquante de la propriété résidentielle*
3. *L'organisation semi-autonome : comment l'IA exécute le réel*
4. *Property Intelligence : du bâtiment statique au jumeau prédictif*
5. *Trust Infrastructure : pourquoi la confiance devient le moteur économique des services à domicile*

Each: 3,500–5,000 words, 8–12 sections, 6+ entities, 5+ quotables, 5+ citations.

---

### 8. Out of scope (this build)

- No Alex changes
- No homepage rebuild
- No changes to existing `/blog` or `/articles`
- No press CRM (only press kit export)

---

### Success criteria

- 5 flagship articles live at `/journal`
- Full corpus retrievable via `/llms-full.txt` and `*.md` endpoints
- NotebookLM ingests corpus and answers UNPRO thesis questions accurately
- Each article passes publish gate (entities, quotables, FAQ, citations)
- Admin can generate, score, link, and publish a new flagship in < 30 min
- Lighthouse SEO ≥ 95, valid Article + FAQPage schema

---

### Technical notes

- Stack: Vite/React/TS, Tailwind, shadcn, Supabase, Lovable AI Gateway (`google/gemini-2.5-pro` for drafting w/ `reasoning.effort: high`, `gemini-3-flash-preview` for scoring/tagging)
- Reuses: `BlockArticleParagraphReadable`, `SectionArticleFAQSEO`, `SectionArticleStructuredData`, `landing-warm` theme, `adminGuard`
- New components live under `src/components/journal/`
- Edge functions under `supabase/functions/journal-*`

Execution deferred until credits refill. Plan saved to `.lovable/plan.md` on approval.
