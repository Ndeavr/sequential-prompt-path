import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

interface GenerateRequest {
  action: "generate" | "preview" | "list_templates" | "list_generations";
  intent?: string;
  persona?: string;
  city?: string;
  service?: string;
  contractor_name?: string;
  score?: number;
  cta?: string;
  variant?: string;
  template_id?: string;
  width?: number;
  height?: number;
  limit?: number;
}

const INTENT_CONFIGS: Record<string, { title: string; subtitle: string; colors: string[] }> = {
  homeowner_problem: {
    title: "Trouvez le bon entrepreneur",
    subtitle: "Décrivez votre problème",
    colors: ["#1a3a5c", "#2563eb", "#ffffff"],
  },
  quote_analysis: {
    title: "Comparez vos soumissions",
    subtitle: "Voyez ce qui manque",
    colors: ["#0f172a", "#6366f1", "#ffffff"],
  },
  contractor_score: {
    title: "Votre score de visibilité",
    subtitle: "Voyez ce que vous perdez",
    colors: ["#1e293b", "#f59e0b", "#ffffff"],
  },
  booking: {
    title: "Réservez avec le bon entrepreneur",
    subtitle: "Profil + disponibilités",
    colors: ["#064e3b", "#10b981", "#ffffff"],
  },
  condo_compliance: {
    title: "Simplifiez votre copropriété",
    subtitle: "Loi 16, documents, clarté",
    colors: ["#312e81", "#818cf8", "#ffffff"],
  },
};

function buildDynamicTitle(intent: string, city?: string, service?: string, contractor_name?: string): { title: string; subtitle: string } {
  const config = INTENT_CONFIGS[intent] || INTENT_CONFIGS.homeowner_problem;
  let title = config.title;
  let subtitle = config.subtitle;

  if (intent === "homeowner_problem" && service && city) {
    title = `Problème de ${service} à ${city}?`;
    subtitle = "Trouver un expert maintenant";
  } else if (intent === "contractor_score" && contractor_name) {
    title = `${contractor_name}, êtes-vous visible?`;
    subtitle = "Découvrez votre score AIPP";
  } else if (intent === "booking" && contractor_name) {
    title = `Réservez avec ${contractor_name}`;
    subtitle = city ? `Disponible à ${city}` : "Profil vérifié";
  } else if (intent === "condo_compliance" && city) {
    title = `Copropriété à ${city}`;
    subtitle = "Diagnostic Loi 16 gratuit";
  }

  return { title, subtitle };
}

async function generateImageWithAI(prompt: string): Promise<string | null> {
  if (!lovableApiKey) return null;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    const data = await response.json();
    return data.choices?.[0]?.message?.images?.[0]?.image_url?.url || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: GenerateRequest = await req.json();
    const supabase = createClient(supabaseUrl, supabaseKey);
    const startTime = Date.now();

    if (body.action === "list_templates") {
      const { data, error } = await supabase
        .from("share_image_templates")
        .select("*, share_image_variants(*)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return new Response(JSON.stringify({ templates: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "list_generations") {
      const { data, error } = await supabase
        .from("share_image_generations")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(body.limit || 50);
      if (error) throw error;
      return new Response(JSON.stringify({ generations: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "generate" || body.action === "preview") {
      const intent = body.intent || "homeowner_problem";
      const config = INTENT_CONFIGS[intent] || INTENT_CONFIGS.homeowner_problem;
      const { title, subtitle } = buildDynamicTitle(intent, body.city, body.service, body.contractor_name);
      const width = body.width || 1200;
      const height = body.height || 630;

      const prompt = `Create a professional Open Graph image for a Quebec home services platform called UNPRO. 
Size: ${width}x${height} pixels. 
Style: Premium, clean, modern SaaS design. 
Primary colors: ${config.colors.join(", ")}.
Main title (large, bold, white): "${title}"
Subtitle (smaller, lighter): "${subtitle}"
Bottom right corner: small UNPRO logo text.
The image should feel premium, trustworthy, and conversion-optimized.
${body.cta ? `CTA button text: "${body.cta}"` : ""}
Layout: gradient background with subtle geometric patterns, text centered with generous padding.
No stock photo look. Clean vector/minimal style.`;

      const imageUrl = await generateImageWithAI(prompt);

      const generationTimeMs = Date.now() - startTime;

      if (body.action === "generate" && imageUrl) {
        const { data: gen, error } = await supabase
          .from("share_image_generations")
          .insert({
            template_id: body.template_id || null,
            generated_image_url: imageUrl,
            width,
            height,
            generation_time_ms: generationTimeMs,
            intent,
            persona: body.persona || null,
            city: body.city || null,
            service: body.service || null,
            contractor_name: body.contractor_name || null,
            metadata_json: { title, subtitle, variant: body.variant, cta: body.cta },
          })
          .select()
          .single();
        if (error) throw error;

        return new Response(JSON.stringify({ 
          success: true, 
          generation: gen, 
          image_url: imageUrl,
          title,
          subtitle,
          generation_time_ms: generationTimeMs,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        preview: true,
        image_url: imageUrl,
        title,
        subtitle,
        generation_time_ms: generationTimeMs,
        config,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
