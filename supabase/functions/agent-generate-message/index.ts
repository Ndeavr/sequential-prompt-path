/**
 * agent-generate-message — DRAFT generator only.
 * - Writes status "draft" (never "pending"): nothing here is auto-sent; a human approves.
 * - Atomic reservation via unique idempotency_key (lead + campaign + template + month):
 *   concurrent or repeated runs cannot create duplicates nor double-call the LLM.
 * - Skips leads already holding any open row (historical pending included).
 * - Fail-closed eligibility (mobile only, no opt-out/DNC/suppression). Hard cap per run.
 * Incident 2026-10-12: previous version re-inserted pending rows every 30 min (~120k rows).
 */
import { corsHeaders, recordAgentRun } from "../_shared/agentRun.ts";
import { idempotencyKey, isDraftEligible, MAX_PER_RUN, TEMPLATE } from "./logic.ts";
import { buildSmsGreeting, reliableCompanyName, validateSmsBody } from "../_shared/smsGreeting.ts";

const SYSTEM_PROMPT = `Tu écris des SMS B2B pour UNPRO en français québécois.
Règles ABSOLUES:
- Max 220 caractères. Pas d'emojis. Phrases courtes. AUCUNE salutation (elle est ajoutée séparément).
- N'invente AUCUN chiffre, score, constat, rareté, nombre de places, garantie ou rendez-vous.
- Si une donnée est « inconnue », ne la mentionne pas.
- Ne mets aucun lien (il est ajouté séparément après validation).`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  const limit = Math.min(Number(body.limit) || 10, MAX_PER_RUN);

  const result = await recordAgentRun("generate-message", async (db) => {
    const { data: leads, error } = await db
      .from("contractor_leads")
      .select("id, first_name, full_name, company_name, city, trade, category_primary, ai_visibility_score, phone_type, do_not_contact, unsubscribed_at, sms_disabled, sms_suppressed_at")
      .eq("score_status", "scored")
      .eq("outreach_status", "none")
      .not("phone", "is", null)
      .is("agent_paused_at", null)
      .limit(limit * 3);
    if (error) throw new Error(error.message);

    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    let generated = 0, skipped_ineligible = 0, skipped_existing = 0;
    const now = new Date();

    for (const lead of leads ?? []) {
      if (generated >= limit) break;
      if (!isDraftEligible(lead)) { skipped_ineligible++; continue; }

      const { count: open } = await db.from("agent_outreach_messages")
        .select("id", { count: "exact", head: true })
        .eq("lead_id", lead.id).in("status", ["pending", "draft", "generating"]);
      if ((open ?? 0) > 0) { skipped_existing++; continue; }

      // Atomic reservation — the unique index decides the single winner.
      const key = idempotencyKey(lead.id, now);
      const { data: reserved } = await db.from("agent_outreach_messages")
        .upsert({ lead_id: lead.id, channel: "sms", body: "", status: "generating", variant: TEMPLATE, idempotency_key: key },
          { onConflict: "idempotency_key", ignoreDuplicates: true })
        .select("id");
      if (!reserved?.length) { skipped_existing++; continue; }
      const rowId = reserved[0].id;

      // Single shared salutation (A prénom fiable / B équipe / C générique).
      const greeting = buildSmsGreeting({ first_name: lead.first_name, company_name: lead.company_name });
      const company = reliableCompanyName(lead.company_name);
      // ONE LLM call max per reserved row; the model only writes the body after the greeting.
      let rest = "";
      if (LOVABLE_KEY) {
        try {
          const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_KEY },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [{ role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: `Entreprise: ${company ?? "(inconnue)"}. Métier: ${lead.trade ?? lead.category_primary ?? "(inconnu)"}. Ville: ${lead.city ?? "(inconnue)"}. Écris seulement la suite, SANS salutation.` }],
            }),
          });
          if (r.status === 402 || r.status === 403 || r.status === 429) {
            await db.from("agent_outreach_messages").update({ status: "failed", error: `ai_${r.status}` }).eq("id", rowId);
            await r.text();
            break; // circuit breaker
          }
          const j = await r.json();
          rest = (j.choices?.[0]?.message?.content ?? "").trim().replace(/^(bonjour|salut)[^,.!]*[,.!]\s*/i, "");
        } catch (_) { /* fallback */ }
      }
      if (!rest) {
        rest = greeting.kind === "generic"
          ? "Nous aidons les entrepreneurs à recevoir des rendez-vous exclusifs. Voulez-vous en savoir plus?"
          : "UNPRO aide les entrepreneurs à recevoir des rendez-vous exclusifs. Voulez-vous en savoir plus?";
      }
      const messageBody = `${greeting.text} ${rest} Répondez STOP pour ne plus recevoir de messages.`;
      const check = validateSmsBody(messageBody, { commercial: true });
      await db.from("agent_outreach_messages")
        .update(check.ok
          ? { body: messageBody, status: "draft", metadata: { requires_approval: true, cta_url: null, greeting_kind: greeting.kind } }
          : { body: messageBody, status: "quarantined", error: `invalid_body:${check.issues.join(",")}`, metadata: { requires_approval: true, greeting_kind: greeting.kind } })
        .eq("id", rowId);
      generated++;
    }
    return { generated, skipped_ineligible, skipped_existing, processed: leads?.length ?? 0 };
  });

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: result.ok ? 200 : 500,
  });
});
