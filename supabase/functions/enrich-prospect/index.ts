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

// ─── Junk TLDs and domains to reject ───
const JUNK_TLDS = new Set(["css","js","jsx","tsx","ts","scss","less","map","svg","png","jpg","jpeg","gif","webp","ico","woff","woff2","ttf","eot","json","xml","html","htm","php","asp","py"]);
const JUNK_DOMAINS = new Set(["example.com","sentry.io","wixpress.com","cloudflare.com","googleapis.com","gstatic.com","w3.org","schema.org","yellowpages.ca","pagesjaunes.ca","facebook.com","instagram.com","twitter.com","linkedin.com","google.com","youtube.com","wordpress.org","jquery.com","bootstrapcdn.com","cloudfront.net","amazonaws.com","gravatar.com","wp.com","trustedpros.ca","trustedpros.com","homestars.com","houzz.com","houzz.ca","yelp.com","yelp.ca","bbb.org","mapquest.com","apple.com","microsoft.com","mozilla.org","github.com","canpages.ca","411.ca","pagesdor.com","soumissionrenovation.ca","renovationquotient.com","renoquotes.com"]);

function isValidBusinessEmail(email: string): boolean {
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  
  // Local part sanity
  if (local.length < 2 || local.length > 64) return false;
  if (local.startsWith(".") || local.startsWith("-") || local.startsWith("_")) return false;
  if (local.startsWith("www.")) return false;
  if (/^\d+$/.test(local)) return false;
  
  // Domain sanity
  const domainParts = domain.split(".");
  if (domainParts.length < 2) return false;
  const tld = domainParts[domainParts.length - 1];
  if (JUNK_TLDS.has(tld)) return false;
  if (JUNK_DOMAINS.has(domain)) return false;
  
  // No CSS/JS patterns
  if (/^[0-9a-f]{6,}$/i.test(local)) return false;
  if (local.includes("static") || local.includes("noreply") || local.includes("no-reply")) return false;
  if (domain.includes("cdn") || domain.includes("static")) return false;
  
  return true;
}

