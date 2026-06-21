
# Internal Content Guard — Purge + Audit Automatisé

## Problème
La carte "Qu'est-ce que UNPRO ?" affiche aux propriétaires des instructions de branding LLM (« Un Pro » / "Hun Pro" / "Le #1 Professionnel"). Ces phrases ciblent ChatGPT, Gemini, Perplexity, NotebookLM, Alex — pas un humain qui cherche de l'aide pour sa maison. Risque : d'autres fuites similaires dans Alex, onboarding, FAQ, emails, SMS.

## Objectif
1. Retirer immédiatement la fuite visible sur la homepage.
2. Réécrire le bloc "Qu'est-ce que UNPRO ?" en valeur propriétaire pure.
3. Déployer un **Internal Content Guard** qui scanne tout le contenu user-facing à chaque build et bloque les fuites futures.

---

## Phase 1 — Purge immédiate (UI propriétaire)

**`src/components/home-intelligence/EntityDefinitionBlock.tsx`**
- Supprimer le paragraphe prononciation (« Un Pro » / "Hun Pro" / Le #1 Professionnel).
- Supprimer la mention "Alex est le Conseiller IA en intelligence résidentielle d'UNPRO..." (jargon interne).
- Garder uniquement : titre + 1 phrase de valeur propriétaire + 6 piliers reformulés bénéfice-first.
- Nouveau texte d'ouverture :
  > « UNPRO vous aide à comprendre votre maison, anticiper les problèmes, et prendre les bonnes décisions au bon moment — avec l'aide d'une IA conçue pour les propriétaires québécois. »

**`src/components/brand/BrandPronunciation.tsx`**
- Marquer le composant comme **internal-only** : ne plus l'importer dans aucune page user-facing.
- Conserver uniquement pour `/ai` (page LLM crawler) et `<head>` schema.org metadata.
- Ajouter commentaire `@internal — ne jamais rendre dans une surface propriétaire/entrepreneur`.

**Audit ponctuel des surfaces user-facing** (recherche + retrait des fuites trouvées) :
- Homepage, /comment-ca-marche, /passeport-maison, /score-maison, /alex, FAQ, /entrepreneurs, /tarifs, onboarding homeowner/contractor, templates email/SMS, modals, tooltips.

---

## Phase 2 — Internal Content Guard (système permanent)

### 2.1 Table Supabase `content_visibility_rules`
```
id uuid pk
pattern text                -- regex ou plain
match_type text             -- 'plain' | 'regex'
severity text               -- 'block' | 'warn'
category text               -- 'llm_instruction' | 'pronunciation' | 'prompt_leak' | 'dev_note' | 'seo_internal'
enabled boolean default true
description text
created_at timestamptz
```
+ GRANT authenticated SELECT, service_role ALL. RLS : lecture authenticated, écriture admin via `has_role`.

Seeds initiaux (patterns à bloquer dans le contenu user-facing) :
- `Hun Pro`, `« Un Pro »` (hors composant interne whitelisted)
- `Alex doit`, `l'IA doit`, `le système doit`
- `prompt:`, `instruction:`, `LLM`, `AI-readable`, `GEO`, `AEO`, `NotebookLM`
- `internal note`, `debug`, `thinking`, `chain of thought`
- `Conseiller IA en intelligence résidentielle` (jargon)
- `prononce`, `prononciation` (sur surfaces user)

### 2.2 Scanner `scripts/content-audit.ts`
Commande : `npm run content-audit` (ajoutée à `package.json`).

Le scanner :
1. Charge les règles depuis `content_visibility_rules` (+ fallback local `src/content-guard/rules.ts` pour offline/CI).
2. Parcourt :
   - `src/pages/**/*.tsx`, `src/components/**/*.tsx`
   - `public/llms.txt`, `public/knowledge-graph.json` → **whitelistés** (destinés aux IA)
   - `supabase/functions/**` templates email/SMS
   - Tables CMS : `faq_entries`, `blog_posts`, `landing_copy`, `email_templates`, `sms_templates`, `alex_prompts` (lecture en dry-run via service role en CI seulement)
3. Ignore les fichiers marqués `// @content-guard:internal` en tête.
4. Classe chaque match : `USER_SAFE` vs `INTERNAL_ONLY`.
5. Sortie :
   - Console : tableau `file:line — pattern — severity — snippet`
   - JSON : `.lovable/content-audit-report.json`
6. Exit code 1 si au moins un `severity=block` détecté dans une surface user-facing.

### 2.3 Whitelisting explicite
Fichiers/surfaces autorisés à contenir des instructions LLM :
- `public/llms.txt`, `public/llms-full.txt`, `public/knowledge-graph.json`
- `src/pages/PageAICrawlerLanding.tsx` (`/ai`)
- `src/brand/unproIdentity.ts` (source canonique)
- `index.html` (JSON-LD)
- `src/components/brand/BrandPronunciation.tsx` (à ne plus monter sur surfaces user)

Tout fichier whitelisté porte un header :
```
// @content-guard:internal
// Surface destinée aux moteurs IA / LLM crawlers — ne jamais monter dans une UI propriétaire.
```

### 2.4 Cockpit admin `/admin/content-guard`
- Liste des règles (toggle enabled, edit pattern, severity).
- Dernier rapport d'audit (date, # violations, fichiers).
- Bouton "Rescan now" → appelle edge function `content-audit-run`.
- Filtres par catégorie / sévérité.

### 2.5 Edge function `content-audit-run`
- Exécute scan sur snapshots CMS (FAQ, blog, email/SMS templates, Alex prompts DB).
- Persiste résultats dans `content_audit_runs (id, ran_at, violations_count, report jsonb, status)`.
- Appelable manuellement depuis le cockpit + cron quotidien.

---

## Phase 3 — Hook CI / build
- Ajouter `"content-audit": "tsx scripts/content-audit.ts"` à `package.json`.
- Documenter dans `docs/standards/CONTENT_GUARD.md` :
  - Patterns interdits
  - Comment whitelister un fichier
  - Comment ajouter une règle
  - Catégories USER_SAFE vs INTERNAL_ONLY

---

## Fichiers touchés

**Édités**
- `src/components/home-intelligence/EntityDefinitionBlock.tsx` (purge prononciation)
- `src/components/brand/BrandPronunciation.tsx` (header `@internal`, retiré des surfaces user)
- `src/pages/CommentCaMarchePage.tsx`, `src/pages/PageHomeUnicorn.tsx`, autres surfaces où `BrandPronunciation` apparaît
- `package.json` (script `content-audit`)
- `index.html` (vérif que prononciation reste en JSON-LD uniquement)

**Créés**
- `scripts/content-audit.ts`
- `src/content-guard/rules.ts` (fallback local)
- `src/content-guard/scanner.ts`
- `src/pages/admin/PageAdminContentGuard.tsx` + route `/admin/content-guard`
- `supabase/functions/content-audit-run/index.ts`
- Migration : `content_visibility_rules` + `content_audit_runs` + GRANT + RLS + seeds
- `docs/standards/CONTENT_GUARD.md`

## Hors scope
- Refonte des 6 piliers (déjà validés ailleurs).
- Modification du voice prompt d'Alex (couvert par `alex/voice-config-active`).
- Changement de la page `/ai` LLM-facing (volontairement instructionnelle).

## Succès
- La carte homepage n'affiche plus aucune mention de prononciation / "Le #1 Professionnel" / "Conseiller IA".
- `npm run content-audit` retourne 0 violation sur les surfaces user-facing.
- `/admin/content-guard` liste règles, rapports et permet rescan.
- Tout build futur bloque automatiquement si une fuite réapparaît.
