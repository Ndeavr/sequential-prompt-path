// acq-enrich-prospect — fetches website + computes basic enrichment, updates prospect
import { svc, startRun, finishRun, log, cors, requireService } from "../_shared/acq-logger.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const s = svc();
  const { prospect_id } = await req.json().catch(() => ({}));
  if (!prospect_id) return new Response(JSON.stringify({ error: "prospect_id requis" }), { status: 400, headers: cors });

  const runId = await startRun(s, "enrich", { prospect_id });
  const { data: prospect, error } = await s.from("contractor_prospects").select("*").eq("id", prospect_id).maybeSingle();
  if (error || !prospect) {
    await log(s, runId, "enrich.load", "error", "Prospect introuvable", prospect_id);
    await finishRun(s, runId, { status: "failed", error_summary: "Not found" });
    return new Response(JSON.stringify({ ok: false, error: "Not found" }), { status: 404, headers: cors });
  }

  const missing: string[] = [];
  const patch: Record<string, unknown> = {};

  // Website scrape (Firecrawl if available, otherwise basic fetch)
  if (prospect.website_url) {
    const fc = Deno.env.get("FIRECRAWL_API_KEY");
    try {
      if (fc) {
        const r = await fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${fc}`, "Content-Type": "application/json" },
          body: JSON.stringify({ url: prospect.website_url, formats: ["markdown", "links"], onlyMainContent: true }),
        });
        const j = await r.json();
        const md: string = j?.data?.markdown || j?.markdown || "";
        const links: string[] = j?.data?.links || j?.links || [];
        // Detect email
        const emailMatch = md.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
        if (emailMatch && !prospect.email) patch.email = emailMatch[0];
        // Detect RBQ / NEQ
        const rbqMatch = md.match(/RBQ[\s:#]*([\d\- ]{8,})/i);
        if (rbqMatch && !prospect.rbq) patch.rbq = rbqMatch[1].replace(/\D/g, "");
        const neqMatch = md.match(/NEQ[\s:#]*([\d ]{10,})/i);
        if (neqMatch && !prospect.neq) patch.neq = neqMatch[1].replace(/\D/g, "");
        await log(s, runId, "enrich.firecrawl", "success", "Site scrapé", prospect_id, { md_len: md.length, links: links.length });
      } else {
        await log(s, runId, "enrich.firecrawl", "skipped", "FIRECRAWL_API_KEY absent", prospect_id);
        missing.push("firecrawl");
      }
    } catch (e) {
      await log(s, runId, "enrich.firecrawl", "warning", String(e), prospect_id);
    }
  } else {
    missing.push("website_url");
  }

  if (!prospect.email && !patch.email) missing.push("email");
  if (!prospect.phone) missing.push("phone");
  if (!prospect.rbq && !patch.rbq) missing.push("rbq");
  if (!prospect.neq && !patch.neq) missing.push("neq");

  patch.enrichment_status = missing.length > 3 ? "failed" : "enriched";
  patch.blocked_reason = missing.length > 3 ? `Données manquantes: ${missing.join(", ")}` : null;
  patch.updated_at = new Date().toISOString();

  await s.from("contractor_prospects").update(patch).eq("id", prospect_id);
  await log(s, runId, "enrich.done", "success", `Statut: ${patch.enrichment_status}`, prospect_id, { missing, patch });
  await finishRun(s, runId, { status: "succeeded", total_items: 1, succeeded_count: 1 });

  return new Response(JSON.stringify({ ok: true, patch, missing, run_id: runId }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
