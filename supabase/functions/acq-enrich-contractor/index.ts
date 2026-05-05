import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ISR_OVERRIDES = {
  match: (web?: string, em?: string) =>
    !!(web?.includes("isroyal.ca") || em?.includes("isroyal.ca")),
  data: {
    company_name: "Isolation Solution Royal",
    slug: "isolation-solution-royal",
    website: "https://isroyal.ca",
    email: "info@isroyal.ca",
    rbq_number: "5834-9101-01",
    city: "Montréal",
    description:
      "Spécialiste en isolation d'entretoit, décontamination et ventilation pour la grande région de Montréal et les Laurentides.",
    services: [
      { service_name: "Isolation d'entretoit", category: "isolation", is_primary: true },
      { service_name: "Décontamination d'entretoit", category: "decontamination", is_primary: true },
      { service_name: "Isolation cellulose", category: "isolation", is_primary: false },
      { service_name: "Ventilation d'entretoit", category: "ventilation", is_primary: false },
      { service_name: "Calfeutrage / étanchéité à l'air", category: "etancheite", is_primary: false },
      { service_name: "Vermiculite", category: "decontamination", is_primary: false },
      { service_name: "Moisissure entretoit", category: "decontamination", is_primary: false },
    ],
    cities: ["Montréal", "Laval", "Terrebonne", "Rive-Nord", "Lanaudière", "Laurentides"],
  },
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function token(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

async function firecrawlScrape(url: string) {
  const key = Deno.env.get("FIRECRAWL_API_KEY");
  if (!key) return null;
  try {
    const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links", "branding"],
        onlyMainContent: true,
      }),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const { website: rawWeb, email, company_name } = await req.json();
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const isISR = ISR_OVERRIDES.match(rawWeb, email);
    const website = rawWeb || (isISR ? ISR_OVERRIDES.data.website : null);
    if (!website && !email) {
      return new Response(JSON.stringify({ error: "website_or_email_required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Scrape (best-effort)
    const scrape = website ? await firecrawlScrape(website) : null;
    const meta = scrape?.metadata ?? scrape?.data?.metadata ?? {};
    const branding = scrape?.branding ?? scrape?.data?.branding ?? {};
    const links: string[] = scrape?.links ?? scrape?.data?.links ?? [];

    let payload: any = {
      company_name: company_name || meta?.title?.split("|")[0]?.trim() || "Entreprise sans nom",
      slug: "",
      website,
      email,
      description: meta?.description || null,
      logo_url: branding?.logo || branding?.images?.logo || null,
      city: null,
      rbq_number: null,
      neq_number: null,
      status: "draft",
      source: "enrich",
    };

    let services: Array<any> = [];
    let cities: string[] = [];

    if (isISR) {
      payload = { ...payload, ...ISR_OVERRIDES.data };
      services = ISR_OVERRIDES.data.services;
      cities = ISR_OVERRIDES.data.cities;
    }

    payload.slug = payload.slug || slugify(payload.company_name) || `c-${token().slice(0, 8)}`;

    // Upsert by slug
    const { data: existing } = await sb
      .from("acq_contractors")
      .select("id")
      .eq("slug", payload.slug)
      .maybeSingle();

    let contractorId: string;
    if (existing?.id) {
      contractorId = existing.id;
      await sb.from("acq_contractors").update(payload).eq("id", contractorId);
    } else {
      const { data: ins, error } = await sb
        .from("acq_contractors")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      contractorId = ins.id;
    }

    // Reset & insert services + cities
    await sb.from("acq_contractor_services").delete().eq("contractor_id", contractorId);
    const svcRows = services.flatMap((s) =>
      cities.length
        ? cities.map((city) => ({ ...s, contractor_id: contractorId, city }))
        : [{ ...s, contractor_id: contractorId }],
    );
    if (svcRows.length) await sb.from("acq_contractor_services").insert(svcRows);

    // Media: logo + extracted images
    await sb.from("acq_contractor_media").delete().eq("contractor_id", contractorId);
    const mediaRows: any[] = [];
    if (payload.logo_url) {
      mediaRows.push({ contractor_id: contractorId, media_type: "logo", url: payload.logo_url, sort_order: 0 });
    }
    const imageLinks = links.filter((l) => /\.(jpg|jpeg|png|webp)$/i.test(l)).slice(0, 8);
    imageLinks.forEach((url, i) =>
      mediaRows.push({ contractor_id: contractorId, media_type: "image", url, sort_order: i + 1 }),
    );
    const videoLinks = links.filter((l) => /\.(mp4|webm)$/i.test(l) || l.includes("youtube.com/watch")).slice(0, 3);
    videoLinks.forEach((url, i) =>
      mediaRows.push({ contractor_id: contractorId, media_type: "video", url, sort_order: 100 + i }),
    );
    if (mediaRows.length) await sb.from("acq_contractor_media").insert(mediaRows);

    // Generate score
    const scoreResp = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/acq-generate-score`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ contractor_id: contractorId }),
      },
    );
    const scoreJson = await scoreResp.json().catch(() => null);

    // AIPP page
    const { data: existingPage } = await sb
      .from("acq_aipp_pages")
      .select("id, page_slug, public_token")
      .eq("contractor_id", contractorId)
      .maybeSingle();
    let page = existingPage;
    if (!page) {
      const { data: pg, error: pgErr } = await sb
        .from("acq_aipp_pages")
        .insert({
          contractor_id: contractorId,
          page_slug: payload.slug,
          public_token: token(),
          page_status: "published",
        })
        .select("id, page_slug, public_token")
        .single();
      if (pgErr) throw pgErr;
      page = pg;
    }

    // Invite (idempotent by email)
    if (email || payload.email) {
      const targetEmail = email || payload.email;
      const { data: inv } = await sb
        .from("acq_invites")
        .select("id")
        .eq("contractor_id", contractorId)
        .eq("email", targetEmail)
        .maybeSingle();
      if (!inv) {
        await sb.from("acq_invites").insert({
          contractor_id: contractorId,
          email: targetEmail,
          invite_token: token(),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        contractor_id: contractorId,
        slug: payload.slug,
        page_slug: page.page_slug,
        score: scoreJson?.aipp_score ?? null,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[acq-enrich]", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
