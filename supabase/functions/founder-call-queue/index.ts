/**
 * UNPRO — Founder call queue builder.
 *
 * Prepares and prioritizes the ONLY manual operational task left to the founder:
 * calling selected contractors/prospects where a human conversation matters.
 *
 * Uses real rows only (verified/declared data). Never invents a business,
 * a phone number, an outreach result or a verification status.
 * Never sends anything — this function only builds a list.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { reportOutcome } from "../_shared/reliability.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const MAX_QUEUE = 25;

function scriptFor(name: string, city: string | null, category: string | null): string {
  const where = city ? ` à ${city}` : "";
  const what = category ? ` en ${category.replace(/-/g, " ")}` : "";
  return [
    `Bonjour, ici UNPRO. Je parle bien au responsable de ${name}?`,
    `On référence les entreprises de services${what}${where} et des propriétaires cherchent déjà ce service dans votre secteur.`,
    `Je vous appelle parce que votre fiche est admissible à la place gratuite de 12 mois dans votre ville.`,
    `Est-ce que ça vaut la peine que je vous explique en deux minutes comment ça fonctionne?`,
  ].join("\n");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Candidates: real verified prospects with a phone, not already queued.
  const { data: prospects, error } = await sb
    .from("verified_contractor_prospects")
    .select("id, business_name, phone_e164, phone_primary, email, city, service_category_slug, data_quality_score, created_at")
    .not("phone_e164", "is", null)
    .order("data_quality_score", { ascending: false, nullsFirst: false })
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: existing } = await sb
    .from("founder_call_tasks")
    .select("source_record_id")
    .in("status", ["queued", "callback"]);
  const queued = new Set((existing ?? []).map((r: any) => r.source_record_id));

  const rows = (prospects ?? [])
    .filter((p: any) => !queued.has(p.id))
    .slice(0, MAX_QUEUE)
    .map((p: any) => ({
      source_table: "verified_contractor_prospects",
      source_record_id: p.id,
      business_name: p.business_name,
      phone: p.phone_e164 ?? p.phone_primary,
      email: p.email,
      city: p.city,
      service_category: p.service_category_slug,
      priority_score: Number(p.data_quality_score ?? 0),
      reason: "Fiche vérifiée avec téléphone, admissible à la place gratuite de sa ville.",
      context: {
        data_class: "verified",
        quality_score: p.data_quality_score ?? null,
        imported_at: p.created_at,
      },
      suggested_script: scriptFor(p.business_name ?? "votre entreprise", p.city, p.service_category_slug),
      objective: "Obtenir l'accord verbal puis envoyer le lien d'activation gratuite.",
      status: "queued",
      next_action: "Envoyer le lien d'activation après un accord verbal.",
    }));

  let inserted = 0;
  if (rows.length > 0) {
    const { error: insErr, count } = await sb
      .from("founder_call_tasks")
      .insert(rows, { count: "exact" });
    if (!insErr) inserted = count ?? rows.length;
  }

  await reportOutcome({
    operation: "founder.call_queue.build",
    intent: "Préparer la liste d'appels priorisée du fondateur",
    outcome: inserted > 0 ? "achieved" : "pending",
    service: "founder-call-queue",
    next_action: inserted > 0 ? "Le fondateur appelle depuis /admin/command" : "Aucun nouveau candidat",
    payload: { candidates: prospects?.length ?? 0, inserted },
  });

  return new Response(JSON.stringify({ ok: true, candidates: prospects?.length ?? 0, inserted }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
