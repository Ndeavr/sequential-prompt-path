// Painting photo analyzer — Lovable AI Gateway (Gemini 2.5 Flash vision)
// Returns wall condition + surface estimate from a photo URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { canAnalyzePaintingPath } from "./pathRules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  image_url?: string;
  storage_path?: string;
  estimate_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: Body = await req.json();
    const { estimate_id, storage_path } = body;
    let image_url = body.image_url;
    if (storage_path !== undefined) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const admin = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      let userId: string | null = null;
      let isAdmin = false;
      const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (token) {
        const { data } = await admin.auth.getUser(token);
        userId = data?.user?.id ?? null;
        if (userId) {
          const { data: r } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
          isAdmin = !!r;
        }
      }
      if (!canAnalyzePaintingPath(storage_path, { userId, isAdmin })) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: signed } = await admin.storage.from("painting-photos").createSignedUrl(storage_path as string, 600);
      if (!signed?.signedUrl) {
        return new Response(JSON.stringify({ error: "not_found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      image_url = signed.signedUrl; // never returned to the caller
    }
    if (!image_url || typeof image_url !== "string") {
      return new Response(JSON.stringify({ error: "image_url required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content:
              "Tu es un expert en peinture résidentielle au Québec. Analyse la photo et retourne UNIQUEMENT un objet JSON valide avec ces clés: detectedCondition (excellent|good|fair|poor), estimatedSurfaceSqft (number), surfaceType (string court FR), repairsNeeded (string court FR), summary (string court FR). Aucun texte hors du JSON.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Analyse cette surface à peindre." },
              { type: "image_url", image_url: { url: image_url } },
            ],
          },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      return new Response(
        JSON.stringify({ error: "ai_gateway_error", detail: txt.slice(0, 400) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiResp.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown> = {};
    try {
      // Strip fenced code blocks if any
      const cleaned = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { summary: raw.slice(0, 200) };
    }

    // Persist if estimate_id provided (uses service role)
    if (estimate_id) {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(SUPABASE_URL, SERVICE);
      await admin
        .from("painting_photos")
        .update({
          ai_notes: parsed,
          detected_surface_sqft: Number(parsed.estimatedSurfaceSqft) || null,
          detected_condition: (parsed.detectedCondition as string) || null,
        })
        .eq("estimate_id", estimate_id)
        .eq("image_url", storage_path ?? image_url);
    }

    return new Response(JSON.stringify({ ok: true, analysis: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "unhandled", detail: String(err).slice(0, 300) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
