import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { import_id, image_base64, image_url } = await req.json();
    if (!import_id) throw new Error("import_id required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Update status
    await supabase.from("business_card_imports").update({ import_status: "processing" }).eq("id", import_id);

    const startMs = Date.now();

    // Build image content for AI
    const imageContent = image_base64
      ? { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${image_base64}` } }
      : { type: "image_url" as const, image_url: { url: image_url } };

    const systemPrompt = `Tu es un extracteur de cartes d'affaires pour UNPRO, une plateforme de services résidentiels au Québec.

Analyse l'image de carte d'affaires et extrais TOUS les champs suivants avec un score de confiance (0-100).

Retourne UNIQUEMENT un JSON valide avec cette structure exacte :
{
  "fields": [
    {"field_name": "first_name", "field_value": "...", "confidence": 95},
    {"field_name": "last_name", "field_value": "...", "confidence": 95},
    {"field_name": "full_name", "field_value": "...", "confidence": 95},
    {"field_name": "company_name", "field_value": "...", "confidence": 90},
    {"field_name": "role_title", "field_value": "...", "confidence": 80},
    {"field_name": "phone", "field_value": "...", "confidence": 85},
    {"field_name": "mobile_phone", "field_value": "...", "confidence": 70},
    {"field_name": "email", "field_value": "...", "confidence": 90},
    {"field_name": "website_url", "field_value": "...", "confidence": 85},
    {"field_name": "street_address", "field_value": "...", "confidence": 60},
    {"field_name": "city", "field_value": "...", "confidence": 80},
    {"field_name": "province", "field_value": "...", "confidence": 90},
    {"field_name": "postal_code", "field_value": "...", "confidence": 75},
    {"field_name": "category_primary", "field_value": "...", "confidence": 70},
    {"field_name": "social_linkedin", "field_value": "...", "confidence": 60},
    {"field_name": "social_facebook", "field_value": "...", "confidence": 60},
    {"field_name": "license_rbq", "field_value": "...", "confidence": 50}
  ],
  "global_confidence": 82,
  "raw_text": "texte brut extrait de la carte"
}

Règles :
- N'invente JAMAIS de données. Si un champ n'est pas visible, ne l'inclus pas.
- Pour category_primary, déduis le métier (plombier, électricien, couvreur, etc.) si possible.
- Formate les téléphones en format nord-américain : (XXX) XXX-XXXX
- Si une adresse est partielle, inclus ce qui est visible avec confiance réduite.
- Détecte le numéro RBQ si présent (format: XXXX-XXXX-XX)
- Retourne UNIQUEMENT le JSON, sans markdown, sans explication.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extrais toutes les informations de cette carte d'affaires." },
              imageContent,
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI API error: ${aiResponse.status} ${errText}`);
    }

    const aiData = await aiResponse.json();
    let rawContent = aiData.choices?.[0]?.message?.content || "";

    // Clean markdown fences if present
    rawContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let parsed: { fields: Array<{ field_name: string; field_value: string; confidence: number }>; global_confidence: number; raw_text: string };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error(`Failed to parse AI response: ${rawContent.substring(0, 200)}`);
    }

    const durationMs = Date.now() - startMs;

    // Insert extractions
    const extractions = parsed.fields
      .filter((f) => f.field_value && f.field_value.trim())
      .map((f) => ({
        import_id,
        field_name: f.field_name,
        field_value: f.field_value.trim(),
        confidence_score: f.confidence,
        source_side: "front",
        needs_manual_review: f.confidence < 70,
      }));

    if (extractions.length > 0) {
      await supabase.from("business_card_extractions").insert(extractions);
    }

    // Update import
    await supabase.from("business_card_imports").update({
      import_status: "extracted",
      extraction_confidence_global: parsed.global_confidence,
      raw_ocr_text: parsed.raw_text,
      ai_model_used: "gemini-2.5-flash",
      processing_duration_ms: durationMs,
    }).eq("id", import_id);

    // Create or update lead if linked
    const { data: importData } = await supabase
      .from("business_card_imports")
      .select("lead_id")
      .eq("id", import_id)
      .single();

    if (importData?.lead_id) {
      const fieldMap: Record<string, string> = {};
      for (const f of parsed.fields) {
        if (f.field_value?.trim()) fieldMap[f.field_name] = f.field_value.trim();
      }

      await supabase.from("contractor_leads").update({
        first_name: fieldMap.first_name,
        last_name: fieldMap.last_name,
        full_name: fieldMap.full_name,
        company_name: fieldMap.company_name,
        role_title: fieldMap.role_title,
        email: fieldMap.email,
        phone: fieldMap.phone,
        mobile_phone: fieldMap.mobile_phone,
        website_url: fieldMap.website_url,
        street_address: fieldMap.street_address,
        city: fieldMap.city,
        province: fieldMap.province || "QC",
        postal_code: fieldMap.postal_code,
        category_primary: fieldMap.category_primary,
        lead_status: "enriching",
        enrichment_status: "complete",
      }).eq("id", importData.lead_id);
    }

    return new Response(JSON.stringify({
      success: true,
      import_id,
      fields_extracted: extractions.length,
      global_confidence: parsed.global_confidence,
      duration_ms: durationMs,
      extractions: parsed.fields.filter((f) => f.field_value?.trim()),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-business-card error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
