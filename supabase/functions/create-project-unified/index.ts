/**
 * create-project-unified — one endpoint for all 3 homeowner entry methods.
 *
 * Guarantee: project insert is authoritative. demand_signal or profile
 * upsert failures are logged but NEVER block the project creation.
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  description?: string;
  category?: string;
  city?: string;
  postal_code?: string;
  photos?: string[];
  source?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = (await req.json().catch(() => ({}))) as Body;
    const description = (body.description ?? "").trim();
    if (!description) {
      return new Response(
        JSON.stringify({ error: "description is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Resolve user (optional — flow works for guests too)
    let userId: string | null = null;
    const auth = req.headers.get("Authorization");
    if (auth) {
      const token = auth.replace("Bearer ", "");
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    // 1. AUTHORITATIVE: insert project.
    const projectInsert = {
      description,
      category: body.category ?? null,
      city: body.city ?? null,
      postal_code: body.postal_code ?? null,
      photos: body.photos ?? [],
      source: body.source ?? "manual",
      user_id: userId,
      status: "new",
    };

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert(projectInsert as never)
      .select("id")
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: projectError?.message ?? "project insert failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const projectId = (project as { id: string }).id;

    // 2. BEST-EFFORT: demand signal. Failure never blocks project creation.
    try {
      await supabase.from("demand_signals" as never).insert({
        project_id: projectId,
        category: body.category ?? null,
        city: body.city ?? null,
        source: body.source ?? "manual",
      } as never);
    } catch (e) {
      console.warn("[create-project-unified] demand_signals insert failed", e);
    }

    // 3. BEST-EFFORT: homeowner profile upsert.
    if (userId) {
      try {
        await supabase.from("profiles").upsert({
          id: userId,
          role: "homeowner",
        } as never, { onConflict: "id" });
      } catch (e) {
        console.warn("[create-project-unified] profile upsert failed", e);
      }
    }

    // 4. BEST-EFFORT: match check.
    let hasMatches = false;
    try {
      const { count } = await supabase
        .from("matches" as never)
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId);
      hasMatches = (count ?? 0) > 0;
    } catch {
      hasMatches = false;
    }

    return new Response(
      JSON.stringify({ projectId, hasMatches }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
