# scripts/

- `generate-sitemaps.ts` never overwrites a valid sitemap or `llms-full.txt` from a failed or suspiciously empty read, and the index lists only non-empty sub-sitemaps; eligibility rules live in `src/seo/sitemapSources.ts`. Why: a transient backend outage must not de-index the site.
- IndexNow submissions run manually via `indexnow-submit.ts` (dry run by default) and refuse to send until the public key file is served on unpro.ca. Why: avoid notification spam and unverifiable submissions.
