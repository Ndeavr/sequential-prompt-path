// Alex Autocomplete — real, non-cosmetic profile enrichment.
// Chains existing enrichment pipelines and writes durable state to
// contractor_activation_funnel so the UI can observe progress via realtime.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StepStatus = "pending" | "running" | "done" | "skipped" | "error";
interface Step { key: string; label: string; status: StepStatus; detail?: string }

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { funnel_id } = await req.json().catch(() => ({}));
    if (!funnel_id) return json({ error: "missing_funnel_id" }, 400);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: funnel } = await sb
      .from("contractor_activation_funnel").select("*").eq("id", funnel_id).single();
    if (!funnel) return json({ error: "funnel_not_found" }, 404);

    const website = (funnel as any).website || "";
    const businessName = (funnel as any).business_name || "";
    const imported = ((funnel as any).imported_data ?? {}) as Record<string, unknown>;

    const steps: Step[] = [
      { key: "website",   label: "Analyse du site web",     status: "pending" },
      { key: "gmb",       label: "Profil Google Business",  status: "pending" },
      { key: "logo",      label: "Détection du logo",       status: "pending" },
      { key: "photos",    label: "Photos et médias",        status: "pending" },
      { key: "categories",label: "Catégories de services",  status: "pending" },
      { key: "zones",     label: "Zones de service",        status: "pending" },
      { key: "rbq",       label: "Licence RBQ",             status: "pending" },
      { key: "neq",       label: "Registre NEQ",            status: "pending" },
    ];

    const pushProgress = async () =>
      sb.from("contractor_activation_funnel")
        .update({ imported_data: { ...imported, alex_autocomplete: { steps, updated_at: new Date().toISOString() } } })
        .eq("id", funnel_id);

    const setStep = async (key: string, patch: Partial<Step>) => {
      const s = steps.find(x => x.key === key); if (s) Object.assign(s, patch);
      await pushProgress();
    };

    const invoke = async (name: string, body: unknown) => {
      try {
        const r = await sb.functions.invoke(name, { body });
        return { ok: !r.error, data: r.data, error: r.error?.message };
      } catch (e) { return { ok: false, error: (e as Error).message }; }
    };

    // 1. Website + GMB via aipp-pipeline-run (best-effort, all downstream signals)
    await setStep("website", { status: "running" });
    const aipp = await invoke("aipp-pipeline-run", { funnel_id, website, business_name: businessName });
    const aippOk = aipp.ok && aipp.data;
    const evidence = (aippOk ? (aipp.data as any) : {}) as Record<string, unknown>;

    await setStep("website", { status: website ? (aippOk ? "done" : "error") : "skipped", detail: aipp.error });
    await setStep("gmb",     { status: evidence?.gmb_place_id ? "done" : "skipped" });
    await setStep("logo",    { status: evidence?.logo_url ? "done" : "skipped" });
    await setStep("photos",  { status: Array.isArray(evidence?.photos) && (evidence!.photos as unknown[]).length > 0 ? "done" : "skipped", detail: Array.isArray(evidence?.photos) ? `${(evidence!.photos as unknown[]).length} photos` : undefined });
    await setStep("categories",{ status: Array.isArray(evidence?.categories) && (evidence!.categories as unknown[]).length > 0 ? "done" : "skipped" });
    await setStep("zones",   { status: Array.isArray(evidence?.service_zones) && (evidence!.service_zones as unknown[]).length > 0 ? "done" : "skipped" });

    // 2. RBQ lookup (only when we have a plausible number)
    await setStep("rbq", { status: "running" });
    const rbqInput = (evidence?.rbq_number as string) || (imported.rbq_number as string) || "";
    if (rbqInput && rbqInput.replace(/\D/g,"").length >= 8) {
      const r = await invoke("rbq-status", { rbq: rbqInput });
      await setStep("rbq", { status: r.ok ? "done" : "error", detail: r.error });
    } else {
      await setStep("rbq", { status: "skipped", detail: "Non détecté automatiquement" });
    }

    // 3. NEQ lookup
    await setStep("neq", { status: "running" });
    const neqInput = (evidence?.neq_number as string) || (imported.neq_number as string) || "";
    if (neqInput && neqInput.replace(/\D/g,"").length >= 10) {
      const r = await invoke("extract-neq", { neq: neqInput });
      await setStep("neq", { status: r.ok ? "done" : "error", detail: r.error });
    } else {
      await setStep("neq", { status: "skipped", detail: "Non détecté automatiquement" });
    }

    // Recompute lightweight completion signals so the funnel UI reflects reality.
    const merged: Record<string, unknown> = { ...imported };
    if (evidence?.rbq_number) merged.rbq_number = evidence.rbq_number;
    if (evidence?.neq_number) merged.neq_number = evidence.neq_number;
    if (evidence?.logo_url)   merged.logo_url = evidence.logo_url;
    if (evidence?.photos)     merged.photos = evidence.photos;
    if (evidence?.gmb_place_id) merged.gmb_place_id = evidence.gmb_place_id;
    merged.alex_autocomplete = { steps, updated_at: new Date().toISOString(), completed: true };

    const patch: Record<string, unknown> = { imported_data: merged, import_status: "complete" };
    if (Array.isArray(evidence?.categories) && (evidence!.categories as unknown[]).length > 0)
      patch.selected_services = evidence!.categories;
    if (Array.isArray(evidence?.service_zones) && (evidence!.service_zones as unknown[]).length > 0)
      patch.selected_zones = evidence!.service_zones;

    await sb.from("contractor_activation_funnel").update(patch).eq("id", funnel_id);

    return json({ ok: true, steps, applied: Object.keys(patch) });
  } catch (e) {
    console.error("[alex-autocomplete-profile] fatal", (e as Error).message);
    return json({ error: "internal_error", detail: (e as Error).message }, 500);
  }
});
