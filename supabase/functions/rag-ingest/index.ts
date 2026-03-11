import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple token estimator (~4 chars per token for French)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Chunk text by paragraphs/sections, respecting max token size
function chunkText(text: string, maxTokens = 600, overlap = 50): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    const combined = current ? `${current}\n\n${para}` : para;
    if (estimateTokens(combined) > maxTokens && current) {
      chunks.push(current.trim());
      // overlap: keep last sentence of previous chunk
      const sentences = current.split(/[.!?]\s/);
      const overlapText = sentences.length > 1 ? sentences[sentences.length - 1] : "";
      current = overlapText ? `${overlapText}\n\n${para}` : para;
    } else {
      current = combined;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const {
      action = "ingest", // ingest | bulk_ingest | delete
      namespace,
      source_type,
      source_id,
      title,
      summary,
      content,
      language = "fr",
      visibility_scope = "public",
      user_id,
      property_id,
      project_id,
      contractor_id,
      city,
      tags = [],
      metadata_json = {},
      documents, // for bulk_ingest
      document_id, // for delete
    } = body;

    if (action === "delete" && document_id) {
      const { error } = await supabase
        .from("rag_documents")
        .delete()
        .eq("id", document_id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, deleted: document_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "bulk_ingest" && Array.isArray(documents)) {
      const results = [];
      for (const doc of documents) {
        const result = await ingestDocument(supabase, doc);
        results.push(result);
      }
      return new Response(JSON.stringify({ success: true, ingested: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single ingest
    if (!namespace || !source_type || !content) {
      return new Response(
        JSON.stringify({ error: "namespace, source_type, and content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await ingestDocument(supabase, {
      namespace, source_type, source_id, title, summary, content,
      language, visibility_scope, user_id, property_id, project_id,
      contractor_id, city, tags, metadata_json,
    });

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("RAG ingest error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function ingestDocument(supabase: any, doc: any) {
  // 1. Create document record
  const { data: docRecord, error: docError } = await supabase
    .from("rag_documents")
    .insert({
      namespace: doc.namespace,
      source_type: doc.source_type,
      source_id: doc.source_id || null,
      title: doc.title || null,
      summary: doc.summary || null,
      language: doc.language || "fr",
      visibility_scope: doc.visibility_scope || "public",
      user_id: doc.user_id || null,
      property_id: doc.property_id || null,
      project_id: doc.project_id || null,
      contractor_id: doc.contractor_id || null,
      city: doc.city || null,
      tags: doc.tags || [],
      metadata_json: doc.metadata_json || {},
    })
    .select("id")
    .single();

  if (docError) throw docError;

  // 2. Chunk the content
  const chunks = chunkText(doc.content);

  // 3. Insert chunks
  const chunkRecords = chunks.map((content, index) => ({
    document_id: docRecord.id,
    chunk_index: index,
    content,
    token_count: estimateTokens(content),
    metadata_json: {},
  }));

  const { error: chunkError } = await supabase
    .from("rag_chunks")
    .insert(chunkRecords);

  if (chunkError) throw chunkError;

  return {
    document_id: docRecord.id,
    chunks_created: chunks.length,
    title: doc.title,
  };
}
