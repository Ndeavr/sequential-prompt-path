const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY")!;
const FIRECRAWL_V2 = "https://api.firecrawl.dev/v2";

interface EmailCandidate {
  email: string;
  source: string;
  confidence: number;
}

// ─── Email pattern generators ───
function generateProbableEmails(domain: string, businessName: string): EmailCandidate[] {
  const clean = businessName.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const prefixes = ["info", "contact", "admin", "hello", "service", "services"];
  if (parts.length > 0) prefixes.push(parts[0]);
  if (parts.length > 1) prefixes.push(`${parts[0]}.${parts[1]}`);
  
  return prefixes.map(p => ({
    email: `${p}@${domain}`,
    source: "generated",
    confidence: p === "info" ? 55 : p === "contact" ? 50 : 35,
  }));
}

// ─── Extract emails from text ───
function extractEmails(text: string): string[] {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const found = text.match(regex) || [];
  return [...new Set(found)].filter(e => 
    !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".svg") &&
    !e.includes("example.com") && !e.includes("sentry.io") &&
    !e.includes("wixpress") && !e.includes("@2x")
  );
}

// ─── Extract social profiles ───
function extractSocials(text: string): Record<string, string> {
  const socials: Record<string, string> = {};
  const fb = text.match(/https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._-]+/);
  if (fb) socials.facebook = fb[0];
  const ig = text.match(/https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._-]+/);
  if (ig) socials.instagram = ig[0];
  const li = text.match(/https?:\/\/(www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9._-]+/);
  if (li) socials.linkedin = li[0];
  return socials;
}

// ─── Domain extractor ───
function extractDomain(url: string): string | null {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch { return null; }
}

// ─── Firecrawl scrape ───
async function scrapeUrl(url: string): Promise<{ markdown: string; html: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: false, waitFor: 1000 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();
    const md = data.data?.markdown || data.markdown || "";
    return { markdown: md, html: "" };
  } catch { clearTimeout(timeout); return null; }
}

// ─── Firecrawl search for new prospects ───
async function searchProspects(query: string, limit = 10): Promise<Array<{ url: string; title: string; description: string }>> {
  try {
    const res = await fetch(`${FIRECRAWL_V2}/search`, {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, lang: "fr", country: "ca" }),
    });
    if (!res.ok) { await res.text(); return []; }
    const data = await res.json();
    const results = data.data?.web || data.data || [];
    return (Array.isArray(results) ? results : []).map((r: any) => ({ url: r.url, title: r.title || "", description: r.description || "" }));
  } catch { return []; }
}

