// Scrape a partner website with Firecrawl, extract structured profile, and
// download logo + gallery photos into Supabase Storage.
// Strict guardrail: never invent materials.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL = "https://api.firecrawl.dev/v2";
const BUCKET = "partner-media";

function extractionPrompt(materialAllowed: string | null) {
  return `Tu analyses le site web d'un entrepreneur en isolation au Québec.
Extrais EXACTEMENT ce que le site dit. N'invente AUCUN matériau, produit, ou certification.
${materialAllowed ? `IMPORTANT: Le seul matériau d'isolation autorisé pour ce partenaire est: ${materialAllowed}. Ne mentionne JAMAIS de cellulose, polyuréthane ou autre matériau s'il n'est pas explicitement mentionné dans le site.` : ""}

Retourne un JSON avec:
- legal_name, display_name, tagline, founded_year
- services: array {name, slug, description} (descriptions courtes, fidèles au site)
- coverage: array de villes/régions
- certifications: array {label, verified}
- contacts: {phone, email, address}
- testimonials: array {quote, author}
- guarantees: array de strings

Réponds UNIQUEMENT avec un JSON valide, aucun markdown, aucun bloc de code.`;
}

async function uploadFromUrl(
  supabase: ReturnType<typeof createClient>,
  url: string,
  path: string,
): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "application/octet-stream";
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.byteLength < 1000) return null; // skip tiny icons
    const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType,
      upsert: true,
    });
    if (error) return null;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch {
    return null;
  }
}

function pickGalleryUrls(links: string[], baseHost: string): string[] {
  const exts = /\.(jpe?g|png|webp)$/i;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of links ?? []) {
    if (!raw || typeof raw !== "string") continue;
    if (!exts.test(raw)) continue;
    if (/icon|favicon|logo|sprite|placeholder/i.test(raw)) continue;
    try {
      const u = new URL(raw);
      if (!u.host.includes(baseHost)) continue;
      if (seen.has(u.href)) continue;
      seen.add(u.href);
      out.push(u.href);
      if (out.length >= 12) break;
    } catch {/* ignore */}
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { slug, source_url } = await req.json();
    if (!slug || !source_url) {
      return new Response(JSON.stringify({ error: "slug + source_url required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_KEY) throw new Error("FIRECRAWL_API_KEY missing");
    if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Read current partner state to enforce material guardrail
    const { data: existing } = await supabase
      .from("signature_partners")
      .select("brand")
      .eq("slug", slug)
      .maybeSingle();
    const materialAllowed =
      (existing?.brand as Record<string, unknown> | null)?.material_label as string | undefined;

    // 1. Firecrawl scrape (markdown + branding + links)
    const scrapeRes = await fetch(`${FIRECRAWL}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: source_url,
        formats: ["markdown", "links", "branding"],
        onlyMainContent: false,
      }),
    });
    const scrape = await scrapeRes.json();
    if (!scrapeRes.ok) throw new Error(`Firecrawl: ${JSON.stringify(scrape)}`);

    const markdown: string = scrape.markdown || scrape.data?.markdown || "";
    const branding: Record<string, any> = scrape.branding || scrape.data?.branding || {};
    const links: string[] = scrape.links || scrape.data?.links || [];

    // 2. Map for gallery / realisations
    let galleryLinks: string[] = [];
    try {
      const mapRes = await fetch(`${FIRECRAWL}/map`, {
        method: "POST",
        headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url: source_url, limit: 100, includeSubdomains: false }),
      });
      const mapJson = await mapRes.json();
      galleryLinks = mapJson.links || mapJson.data?.links || [];
    } catch {/* optional */}

    // 3. AI extraction with material guardrail
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: extractionPrompt(materialAllowed ?? null) },
          { role: "user", content: markdown.slice(0, 24000) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const aiJson = await aiRes.json();
    if (!aiRes.ok) throw new Error(`AI gateway: ${JSON.stringify(aiJson)}`);

    let extracted: Record<string, any> = {};
    try {
      extracted = JSON.parse(aiJson.choices?.[0]?.message?.content || "{}");
    } catch { extracted = {}; }

    // Anti-hallucination scrub: strip any service description that mentions a forbidden material
    if (materialAllowed && Array.isArray(extracted.services)) {
      const forbidden = /cellulose|polyur[eé]thane|laine\s*min[eé]rale|polystyr[eè]ne/i;
      extracted.services = extracted.services.filter(
        (s: any) => !forbidden.test(`${s?.name ?? ""} ${s?.description ?? ""}`),
      );
    }

    // 4. Media: logo + hero + gallery → Supabase Storage
    const baseHost = new URL(source_url).host.replace(/^www\./, "");
    const logoSrc: string | undefined = branding?.logo || branding?.images?.logo;
    const ogSrc: string | undefined = branding?.images?.ogImage;

    const logoUrl = logoSrc
      ? await uploadFromUrl(supabase, logoSrc, `${slug}/logo${logoSrc.match(/\.(svg|png|jpe?g|webp)/i)?.[0] ?? ".png"}`)
      : null;

    const heroUrl = ogSrc
      ? await uploadFromUrl(supabase, ogSrc, `${slug}/hero.jpg`)
      : null;

    const gallerySrcs = pickGalleryUrls([...links, ...galleryLinks], baseHost);
    const gallery: string[] = [];
    for (let i = 0; i < gallerySrcs.length; i++) {
      const ext = gallerySrcs[i].match(/\.(jpe?g|png|webp)/i)?.[0] ?? ".jpg";
      const uploaded = await uploadFromUrl(
        supabase,
        gallerySrcs[i],
        `${slug}/gallery/${String(i + 1).padStart(2, "0")}${ext}`,
      );
      if (uploaded) gallery.push(uploaded);
    }

    // 5. Persist (preserve existing brand material flags)
    const contacts = (extracted.contacts as Record<string, string>) || {};
    const update: Record<string, any> = {
      legal_name: extracted.legal_name ?? null,
      display_name: extracted.display_name ?? undefined,
      tagline: extracted.tagline ?? null,
      phone: contacts.phone ?? null,
      email: contacts.email ?? null,
      address: contacts.address ?? null,
      brand: {
        ...(existing?.brand as Record<string, any> ?? {}),
        colors: branding?.colors ?? null,
        fonts: branding?.fonts ?? null,
        logo_remote: logoSrc ?? null,
      },
      services: extracted.services ?? [],
      coverage: extracted.coverage ?? [],
      certifications: extracted.certifications ?? [],
      media: {
        logo_url: logoUrl,
        hero_url: heroUrl,
        gallery,
        testimonials: extracted.testimonials ?? [],
      },
      scraped_data: { markdown_excerpt: markdown.slice(0, 4000), links: links.slice(0, 50) },
      enriched_at: new Date().toISOString(),
    };
    // Don't overwrite display_name if extraction is empty/garbage
    if (!update.display_name) delete update.display_name;

    const { data, error } = await supabase
      .from("signature_partners")
      .update(update)
      .eq("slug", slug)
      .select()
      .single();

    if (error) throw error;
    return new Response(JSON.stringify({
      ok: true,
      partner: data,
      media_uploaded: { logo: !!logoUrl, hero: !!heroUrl, gallery: gallery.length },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