// ─── Extract emails from text (standard + obfuscated) ───
function extractEmails(text: string): string[] {
  const results = new Set<string>();

  // Standard regex
  const standard = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  standard.forEach(e => results.add(e.toLowerCase()));

  // Obfuscated: name [at] domain [dot] com
  const obfuscated = text.matchAll(
    /([a-zA-Z0-9._%+-]+)\s*[\[\({<]?\s*(?:at|AT|arobase)\s*[\]\)}>]?\s*([a-zA-Z0-9.-]+)\s*[\[\({<]?\s*(?:dot|DOT)\s*[\]\)}>]?\s*([a-zA-Z]{2,})/g
  );
  for (const m of obfuscated) {
    results.add(`${m[1].trim()}@${m[2].trim()}.${m[3].trim()}`.toLowerCase());
  }

  // mailto: links in HTML
  const mailto = text.matchAll(/mailto:([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi);
  for (const m of mailto) {
    results.add(m[1].toLowerCase());
  }

  // href="mailto:..." with HTML entities
  const encoded = text.matchAll(/&#109;&#97;&#105;&#108;&#116;&#111;:([^"<\s]+)/gi);
  for (const m of encoded) {
    const decoded = m[1].replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c)));
    if (decoded.includes("@")) results.add(decoded.toLowerCase());
  }

  // Strict filter — only valid business emails survive
  return [...results].filter(isValidBusinessEmail);
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

// ─── Firecrawl scrape — full HTML + markdown + screenshot ───
async function scrapeUrl(url: string, withScreenshot = false): Promise<{ markdown: string; html: string; screenshot?: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const formats: string[] = ["markdown", "html", "rawHtml"];
    if (withScreenshot) formats.push("screenshot");

    const res = await fetch(`${FIRECRAWL_V2}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats, onlyMainContent: false, waitFor: 2000 }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();
    const d = data.data || data;
    return {
      markdown: d.markdown || "",
      html: (d.rawHtml || d.html || ""),
      screenshot: d.screenshot || undefined,
    };
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

  // Step 2: Scrape FULL homepage (markdown + rawHtml + screenshot)
  if (website) {
    log.push({ step: "scrape_homepage_full", url: website });
    const main = await scrapeUrl(website, true);
    if (main) {
      const combined = `${main.markdown}\n${main.html}`;
      const emails = extractEmails(combined);
      emails.forEach(e => allEmails.push({ email: e, source: "homepage", confidence: 85 }));
      socials = { ...socials, ...extractSocials(combined) };
      log.push({ step: "homepage_emails", found: emails.length, emails });
    }

    // Step 3: ALWAYS scrape contact pages (don't skip even if emails found on homepage)
    const contactPaths = ["/contact", "/nous-joindre", "/contactez-nous", "/about", "/a-propos"];
    for (const path of contactPaths) {
      try {
        const contactUrl = new URL(path, website.startsWith("http") ? website : `https://${website}`).href;
        log.push({ step: "scrape_contact", url: contactUrl });
        const contact = await scrapeUrl(contactUrl);
        if (contact) {
          const combined = `${contact.markdown}\n${contact.html}`;
          const ce = extractEmails(combined);
          ce.forEach(e => allEmails.push({ email: e, source: `contact:${path}`, confidence: 92 }));
          socials = { ...socials, ...extractSocials(combined) };
          log.push({ step: "contact_emails", path, found: ce.length, emails: ce });
        }
      } catch { /* skip */ }
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
      const combined = `${gmb.markdown}\n${gmb.html}`;
      const ge = extractEmails(combined);
      ge.forEach(e => allEmails.push({ email: e, source: "google_maps", confidence: 80 }));
    }
  }

  // Deduplicate and pick best — prioritize emails matching prospect's own domain
  const emailMap = new Map<string, EmailCandidate>();
  for (const ec of allEmails) {
    const key = ec.email.toLowerCase();
    let boostedConfidence = ec.confidence;
    // Boost emails that match the prospect's domain
    if (domain && key.endsWith(`@${domain}`)) boostedConfidence = Math.min(boostedConfidence + 10, 99);
    // Penalize generated-only emails
    if (ec.source === "generated") boostedConfidence = Math.max(boostedConfidence - 5, 10);
    const boosted = { ...ec, email: key, confidence: boostedConfidence };
    if (!emailMap.has(key) || (emailMap.get(key)!.confidence < boostedConfidence)) {
      emailMap.set(key, boosted);
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
    const body = await req.json().catch(() => ({}));
    const { mode, prospect_id, city, category, limit: searchLimit } = body as any;

    // Mode 0: CRON WORKER — process 3 pending prospects, never timeout
    if (mode === "cron_worker") {
      const BATCH_SIZE = 3;
      // Pick oldest pending first, then retry failed (older than 1h)
      const { data: pending } = await supabase
        .from("contractors_prospects")
        .select("id")
        .eq("enrichment_status", "pending")
        .order("created_at", { ascending: true })
        .limit(BATCH_SIZE);

      const remaining = BATCH_SIZE - (pending?.length || 0);
      let retries: any[] = [];
      if (remaining > 0) {
        const oneHourAgo = new Date(Date.now() - 3600_000).toISOString();
        const { data } = await supabase
          .from("contractors_prospects")
          .select("id")
          .eq("enrichment_status", "failed")
          .lt("enriched_at", oneHourAgo)
          .order("enriched_at", { ascending: true })
          .limit(remaining);
        retries = data || [];
      }

      const batch = [...(pending || []), ...retries];
      if (batch.length === 0) {
        return new Response(JSON.stringify({ success: true, message: "No prospects to process", processed: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results = [];
      for (const p of batch) {
        try {
          const r = await enrichProspect(supabase, p.id);
          results.push(r);
        } catch (e) {
          await supabase.from("contractors_prospects").update({ enrichment_status: "failed", enriched_at: new Date().toISOString() }).eq("id", p.id);
          results.push({ prospectId: p.id, error: (e as Error).message });
        }
      }

      // Check total verified emails — auto-trigger outreach at 10+
      const { data: verifiedCount } = await supabase
        .from("contractors_prospects")
        .select("id", { count: "exact", head: true })
        .not("verified_email", "is", null)
        .eq("outreach_status", "pending");

      let autoOutreach = false;
      if ((verifiedCount as any)?.length >= 10 || (results.filter(r => r.email).length > 0)) {
        // Check total across DB
        const { count } = await supabase
          .from("contractors_prospects")
          .select("id", { count: "exact", head: true })
          .not("verified_email", "is", null)
          .neq("outreach_status", "queued")
          .neq("outreach_status", "sent");
        
        if ((count || 0) >= 10) {
          autoOutreach = true;
          await supabase
            .from("contractors_prospects")
            .update({ outreach_status: "queued" })
            .not("verified_email", "is", null)
            .eq("outreach_status", "pending");
        }
      }

      return new Response(JSON.stringify({
        success: true,
        processed: results.length,
        emailsFound: results.filter(r => r.email).length,
        failed: results.filter(r => r.error).length,
        autoOutreachTriggered: autoOutreach,
        results,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        .in("enrichment_status", ["pending", "failed"])
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
        const ids = withEmails.map(r => r.prospectId);
        await supabase.from("contractors_prospects")
          .update({ outreach_status: "queued" })
          .in("id", ids);
      }

      return new Response(JSON.stringify({
        success: true,
        total: results.length,
        emailsFound: withEmails.length,
        missedPublicEmailCount: results.filter(r => !r.email).length,
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
