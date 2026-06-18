## Refonte sitemaps LLM-first

Remplacer le `public/sitemap.xml` statique de 2393 lignes et le script `generate-ai-sitemap.ts` par un système dynamique généré depuis Supabase, optimisé pour les crawlers IA (GPTBot, ClaudeBot, PerplexityBot, Google-Extended) ET les moteurs classiques.

### Architecture

```text
public/sitemap.xml              → sitemap index (pointeur vers les 6 enfants)
public/sitemap-pages.xml        → routes statiques publiques (~60 pages piliers)
public/sitemap-blog.xml         → blog_articles WHERE status='published'
public/sitemap-journal.xml      → journal_articles WHERE published=true
public/sitemap-ai-entities.xml  → ai_entities WHERE published=true (remplace ai-sitemap.xml)
public/sitemap-problems.xml     → home_problems + home_problem_city_pages
public/sitemap-contractors.xml  → contractor_profiles publics

public/llms.txt                 → index court (nettoyé, format llmstxt.org)
public/llms-full.txt            → corpus complet (markdown) : piliers + blog + journal + ai-entities
```

### Génération

Un seul script `scripts/generate-sitemaps.ts` (remplace `generate-ai-sitemap.ts`) lancé via `predev` + `prebuild` :

- Lit `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (anon, lecture publique)
- Récupère en parallèle : `blog_articles`, `journal_articles`, `ai_entities`, `home_problems`, `home_problem_city_pages`, `contractor_profiles` (publics)
- Écrit les 6 sitemaps enfants + le sitemap index + `llms-full.txt`
- Fail-soft : si Supabase est down, écrit des sitemaps vides plutôt que de bloquer le build
- Garde `BASE_URL = "https://unpro.ca"`

### llms.txt nettoyé

Garde structure llmstxt.org actuelle mais ajoute :
- Lien explicite vers `llms-full.txt`
- Bloc `## API publique` avec exemples curl
- Section `## Sitemaps` listant les 6 sitemaps
- Citation préférée enrichie (auteur UNPRO, licence)

### llms-full.txt (nouveau)

Corpus markdown concaténé, format :
```
# UNPRO — Corpus complet

## Pages piliers
[manifeste, pourquoi-unpro, intelligence, pim, cest-quoi-unpro, pourquoi-pas-trois-soumissions]
→ contenu markdown extrait

## Articles blog (N)
### {title}
URL: {url} | Publié: {date}
{content_markdown}
---

## Journal d'autorité (N)
### {title}
{content}
---

## AI Entities (N)
### {name}
{description + services + zones}
---
```

### robots.txt — autorisations LLM explicites

Ajoute en tête, AVANT le `User-agent: *` existant :
```
# LLM crawlers — explicitement autorisés
User-agent: GPTBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Claude-Web
Allow: /
User-agent: anthropic-ai
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Perplexity-User
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: CCBot
Allow: /
User-agent: Applebot-Extended
Allow: /
User-agent: Bytespider
Allow: /
User-agent: meta-externalagent
Allow: /
```

Garde les `Disallow` existants (admin/, dashboard/, etc.) sous `User-agent: *`.
Met à jour les directives `Sitemap:` pour pointer vers tous les sitemaps enfants + l'index.

### Fichiers touchés

**Créés**
- `scripts/generate-sitemaps.ts` (consolide + remplace `generate-ai-sitemap.ts`)
- `public/llms-full.txt` (sortie générée, versionnée vide au départ)

**Modifiés**
- `public/sitemap.xml` → devient sitemap index
- `public/llms.txt` → refonte format llmstxt.org strict
- `public/robots.txt` → ajout blocs LLM-friendly
- `package.json` → `predev` + `prebuild` invoquent `generate-sitemaps.ts`

**Supprimés**
- `scripts/generate-ai-sitemap.ts` (remplacé)
- `public/ai-sitemap.xml` (remplacé par `sitemap-ai-entities.xml`)

### Hors scope

- Pas d'edge function temps réel (script build-time uniquement)
- Pas de changement de routes ou de pages
- Pas de modification du contenu des articles (extraction read-only)
- Pas de schema DB

### Succès

- `https://unpro.ca/sitemap.xml` retourne un sitemap index valide
- Les 6 sitemaps enfants reflètent l'état Supabase à chaque build
- `llms-full.txt` < 5MB, contient ≥ 100 articles/entités
- GPTBot/ClaudeBot/PerplexityBot/Google-Extended explicitement autorisés
- Aucun lien mort dans les sitemaps (URLs canoniques uniquement)
