// qa-e2e-fixture — static, clearly-labeled QA landing page used ONLY as the
// synthetic destination of E2E outreach selftests (acq-e2e-real) and repaired
// QA links. No data, no payment, no tracking, noindex. Safe to expose publicly.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const run = (url.searchParams.get("run") ?? "").replace(/[^a-z0-9-]/gi, "").slice(0, 40);
  const html = `<!doctype html><html lang="fr-CA"><head><meta charset="utf-8"><title>Fixture QA UNPRO</title><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:system-ui,sans-serif;background:#050816;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:1.5rem"><main style="max-width:32rem;text-align:center"><h1 style="font-size:1.5rem">Fixture QA UNPRO</h1><p style="color:rgba(255,255,255,.75);line-height:1.6">Cette page est une destination synthétique utilisée uniquement pour valider les liens de suivi UNPRO (tests E2E). Aucune donnée réelle, aucun paiement, aucune offre.</p>${run ? `<p data-testid="qa-run" style="color:rgba(255,255,255,.5);font-size:.85rem">Run : ${run}</p>` : ""}</main></body></html>`;
  return new Response(html, {
    headers: { ...cors, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
});
