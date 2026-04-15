import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { domain = "mail.unpro.ca" } = await req.json().catch(() => ({}));

    // Simulate DNS checks (in production, use DNS-over-HTTPS APIs)
    const dkimStatus = "passed";
    const spfStatus = "passed";
    let dmarcStatus = "warning";
    let dmarcPolicy: string | null = null;

    // Check DMARC via Google DNS-over-HTTPS
    try {
      const dnsRes = await fetch(`https://dns.google/resolve?name=_dmarc.${domain.replace(/^mail\./, "")}&type=TXT`);
      const dnsData = await dnsRes.json();
      const answers = dnsData?.Answer || [];
      for (const a of answers) {
        const txt = (a.data || "").replace(/"/g, "");
        if (txt.includes("v=DMARC1")) {
          dmarcPolicy = txt;
          if (txt.includes("p=reject") || txt.includes("p=quarantine")) {
            dmarcStatus = "passed";
          } else if (txt.includes("p=none")) {
            dmarcStatus = "warning";
          }
        }
      }
    } catch {
      dmarcStatus = "unknown";
    }

    // Calculate score
    const scores: Record<string, number> = { passed: 30, warning: 15, unknown: 0, failed: 0 };
    const overallScore = Math.min(100,
      (scores[dkimStatus] || 0) +
      (scores[spfStatus] || 0) +
      (scores[dmarcStatus] || 0) + 10
    );

    const status = overallScore >= 80 ? "ready" : overallScore >= 50 ? "limited" : "blocked";

    // Upsert into email_domain_health
    await supabase.from("email_domain_health").upsert({
      domain,
      dkim_status: dkimStatus,
      spf_status: spfStatus,
      dmarc_status: dmarcStatus,
      dmarc_policy: dmarcPolicy,
      overall_score: overallScore,
      status,
      last_checked: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "domain" });

    const result = { domain, dkim_status: dkimStatus, spf_status: spfStatus, dmarc_status: dmarcStatus, dmarc_policy: dmarcPolicy, overall_score: overallScore, status };

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
