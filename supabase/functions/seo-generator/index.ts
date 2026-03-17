/**
 * UNPRO — SEO Domination Generator
 * Generates SEO pages from problem graph × cities with AI content.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json().catch(() => ({}));
    const action = body.action || "generate";

    if (action === "generate") {
      // 1. Get pending items from queue
      const { data: queue } = await supabase
        .from("seo_generation_queue")
        .select("*")
        .eq("status", "pending")
        .order("created_at")
        .limit(body.batchSize || 5);

      if (!queue?.length) {
        return new Response(JSON.stringify({ generated: 0, message: "Queue empty" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let generated = 0;
      for (const item of queue) {
        // Mark as processing
        await supabase.from("seo_generation_queue").update({ status: "processing" }).eq("id", item.id);

        // Generate content via AI
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `You are an SEO content expert for home renovation in Quebec. Generate comprehensive, natural French content for localized problem pages. Include real Quebec-specific details (climate, building codes, local costs). Target property type: ${item.property_type || "all"}.`,
              },
              {
                role: "user",
                content: `Generate a complete SEO page for:\nProblem: ${item.problem}\nCity: ${item.city}\n\nInclude: explanation, causes, solutions, estimated costs (CAD), recommended professional type, 5-7 FAQ, meta description, and a property insight paragraph (anonymized stats).`,
              },
            ],
            tools: [{
              type: "function",
              function: {
                name: "create_seo_page",
                description: "Return structured SEO page content",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "SEO title (60 chars max)" },
                    meta_description: { type: "string", description: "Meta description (160 chars max)" },
                    slug: { type: "string", description: "URL slug" },
                    content: {
                      type: "object",
                      properties: {
                        problem_description: { type: "string" },
                        causes: { type: "array", items: { type: "string" } },
                        solutions: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, cost_range: { type: "string" } }, required: ["title", "description", "cost_range"] } },
                        recommended_professional: { type: "string" },
                        property_insight: { type: "string" },
                        faq: { type: "array", items: { type: "object", properties: { question: { type: "string" }, answer: { type: "string" } }, required: ["question", "answer"] } },
                      },
                      required: ["problem_description", "causes", "solutions", "recommended_professional", "faq"],
                    },
                  },
                  required: ["title", "meta_description", "slug", "content"],
                  additionalProperties: false,
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "create_seo_page" } },
          }),
        });

        if (!aiResponse.ok) {
          const errStatus = aiResponse.status;
          await supabase.from("seo_generation_queue").update({
            status: "error",
            error_message: errStatus === 429 ? "Rate limited" : errStatus === 402 ? "Payment required" : "AI error " + errStatus,
          }).eq("id", item.id);
          continue;
        }

        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (!toolCall?.function?.arguments) {
          await supabase.from("seo_generation_queue").update({ status: "error", error_message: "No AI output" }).eq("id", item.id);
          continue;
        }

        let pageData: any;
        try { pageData = JSON.parse(toolCall.function.arguments); } catch {
          await supabase.from("seo_generation_queue").update({ status: "error", error_message: "Invalid JSON" }).eq("id", item.id);
          continue;
        }

        // Insert into seo_pages
        const finalSlug = pageData.slug || `${item.problem}-${item.city}`.toLowerCase().replace(/\s+/g, "-");
        const { data: page, error: pageError } = await supabase.from("seo_pages").insert({
          title: pageData.title,
          slug: finalSlug,
          page_type: "problem_city",
          meta_description: pageData.meta_description,
          content_data: pageData.content,
          is_published: false,
        }).select("id").single();

        if (pageError) {
          await supabase.from("seo_generation_queue").update({ status: "error", error_message: pageError.message }).eq("id", item.id);
          continue;
        }

        // Update queue
        await supabase.from("seo_generation_queue").update({
          status: "completed",
          result_page_id: page.id,
          processed_at: new Date().toISOString(),
        }).eq("id", item.id);

        // Create metrics entry
        await supabase.from("seo_metrics").insert({
          page_id: page.id,
          page_type: "seo_page",
        });

        generated++;
      }

      return new Response(JSON.stringify({ success: true, generated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: queue — Add items to generation queue
    if (action === "queue") {
      const items = body.items || [];
      if (!items.length) {
        return new Response(JSON.stringify({ queued: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data } = await supabase.from("seo_generation_queue").insert(
        items.map((i: any) => ({
          city: i.city,
          problem: i.problem,
          property_type: i.property_type || null,
          status: "pending",
        }))
      ).select("id");

      return new Response(JSON.stringify({ queued: data?.length || 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: stats
    if (action === "stats") {
      const [queueRes, pagesRes, publishedRes] = await Promise.all([
        supabase.from("seo_generation_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("seo_pages").select("id", { count: "exact", head: true }),
        supabase.from("seo_pages").select("id", { count: "exact", head: true }).eq("is_published", true),
      ]);
      return new Response(JSON.stringify({
        queuePending: queueRes.count || 0,
        totalPages: pagesRes.count || 0,
        publishedPages: publishedRes.count || 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("seo-generator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
