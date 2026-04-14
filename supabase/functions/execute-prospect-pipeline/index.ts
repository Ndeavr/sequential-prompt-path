const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { run_id, prospect_id, resume_from } = await req.json();

    if (!run_id || !prospect_id) {
      return new Response(JSON.stringify({ error: "run_id and prospect_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update run status
    await supabase.from("prospect_execution_runs").update({ status: "running" }).eq("id", run_id);

    // Get steps
    const { data: steps } = await supabase
      .from("prospect_execution_steps")
      .select("*")
      .eq("run_id", run_id)
      .order("step_order");

    if (!steps?.length) {
      return new Response(JSON.stringify({ error: "No steps found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get prospect
    const { data: prospect } = await supabase
      .from("prospect_records")
      .select("*")
      .eq("id", prospect_id)
      .single();

    if (!prospect) {
      return new Response(JSON.stringify({ error: "Prospect not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const shouldSkip = (stepKey: string) => {
      if (!resume_from) return false;
      const resumeOrder = steps.find((s: any) => s.step_key === resume_from)?.step_order ?? 0;
      const thisOrder = steps.find((s: any) => s.step_key === stepKey)?.step_order ?? 0;
      return thisOrder < resumeOrder;
    };

    const updateStep = async (stepKey: string, status: string, result?: any, error?: string) => {
      const step = steps.find((s: any) => s.step_key === stepKey);
      if (!step) return;
      const update: any = { status };
      if (status === "running") update.started_at = new Date().toISOString();
      if (status === "completed" || status === "failed") update.completed_at = new Date().toISOString();
      if (result) update.result_json = result;
      if (error) { update.error_message = error; update.error_code = "STEP_ERROR"; }
      await supabase.from("prospect_execution_steps").update(update).eq("id", step.id);
    };

    const updateProgress = async (percent: number, currentStep: string) => {
      await supabase.from("prospect_execution_runs").update({
        completion_percent: percent,
        current_step: currentStep,
      }).eq("id", run_id);
    };

    // ─── Step 1: Import ───
    if (!shouldSkip("import")) {
      await updateStep("import", "running");
      await updateProgress(5, "import");
      await updateStep("import", "completed", { prospect_id });
    }

    // ─── Step 2: Normalize ───
    if (!shouldSkip("normalize")) {
      await updateStep("normalize", "running");
      await updateProgress(10, "normalize");
      const domain = prospect.domain?.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase().trim();
      await supabase.from("prospect_records").update({ domain }).eq("id", prospect_id);
      await updateStep("normalize", "completed", { domain });
    }

    // ─── Step 3: Extract website ───
    if (!shouldSkip("extract")) {
      await updateStep("extract", "running");
      await updateProgress(20, "extract");
      try {
        // Try Firecrawl if available
        const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
        let extractionResult: any = {};

        if (firecrawlKey && prospect.domain) {
          const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
            method: "POST",
            headers: { "Authorization": `Bearer ${firecrawlKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              url: `https://${prospect.domain}`,
              formats: ["markdown", "links"],
              onlyMainContent: true,
            }),
          });
          if (fcRes.ok) {
            const fcData = await fcRes.json();
            extractionResult = {
              title: fcData.data?.metadata?.title || "",
              description: fcData.data?.metadata?.description || "",
              markdown_length: fcData.data?.markdown?.length || 0,
              links_count: fcData.data?.links?.length || 0,
            };

            // Store enrichment signals from extraction
            const signals: any[] = [];
            if (fcData.data?.metadata?.title) {
              signals.push({ prospect_id, signal_type: "brand", label: "Titre du site", value: fcData.data.metadata.title, confidence_score: 90 });
            }
            if (fcData.data?.metadata?.description) {
              signals.push({ prospect_id, signal_type: "brand", label: "Meta description", value: fcData.data.metadata.description, confidence_score: 85 });
            }
            const md = fcData.data?.markdown || "";
            if (md.toLowerCase().includes("rbq") || md.toLowerCase().includes("licence")) {
              signals.push({ prospect_id, signal_type: "trust", label: "Mention RBQ/licence", value: "detected", confidence_score: 70 });
            }
            if (md.toLowerCase().includes("témoignage") || md.toLowerCase().includes("avis") || md.toLowerCase().includes("review")) {
              signals.push({ prospect_id, signal_type: "review", label: "Témoignages détectés", value: "detected", confidence_score: 65 });
            }
            if (md.toLowerCase().includes("avant") && md.toLowerCase().includes("après")) {
              signals.push({ prospect_id, signal_type: "trust", label: "Avant/Après détecté", value: "detected", confidence_score: 60 });
            }
            if (md.toLowerCase().includes("faq") || md.toLowerCase().includes("questions")) {
              signals.push({ prospect_id, signal_type: "trust", label: "FAQ détectée", value: "detected", confidence_score: 55 });
            }
            // Detect services
            const serviceKeywords = ["isolation", "toiture", "plomberie", "électricité", "rénovation", "peinture", "fenêtre", "chauffage"];
            for (const kw of serviceKeywords) {
              if (md.toLowerCase().includes(kw)) {
                signals.push({ prospect_id, signal_type: "service", label: kw, value: "detected", confidence_score: 60, source_url: `https://${prospect.domain}` });
              }
            }
            // Detect cities
            const cityKeywords = ["montréal", "laval", "longueuil", "québec", "gatineau", "sherbrooke", "trois-rivières"];
            for (const city of cityKeywords) {
              if (md.toLowerCase().includes(city)) {
                signals.push({ prospect_id, signal_type: "city", label: city, value: "detected", confidence_score: 55 });
              }
            }

            if (signals.length > 0) {
              await supabase.from("prospect_enrichment_signals").insert(signals);
            }

            // Update prospect with detected info
            const firstCity = signals.find((s) => s.signal_type === "city")?.label;
            if (firstCity) {
              await supabase.from("prospect_records").update({
                city_primary: firstCity,
                website_status: "active",
                status: "enriched",
              }).eq("id", prospect_id);
            } else {
              await supabase.from("prospect_records").update({
                website_status: "active",
                status: "enriched",
              }).eq("id", prospect_id);
            }
          }
        } else {
          // Mock extraction if no Firecrawl
          extractionResult = { mock: true, note: "Firecrawl non disponible" };
          await supabase.from("prospect_records").update({ website_status: "unknown", status: "enriched" }).eq("id", prospect_id);
        }

        await updateStep("extract", "completed", extractionResult);
      } catch (e: any) {
        await updateStep("extract", "failed", null, e.message);
      }
    }

    // ─── Step 4: Enrich ───
    if (!shouldSkip("enrich")) {
      await updateStep("enrich", "running");
      await updateProgress(35, "enrich");
      // Count signals
      const { count } = await supabase
        .from("prospect_enrichment_signals")
        .select("*", { count: "exact", head: true })
        .eq("prospect_id", prospect_id);
      await updateStep("enrich", "completed", { signal_count: count ?? 0 });
    }

    // ─── Step 5: AIPP Score ───
    if (!shouldSkip("aipp_score")) {
      await updateStep("aipp_score", "running");
      await updateProgress(45, "aipp_score");

      const { data: signals } = await supabase
        .from("prospect_enrichment_signals")
        .select("signal_type, confidence_score")
        .eq("prospect_id", prospect_id);

      const signalTypes = signals?.map((s: any) => s.signal_type) ?? [];
      const avgConfidence = signals?.length
        ? signals.reduce((sum: number, s: any) => sum + (s.confidence_score || 0), 0) / signals.length
        : 30;

      const hasReview = signalTypes.includes("review");
      const hasTrust = signalTypes.includes("trust");
      const hasBrand = signalTypes.filter((t: string) => t === "brand").length;
      const hasService = signalTypes.includes("service");
      const hasCity = signalTypes.includes("city");

      const scoreVisibility = Math.min(100, (hasCity ? 25 : 10) + (hasService ? 25 : 10) + Math.round(avgConfidence * 0.3));
      const scoreConversion = hasTrust ? 45 : 25;
      const scoreStructure = Math.min(100, 30 + (signals?.length ?? 0) * 3);
      const scoreAuthority = hasReview ? 50 : 20;
      const scoreTrust = (hasTrust ? 40 : 15) + (hasReview ? 20 : 0);
      const scoreBrand = Math.min(100, hasBrand * 30 + 20);
      const scoreContent = Math.min(100, (signals?.length ?? 0) * 8 + 15);
      const scoreGlobal = Math.round(
        (scoreVisibility + scoreConversion + scoreStructure + scoreAuthority + scoreTrust + scoreBrand + scoreContent) / 7
      );

      const weaknesses: string[] = [];
      if (!hasReview) weaknesses.push("Aucun témoignage détecté");
      if (!hasTrust) weaknesses.push("Signaux de confiance faibles");
      if (scoreBrand < 50) weaknesses.push("Identité de marque insuffisante");
      if (scoreContent < 40) weaknesses.push("Contenu limité");

      const opportunities: string[] = [];
      if (!hasReview) opportunities.push("Ajouter des témoignages clients");
      opportunities.push("Optimiser la présence IA (AEO)");
      if (scoreConversion < 50) opportunities.push("Améliorer les CTAs de conversion");

      const moneyEstimate = Math.round((100 - scoreGlobal) * 500);

      await supabase.from("prospect_aipp_snapshots").insert({
        prospect_id,
        score_global: scoreGlobal,
        score_visibility: scoreVisibility,
        score_conversion: scoreConversion,
        score_structure: scoreStructure,
        score_authority: scoreAuthority,
        score_trust: scoreTrust,
        score_brand: scoreBrand,
        score_content: scoreContent,
        weaknesses_json: weaknesses,
        opportunities_json: opportunities,
        money_left_on_table_estimate: moneyEstimate,
      });

      await supabase.from("prospect_records").update({ status: "scored" }).eq("id", prospect_id);
      await updateStep("aipp_score", "completed", { score_global: scoreGlobal });
    }

    // ─── Step 6: Plan session ───
    if (!shouldSkip("plan_session")) {
      await updateStep("plan_session", "running");
      await updateProgress(55, "plan_session");

      const { data: aipp } = await supabase
        .from("prospect_aipp_snapshots")
        .select("score_global")
        .eq("prospect_id", prospect_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const score = aipp?.score_global ?? 40;
      let recommendedPlan = "starter";
      let reason = "Score modéré — plan de base recommandé";
      let foundersShown = false;
      let signatureShown = false;

      if (score >= 70) {
        recommendedPlan = "elite";
        reason = "Score élevé — le prospect a un bon potentiel digital";
      } else if (score >= 50) {
        recommendedPlan = "growth";
        reason = "Score moyen — plan intermédiaire pour maximiser le ROI";
        foundersShown = true;
      } else {
        foundersShown = true;
      }

      if (score >= 80) {
        signatureShown = true;
        recommendedPlan = "signature";
        reason = "Score très élevé — profil premium, offre Signature recommandée";
      }

      await supabase.from("prospect_plan_sessions").insert({
        prospect_id,
        recommended_plan: recommendedPlan,
        recommended_plan_reason: reason,
        estimated_monthly_revenue: Math.round(score * 150 + 3000),
        estimated_monthly_appointments: Math.round(score / 10 + 3),
        capacity_score: Math.min(100, score + 20),
        competition_score: Math.max(10, 80 - score),
        territory_score: Math.min(100, score + 15),
        founders_offer_shown: foundersShown,
        signature_offer_shown: signatureShown,
        status: "ready",
      });

      await updateStep("plan_session", "completed", { recommended_plan: recommendedPlan });
    }

    // ─── Step 7: Generate email ───
    if (!shouldSkip("email_generate")) {
      await updateStep("email_generate", "running");
      await updateProgress(65, "email_generate");

      // Get fresh prospect data
      const { data: freshProspect } = await supabase
        .from("prospect_records")
        .select("*")
        .eq("id", prospect_id)
        .single();

      const { data: enrichSignals } = await supabase
        .from("prospect_enrichment_signals")
        .select("signal_type, label, value")
        .eq("prospect_id", prospect_id);

      const { data: aippData } = await supabase
        .from("prospect_aipp_snapshots")
        .select("*")
        .eq("prospect_id", prospect_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const companyName = freshProspect?.company_name || freshProspect?.domain || "votre entreprise";
      const city = freshProspect?.city_primary || "";
      const category = freshProspect?.category_primary || "";
      const scoreGlobal = aippData?.score_global ?? 0;

      // Find notable signals for personalization
      const trustSignals = enrichSignals?.filter((s: any) => s.signal_type === "trust") ?? [];
      const serviceSignals = enrichSignals?.filter((s: any) => s.signal_type === "service") ?? [];
      const weaknesses = (aippData?.weaknesses_json as string[]) ?? [];

      let observation1 = "";
      if (trustSignals.length > 0) {
        observation1 = `J'ai remarqué que vous avez ${trustSignals[0].label.toLowerCase()} sur votre site`;
      } else {
        observation1 = "J'ai analysé votre présence en ligne";
      }

      let observation2 = "";
      if (weaknesses.length > 0) {
        observation2 = `, mais ${weaknesses[0].toLowerCase()}.`;
      } else {
        observation2 = " et j'ai identifié des opportunités de croissance.";
      }

      const subject = `${companyName} — Votre visibilité IA en ${city || "ligne"} pourrait vous rapporter plus`;
      const preheader = `Score AIPP : ${scoreGlobal}/100. Des rendez-vous qualifiés vous attendent.`;

      const bodyText = `Bonjour,

Je suis Alex d'UNPRO, la plateforme de recommandation IA pour les services résidentiels au Québec.

${observation1}${observation2}

${scoreGlobal < 60
  ? `Votre score de visibilité IA est actuellement de ${scoreGlobal}/100. Cela signifie que quand un propriétaire demande à ChatGPT, Gemini ou Siri « qui recommander en ${category || "rénovation"} à ${city || "Montréal"} », vous n'apparaissez pas encore.`
  : `Avec un score de visibilité IA de ${scoreGlobal}/100, vous avez une bonne base, mais il y a encore ${Math.round((100 - scoreGlobal) * 500)} $/an de revenus potentiels que vous laissez sur la table.`
}

UNPRO vous connecte directement avec des propriétaires qualifiés qui ont besoin de vos services. Pas de leads partagés, pas de soumissions inutiles — des rendez-vous réels, pré-qualifiés.

${serviceSignals.length > 0 ? `Nous avons détecté que vous offrez : ${serviceSignals.map((s: any) => s.label).join(", ")}. C'est exactement ce que nos propriétaires recherchent.` : ""}

Voulez-vous voir comment UNPRO peut augmenter vos rendez-vous qualifiés ?

Répondez à ce courriel ou visitez unpro.ca pour démarrer.

Alex
UNPRO — Recommandation IA pour les pros`;

      const bodyHtml = bodyText.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>");

      // Create email sequence
      const { data: seq } = await supabase
        .from("prospect_email_sequences")
        .insert({
          prospect_id,
          sequence_type: "cold_outreach",
          language: "fr",
          status: "draft",
          send_mode: "manual_review_then_send",
        })
        .select("id")
        .single();

      // Create message
      await supabase.from("prospect_email_messages").insert({
        sequence_id: seq?.id,
        prospect_id,
        message_type: "initial",
        subject,
        preheader,
        body_html: `<p>${bodyHtml}</p>`,
        body_text: bodyText,
        personalization_tokens_json: {
          company_name: companyName,
          city,
          category,
          score: scoreGlobal,
          observations: [observation1 + observation2],
        },
        approval_status: "pending",
        send_status: "draft",
      });

      await supabase.from("prospect_records").update({ status: "emailed" }).eq("id", prospect_id);
      await updateStep("email_generate", "completed", { subject });
    }

    // ─── Step 8: Email approve (manual) ───
    if (!shouldSkip("email_approve")) {
      await updateStep("email_approve", "running");
      await updateProgress(75, "email_approve");
      // This step waits for manual approval — just mark as completed to show it's ready for review
      await updateStep("email_approve", "completed", { note: "En attente d'approbation manuelle" });
    }

    // ─── Step 9: Queue email ───
    if (!shouldSkip("email_queue")) {
      await updateStep("email_queue", "running");
      await updateProgress(85, "email_queue");
      // Check if email is approved
      const { data: msg } = await supabase
        .from("prospect_email_messages")
        .select("approval_status, send_status")
        .eq("prospect_id", prospect_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (msg?.approval_status === "approved") {
        await supabase.from("prospect_email_messages")
          .update({ send_status: "queued" })
          .eq("prospect_id", prospect_id)
          .eq("approval_status", "approved")
          .eq("send_status", "draft");
        await updateStep("email_queue", "completed", { queued: true });
      } else {
        await updateStep("email_queue", "completed", { note: "En attente approbation — pas encore mis en file" });
      }
    }

    // ─── Step 10: Send email ───
    if (!shouldSkip("email_send")) {
      await updateStep("email_send", "running");
      await updateProgress(95, "email_send");

      const { data: msg } = await supabase
        .from("prospect_email_messages")
        .select("*")
        .eq("prospect_id", prospect_id)
        .eq("send_status", "queued")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (msg && prospect.email) {
        // Log send attempt
        await supabase.from("prospect_email_send_attempts").insert({
          message_id: msg.id,
          attempt_number: 1,
          from_email: "alex@unpro.ca",
          to_email: prospect.email,
          send_status: "sent",
          provider_name: "mock",
        });

        await supabase.from("prospect_email_messages")
          .update({ send_status: "sent", sent_at: new Date().toISOString() })
          .eq("id", msg.id);

        await updateStep("email_send", "completed", { sent_to: prospect.email });
      } else {
        await updateStep("email_send", "completed", {
          note: msg ? "Email non envoyé — pas d'adresse prospect" : "Pas de message en file d'envoi (approbation requise)",
        });
      }
    }

    // Complete run
    await supabase.from("prospect_execution_runs").update({
      status: "completed",
      completion_percent: 100,
      current_step: "done",
      summary_json: { completed_at: new Date().toISOString() },
    }).eq("id", run_id);

    return new Response(JSON.stringify({ success: true, run_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Pipeline error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
