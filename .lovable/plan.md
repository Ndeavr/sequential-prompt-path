## AI Content Quality Gate — Contrast + Image Governance

Fix the three trust-breaking failures visible on `/blog/*` and other article pages: unreadable text, wrong-category AI images, and no central image policy. Ship the four highest-ROI fixes as one coherent system.

---

### 1. Global readability fix (site-wide)

Enforce WCAG AAA on all text over dark/gradient surfaces.

- Update tokens in `src/index.css` under the dark scope (`.alex-immersive`, `.admin-theme`, article shells):
  - `--text-primary: 255 255 255` (headings → `#FFFFFF`)
  - `--text-body: 255 255 255 / 0.92`
  - `--text-muted: 255 255 255 / 0.75` (floor — never below)
  - Deprecate any `text-white/60`, `text-white/50`, `opacity-70` on text.
- Add a "readable surface" rule: any text block sitting on a gradient/backdrop must be wrapped in `.glass-strong` (bg `rgba(10,15,25,0.72)` + blur 24px) so contrast is measured against a solid, not the gradient.
- Extend the existing UI readability rule (`mem://standards/ui-readability-rule`) with the AAA floor and the "no text on raw gradient" rule.
- Sweep the offenders visible in the screenshots:
  - `PageArticleDetail` / SEO article template: FAQ accordion, "Articles connexes" cards, breadcrumbs, `3 min` metadata.
  - `SeoFaqSection`, `SeoInternalLinks`, article breadcrumb component.
  Replace muted classes with the new tokens and wrap each section in `.glass-strong`.

### 2. Article contrast guard (build-time + runtime)

- **Build-time**: extend `scripts/content-audit.ts` with a new scanner `contrast-audit` that parses article/SEO templates and flags any text utility whose computed contrast against its nearest surface token is `< 7:1`. Fails CI (`blocking` severity).
- **Runtime dev guard**: small hook `useContrastGuard` (dev-only) that walks article DOM, computes contrast via `getComputedStyle`, and logs to the visual stability buffer when `< 7`.

### 3. Category-scoped image governance

Replace "article → random image" with `category → approved library → article`.

New tables (single migration):

- `content_image_categories` — slug, label, description.
- `content_image_rules` — category_id, allowed_tags[], blocked_tags[], required_tags[], style_prompt, negative_prompt.
- `content_image_library` — category_id, storage path/url, tags[], source (`generated` | `uploaded` | `stock`), status (`pending` | `approved` | `rejected`), confidence, rejected_reason.
- `content_article_images` — article_id, image_id, status, override_reason.

Seed the first category `attic-insulation`:
- Allowed: `unfinished attic, blown fiberglass, attic floor, trusses, soffit, attic hatch, pink insulation, low headroom`
- Blocked: `window, finished attic, drywall ceiling, cathedral ceiling, insulated wall cavity, living space, furniture, worker posing, cellulose bag, european roof`
- Style prompt tuned to Quebec unfinished attics (reference: user's ISR photo).

Add ~6 more launch categories (roofing, plumbing, HVAC, foundation, exterior, general) with the same shape — content teams extend later via `/admin/content-audit`.

### 4. Image validation pipeline

New edge function `content-image-validate`:

1. Accepts `{ image_url, category_slug }`.
2. Calls Gemini 2.5 Flash multimodal via AI Gateway with a structured prompt: "Return JSON `{ detected_tags[], violates_blocked[], missing_required[], confidence 0-1, verdict: approved|rejected, reason }`."
3. Writes result to `content_image_library`. Verdict `rejected` blocks publish.

New edge function `content-image-generate`:
1. Reads category rule → composes prompt = `style_prompt` + allowed tags, `negative_prompt` + blocked tags.
2. Calls `openai/gpt-image-2` (or Gemini fallback) via `/v1/images/generations`.
3. Pipes result through `content-image-validate` before storing.
4. On rejection, auto-regenerates up to 3 times, then flags for manual review.

Wire this into the existing article publish path (`renovationContentService` / any current image assignment) — a publish is blocked if `content_article_images.status !== 'approved'`.

### 5. Admin cockpit — `/admin/content-audit`

New page `PageAdminContentAudit.tsx`:

Columns: URL · Category · Image status (approved / rejected / pending) · Confidence · Readability status · Contrast score · Publish status.

Row actions: Replace image (from library), Regenerate (calls `content-image-generate`), Approve manually (with reason), Open in new tab.

Bulk actions: Regenerate all rejected · Re-run contrast audit · Re-run image audit for a category.

Filters: category, status, confidence range, last audited date.

KPI header: total articles · % passing readability · % passing image audit · pending manual review.

---

### Files (new)

- `supabase/migrations/<ts>_content_quality_gate.sql`
- `supabase/functions/content-image-validate/index.ts`
- `supabase/functions/content-image-generate/index.ts`
- `src/pages/admin/PageAdminContentAudit.tsx`
- `src/features/contentQuality/{types.ts,useContentAudit.ts,ImageLibraryPicker.tsx,ContrastBadge.tsx}`
- `src/hooks/useContrastGuard.ts` (dev-only)
- `src/content-guard/contrastScanner.ts`
- Seed: `supabase/seeds/content_image_rules_v1.sql`

### Files (edited)

- `src/index.css` — AAA tokens, `.glass-strong` floor.
- `src/seo/components/SeoFaqSection.tsx`, `SeoInternalLinks.tsx`, article/breadcrumb components — swap muted classes + wrap in `.glass-strong`.
- `src/pages/PageArticleDetail*.tsx` (and equivalent SEO article templates) — apply the readable surface pattern.
- `src/seo/services/renovationContentService.ts` — call the new image validation before publish.
- `scripts/content-audit.ts` — add contrast scanner, fail CI on `< 7:1`.
- `src/app/router.tsx` — add `/admin/content-audit`.
- `src/admin/adminToolsRegistry.ts` — register the tool.

### Data / API changes

- 4 new tables (with GRANTs + RLS admin-only) + seed of `attic-insulation` rule and starter categories.
- 2 new edge functions using Lovable AI Gateway (Gemini for validation, gpt-image-2 for generation).

### Rollout

1. Migration + seed + edge functions.
2. Global tokens + article template sweep (visible fix on `/blog/*` immediately).
3. Image pipeline + admin cockpit.
4. Backfill: run `content-image-validate` across existing articles → auto-flag wrong-category images (all cathedral/finished-attic/window photos on attic articles get `rejected` and queued for regeneration).

### Out of scope (this pass)

- Rebuilding article content itself.
- Full library beyond the 7 launch categories.
- Public-facing image credits / photographer attribution.
