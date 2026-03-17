import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// All key pages to validate, in priority order
const PAGES_TO_VALIDATE = [
  { route: "/", name: "Accueil", priority: 1, category: "public" },
  { route: "/signup", name: "Inscription", priority: 2, category: "auth" },
  { route: "/login", name: "Connexion", priority: 2, category: "auth" },
  { route: "/onboarding", name: "Onboarding", priority: 3, category: "onboarding" },
  { route: "/pricing", name: "Tarification", priority: 4, category: "conversion" },
  { route: "/describe-project", name: "Décrire un projet", priority: 5, category: "lead_capture" },
  { route: "/compare-quotes", name: "Comparer des soumissions", priority: 5, category: "lead_capture" },
  { route: "/contractor-onboarding", name: "Onboarding Entrepreneur", priority: 6, category: "contractor" },
  { route: "/search", name: "Recherche", priority: 6, category: "public" },
  { route: "/homeowners", name: "Propriétaires", priority: 7, category: "public" },
  { route: "/professionals", name: "Professionnels", priority: 7, category: "public" },
  { route: "/partners", name: "Partenaires", priority: 8, category: "partner" },
  { route: "/aipp-score", name: "Score AIPP", priority: 7, category: "public" },
  { route: "/copropriete", name: "Copropriété", priority: 7, category: "public" },
  { route: "/energy", name: "Énergie", priority: 8, category: "public" },
  { route: "/preventive-maintenance", name: "Entretien Préventif", priority: 8, category: "public" },
  { route: "/flywheel", name: "Flywheel", priority: 9, category: "internal" },
  { route: "/building-map", name: "Carte Intelligence", priority: 8, category: "public" },
  { route: "/property-graph", name: "Graphe Propriété", priority: 9, category: "public" },
  { route: "/alex", name: "Alex Chat", priority: 7, category: "public" },
  { route: "/services", name: "Répertoire SEO", priority: 9, category: "seo" },
];

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "submit_validation",
          description: "Submit validation findings and page scores",
          parameters: {
            type: "object",
            properties: {
              findings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    agent: { type: "string", enum: ["agent_q", "agent_i"] },
                    category: { type: "string" },
                    severity: { type: "string", enum: ["critical", "high", "medium", "low", "info"] },
                    title: { type: "string" },
                    description: { type: "string" },
                    expected_behavior: { type: "string" },
                    actual_behavior: { type: "string" },
                    probable_cause: { type: "string" },
                    suggested_fix: { type: "string" },
                    business_impact_score: { type: "integer" },
                  },
                  required: ["agent", "category", "severity", "title", "description", "suggested_fix", "business_impact_score"],
                },
              },
              page_score: {
                type: "object",
                properties: {
                  clarity_score: { type: "integer" },
                  navigation_score: { type: "integer" },
                  cta_score: { type: "integer" },
                  trust_score: { type: "integer" },
                  visual_score: { type: "integer" },
                  image_score: { type: "integer" },
                  mobile_score: { type: "integer" },
                  overall_score: { type: "integer" },
                  recommendations: { type: "array", items: { type: "string" } },
                  strengths: { type: "array", items: { type: "string" } },
                  weaknesses: { type: "array", items: { type: "string" } },
                },
                required: ["clarity_score", "navigation_score", "cta_score", "trust_score", "visual_score", "image_score", "mobile_score", "overall_score"],
              },
            },
            required: ["findings", "page_score"],
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "submit_validation" } },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI error:", resp.status, t);
    throw new Error(`AI gateway error: ${resp.status}`);
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("No tool call in AI response");
  return JSON.parse(toolCall.function.arguments);
}

