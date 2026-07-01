// Phase 1+2 — Enrichment failure audit + re-enrichment for contractor_leads
// Read-only audit by default; pass { execute: true } to write recovered contact data.
// Never overwrites an existing non-null phone/email.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Lead = {
  id: string;
  company_name: string | null;
  website_url: string | null;
  phone: string | null;
  email: string | null;
  do_not_contact: boolean | null;
  unsubscribed_at: string | null;
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const TEL_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
const BLOCKED_EMAIL_HINTS = /(sentry|wixpress|example\.|no-?reply|godaddy|domainsbyproxy|whoisguard|cloudflare)/i;

function normalizeUrl(u: string): string {
  const s = u.trim();
  if (/^https?:\/\//i.test(s)) return s;
  return "https://" + s.replace(/^\/+/, "");
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return null;
}

async function fetchPage(url: string, ms = 3500): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; UNPRO-Enrich/1.0; +https://unpro.ca)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("text/html") && !ct.includes("xml")) return null;
    const txt = await r.text();
    return txt.slice(0, 200_000);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function extractContacts(html: string, domain: string) {
  const emails = new Set<string>();
  const phones = new Set<string>();
  const sources = new Set<string>();

  // mailto:
  for (const m of html.matchAll(/mailto:([^"'\s?>]+)/gi)) {
    const e = m[1].split("?")[0].toLowerCase();
    if (BLOCKED_EMAIL_HINTS.test(e)) continue;
    emails.add(e);
    sources.add("mailto");
  }
  // tel:
  for (const m of html.matchAll(/tel:([+\d().\s-]+)/gi)) {
    const n = normalizePhone(m[1]);
    if (n) { phones.add(n); sources.add("tel"); }
  }
  // JSON-LD
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1]);
      const nodes = Array.isArray(j) ? j : [j];
      for (const n of nodes) {
        if (n?.email) { emails.add(String(n.email).toLowerCase()); sources.add("jsonld"); }
        if (n?.telephone) {
          const p = normalizePhone(String(n.telephone));
          if (p) { phones.add(p); sources.add("jsonld"); }
        }
      }
    } catch { /* ignore */ }
  }
  // Free-text regex fallback (limited scan window to avoid noise)
  const scan = html.slice(0, 200_000);
  for (const m of scan.match(EMAIL_RE) || []) {
    const e = m.toLowerCase();
    if (BLOCKED_EMAIL_HINTS.test(e)) continue;
    // Prefer same-domain emails
    if (domain && !e.endsWith("@" + domain) && emails.size > 0) continue;
    emails.add(e);
    sources.add("regex");
  }
  for (const m of scan.match(TEL_RE) || []) {
    const p = normalizePhone(m);
    if (p) { phones.add(p); sources.add("regex"); }
  }

  return {
    email: [...emails][0] ?? null,
    phone: [...phones][0] ?? null,
    sources: [...sources],
  };
}

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

