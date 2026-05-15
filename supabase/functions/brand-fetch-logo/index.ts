// UNPRO — brand-fetch-logo
// Fetches a brand logo from Brandfetch -> Clearbit -> Google favicon,
// uploads color + monochrome variants to the `brand-assets` bucket,
// and updates the `brands` row.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BRANDFETCH_KEY = Deno.env.get("BRANDFETCH_API_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function publicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/brand-assets/${path}`;
}

function domainFromUrl(u: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u.startsWith("http") ? u : `https://${u}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

interface FetchedLogo {
  bytes: Uint8Array;
  ext: "svg" | "png";
  mime: string;
  source: string;
}

async function tryBrandfetch(domain: string): Promise<FetchedLogo | null> {
  if (!BRANDFETCH_KEY) return null;
  try {
    const r = await fetch(`https://api.brandfetch.io/v2/brands/${domain}`, {
      headers: { Authorization: `Bearer ${BRANDFETCH_KEY}` },
    });
    if (!r.ok) return null;
    const data = await r.json();
    const logos: any[] = data.logos ?? [];
    // prefer logo type 'logo' over 'icon', prefer SVG
    const sorted = logos
      .flatMap((l) => (l.formats ?? []).map((f: any) => ({ ...f, type: l.type })))
      .sort((a, b) => {
        const fmtA = a.format === "svg" ? 0 : 1;
        const fmtB = b.format === "svg" ? 0 : 1;
        if (fmtA !== fmtB) return fmtA - fmtB;
        const tA = a.type === "logo" ? 0 : 1;
        const tB = b.type === "logo" ? 0 : 1;
        return tA - tB;
      });
    for (const f of sorted) {
      if (!f.src) continue;
      const ext = (f.format === "svg" ? "svg" : "png") as "svg" | "png";
      const mime = ext === "svg" ? "image/svg+xml" : "image/png";
      const res = await fetch(f.src);
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length < 100) continue;
      return { bytes, ext, mime, source: "brandfetch" };
    }
    return null;
  } catch {
    return null;
  }
}

async function tryClearbit(domain: string): Promise<FetchedLogo | null> {
  try {
    const r = await fetch(`https://logo.clearbit.com/${domain}?size=512&format=png`);
    if (!r.ok) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.length < 200) return null;
    return { bytes, ext: "png", mime: "image/png", source: "clearbit" };
  } catch {
    return null;
  }
}

async function tryFavicon(domain: string): Promise<FetchedLogo | null> {
  try {
    const r = await fetch(
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
    );
    if (!r.ok) return null;
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (bytes.length < 100) return null;
    return { bytes, ext: "png", mime: "image/png", source: "favicon" };
  } catch {
    return null;
  }
}

/** Convert SVG bytes to a monochrome variant using currentColor. */
function svgToMonochrome(bytes: Uint8Array): Uint8Array {
  let svg = new TextDecoder().decode(bytes);
  // strip explicit fill/stroke colors (hex, rgb, named) but keep "none"
  svg = svg.replace(/\sfill="(?!none")[^"]*"/gi, ' fill="currentColor"');
  svg = svg.replace(/\sstroke="(?!none")[^"]*"/gi, ' stroke="currentColor"');
  svg = svg.replace(/fill:\s*(?!none)[^;"]+/gi, "fill:currentColor");
  svg = svg.replace(/stroke:\s*(?!none)[^;"]+/gi, "stroke:currentColor");
  // ensure root <svg> carries fill="currentColor"
  if (!/<svg[^>]*\sfill=/i.test(svg)) {
    svg = svg.replace(/<svg\b/i, '<svg fill="currentColor"');
  }
  // hint color via CSS too
  if (!svg.includes("color:")) {
    svg = svg.replace(/<svg\b([^>]*)>/i, '<svg$1 style="color:#9CA3AF">');
  }
  return new TextEncoder().encode(svg);
}

async function uploadAsset(path: string, body: Uint8Array, mime: string) {
  const { error } = await supabase.storage
    .from("brand-assets")
    .upload(path, body, { contentType: mime, upsert: true });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
}

async function processOne(brand: any, force: boolean) {
  const start = Date.now();
  if (!force && (brand.logo_svg_url || brand.logo_png_url)) {
    return { skipped: true, brand: brand.slug };
  }
  const domain = domainFromUrl(brand.website) ?? `${brand.slug}.com`;

  const fetched =
    (await tryBrandfetch(domain)) ??
    (await tryClearbit(domain)) ??
    (await tryFavicon(domain));

  if (!fetched) {
    await supabase
      .from("brands")
      .update({
        logo_attempts: (brand.logo_attempts ?? 0) + 1,
        logo_last_error: "no source returned a logo",
        logo_fetched_at: new Date().toISOString(),
      })
      .eq("id", brand.id);
    return { ok: false, brand: brand.slug, error: "no_source" };
  }

  const colorPath = `logos/color/${brand.slug}.${fetched.ext}`;
  await uploadAsset(colorPath, fetched.bytes, fetched.mime);
  const colorUrl = publicUrl(colorPath);

  // Monochrome
  let monoSvgUrl: string | null = null;
  let monoPngUrl: string | null = null;
  if (fetched.ext === "svg") {
    const monoBytes = svgToMonochrome(fetched.bytes);
    const monoPath = `logos/mono/${brand.slug}.svg`;
    await uploadAsset(monoPath, monoBytes, "image/svg+xml");
    monoSvgUrl = publicUrl(monoPath);
  } else {
    // For PNGs we just reuse the color as the mono fallback;
    // the renderer applies CSS grayscale + brightness when no true mono exists.
    monoPngUrl = colorUrl;
  }

  const update: Record<string, unknown> = {
    logo_source: fetched.source,
    logo_fetched_at: new Date().toISOString(),
    logo_attempts: (brand.logo_attempts ?? 0) + 1,
    logo_last_error: null,
  };
  if (fetched.ext === "svg") {
    update.logo_svg_url = colorUrl;
    update.logo_grey_svg_url = monoSvgUrl;
  } else {
    update.logo_png_url = colorUrl;
    update.logo_grey_png_url = monoPngUrl;
  }

  const { error } = await supabase.from("brands").update(update).eq("id", brand.id);
  if (error) throw new Error(`brand update: ${error.message}`);

  // History
  await supabase.from("brand_logos").insert({
    brand_id: brand.id,
    variant: fetched.ext === "svg" ? "color_svg" : "color_png",
    url: colorUrl,
    source: fetched.source,
  });
  if (monoSvgUrl) {
    await supabase.from("brand_logos").insert({
      brand_id: brand.id,
      variant: "mono_svg",
      url: monoSvgUrl,
      source: `derived:${fetched.source}`,
    });
  }

  return {
    ok: true,
    brand: brand.slug,
    source: fetched.source,
    ext: fetched.ext,
    ms: Date.now() - start,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const force = !!body.force;
    let brand: any = null;

    if (body.brand_id) {
      const { data } = await supabase.from("brands").select("*").eq("id", body.brand_id).maybeSingle();
      brand = data;
    } else if (body.slug) {
      const { data } = await supabase.from("brands").select("*").eq("slug", body.slug).maybeSingle();
      brand = data;
    }
    if (!brand) {
      return new Response(JSON.stringify({ error: "brand not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await processOne(brand, force);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