async function generateExecutiveSummary(apiKey: string, allFindings: any[], pageScores: any[]) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Tu es un directeur QA qui rédige des rapports exécutifs concis en français. Produis un résumé exécutif structuré avec: 1) État général, 2) Bloqueurs critiques, 3) Quick wins 24h, 4) Priorités sprint suivant." },
        { role: "user", content: `Voici les résultats de validation:\n\nFindings (${allFindings.length}):\n${JSON.stringify(allFindings.slice(0, 50), null, 1)}\n\nScores pages (${pageScores.length}):\n${JSON.stringify(pageScores, null, 1)}` },
      ],
    }),
  });

  if (!resp.ok) { await resp.text(); return "Erreur lors de la génération du résumé."; }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content || "Résumé non disponible.";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, run_id, finding_id } = await req.json();

    // ── Launch a new validation run ──
    if (action === "launch") {
      const { data: run, error: runErr } = await supabase
        .from("validation_runs")
        .insert({ status: "running", total_pages: PAGES_TO_VALIDATE.length, started_at: new Date().toISOString() })
        .select()
        .single();

      if (runErr) throw runErr;

      const allFindings: any[] = [];
      const allPageScores: any[] = [];

      const agentQPrompt = `Tu es Agent Q, un testeur QA autonome expert pour la plateforme UNPRO (marketplace entrepreneurs/propriétaires au Québec).

Pour la page donnée, identifie TOUS les problèmes:
- Liens brisés ou boutons morts
- Formulaires cassés
- Routes incorrectes ou 404
- Images manquantes ou cassées
- Échecs silencieux
- Pages inachevées
- Problèmes de chargement
- Problèmes responsive
- Erreurs de logique métier
- Problèmes d'accessibilité

Sois impitoyable. Agis comme un vrai utilisateur frustré, pas un analyste statique.
Score de 0 à 100 pour chaque dimension.`;

      const agentIPrompt = `Tu es Agent I, un auditeur UX/UI expert pour la plateforme UNPRO (marketplace entrepreneurs/propriétaires au Québec, style premium dark SaaS).

Pour la page donnée, évalue:
- Clarté dans les 5 premières secondes
- Labels de menu et logique de navigation
- Clarté et hiérarchie des CTA
- Signaux de confiance (badges, reviews, certifications)
- Qualité premium du design
- Hiérarchie visuelle
- Force des images (pertinence, qualité, impact)
- Sections faibles, copy confuse, layouts faibles
- Potentiel de conversion

Sois exigeant. Compare à Stripe, Linear, Vercel en termes de qualité.
Score de 0 à 100 pour chaque dimension.`;

      for (const page of PAGES_TO_VALIDATE) {
        try {
          const pageContext = `Page: "${page.name}" (route: ${page.route}, catégorie: ${page.category}, priorité: ${page.priority}/9)

Cette page fait partie de la plateforme UNPRO, une marketplace premium qui connecte propriétaires et entrepreneurs au Québec. La plateforme utilise un design dark premium avec des animations Framer Motion, des composants shadcn/ui, et un assistant AI nommé Alex.

Analyse cette page en profondeur. Identifie les problèmes réels qu'un utilisateur rencontrerait. Pense aux parcours utilisateur: un propriétaire qui cherche un entrepreneur, un entrepreneur qui veut s'inscrire, un gestionnaire de copropriété qui veut analyser son immeuble.`;

          // Run both agents in parallel
          const [agentQResult, agentIResult] = await Promise.all([
            callAI(apiKey, agentQPrompt, pageContext).catch(e => {
              console.error(`Agent Q error for ${page.route}:`, e);
              return { findings: [], page_score: { clarity_score: 0, navigation_score: 0, cta_score: 0, trust_score: 0, visual_score: 0, image_score: 0, mobile_score: 0, overall_score: 0, recommendations: [], strengths: [], weaknesses: [] } };
            }),
            callAI(apiKey, agentIPrompt, pageContext).catch(e => {
              console.error(`Agent I error for ${page.route}:`, e);
              return { findings: [], page_score: { clarity_score: 0, navigation_score: 0, cta_score: 0, trust_score: 0, visual_score: 0, image_score: 0, mobile_score: 0, overall_score: 0, recommendations: [], strengths: [], weaknesses: [] } };
            }),
          ]);

          // Store findings
          const pageFindings = [...(agentQResult.findings || []), ...(agentIResult.findings || [])].map(f => ({
            ...f,
            run_id: run.id,
            page_route: page.route,
          }));

          if (pageFindings.length > 0) {
            await supabase.from("validation_findings").insert(pageFindings);
            allFindings.push(...pageFindings);
          }

          // Merge page scores (average of both agents)
          const qScore = agentQResult.page_score || {};
          const iScore = agentIResult.page_score || {};
          const avgScore = (a: number, b: number) => Math.round(((a || 0) + (b || 0)) / 2);

          const mergedScore = {
            run_id: run.id,
            page_route: page.route,
            page_name: page.name,
            clarity_score: avgScore(qScore.clarity_score, iScore.clarity_score),
            navigation_score: avgScore(qScore.navigation_score, iScore.navigation_score),
            cta_score: avgScore(qScore.cta_score, iScore.cta_score),
            trust_score: avgScore(qScore.trust_score, iScore.trust_score),
            visual_score: avgScore(qScore.visual_score, iScore.visual_score),
            image_score: avgScore(qScore.image_score, iScore.image_score),
            mobile_score: avgScore(qScore.mobile_score, iScore.mobile_score),
            overall_score: avgScore(qScore.overall_score, iScore.overall_score),
            recommendations: [...(iScore.recommendations || []), ...(qScore.recommendations || [])],
            strengths: [...(iScore.strengths || []), ...(qScore.strengths || [])],
            weaknesses: [...(iScore.weaknesses || []), ...(qScore.weaknesses || [])],
          };

          await supabase.from("page_scores").insert(mergedScore);
          allPageScores.push(mergedScore);

          // Update progress
          await supabase.from("validation_runs").update({ pages_scanned: allPageScores.length }).eq("id", run.id);
        } catch (e) {
          console.error(`Error validating ${page.route}:`, e);
        }
      }

      // Count severities
      const critical = allFindings.filter(f => f.severity === "critical").length;
      const high = allFindings.filter(f => f.severity === "high").length;
      const medium = allFindings.filter(f => f.severity === "medium").length;
      const low = allFindings.filter(f => f.severity === "low").length;

      // Generate executive summary
      let summary = "";
      try {
        summary = await generateExecutiveSummary(apiKey, allFindings, allPageScores);
      } catch (e) {
        console.error("Summary generation error:", e);
        summary = `Validation terminée. ${allFindings.length} anomalies trouvées (${critical} critiques, ${high} élevées). ${allPageScores.length} pages analysées.`;
      }

      // Generate improvement tasks from critical/high findings
      const improvementTasks = allFindings
        .filter(f => f.severity === "critical" || f.severity === "high")
        .map(f => ({
          run_id: run.id,
          title: f.title,
          description: `${f.description}\n\nCorrectif suggéré: ${f.suggested_fix}`,
          priority: f.severity === "critical" ? "p0" : "p1",
          effort: f.business_impact_score >= 8 ? "quick_win" : "small",
          category: f.category,
          page_route: f.page_route,
          status: "backlog",
        }));

      if (improvementTasks.length > 0) {
        await supabase.from("improvement_tasks").insert(improvementTasks);
      }

      // Finalize run
      await supabase.from("validation_runs").update({
        status: "completed",
        pages_scanned: allPageScores.length,
        critical_count: critical,
        high_count: high,
        medium_count: medium,
        low_count: low,
        executive_summary: summary,
        completed_at: new Date().toISOString(),
      }).eq("id", run.id);

      return new Response(JSON.stringify({ run_id: run.id, findings_count: allFindings.length, pages_scanned: allPageScores.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Resolve a finding ──
    if (action === "resolve" && finding_id) {
      await supabase.from("validation_findings").update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq("id", finding_id);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Get run status ──
    if (action === "status" && run_id) {
      const { data } = await supabase.from("validation_runs").select("*").eq("id", run_id).single();
      return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Orchestrator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
