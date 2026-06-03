/**
 * agent-generate-message
 * Génère un message SMS personnalisé via Lovable AI (Gemini) basé sur le AI visibility report.
 * N'envoie pas: écrit dans outreach_messages (status pending) — c'est agent-send-outreach qui draine.
 */
import { corsHeaders, recordAgentRun } from "../_shared/agentRun.ts";

const SYSTEM_PROMPT = `Tu écris des SMS B2B pour UNPRO en français québécois.
Règles ABSOLUES:
- 1 SMS = max 320 caractères.
- Ton: intelligent, spécifique, algorithmique, exclusif, local.
- JAMAIS de copy générique de vente.
- Inclure: prénom OU compagnie, métier, ville, faiblesse IA détectée, urgence territoire.
- Format: Bonjour {prénom}, [insight spécifique]. UNPRO ouvre {N} activations dans {ville}. On vous montre votre score?
- Pas d'emojis. Pas de "!!". Phrases courtes.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(body.limit ?? 20, 50);

  const result = await recordAgentRun("generate-message", async (db) => {
    const { data: leads } = await db
      .from("contractor_leads")
      .select("id, first_name, full_name, company_name, city, trade, category_primary, phone, ai_visibility_score")
      .eq("score_status", "scored")
      .eq("outreach_status", "none")
      .not("phone", "is", null)
      .is("agent_paused_at", null)
      .limit(limit);

    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    let generated = 0;

    for (const lead of leads ?? []) {
      const { data: report } = await db
        .from("ai_visibility_reports")
        .select("ai_summary, visibility_score")
        .eq("lead_id", lead.id)
        .order("generated_at", { ascending: false })
        .limit(1).maybeSingle();

      const trade = lead.trade ?? lead.category_primary ?? "votre métier";
      const fname = lead.first_name ?? (lead.full_name ?? "").split(" ")[0] ?? lead.company_name ?? "";
      const userMsg = `Lead: ${lead.company_name}. Prénom: ${fname}. Métier: ${trade}. Ville: ${lead.city}. Score IA: ${lead.ai_visibility_score}/100. Insight: ${report?.ai_summary ?? ""}. Écris le SMS.`;

      let messageBody = "";
      if (LOVABLE_KEY) {
        try {
          const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_KEY },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userMsg }],
            }),
          });
          const j = await r.json();
          messageBody = j.choices?.[0]?.message?.content?.trim() ?? "";
        } catch (_) { /* fallback below */ }
      }

      if (!messageBody) {
        messageBody = `Bonjour ${fname}, quand un propriétaire demande à l'IA la meilleure entreprise de ${trade} à ${lead.city}, ${lead.company_name} n'apparaît pas. UNPRO ouvre 2 activations dans votre territoire. On vous montre votre score?`;
      }

      await db.from("agent_outreach_messages").insert({
        lead_id: lead.id,
        channel: "sms",
        subject: null,
        body: messageBody,
        status: "pending",
        variant: "v1_insight",
        scheduled_at: new Date().toISOString(),
      });
      generated++;
    }

    return { generated, processed: leads?.length ?? 0 };
  });

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: result.ok ? 200 : 500,
  });
});