// ─── Main enrichment for a single prospect ───
async function enrichProspect(supabase: any, prospectId: string) {
  const { data: prospect } = await supabase.from("contractors_prospects").select("*").eq("id", prospectId).single();
  if (!prospect) throw new Error("Prospect not found");

  await supabase.from("contractors_prospects").update({ enrichment_status: "running" }).eq("id", prospectId);

  const log: any[] = [];
  const allEmails: EmailCandidate[] = [];
  let socials: Record<string, string> = {};
  let website = prospect.website;
  let domain = prospect.domain;

  // Step 1: Find website if missing
  if (!website && prospect.business_name) {
    log.push({ step: "search_website", ts: new Date().toISOString() });
    const results = await searchProspects(`${prospect.business_name} ${prospect.city || ""} site officiel`, 3);
    if (results.length > 0) {
      website = results[0].url;
      domain = extractDomain(website);
      log.push({ step: "website_found", url: website, domain });
    }
  }

  if (!domain && website) domain = extractDomain(website);

  // Step 2: Scrape main page
  if (website) {
    log.push({ step: "scrape_main", url: website });
    const main = await scrapeUrl(website);
    if (main) {
      const emails = extractEmails(main.markdown + " " + main.html);
      emails.forEach(e => allEmails.push({ email: e, source: "main_page", confidence: 85 }));
      socials = { ...socials, ...extractSocials(main.markdown + " " + main.html) };

      // Step 3: Scrape contact page (only first match to save time)
      const contactPaths = ["/contact", "/nous-joindre"];
      for (const path of contactPaths) {
        if (allEmails.length > 0) break; // Already found emails, skip
        try {
          const contactUrl = new URL(path, website.startsWith("http") ? website : `https://${website}`).href;
          log.push({ step: "scrape_contact", url: contactUrl });
          const contact = await scrapeUrl(contactUrl);
          if (contact) {
            const ce = extractEmails(contact.markdown);
            ce.forEach(e => allEmails.push({ email: e, source: `contact_page:${path}`, confidence: 90 }));
            socials = { ...socials, ...extractSocials(contact.markdown) };
          }
        } catch { /* skip */ }
      }
    }
  }

  // Step 4: Generate probable emails from domain
  if (domain) {
    const generated = generateProbableEmails(domain, prospect.business_name || "");
    allEmails.push(...generated);
    log.push({ step: "generated_emails", count: generated.length, domain });
  }

  // Step 5: Scrape Google Maps for data
  if (prospect.google_maps_url) {
    log.push({ step: "scrape_gmb", url: prospect.google_maps_url });
    const gmb = await scrapeUrl(prospect.google_maps_url);
    if (gmb) {
      const ge = extractEmails(gmb.markdown + " " + gmb.html);
      ge.forEach(e => allEmails.push({ email: e, source: "google_maps", confidence: 80 }));
    }
  }

  // Deduplicate and pick best
  const emailMap = new Map<string, EmailCandidate>();
  for (const ec of allEmails) {
    const key = ec.email.toLowerCase();
    if (!emailMap.has(key) || (emailMap.get(key)!.confidence < ec.confidence)) {
      emailMap.set(key, { ...ec, email: key });
    }
  }
  const uniqueEmails = [...emailMap.values()].sort((a, b) => b.confidence - a.confidence);
  const bestEmail = uniqueEmails[0]?.email || null;
  const bestConfidence = uniqueEmails[0]?.confidence || 0;

  // SMS fallback
  const smsStatus = (!bestEmail && prospect.phone) ? "queued" : "none";

  // Update prospect
  const update: any = {
    enrichment_status: "done",
    enriched_at: new Date().toISOString(),
    emails_found: uniqueEmails,
    email_confidence: bestConfidence,
    verified_email: bestEmail,
    social_profiles: socials,
    sms_queue_status: smsStatus,
    enrichment_log: log,
  };
  if (website && !prospect.website) update.website = website;
  if (domain && !prospect.domain) update.domain = domain;
  if (bestEmail && !prospect.email) update.email = bestEmail;

  await supabase.from("contractors_prospects").update(update).eq("id", prospectId);

  return { prospectId, email: bestEmail, confidence: bestConfidence, emailsFound: uniqueEmails.length, smsStatus };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const { mode, prospect_id, city, category, limit: searchLimit } = body;

    // Mode 1: Enrich a single prospect
    if (mode === "enrich_one" && prospect_id) {
      const result = await enrichProspect(supabase, prospect_id);
      return new Response(JSON.stringify({ success: true, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 2: Enrich all pending prospects for a city/category
    if (mode === "enrich_batch") {
      let q = supabase.from("contractors_prospects").select("id")
        .eq("enrichment_status", "pending")
        .order("aipp_score", { ascending: false })
        .limit(searchLimit || 25);
      if (city) q = q.ilike("city", city);
      if (category) q = q.ilike("category", `%${category}%`);
      const { data: prospects } = await q;

      const results = [];
      for (const p of (prospects || [])) {
        try {
          const r = await enrichProspect(supabase, p.id);
          results.push(r);
        } catch (e) {
          results.push({ prospectId: p.id, error: (e as Error).message });
          await supabase.from("contractors_prospects").update({ enrichment_status: "failed" }).eq("id", p.id);
        }
      }

      // Auto-trigger outreach if 10+ verified emails
      const withEmails = results.filter(r => r.email);
      let autoOutreach = false;
      if (withEmails.length >= 10) {
        autoOutreach = true;
        // Queue them for outreach
        const ids = withEmails.map(r => r.prospectId);
        await supabase.from("contractors_prospects")
          .update({ outreach_status: "queued" })
          .in("id", ids);
      }

      return new Response(JSON.stringify({
        success: true,
        total: results.length,
        emailsFound: withEmails.length,
        smsQueued: results.filter(r => r.smsStatus === "queued").length,
        autoOutreachTriggered: autoOutreach,
        results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode 3: Discover new prospects via search
    if (mode === "discover") {
      const searchQuery = `${category || "isolation"} ${city || "Laval"} Québec entrepreneur`;
      const found = await searchProspects(searchQuery, searchLimit || 20);

      const inserted = [];
      for (const result of found) {
        const domain = extractDomain(result.url);
        if (!domain) continue;

        // Dedupe by domain
        const { data: existing } = await supabase.from("contractors_prospects")
          .select("id").eq("domain", domain).limit(1);
        if (existing?.length) continue;

        const { data: newP, error } = await supabase.from("contractors_prospects").insert({
          business_name: result.title.slice(0, 100),
          city: city || "Laval",
          category: category || "Insulation",
          website: result.url,
          domain,
          source: "firecrawl_search",
          source_detail: searchQuery,
          status: "new",
          enrichment_status: "pending",
          notes: result.description,
        }).select("id").single();

        if (!error && newP) inserted.push(newP.id);
      }

      return new Response(JSON.stringify({
        success: true,
        searchResults: found.length,
        newProspects: inserted.length,
        prospectIds: inserted,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid mode. Use: enrich_one, enrich_batch, discover" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("enrich-prospect error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
