/**
 * create-project-unified — point d'entrée unique de création de projet
 * propriétaire (Clara voix, Clara clavardage, formulaire, calculateurs).
 *
 * Garanties :
 *  - session vérifiée obligatoire (projects.user_id est NOT NULL) ;
 *  - idempotence stricte par `idempotency_key` : jamais deux projets pour la
 *    même estimation (double clic, rafraîchissement, renvoi de code) ;
 *  - propriété réutilisée ou créée une seule fois ;
 *  - un seul lead propriétaire par projet, jamais diffusé à plusieurs
 *    entrepreneurs ;
 *  - les étapes secondaires (contexte, signal de demande, profil) ne bloquent
 *    jamais la création du projet.
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
  category_label?: string;
  city?: string | null;
  postal_code?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  property_type?: string | null;
  photos?: string[];
  source?: string;
  idempotency_key?: string;
  first_name?: string | null;
  email?: string | null;
  budget_min?: number | null;
  budget_max?: number | null;
  urgency?: string | null;
  estimate?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  attribution?: Record<string, unknown>;
  source_page?: string | null;
  consent_marketing?: boolean;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function positive(n: unknown): number | null {
  return typeof n === "number" && Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
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
    const source = (body.source ?? "manual").slice(0, 60);
    const categoryLabel = (body.category_label ?? body.category ?? "Projet").slice(0, 120);
    const description = (body.description ?? "").trim().slice(0, 4000);

    // Session vérifiée obligatoire.
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "auth_required" }, 401);
    const { data: userData } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
    const userId = userData.user?.id ?? null;
    if (!userId) return json({ error: "auth_required" }, 401);

    const idempotencyKey = (body.idempotency_key ?? "").trim().slice(0, 120);

    // 0. Rejeu idempotent — aucune écriture supplémentaire.
    if (idempotencyKey) {
      const { data: existing } = await supabase
        .from("project_intake_keys")
        .select("project_id, lead_id")
        .eq("user_id", userId)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();
      if (existing) {
        const row = existing as { project_id: string; lead_id: string | null };
        return json({
          projectId: row.project_id,
          leadId: row.lead_id,
          hasMatches: false,
          reused: true,
        });
      }
    }

    // 1. Propriété : réutiliser la plus récente, sinon en créer une seule.
    let propertyId: string | null = null;
    const { data: existingProperty } = await supabase
      .from("properties")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingProperty) {
      propertyId = (existingProperty as { id: string }).id;
    } else {
      const { data: createdProperty, error: propertyError } = await supabase
        .from("properties")
        .insert({
          user_id: userId,
          address: body.address ?? body.city ?? "Adresse à confirmer",
          full_address: body.address ?? null,
          city: body.city ?? null,
          province: "QC",
          country: "CA",
          postal_code: body.postal_code ?? null,
          property_type: body.property_type ?? null,
          latitude: body.latitude ?? null,
          longitude: body.longitude ?? null,
        } as never)
        .select("id")
        .single();
      if (propertyError || !createdProperty) {
        return json({ error: propertyError?.message ?? "property_insert_failed" }, 500);
      }
      propertyId = (createdProperty as { id: string }).id;
    }

    // 2. AUTORITAIRE : le projet.
    const budgetMin = positive(body.budget_min);
    const budgetMax = positive(body.budget_max);
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .insert({
        user_id: userId,
        property_id: propertyId,
        title: categoryLabel,
        description: description || categoryLabel,
        subcategory: body.category ?? null,
        status: "open",
        urgency: body.urgency ?? "normal",
        budget_min: budgetMin,
        budget_max: budgetMax,
        photo_urls: Array.isArray(body.photos) ? body.photos.slice(0, 12) : [],
        matching_status: "pending",
      } as never)
      .select("id")
      .single();

    if (projectError || !project) {
      return json({ error: projectError?.message ?? "project_insert_failed" }, 500);
    }
    const projectId = (project as { id: string }).id;

    // 3. Lead propriétaire unique (exclusif, jamais diffusé).
    let leadId: string | null = null;
    try {
      const { data: lead } = await supabase
        .from("leads")
        .insert({
          owner_profile_id: userId,
          property_id: propertyId,
          lead_type: "contractor",
          city: body.city ?? null,
          intent: "renovation",
          project_category: body.category ?? null,
          budget_min: budgetMin,
          budget_max: budgetMax,
          urgency: body.urgency ?? "normal",
          language: "fr",
          status: "new",
          matching_status: "pending",
          payload: {
            source,
            source_page: body.source_page ?? null,
            project_id: projectId,
            idempotency_key: idempotencyKey || null,
            first_name: body.first_name ?? null,
            email: body.email ?? null,
            consent_marketing: !!body.consent_marketing,
            estimate: body.estimate ?? null,
            inputs: body.inputs ?? null,
            attribution: body.attribution ?? null,
          },
        } as never)
        .select("id")
        .single();
      leadId = (lead as { id: string } | null)?.id ?? null;
    } catch (e) {
      console.warn("[create-project-unified] lead insert failed", e);
    }

    // 4. Clé d'idempotence (après succès du projet).
    if (idempotencyKey) {
      try {
        await supabase.from("project_intake_keys").insert({
          idempotency_key: idempotencyKey,
          user_id: userId,
          project_id: projectId,
          lead_id: leadId,
          source,
        } as never);
      } catch (e) {
        console.warn("[create-project-unified] intake key insert failed", e);
      }
    }

    // 5. Meilleur effort : contexte de projet et profil propriétaire.
    try {
      await supabase.from("project_context_snapshots").insert({
        project_id: projectId,
        user_id: userId,
        property_id: propertyId,
        project_type: body.category ?? null,
        subcategory: body.category ?? null,
        declared_budget_min: budgetMin,
        declared_budget_max: budgetMax,
        constraints: { estimate: body.estimate ?? null, inputs: body.inputs ?? null, source },
      } as never);
    } catch (e) {
      console.warn("[create-project-unified] context snapshot failed", e);
    }

    try {
      await supabase.from("profiles").upsert(
        { user_id: userId, role: "homeowner" } as never,
        { onConflict: "user_id" },
      );
    } catch (e) {
      console.warn("[create-project-unified] profile upsert failed", e);
    }

    // 6. Meilleur effort : présence d'une compatibilité déjà calculée.
    let hasMatches = false;
    try {
      const { count } = await supabase
        .from("project_matches")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId);
      hasMatches = (count ?? 0) > 0;
    } catch {
      hasMatches = false;
    }

    return json({ projectId, leadId, hasMatches, reused: false });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[create-project-unified]", msg);
    return json({ error: msg }, 500);
  }
});
