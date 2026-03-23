

# Fix Blog Articles: Empty Content, Missing Images, Broken FAQs

## Problems Found

1. **FAQ items show empty** — Data uses `{q, a}` keys but `FaqItem` component reads `{question, answer}`. That's why the accordion shows but with no text.
2. **25 of 55 published articles have no body content** (`content_html` is null/empty).
3. **All 55 articles have no featured image** (`featured_image_url` is null).

## Plan

### Step 1 — Fix FAQ key mismatch in BlogArticlePage
Update the `FaqItem` mapping to handle both `{q, a}` and `{question, answer}` formats. One-line fix in the component:
```tsx
<FaqItem question={faq.question || faq.q} answer={faq.answer || faq.a} />
```

### Step 2 — Fix FAQ data in database
Run a migration to normalize all `faq_json` entries from `{q, a}` to `{question, answer}` format across `blog_articles` so all consumers work consistently.

### Step 3 — Generate missing article content
Create and run an edge function (`blog-content-generator`) that:
- Queries articles where `content_html` is null/empty
- Uses Gemini to generate SEO-optimized French content (800-1200 words) based on the article's `title`, `category`, `city`
- Saves the generated HTML back to `content_html`
- Processes in batches of 5 to avoid timeouts

### Step 4 — Generate featured images
Create an edge function (`blog-image-generator`) that:
- Queries articles missing `featured_image_url`
- Uses the AI image generation model to create contextual hero images
- Uploads to Supabase Storage and updates the article record
- Processes in batches

### Step 5 — Register as automation agents
Add `blog-content-generator` and `blog-image-generator` to `automation_agents` with scheduled runs so new articles automatically get content and images.

## Technical Details

- FAQ fix: both component-side (graceful fallback) and data-side (normalize keys)
- Content generation: edge function using `google/gemini-2.5-flash` via Lovable AI gateway
- Image generation: edge function using `google/gemini-2.5-flash-image` model
- Storage: images saved to `blog-images` bucket in Supabase Storage
- All agents registered with `next_run_at` for autonomous operation