function classify(lead: Lead, siteReachable: boolean, contactPageReachable: boolean, found: { email: string | null; phone: string | null }): string {
  if (!lead.website_url) return "no_website";
  if (!siteReachable && !contactPageReachable) return "website_fetch_failed";
  if (!found.email && !found.phone) return "parser_no_hits";
  return "recovered";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const started = Date.now();
  try {
    const body = await req.json().catch(() => ({}));
    const execute = body?.execute === true;
    const limit = Math.min(Number(body?.limit ?? 25), 40);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Snapshot before
    const { count: before_missing_c } = await sb
      .from("contractor_leads")
      .select("id", { count: "exact", head: true })
      .is("phone", null).is("email", null);
    const before_missing = before_missing_c ?? 0;

    const { data: leadsRaw, error: fetchErr } = await sb
      .from("contractor_leads")
      .select("id, company_name, website_url, phone, email, do_not_contact, unsubscribed_at")
      .is("phone", null)
      .is("email", null)
      .limit(limit);
    if (fetchErr) throw new Error("fetch_leads: " + fetchErr.message);
    const leads = (leadsRaw ?? []) as Lead[];

    const buckets: Record<string, number> = {
      no_website: 0, website_fetch_failed: 0, parser_no_hits: 0,
      recovered: 0, skipped_dnc: 0,
    };
    const by_source: Record<string, number> = {};
    let new_phone_count = 0;
    let new_email_count = 0;
    const samples: Record<string, string[]> = { no_website: [], website_fetch_failed: [], parser_no_hits: [], recovered: [] };

    // Concurrency 6
    const queue = [...leads];
    async function worker() {
      while (queue.length) {
        const lead = queue.shift()!;
        if (lead.do_not_contact || lead.unsubscribed_at) { buckets.skipped_dnc++; continue; }

        if (!lead.website_url) {
          buckets.no_website++;
          if (samples.no_website.length < 20) samples.no_website.push(lead.id);
          if (execute) {
            await sb.from("contractor_leads").update({
              enrichment_last_error: "no_website",
              enrichment_last_source: null,
              enrichment_last_run_at: new Date().toISOString(),
              enrichment_attempts: 1, // will be overwritten by RPC-free increment path
            }).eq("id", lead.id);
          }
          continue;
        }

        const base = normalizeUrl(lead.website_url);
        const dom = domainOf(base);
        const candidates = [
          base,
          base.replace(/\/+$/, "") + "/contact",
        ];

        let siteReachable = false;
        let contactPageReachable = false;
        let found = { email: null as string | null, phone: null as string | null, sources: [] as string[] };
        for (let i = 0; i < candidates.length; i++) {
          const html = await fetchPage(candidates[i]);
          if (html) {
            if (i === 0) siteReachable = true; else contactPageReachable = true;
            const hits = extractContacts(html, dom);
            found.email ||= hits.email;
            found.phone ||= hits.phone;
            for (const s of hits.sources) found.sources.push(s);
            if (found.email && found.phone) break;
          }
        }

        const bucket = classify(lead, siteReachable, contactPageReachable, found);
        buckets[bucket] = (buckets[bucket] ?? 0) + 1;
        if (samples[bucket] && samples[bucket].length < 20) samples[bucket].push(lead.id);

        if (bucket === "recovered") {
          for (const s of found.sources) by_source[s] = (by_source[s] ?? 0) + 1;
          if (found.phone) new_phone_count++;
          if (found.email) new_email_count++;

          if (execute) {
            // Never overwrite existing values
            const upd: Record<string, unknown> = {
              enrichment_last_error: null,
              enrichment_last_source: found.sources.join(",").slice(0, 120),
              enrichment_last_run_at: new Date().toISOString(),
            };
            if (found.phone && !lead.phone) {
              upd.phone = found.phone;
              upd.phone_e164 = found.phone;
            }
            if (found.email && !lead.email) upd.email = found.email;
            await sb.from("contractor_leads").update(upd).eq("id", lead.id);
          }
        } else if (execute) {
          await sb.from("contractor_leads").update({
            enrichment_last_error: bucket,
            enrichment_last_run_at: new Date().toISOString(),
          }).eq("id", lead.id);
        }
      }
    }
    await Promise.all([worker(), worker(), worker()]);

    const { count: after_missing_c } = await sb
      .from("contractor_leads")
      .select("id", { count: "exact", head: true })
      .is("phone", null).is("email", null);
    const after_missing = after_missing_c ?? before_missing;

    return new Response(JSON.stringify({
      ok: true,
      execute,
      elapsed_ms: Date.now() - started,
      before_missing,
      after_missing,
      new_phone_count,
      new_email_count,
      buckets,
      by_source,
      samples,
      root_cause_ranking: Object.entries(buckets)
        .filter(([k]) => k !== "recovered" && k !== "skipped_dnc")
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => ({ bucket: k, count: v })),
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as any)?.message ?? e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
