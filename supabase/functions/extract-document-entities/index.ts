import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { job_item_id, content, doc_type } = await req.json();
    if (!job_item_id || !content) {
      return new Response(JSON.stringify({ error: "job_item_id and content required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update job item status
    await supabase.from("ingestion_job_items").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", job_item_id);

    const startTime = Date.now();

    // Entity extraction rules by doc type
    const entityPatterns: Record<string, Array<{ type: string; regex: RegExp }>> = {
      tax_bill: [
        { type: "address", regex: /(\d+[\s,]+[\w\s-]+(?:rue|av|boul|ch|street|avenue|boulevard|chemin)[\w\s-]*)/gi },
        { type: "municipal_evaluation", regex: /(?:évaluation|valeur|assessment)\s*[:.]?\s*\$?\s*([\d\s,.]+)/gi },
        { type: "lot_number", regex: /(?:lot|cadastre)\s*[:.]?\s*([\w-]+)/gi },
        { type: "tax_amount", regex: /(?:taxe|tax|montant|total)\s*[:.]?\s*\$?\s*([\d\s,.]+)/gi },
        { type: "year", regex: /(?:année|year|exercice)\s*[:.]?\s*(\d{4})/gi },
        { type: "postal_code", regex: /([A-Z]\d[A-Z]\s?\d[A-Z]\d)/gi },
      ],
      contractor_quote: [
        { type: "amount", regex: /(?:total|montant|prix|price|cost)\s*[:.]?\s*\$?\s*([\d\s,.]+)/gi },
        { type: "company_name", regex: /(?:entreprise|company|contractor|soumis par)\s*[:.]?\s*([\w\s&.-]+)/gi },
        { type: "license_number", regex: /(?:RBQ|licence|license)\s*[:.]?\s*([\w-]+)/gi },
        { type: "work_description", regex: /(?:description|travaux|scope)\s*[:.]?\s*([^\n.]+)/gi },
        { type: "validity_date", regex: /(?:valide|valid|expire)\s*[:.]?\s*([\d/.-]+)/gi },
      ],
      reserve_fund_study: [
        { type: "total_reserve", regex: /(?:fonds|reserve|fond)\s*[:.]?\s*\$?\s*([\d\s,.]+)/gi },
        { type: "contribution_annual", regex: /(?:contribution|cotisation)\s*[:.]?\s*\$?\s*([\d\s,.]+)/gi },
        { type: "deficit", regex: /(?:déficit|deficit|insuffisance)\s*[:.]?\s*\$?\s*([\d\s,.]+)/gi },
        { type: "component", regex: /(?:composante|component|élément)\s*[:.]?\s*([^\n,]+)/gi },
        { type: "useful_life", regex: /(?:durée|life|lifespan)\s*[:.]?\s*(\d+)\s*(?:ans|years)/gi },
      ],
      inspection_report: [
        { type: "deficiency", regex: /(?:déficience|deficiency|problème|issue|concern)\s*[:.]?\s*([^\n.]+)/gi },
        { type: "recommendation", regex: /(?:recommandation|recommendation|suggest)\s*[:.]?\s*([^\n.]+)/gi },
        { type: "condition_rating", regex: /(?:état|condition|rating)\s*[:.]?\s*(excellent|bon|good|fair|moyen|poor|mauvais|critical|critique)/gi },
        { type: "system", regex: /(?:système|system)\s*[:.]?\s*([\w\s]+)/gi },
      ],
      maintenance_document: [
        { type: "work_done", regex: /(?:travaux|work|maintenance|entretien)\s*[:.]?\s*([^\n.]+)/gi },
        { type: "date", regex: /(\d{4}[-/]\d{2}[-/]\d{2})/g },
        { type: "cost", regex: /(?:coût|cost|prix|montant)\s*[:.]?\s*\$?\s*([\d\s,.]+)/gi },
        { type: "contractor", regex: /(?:entrepreneur|contractor|par)\s*[:.]?\s*([\w\s&.-]+)/gi },
      ],
    };

    const patterns = entityPatterns[doc_type] || entityPatterns.maintenance_document;
    const entities: Array<{ entity_type: string; entity_value: string; confidence: number; source_text: string }> = [];

    for (const pattern of patterns) {
      let match;
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((match = regex.exec(content)) !== null) {
        const value = (match[1] || match[0]).trim();
        if (value.length > 1 && value.length < 500) {
          entities.push({
            entity_type: pattern.type,
            entity_value: value,
            confidence: 0.7,
            source_text: match[0].substring(0, 200),
          });
        }
      }
    }

    // Chunk the content
    const paragraphs = content.split(/\n{2,}/);
    const chunks: Array<{ chunk_index: number; content: string; token_count: number }> = [];
    let current = "";
    let idx = 0;

    for (const para of paragraphs) {
      const combined = current ? `${current}\n\n${para}` : para;
      if (combined.length / 4 > 600 && current) {
        chunks.push({ chunk_index: idx++, content: current.trim(), token_count: Math.ceil(current.length / 4) });
        current = para;
      } else {
        current = combined;
      }
    }
    if (current.trim()) {
      chunks.push({ chunk_index: idx, content: current.trim(), token_count: Math.ceil(current.length / 4) });
    }

    // Insert entities
    if (entities.length > 0) {
      const entityRows = entities.map(e => ({
        job_item_id,
        entity_type: e.entity_type,
        entity_value: e.entity_value,
        confidence: e.confidence,
        source_text: e.source_text,
        metadata: {},
      }));
      await supabase.from("document_entities").insert(entityRows);
    }

    // Insert chunks
    if (chunks.length > 0) {
      const chunkRows = chunks.map(c => ({
        job_item_id,
        chunk_index: c.chunk_index,
        content: c.content,
        token_count: c.token_count,
        metadata: {},
      }));
      await supabase.from("document_chunks").insert(chunkRows);
    }

    const processingTime = Date.now() - startTime;

    // Update job item
    await supabase.from("ingestion_job_items").update({
      status: "completed",
      extraction_result: { entities_count: entities.length, chunks_count: chunks.length },
      processing_time_ms: processingTime,
      updated_at: new Date().toISOString(),
    }).eq("id", job_item_id);

    return new Response(JSON.stringify({
      success: true,
      entities_extracted: entities.length,
      chunks_created: chunks.length,
      processing_time_ms: processingTime,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Extract entities error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
