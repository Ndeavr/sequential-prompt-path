## Fix logo on Unicorn homepage

**Root cause:** `PageHomeUnicorn.tsx` (line 56) renders `<img src={BRAND.logo}>`, which resolves to the static path `/assets/branding/unpro-logo.png` in `src/config/branding.ts`. That file does not exist in `public/`, so the header logo shows broken/empty even though every other surface uses the new CDN sticker via `BRAND.logoAsset`.

**Change:** Point `BRAND.logo` at the CDN asset URL so every consumer (including the Unicorn header) resolves to the new sticker automatically. No component edits required — one-line fix at the single source of truth.

### File
- `src/config/branding.ts` — set `logo: logoAsset.url` (drop the broken `/assets/branding/unpro-logo.png` path; keep `logoAsset` and `logoStatic` for compatibility).

### Verification
- Reload `/`, confirm header sticker renders.
- Grep for other `BRAND.logo` consumers to confirm none rely on the old static path.
