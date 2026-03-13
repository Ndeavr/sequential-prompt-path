import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ===== NAMESPACE ROUTING =====
const INTENT_NAMESPACE_MAP: Record<string, string[]> = {
  home_problem: ["property_private", "home_problems", "renovation_costs", "local_markets"],
  renovation_cost: ["renovation_costs", "local_markets", "home_problems"],
  find_contractor: ["contractors_public", "projects_private", "local_markets"],
  quote_analysis: ["quotes_private", "renovation_costs", "contractors_public"],
  warranty_check: ["property_private"],
  home_score: ["property_private", "home_problems"],
  energy: ["property_private", "home_problems", "renovation_costs"],
  permits: ["permits", "local_markets"],
  subsidies: ["subsidies", "local_markets"],
  general: ["unpro_core", "home_problems"],
  buyer_analysis: ["property_private", "home_problems", "renovation_costs", "local_markets"],
  contractor_profile: ["contractors_public", "unpro_core"],
  maintenance: ["property_private", "home_problems", "renovation_costs"],
};

// ===== INTENT DETECTION KEYWORDS =====
function detectIntent(message: string): string {
  const lower = message.toLowerCase();
  if (/froid|chauff|isol|thermopompe|énergie|hydro|consommation/.test(lower)) return "energy";
  if (/toit|toiture|bardeaux|couverture/.test(lower)) return "home_problem";
  if (/combien|coût|prix|budget|estim/.test(lower)) return "renovation_cost";
  if (/entrepreneur|professionnel|trouver|cherch|recommand/.test(lower)) return "find_contractor";
  if (/soumission|devis|quote|analys/.test(lower)) return "quote_analysis";
  if (/garantie|warranty/.test(lower)) return "warranty_check";
  if (/score.*maison|état.*maison|condition/.test(lower)) return "home_score";
  if (/permis|réglementation|code/.test(lower)) return "permits";
  if (/subvention|aide|programme|crédit/.test(lower)) return "subsidies";
  if (/achat|acheter|avant.*offre|inspection/.test(lower)) return "buyer_analysis";
  if (/profil|aipp|badge|vérif/.test(lower)) return "contractor_profile";
  if (/entretien|préventif|maintenance/.test(lower)) return "maintenance";
  return "general";
}

