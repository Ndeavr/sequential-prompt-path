import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PROJECT_CATEGORIES = [
  "kitchen", "bathroom", "basement", "living room", "bedroom",
  "facade", "roof", "paint colors", "backyard", "pool", "deck", "landscaping",
];

const CATEGORY_FR: Record<string, string> = {
  kitchen: "Cuisine", bathroom: "Salle de bain", basement: "Sous-sol",
  "living room": "Salon", bedroom: "Chambre", facade: "Façade",
  roof: "Toiture", "paint colors": "Peinture", backyard: "Cour arrière",
  pool: "Piscine", deck: "Terrasse", landscaping: "Aménagement paysager",
};

const SYSTEM_PROMPT = `Tu es Alex, concierge rénovation IA chez UNPRO. Tu guides les propriétaires étape par étape pour visualiser leurs projets de transformation.

RÈGLES ABSOLUES :
- Pose UNE SEULE question à la fois
- Sois chaleureuse, calme, professionnelle et pratique
- Garde tes messages courts (2-3 phrases max)
- Ne sois jamais robotique. Parle comme une conseillère de confiance
- Utilise le vouvoiement

FLUX DE CONVERSATION :
1. Quand l'utilisateur upload une photo, identifie le type de pièce/projet parmi : ${PROJECT_CATEGORIES.join(", ")}
2. Pose des questions adaptatives une à la fois pour collecter :
   - objectif principal (style, valeur, fonction, luminosité, attrait, efficacité énergétique, revente)
   - budget (moins de 5k, 5k-15k, 15k-40k, 40k+, juste explorer)
   - style préféré (moderne, contemporain, scandinave, classique, luxe, farmhouse, minimaliste)
   - échéancier (dès que possible, 1-3 mois, 3-6 mois, inspiration seulement)
3. Pose des questions conditionnelles selon le projet
4. Quand tu as assez d'infos, résume le projet et indique que tu vas générer des concepts

QUESTIONS CONDITIONNELLES PAR PROJET :
- Cuisine : garder la disposition ou redessiner, remplacer ou repeindre les armoires, îlot oui/non
- Façade : peinture seule ou modernisation complète, coordonner la couleur du toit, changer les fenêtres
- Cour arrière : piscine, terrasse, pergola, aménagement paysager

PRÉSENTATION DES RÉSULTATS :
Quand tu présentes un concept, explique :
- Le concept de design
- Les implications budgétaires
- La portée de la rénovation

Puis propose de connecter l'utilisateur avec des entrepreneurs.

IMPORTANT :
- Quand tu as collecté suffisamment d'informations pour générer, inclus dans ta réponse le marqueur [READY_TO_GENERATE] suivi d'un JSON avec les paramètres collectés
- Format : [READY_TO_GENERATE]{"category":"kitchen","goal":"modern","budget":"15k-40k","style":"modern","timeline":"1-3 months","details":"..."}
- Ne montre pas ce marqueur à l'utilisateur, c'est un signal système`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { messages, action, imageBase64, generationParams } = await req.json();

    // ===== ACTION: GENERATE TRANSFORMATION =====
    if (action === "generate_transformation") {
      const params = generationParams || {};
      const categoryFr = CATEGORY_FR[params.category] || params.category;
      
      const prompt = `Transform this ${params.category || "room"} photo into a ${params.style || "modern"} renovation concept. 
Goal: ${params.goal || "improve style and function"}. 
Budget level: ${params.budget || "mid-range"}. 
${params.details || ""}
Keep the same room dimensions and perspective. Show realistic renovation results with new materials, colors, and fixtures. Professional interior design photography style, high quality, natural lighting.`;

      const imageMessages: any[] = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
          ],
        },
      ];

      // If we have the original image, include it for edit-based generation
      if (imageBase64) {
        imageMessages[0].content.push({
          type: "image_url",
          image_url: { url: imageBase64 },
        });
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: imageMessages,
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const t = await response.text();
        console.error("Image generation error:", status, t);
        
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Trop de requêtes. Réessayez dans un moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({ error: "Erreur lors de la génération d'image" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await response.json();
      const textContent = data.choices?.[0]?.message?.content || "";
      const images = data.choices?.[0]?.message?.images || [];

      return new Response(JSON.stringify({
        text: textContent,
        images: images.map((img: any) => img.image_url?.url || ""),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: IDENTIFY ROOM from photo =====
    if (action === "identify_room" && imageBase64) {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Identify the room/area type from the photo. Return ONLY a JSON object with: {"category": "one of: ${PROJECT_CATEGORIES.join(", ")}", "description_fr": "brief description in French of what you see"}. Nothing else.`,
            },
            {
              role: "user",
              content: [
                { type: "text", text: "What room or area is this?" },
                { type: "image_url", image_url: { url: imageBase64 } },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "identify_room",
                description: "Identify the room type from a photo",
                parameters: {
                  type: "object",
                  properties: {
                    category: { type: "string", enum: PROJECT_CATEGORIES },
                    description_fr: { type: "string" },
                  },
                  required: ["category", "description_fr"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "identify_room" } },
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Room identification error:", response.status, t);
        return new Response(JSON.stringify({ error: "Impossible d'identifier la pièce" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      let result = { category: "living room", description_fr: "Pièce non identifiée" };
      
      if (toolCall?.function?.arguments) {
        try {
          result = JSON.parse(toolCall.function.arguments);
        } catch { /* use default */ }
      }

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== ACTION: CHAT (streaming) =====
    const contextMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA insuffisants." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const t = await response.text();
      console.error("Chat error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("alex-renovation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
