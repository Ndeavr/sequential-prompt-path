## Adopt the new UNPRO logo (wordmark + speech-bubble mark)

Replace the current "fleur-de-lys" master logo with the uploaded UNPRO wordmark set (blue primary, black, white, grey, round-blue favicon).

### Assets

Upload the five files as Lovable CDN assets and write `.asset.json` pointers into `src/assets/brand/`:

- `Logo-UNPRO.png` → `src/assets/brand/unpro-logo-blue.png.asset.json` (primary color logo)
- `Logo-UNPRO-Black.png` → `unpro-logo-black.png.asset.json`
- `Logo-UNPRO-White.png` → `unpro-logo-white.png.asset.json`
- `Logo-UNPRO-Grey.png` → `unpro-logo-grey.png.asset.json`
- `Logo-UNPRO-fav.png` → `unpro-logo-mark.png.asset.json` (round blue mark, used as icon and for favicons)

### Component rewiring

**`src/components/brand/UnproLogo.tsx`** — replace fleur/chrome imports with the new asset pointers. Map variants directly (no CSS filters, use the correct file per variant):

| variant | source |
|---|---|
| `primary` / `blue` | blue wordmark |
| `mono` (light bg) | black wordmark |
| `mono-invert` (dark bg) | white wordmark |
| `rubber` / `muted` | grey wordmark |

`showWordmark={false}` → render the round blue mark (`unpro-logo-mark.png`).

Update aspect ratio: new wordmark is ~1160×270 (ratio ≈ 4.3). Height = `Math.round(size / 4.3)`.

**`src/components/brand/UnproIcon.tsx`** — swap fleur source for the round blue mark asset (`unpro-logo-mark.png`); keep it a perfect square.

Delete `src/assets/unpro-icon-fleur.png` and `src/assets/unpro-wordmark-chrome.png` (+ their `.asset.json` if present) once the components no longer reference them.

### Favicons + PWA icons

The round blue mark IS the new favicon. Copy it to `public/` and rewrite the icon set:

1. `public/favicon.png` ← round blue mark (single canonical fallback).
2. Regenerate the five branded PNGs already referenced in `index.html` (`favicon-32.png`, `favicon-64.png`, `favicon-chrome-32/64/192/512.png`, `icon-192.png`, `icon-512.png`) from the round blue mark at the matching sizes using `imagegen--edit_image` or a shell resize.
3. `public/unpro-logo-master.png` (used by `og:image`, `twitter:image`, and JSON-LD `logo`) ← the full blue wordmark file, so link previews now show the correct mark.
4. Delete `public/favicon.ico` (still on disk, browsers hit it by default and would override the new PNG).
5. Leave `index.html` head tags as-is — they already point at these filenames.

### Out of scope

- No color-token / theme changes. The new logo's blue (`#3B57F0`-ish) matches the existing primary; no `--brand-*` rewrites in this pass.
- No changes to `PillarStrip`, `BrandPronunciation`, PWA manifest metadata, or the outbound email header logo (those already resolve `/unpro-logo-master.png` and will pick up the new file automatically).
