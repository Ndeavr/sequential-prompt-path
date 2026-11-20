# Claim entry by slug — staged

Status: **not applied, not deployed.**

- `001_claim_preview_by_slug.sql` adds a read-only, contact-free preview of an
  unclaimed prospect by its unique `public_slug`. Before applying, verify the
  column names (`contractor_prospects.trade`/`trade_category`/`category_slug`, `city`,
  `contractor_prospect_claims.prospect_id`) against the live schema.
- The preview is display-only. Ownership still requires the exact opaque
  token claim (`activation-claim`, verification code) or admin review of a
  `contractor_profile_corrections` request.
- Root alias `unpro.ca/<slug>` is intentionally **not** added: the app's
  catch-all and many single-segment routes would collide, and a bare slug
  must not look like a personal invitation. Personal links stay
  `/unpro/activate/<token>`; `/entrepreneur/<slug>/reclamer?t=<token>` forwards
  to it.
