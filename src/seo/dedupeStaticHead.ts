/**
 * UNPRO — Static head deduplication.
 *
 * `index.html` ships fallback head tags (description, canonical, og:*, twitter:*)
 * so non-JS social crawlers always see something. react-helmet-async appends its
 * own tags instead of replacing those, which leaves two `<meta name="description">`
 * and — worse — two `<link rel="canonical">` per page, the first one pointing at
 * the homepage. Crawlers read the first, so every route was canonicalizing to `/`.
 *
 * This observer removes a `data-static-head` fallback as soon as a Helmet-managed
 * (`data-rh`) counterpart for the same key exists. Tags mutated in place by
 * `SeoHead` keep their attribute and are never removed (no Helmet counterpart).
 */

type Key = { selector: string; staticSelector: string };

const KEYS: Key[] = [
  { selector: 'meta[data-rh][name="description"]', staticSelector: 'meta[data-static-head][name="description"]' },
  { selector: "link[data-rh][rel='canonical']", staticSelector: "link[data-static-head][rel='canonical']" },
  { selector: 'meta[data-rh][property="og:url"]', staticSelector: 'meta[data-static-head][property="og:url"]' },
  { selector: 'meta[data-rh][property="og:title"]', staticSelector: 'meta[data-static-head][property="og:title"]' },
  { selector: 'meta[data-rh][property="og:description"]', staticSelector: 'meta[data-static-head][property="og:description"]' },
  { selector: 'meta[data-rh][property="og:image"]', staticSelector: 'meta[data-static-head][property="og:image"]' },
  { selector: 'meta[data-rh][name="twitter:title"]', staticSelector: 'meta[data-static-head][name="twitter:title"]' },
  { selector: 'meta[data-rh][name="twitter:description"]', staticSelector: 'meta[data-static-head][name="twitter:description"]' },
  { selector: 'meta[data-rh][name="twitter:image"]', staticSelector: 'meta[data-static-head][name="twitter:image"]' },
];

function sweep() {
  for (const { selector, staticSelector } of KEYS) {
    if (document.head.querySelector(selector)) {
      document.head.querySelectorAll(staticSelector).forEach((el) => el.remove());
    }
  }
}

let started = false;

export function startStaticHeadDedupe() {
  if (started || typeof document === "undefined") return;
  started = true;
  sweep();
  new MutationObserver(sweep).observe(document.head, { childList: true, subtree: true });
}
