import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ===== AVAILABLE MODELS =====
const IMAGE_MODELS = [
  { id: "google/gemini-2.5-flash-image", label: "Nano Banana", tier: "fast", strength: "speed" },
  { id: "google/gemini-3.1-flash-image-preview", label: "Nano Banana 2", tier: "standard", strength: "balanced" },
  { id: "google/gemini-3-pro-image-preview", label: "Nano Banana Pro", tier: "premium", strength: "quality" },
];

// ===== STYLE PRESETS =====
const STYLE_PRESETS: Record<string, string> = {
  "unpro-premium": "Premium editorial style, clean modern aesthetic, soft blue and white tones with subtle indigo accents, professional architectural photography feel, high-end SaaS visual language, warm natural lighting",
  "unpro-contractor": "Professional contractor at work, clean modern residential setting, confident expert vibe, warm daylight, editorial portrait style, Canadian suburban architecture",
  "unpro-homeowner": "Modern homeowner lifestyle, bright contemporary home interior, warm inviting atmosphere, natural light, aspirational but authentic, Quebec residential context",
  "unpro-seo": "Clean informative visual, minimal text-friendly composition, high contrast subject, architectural or renovation context, Quebec residential setting, stock-photo quality",
  "unpro-marketing": "High-impact marketing visual, bold composition, emotional resonance, trust-building imagery, premium brand feel, conversion-optimized layout",
};

// ===== PROMPT OPTIMIZER =====
function optimizePrompt(basePrompt: string, preset: string, aspectRatio: string): string {
  const styleContext = STYLE_PRESETS[preset] || STYLE_PRESETS["unpro-premium"];
  
  const aspectHints: Record<string, string> = {
    "16:9": "wide cinematic composition, horizontal framing",
    "9:16": "vertical mobile-first composition, portrait framing",
    "1:1": "square balanced composition, centered subject",
    "4:3": "classic photo composition, balanced framing",
    "4:5": "social media portrait composition",
  };

  const aspectHint = aspectHints[aspectRatio] || aspectHints["16:9"];

  return `${basePrompt}. ${styleContext}. ${aspectHint}. Ultra high quality, 8k resolution, sharp details, professional photography.`;
}

// ===== GENERATE WITH SINGLE MODEL =====
async function generateWithModel(
  apiKey: string,
  modelId: string,
  prompt: string
): Promise<{ modelId: string; imageBase64: string | null; error?: string }> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Model ${modelId} error ${response.status}:`, errText);
      return { modelId, imageBase64: null, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      return { modelId, imageBase64: null, error: "No image in response" };
    }

    return { modelId, imageBase64: imageUrl };
  } catch (e) {
    console.error(`Model ${modelId} exception:`, e);
    return { modelId, imageBase64: null, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ===== SCORE IMAGE USING AI =====
async function scoreImage(
  apiKey: string,
  imageBase64: string,
  purpose: string
): Promise<{ realism: number; clarity: number; brand_consistency: number; composition: number; overall: number }> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{
          role: "user",
          content: [
            {
              type: "text",
              text: `Score this generated image for a premium home renovation platform (UNPRO). Purpose: ${purpose}.
Rate each criterion from 0-100:
- realism: How photorealistic and believable
- clarity: Visual sharpness and readability
- brand_consistency: Matches premium SaaS aesthetic (clean, modern, trustworthy)
- composition: Professional framing and balance

