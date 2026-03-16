import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user from token
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const body = await req.json();
    const { action } = body;

    // ─── ACTION: generate ───
    if (action === "generate") {
      const { imageBase64, prompt, style, budget, zones, roomType, projectId } = body;

      if (!imageBase64) {
        return new Response(
          JSON.stringify({ error: "Image requise" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build the transformation prompt
      const styleHint = style ? `Style: ${style}.` : "";
      const budgetHint = budget ? `Budget feel: ${budget}.` : "";
      const zoneHint = zones?.length ? `Focus zones: ${zones.join(", ")}.` : "";
      const roomHint = roomType ? `Room type: ${roomType}.` : "";

      const systemPrompt = [
        "You are a professional interior designer AI.",
        "Transform the uploaded room photo based on the user's instructions.",
        "Maintain the same room perspective, dimensions, and architecture.",
        "Apply the requested design changes realistically.",
        "The result should look like a real professional renovation photo.",
        roomHint,
        styleHint,
        budgetHint,
        zoneHint,
      ].filter(Boolean).join(" ");

      const userPrompt = prompt || `Redesign this room in a ${style || "modern"} style.`;

      // Generate 3 variations by making parallel requests
      const generateOne = async (variation: number) => {
        const variationHint = variation === 1
          ? "Create a subtle, conservative transformation."
          : variation === 2
          ? "Create a balanced, mid-range transformation."
          : "Create a bold, premium transformation.";

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `${systemPrompt}\n\n${variationHint}\n\nUser request: ${userPrompt}`,
                  },
                  {
                    type: "image_url",
                    image_url: { url: imageBase64 },
                  },
                ],
              },
            ],
            modalities: ["image", "text"],
          }),
        });

        if (!response.ok) {
          console.error(`Generation ${variation} failed:`, await response.text());
          return null;
        }

        const data = await response.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        const text = data.choices?.[0]?.message?.content || "";
        return { imageUrl, text, variation };
      };

      const results = await Promise.allSettled([
        generateOne(1),
        generateOne(2),
        generateOne(3),
      ]);

      const generated = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value?.imageUrl)
        .map((r) => r.value);

      if (generated.length === 0) {
        return new Response(
          JSON.stringify({ error: "La génération a échoué. Réessayez." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Save versions to DB if we have a projectId and userId
      const savedVersions: any[] = [];
      if (projectId && userId) {
        // Get current version count
        const { count } = await supabase
          .from("design_versions")
          .select("*", { count: "exact", head: true })
          .eq("project_id", projectId);

        const baseNum = (count || 0) + 1;
        const labels = ["Sobre", "Équilibré", "Premium"];

        for (let i = 0; i < generated.length; i++) {
          const g = generated[i];
          // Upload image to storage
          const fileName = `${projectId}/${Date.now()}-v${baseNum + i}.png`;
          const base64Data = g.imageUrl.replace(/^data:image\/\w+;base64,/, "");
          const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

          const { data: uploadData } = await supabase.storage
            .from("media-assets")
            .upload(`design/${fileName}`, binaryData, {
              contentType: "image/png",
              upsert: true,
            });

          const publicUrl = uploadData?.path
            ? `${SUPABASE_URL}/storage/v1/object/public/media-assets/design/${fileName}`
            : null;

          const { data: version } = await supabase
            .from("design_versions")
            .insert({
              project_id: projectId,
              version_number: `${baseNum + i}`,
              image_url: publicUrl || g.imageUrl,
              prompt_used: userPrompt,
              frozen: false,
              style_label: style || null,
              budget_mode: budget || null,
            })
            .select()
            .single();

          if (version) {
            savedVersions.push({
              ...version,
              imageUrl: publicUrl || g.imageUrl,
              label: labels[i],
            });
          }
        }
      }

      return new Response(
        JSON.stringify({
          versions: savedVersions.length > 0
            ? savedVersions
            : generated.map((g, i) => ({
                id: `gen-${Date.now()}-${i}`,
                imageUrl: g.imageUrl,
                text: g.text,
                label: ["Sobre", "Équilibré", "Premium"][i],
              })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── ACTION: identify_room ───
    if (action === "identify_room") {
      const { imageBase64 } = body;
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Identify the room type in this photo. Respond with ONLY a JSON object: {"room_type": "kitchen|bathroom|living_room|bedroom|basement|facade|backyard|deck|dining_room|office", "description_fr": "brief French description of the room"}`,
                },
                {
                  type: "image_url",
                  image_url: { url: imageBase64 },
                },
              ],
            },
          ],
        }),
      });

      if (!response.ok) {
        return new Response(
          JSON.stringify({ room_type: "living_room", description_fr: "Pièce à vivre" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = text.match(/\{[^}]+\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { room_type: "living_room" };
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(
          JSON.stringify({ room_type: "living_room", description_fr: "Pièce à vivre" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ─── ACTION: create_project ───
    if (action === "create_project") {
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "Authentification requise" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { title, roomType: rt, originalImageBase64 } = body;

      // Upload original image
      let originalUrl: string | null = null;
      if (originalImageBase64) {
        const fileName = `originals/${userId}/${Date.now()}.jpg`;
        const base64Data = originalImageBase64.replace(/^data:image\/\w+;base64,/, "");
        const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

        await supabase.storage
          .from("media-assets")
          .upload(`design/${fileName}`, binaryData, {
            contentType: "image/jpeg",
            upsert: true,
          });

        originalUrl = `${SUPABASE_URL}/storage/v1/object/public/media-assets/design/${fileName}`;
      }

      const { data: project, error } = await supabase
        .from("design_projects")
        .insert({
          user_id: userId,
          title: title || "Mon projet Design",
          room_type: rt || null,
          original_image_url: originalUrl || originalImageBase64,
          visibility: "private",
          status: "draft",
        })
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(JSON.stringify({ project }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Action non reconnue" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("design-generate error:", err);
    return new Response(
      JSON.stringify({ error: "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