const SYSTEM_PROMPT = `Tu es Alex, la concierge IA principale de la plateforme UNPRO. Tu es une guide professionnelle pour les propriétaires québécois et les entrepreneurs en rénovation résidentielle.

IDENTITÉ :
- Tu es une femme. Utilise toujours le féminin pour te décrire (« je suis ravie », « je suis disponible », etc.)
- Tu ne dis jamais « je suis un assistant » — tu dis « je suis votre concierge » ou « je suis Alex »

PERSONNALITÉ :
- Dynamique et confiante, comme une conseillère de confiance qui connaît son domaine
- Directe, concise et utile — pas de bla-bla
- Tu parles en français québécois naturel
- Tu inspires confiance sans faire de promesses exagérées
- Ton premium, clair, rassurant mais énergique

RÔLE PRINCIPAL :
Tu aides les utilisateurs à accomplir ces missions clés :

1. DIAGNOSTIQUER un problème maison (froid, humidité, toit, fondation...)
2. ESTIMER des coûts de rénovation avec contexte local
3. ANALYSER des soumissions uploadées
4. TROUVER et RECOMMANDER des entrepreneurs vérifiés
5. PLANIFIER des rendez-vous qualifiés
6. GUIDER vers le prochain meilleur step sur la plateforme

PRIORITÉS DE RÉPONSE :
1. Utilise d'abord le contexte privé user/propriété/projet si disponible
2. Ensuite les données structurées UNPRO (scores, coûts, contractors)
3. Ensuite la knowledge base générale UNPRO
4. En dernier : réponse prudente sans halluciner

CAPACITÉS PLATEFORME :
- Score Maison (0-100) : structure, systèmes, extérieur, intérieur
- Score AIPP (0-100) : complétude, confiance, performance, visibilité
- Analyse IA de soumissions : fairness score, items manquants, comparaison marché
- Recherche d'entrepreneurs vérifiés par spécialité et territoire
- Passeport Maison — dossier numérique complet
- Intelligence de quartier et recommandations proactives
- Comparaison côte-à-côte de soumissions

CATÉGORIES D'ENTREPRENEURS :
toiture, isolation, plomberie, électricité, fondation, fenêtres, revêtement extérieur, rénovation générale, chauffage/climatisation, peinture, drainage, maçonnerie

RÈGLES STRICTES :
- Ne donne JAMAIS de conseils techniques précis (tu n'es pas ingénieure ni inspectrice)
- Dirige toujours vers un professionnel qualifié pour les diagnostics
- Ne partage pas de données privées d'autres utilisateurs
- Garde tes réponses courtes : 2-4 phrases max, sauf si plus demandé
- Termine TOUJOURS par une suggestion d'action concrète sur la plateforme
- Si tu identifies un besoin, nomme la catégorie d'entrepreneur appropriée
- Si le contexte RAG contient la réponse, utilise-le directement

FORMAT :
Réponds naturellement en paragraphes courts. Utilise des listes à puces quand pertinent. Termine par une suggestion d'action claire.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { messages, context } = await req.json();

    // Get the last user message for RAG retrieval
    const lastUserMessage = [...messages].reverse().find((m: any) => m.role === "user")?.content || "";
    
    // ===== INTENT DETECTION =====
    const intent = detectIntent(lastUserMessage);
    const namespaces = INTENT_NAMESPACE_MAP[intent] || INTENT_NAMESPACE_MAP.general;

    // ===== RAG RETRIEVAL (full-text search MVP) =====
    let ragContext = "";
    try {
      const { data: chunks } = await supabase.rpc("search_rag_chunks_text", {
        search_query: lastUserMessage,
        match_count: 6,
        filter_namespaces: namespaces,
        filter_user_id: context?.userId || null,
      });

      if (chunks && chunks.length > 0) {
        const ragParts = chunks.map((c: any) =>
          `[${c.namespace}${c.document_title ? ` — ${c.document_title}` : ""}]\n${c.chunk_content}`
        );
        ragContext = ragParts.join("\n\n---\n\n");
      }
    } catch (ragErr) {
      console.error("RAG retrieval error (non-blocking):", ragErr);
    }

    // ===== CONVERSATION MEMORY =====
    let memoryContext = "";
    if (context?.userId) {
      try {
        const { data: memories } = await supabase
          .from("conversation_memory")
          .select("memory_type, memory_text")
          .eq("user_id", context.userId)
          .order("importance_score", { ascending: false })
          .limit(5);

        if (memories && memories.length > 0) {
          memoryContext = memories.map((m: any) => `[${m.memory_type}] ${m.memory_text}`).join("\n");
        }
      } catch (memErr) {
        console.error("Memory retrieval error (non-blocking):", memErr);
      }
    }

    // ===== BUILD CONTEXT MESSAGES =====
    const contextMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // User context
    if (context) {
      const ctxParts: string[] = [];
      if (context.userName) ctxParts.push(`Prénom : ${context.userName}`);
      if (context.properties?.length) {
        ctxParts.push(
          `Propriétés : ${context.properties.map((p: any) => 
            `${p.address}${p.city ? ` (${p.city})` : ""}${p.year_built ? `, construite en ${p.year_built}` : ""}`
          ).join("; ")}`
        );
      }
      if (context.homeScore != null) ctxParts.push(`Score Maison actuel : ${context.homeScore}/100`);
      if (context.currentPage) ctxParts.push(`Page actuelle : ${context.currentPage}`);
      if (context.isAuthenticated !== undefined) ctxParts.push(`Utilisateur ${context.isAuthenticated ? "connecté" : "non connecté"}`);
      if (context.userRole) ctxParts.push(`Rôle : ${context.userRole}`);
      if (ctxParts.length) {
        contextMessages.push({
          role: "system",
          content: `CONTEXTE UTILISATEUR :\n${ctxParts.join("\n")}`,
        });
      }
    }

    // Memory context
    if (memoryContext) {
      contextMessages.push({
        role: "system",
        content: `MÉMOIRE CONVERSATIONNELLE :\n${memoryContext}`,
      });
    }

    // RAG context
    if (ragContext) {
      contextMessages.push({
        role: "system",
        content: `CONNAISSANCES PERTINENTES RÉCUPÉRÉES (utilise ces informations en priorité si elles répondent à la question) :\n\n${ragContext}`,
      });
    }

    // Intent hint
    contextMessages.push({
      role: "system",
      content: `Intent détecté : ${intent}. Namespaces consultés : ${namespaces.join(", ")}.`,
    });

    contextMessages.push(...messages);

    // ===== LOG QUERY =====
    if (context?.userId) {
      supabase.from("rag_queries_log").insert({
        user_id: context.userId,
        query_text: lastUserMessage,
        namespace_filter: namespaces,
        top_k: 6,
      }).then(() => {}).catch(() => {});
    }

    // ===== CALL LLM =====
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: contextMessages,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes. Réessayez dans un moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Alex error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
