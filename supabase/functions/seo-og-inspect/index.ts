/**
 * seo-og-inspect — Fetch a URL and extract OG / Twitter metadata.
 *
 * Reads what social crawlers (Facebook, LinkedIn, iMessage, X, Google
 * Messages) actually see: the raw HTML head as delivered by the server,
 * BEFORE any client-side mutation from SeoHead. That's the source of
 * truth for social previews.
 *
 * POST body: { url: string }
 * Returns:   { ok, url, status, meta: { title, description, canonical,
 *                                       ogTitle, ogDescription, ogImage,
 *                                       ogUrl, twitterCard, twitterImage },
 *              matchesExpected, expectedOgImage, error? }
 */
import "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const EXPECTED_OG_IMAGE = "https://unpro.ca/og/unpro-og-v3.jpg?v=20260712";
// Match on filename only (allow ?v= drift or extra params)
const EXPECTED_OG_MATCH = /\/og\/unpro-og-v3\.jpg/;

function extract(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m?.[1]?.trim() ?? null;
}

function pickMeta(html: string, key: string, kind: "name" | "property"): string | null {
  const attr = kind === "name" ? "name" : "property";
  // Tolerant: attribute order can swap
  const re1 = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']+)["']`, "i");
  const re2 = new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*${attr}=["']${key}["']`, "i");
  return extract(html, re1) ?? extract(html, re2);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ ok: false, error: "url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch as a social crawler would — the prerender edge picks up known bots
    // via the User-Agent, so use facebookexternalhit to get the static snapshot.
    const res = await fetch(url, {
      headers: {
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    const html = await res.text();

    const meta = {
      title: extract(html, /<title[^>]*>([^<]+)<\/title>/i),
      description: pickMeta(html, "description", "name"),
      canonical: extract(html, /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i),
      ogTitle: pickMeta(html, "og:title", "property"),
      ogDescription: pickMeta(html, "og:description", "property"),
      ogImage: pickMeta(html, "og:image", "property"),
      ogUrl: pickMeta(html, "og:url", "property"),
      ogType: pickMeta(html, "og:type", "property"),
      twitterCard: pickMeta(html, "twitter:card", "name"),
      twitterImage: pickMeta(html, "twitter:image", "name"),
    };

    const matchesExpected =
      !!meta.ogImage &&
      EXPECTED_OG_MATCH.test(meta.ogImage) &&
      !!meta.twitterImage &&
      EXPECTED_OG_MATCH.test(meta.twitterImage);

    return new Response(
      JSON.stringify({
        ok: true,
        url,
        status: res.status,
        meta,
        matchesExpected,
        expectedOgImage: EXPECTED_OG_IMAGE,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String((e as Error).message ?? e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
