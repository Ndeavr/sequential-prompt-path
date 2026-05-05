import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { contractor_id } = await req.json();
    if (!contractor_id) throw new Error("contractor_id_required");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: c } = await sb.from("acq_contractors").select("*").eq("id", contractor_id).single();
    const { data: media } = await sb.from("acq_contractor_media").select("media_type").eq("contractor_id", contractor_id);
    const { data: services } = await sb.from("acq_contractor_services").select("city").eq("contractor_id", contractor_id);

    // Deterministic signal-based scoring
    const hasWebsite = !!c?.website;
    const hasLogo = (media || []).some((m) => m.media_type === "logo");
    const hasImages = (media || []).filter((m) => m.media_type === "image").length;
    const hasVideos = (media || []).filter((m) => m.media_type === "video").length;
    const cityCount = new Set((services || []).map((s) => s.city).filter(Boolean)).size;
    const hasRBQ = !!c?.rbq_number;
    const hasNEQ = !!c?.neq_number;
    const hasDesc = !!(c?.description && c.description.length > 60);

    const visibility = Math.min(20, (hasWebsite ? 12 : 0) + Math.min(8, cityCount * 2));
    const trust = Math.min(25, (hasRBQ ? 16 : 0) + (hasNEQ ? 5 : 0) + (hasLogo ? 4 : 0));
    const content = Math.min(20, (hasDesc ? 6 : 0) + Math.min(10, hasImages * 1.5) + (hasVideos ? 4 : 0));
    const conversion = Math.min(20, (hasWebsite ? 8 : 0) + (hasLogo ? 4 : 0) + (services?.length ? 8 : 0));
    const availability = 12; // baseline — unknown without bookings

    const aipp = Math.round(visibility + trust + content + conversion + availability);

    const strengths: string[] = [];
    if (hasRBQ) strengths.push("Licence RBQ valide");
    if (hasWebsite) strengths.push("Présence web active");
    if (hasLogo) strengths.push("Identité visuelle claire");
    if (cityCount >= 3) strengths.push(`Couverture territoriale (${cityCount} villes)`);

    const weaknesses: string[] = [];
    if (!hasNEQ) weaknesses.push("Numéro NEQ à confirmer");
    if (hasImages < 4) weaknesses.push("Galerie de réalisations limitée");
    if (!hasVideos) weaknesses.push("Aucune vidéo de projet");
    weaknesses.push("Avis Google à confirmer");

    const recommendations = [
      "Activer un canal de prise de rendez-vous direct",
      "Ajouter 6 à 10 photos avant/après par service",
      "Compléter le profil NEQ et assurances",
      "Publier 1 à 2 vidéos courtes de chantier",
    ];

    const lostRev = Math.round((100 - aipp) * 220 + 1800); // realistic monthly $ estimate

    const summary =
      `Score AIPP de ${aipp}/100. ${strengths.length ? "Forces : " + strengths.slice(0, 2).join(", ") + "." : ""} ` +
      `Opportunité immédiate : ${recommendations[0].toLowerCase()}.`;

    // Upsert
    const { data: existing } = await sb
      .from("acq_contractor_scores")
      .select("id")
      .eq("contractor_id", contractor_id)
      .maybeSingle();

    const row = {
      contractor_id,
      aipp_score: aipp,
      visibility_score: visibility,
      trust_score: trust,
      content_score: content,
      conversion_score: conversion,
      availability_score: availability,
      lost_revenue_estimate_monthly: lostRev,
      strengths,
      weaknesses,
      recommendations,
      score_summary: summary,
    };

    if (existing) {
      await sb.from("acq_contractor_scores").update(row).eq("id", existing.id);
    } else {
      await sb.from("acq_contractor_scores").insert(row);
    }

    // Objectives
    await sb.from("acq_contractor_objectives").delete().eq("contractor_id", contractor_id);
    await sb.from("acq_contractor_objectives").insert([
      {
        contractor_id,
        objective_type: "visibility",
        current_state: `Visibilité ${visibility}/20`,
        target_state: "18/20 minimum",
        recommended_action: "Activer la fiche AIPP UNPRO",
        priority: 1,
      },
      {
        contractor_id,
        objective_type: "conversion",
        current_state: `Conversion ${conversion}/20`,
        target_state: "Rendez-vous qualifiés au lieu de soumissions partagées",
        recommended_action: "Brancher le moteur de matching UNPRO",
        priority: 2,
      },
      {
        contractor_id,
        objective_type: "trust",
        current_state: `Confiance ${trust}/25`,
        target_state: "Profil RBQ + NEQ + assurances confirmés",
        recommended_action: "Compléter les vérifications légales",
        priority: 3,
      },
    ]);

    return new Response(JSON.stringify({ success: true, aipp_score: aipp, lost_revenue_estimate_monthly: lostRev }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[acq-generate-score]", e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
