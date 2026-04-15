import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { domain = "mail.unpro.ca", hours = 24 } = await req.json().catch(() => ({}));

    // Get recent delivery stats
    const since = new Date(Date.now() - hours * 3600000).toISOString();
    const { data: logs } = await supabase
      .from("email_delivery_logs")
      .select("status")
      .eq("domain_used", domain)
      .gte("created_at", since);

    const total = logs?.length || 0;
    const bounced = logs?.filter(l => l.status === "bounced").length || 0;
    const sent = logs?.filter(l => l.status === "sent" || l.status === "delivered").length || 0;

    // Get warmup limit
    const today = new Date().toISOString().split("T")[0];
    const { data: warmup } = await supabase
      .from("email_warmup_schedule")
      .select("max_emails, sent_count")
      .eq("domain", domain)
      .eq("scheduled_date", today)
      .maybeSingle();

    // Get domain health
    const { data: health } = await supabase
      .from("email_domain_health")
      .select("dmarc_status, overall_score")
      .eq("domain", domain)
      .maybeSingle();

    const reasons: string[] = [];
    let riskLevel = "low";

    // Check bounce rate
    if (total > 5 && bounced / total > 0.1) {
      reasons.push(`Taux de rebond élevé: ${Math.round(bounced / total * 100)}%`);
      riskLevel = "high";
    }

    // Check warmup overshoot
    if (warmup && warmup.sent_count >= warmup.max_emails) {
      reasons.push(`Limite warmup atteinte: ${warmup.sent_count}/${warmup.max_emails}`);
      riskLevel = riskLevel === "high" ? "high" : "medium";
    }

    // Check DMARC
    if (health?.dmarc_status !== "passed") {
      reasons.push("DMARC non enforced — risque de quarantine/rejet");
      riskLevel = riskLevel === "low" ? "medium" : riskLevel;
    }

    // Volume spike
    if (total > 100) {
      reasons.push(`Volume élevé en ${hours}h: ${total} emails`);
      riskLevel = riskLevel === "low" ? "medium" : riskLevel;
    }

    const action = riskLevel === "high"
      ? "Suspendre les envois immédiatement"
      : riskLevel === "medium"
      ? "Réduire le volume et vérifier la configuration"
      : "Aucune action requise";

    return new Response(JSON.stringify({
      risk_level: riskLevel,
      reasons,
      recommended_action: action,
      stats: { total, sent, bounced, warmup_limit: warmup?.max_emails, warmup_sent: warmup?.sent_count },
      domain_score: health?.overall_score || 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