Return ONLY valid JSON: {"realism":N,"clarity":N,"brand_consistency":N,"composition":N,"overall":N}`
            },
            {
              type: "image_url",
              image_url: { url: imageBase64 }
            }
          ]
        }],
      }),
    });

    if (!response.ok) {
      return { realism: 50, clarity: 50, brand_consistency: 50, composition: 50, overall: 50 };
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const scores = JSON.parse(jsonMatch[0]);
      return {
        realism: scores.realism ?? 50,
        clarity: scores.clarity ?? 50,
        brand_consistency: scores.brand_consistency ?? 50,
        composition: scores.composition ?? 50,
        overall: scores.overall ?? ((scores.realism + scores.clarity + scores.brand_consistency + scores.composition) / 4),
      };
    }
    return { realism: 50, clarity: 50, brand_consistency: 50, composition: 50, overall: 50 };
  } catch {
    return { realism: 50, clarity: 50, brand_consistency: 50, composition: 50, overall: 50 };
  }
}

// ===== GENERATE ALT TEXT =====
async function generateAltText(apiKey: string, imageBase64: string): Promise<string> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Generate a concise, SEO-friendly alt text (max 125 characters) for this image. Return ONLY the alt text, nothing else." },
            { type: "image_url", image_url: { url: imageBase64 } }
          ]
        }],
      }),
    });
    if (!response.ok) return "Image générée par UNPRO";
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || "Image générée par UNPRO";
  } catch {
    return "Image générée par UNPRO";
  }
}

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

    const body = await req.json();
    const { action } = body;

    // ===== ACTION: GENERATE =====
    if (action === "generate") {
      const {
        prompt,
        purpose = "general",
        asset_type = "image",
        aspect_ratio = "16:9",
        style_preset = "unpro-premium",
        strategy = "multi", // "single" | "multi" | "best"
        target_page,
        target_entity_id,
        target_entity_type,
        requested_by,
      } = body;

      if (!prompt) {
        return new Response(JSON.stringify({ error: "Prompt is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create asset record
      const optimizedPrompt = optimizePrompt(prompt, style_preset, aspect_ratio);

      const { data: asset, error: insertErr } = await supabase.from("media_assets").insert({
        request_prompt: prompt,
        optimized_prompt: optimizedPrompt,
        asset_type,
        purpose,
        aspect_ratio,
        style_preset,
        generation_strategy: strategy,
        target_page,
        target_entity_id,
        target_entity_type,
        requested_by,
        status: "generating",
      }).select().single();

      if (insertErr) throw insertErr;

      // Select models based on strategy
      let modelsToUse = IMAGE_MODELS;
      if (strategy === "single") {
        modelsToUse = [IMAGE_MODELS[1]]; // balanced
      } else if (strategy === "best") {
        modelsToUse = [IMAGE_MODELS[2]]; // premium only
      }

      // Generate in parallel
      const results = await Promise.allSettled(
        modelsToUse.map(m => generateWithModel(LOVABLE_API_KEY, m.id, optimizedPrompt))
      );

      const successResults = results
        .filter((r): r is PromiseFulfilledResult<{ modelId: string; imageBase64: string | null }> =>
          r.status === "fulfilled" && !!r.value.imageBase64
        )
        .map(r => r.value);

      if (successResults.length === 0) {
        await supabase.from("media_assets").update({
          status: "failed",
          error_message: "All models failed to generate",
        }).eq("id", asset.id);

        return new Response(JSON.stringify({ error: "All models failed", asset_id: asset.id }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Score each result (only if multi-model)
      let bestResult = successResults[0];
      let bestScore = { realism: 70, clarity: 70, brand_consistency: 70, composition: 70, overall: 70 };
      const variationsData: Array<{ model: string; score: number }> = [];

      if (successResults.length > 1) {
        const scorePromises = successResults.map(async (r) => {
          const score = await scoreImage(LOVABLE_API_KEY, r.imageBase64!, purpose);
          return { result: r, score };
        });

        const scored = await Promise.all(scorePromises);
        scored.sort((a, b) => b.score.overall - a.score.overall);
        
        bestResult = scored[0].result;
        bestScore = scored[0].score;
        
        for (const s of scored) {
          variationsData.push({ model: s.result.modelId, score: s.score.overall });
        }
      }

      // Generate alt text for the best result
      const altText = await generateAltText(LOVABLE_API_KEY, bestResult.imageBase64!);

      // Upload to storage
      const base64Data = bestResult.imageBase64!.replace(/^data:image\/\w+;base64,/, "");
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const storagePath = `generated/${asset.id}.png`;

      const { error: uploadErr } = await supabase.storage
        .from("media-assets")
        .upload(storagePath, imageBytes, { contentType: "image/png", upsert: true });

      if (uploadErr) {
        console.error("Upload error:", uploadErr);
      }

      const { data: urlData } = supabase.storage.from("media-assets").getPublicUrl(storagePath);

      // Update asset record
      await supabase.from("media_assets").update({
        status: "generated",
        storage_path: storagePath,
        storage_url: urlData.publicUrl,
        models_used: successResults.map(r => r.modelId),
        variations_count: successResults.length,
        variations: variationsData,
        overall_score: bestScore.overall,
        realism_score: bestScore.realism,
        clarity_score: bestScore.clarity,
        brand_consistency_score: bestScore.brand_consistency,
        composition_score: bestScore.composition,
        alt_text: altText,
        file_format: "png",
        generated_at: new Date().toISOString(),
      }).eq("id", asset.id);

      // Log to agent system
      await supabase.from("agent_logs").insert({
        agent_name: "ai-media-orchestrator",
        log_type: "generation",
        message: `Asset généré: "${prompt}" — Score: ${bestScore.overall}/100 — Modèle: ${bestResult.modelId}`,
        metadata: { asset_id: asset.id, models_used: successResults.length, score: bestScore.overall },
      });

      return new Response(JSON.stringify({
        asset_id: asset.id,
        storage_url: urlData.publicUrl,
        score: bestScore,
        models_used: successResults.map(r => r.modelId),
        alt_text: altText,
        variations: variationsData.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: LIST =====
    if (action === "list") {
      const { status: filterStatus, purpose: filterPurpose, limit = 50 } = body;
      let query = supabase.from("media_assets").select("*").order("created_at", { ascending: false }).limit(limit);
      if (filterStatus) query = query.eq("status", filterStatus);
      if (filterPurpose) query = query.eq("purpose", filterPurpose);
      const { data, error } = await query;
      if (error) throw error;
      return new Response(JSON.stringify({ assets: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: APPROVE =====
    if (action === "approve") {
      const { asset_id, approved_by } = body;
      await supabase.from("media_assets").update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by,
      }).eq("id", asset_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: REJECT =====
    if (action === "reject") {
      const { asset_id } = body;
      await supabase.from("media_assets").update({ status: "rejected" }).eq("id", asset_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: REGENERATE =====
    if (action === "regenerate") {
      const { asset_id } = body;
      const { data: existing } = await supabase.from("media_assets").select("*").eq("id", asset_id).single();
      if (!existing) throw new Error("Asset not found");

      // Re-trigger generation with same params but premium model
      const optimizedPrompt = optimizePrompt(existing.request_prompt, existing.style_preset || "unpro-premium", existing.aspect_ratio || "16:9");
      const result = await generateWithModel(LOVABLE_API_KEY, "google/gemini-3-pro-image-preview", optimizedPrompt);
      
      if (!result.imageBase64) {
        return new Response(JSON.stringify({ error: "Regeneration failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const score = await scoreImage(LOVABLE_API_KEY, result.imageBase64, existing.purpose);
      const altText = await generateAltText(LOVABLE_API_KEY, result.imageBase64);

      const base64Data = result.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      const storagePath = `generated/${asset_id}_v2.png`;

      await supabase.storage.from("media-assets").upload(storagePath, imageBytes, { contentType: "image/png", upsert: true });
      const { data: urlData } = supabase.storage.from("media-assets").getPublicUrl(storagePath);

      await supabase.from("media_assets").update({
        status: "generated",
        storage_path: storagePath,
        storage_url: urlData.publicUrl,
        models_used: [result.modelId],
        overall_score: score.overall,
        realism_score: score.realism,
        clarity_score: score.clarity,
        brand_consistency_score: score.brand_consistency,
        composition_score: score.composition,
        alt_text: altText,
        generated_at: new Date().toISOString(),
      }).eq("id", asset_id);

      return new Response(JSON.stringify({ success: true, storage_url: urlData.publicUrl, score }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Media orchestrator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
