# Internal Content Guard

Empêche tout contenu destiné aux IA / dev / admin d'apparaître dans une surface user-facing (propriétaire, entrepreneur, condo).

## Patterns interdits (extrait)
- Prononciation : `Hun Pro`, `« Un Pro »`, `Le #1 Professionnel`, `se prononce`
- Jargon : `Conseiller IA en intelligence résidentielle`
- Imperatifs IA : `Alex doit`, `l'IA doit`, `le système doit`
- Prompts : `prompt:`, `instruction:`, `chain of thought`, `internal note`
- SEO interne (warn) : `NotebookLM`, `AI-readable`, `GEO`, `AEO`

Source de vérité : table `content_visibility_rules` (admin via `/admin/content-guard`).
Fallback CI : `src/content-guard/rules.ts`.

## Whitelister un fichier
Ajouter `// @content-guard:internal` dans les 400 premiers caractères du fichier, ou ajouter le chemin dans `WHITELISTED_PATHS` (`src/content-guard/rules.ts`).

Surfaces déjà whitelistées : `public/llms.txt`, `public/llms-full.txt`, `public/knowledge-graph.json`, `/ai`, `src/brand/unproIdentity.ts`, `src/components/brand/BrandPronunciation.tsx`, `index.html` (JSON-LD).

## Lancer le scan
```bash
npm run content-audit
```
Sortie : `.lovable/content-audit-report.json`. Exit code 1 si au moins une violation `block`.

## CMS / DB content
Edge function `content-audit-run` scanne les tables `faq_entries`, `blog_posts`, `landing_copy`, `email_templates`, `sms_templates`, `alex_prompts` et enregistre le rapport dans `content_audit_runs`. Disponible depuis le cockpit `/admin/content-guard`.

## Ajouter une règle
1. Ouvrir `/admin/content-guard` → bouton « Ajouter ».
2. Fournir `pattern`, `match_type` (`plain`/`regex`), `severity` (`block`/`warn`), `category`.
3. Toggle `enabled` pour activer/désactiver sans supprimer.
