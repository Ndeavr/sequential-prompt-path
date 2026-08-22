// UNPRO — Déduction IA de préférences candidates à partir des notes libres de l'entrepreneur.
// JAMAIS d'exclusion dure automatique : tout est écrit en `inferred`, non confirmé, non bloquant.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { compatCors } from "../_shared/contractorCompatibility.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...compatCors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: compatCors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await authClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const requestedId: string | null = typeof body?.contractor_id === "string" ? body.contractor_id : null;

    const { data: own } = await admin.from("contractors").select("id").eq("user_id", userId).maybeSingle();
    let contractorId = own?.id ?? null;
    if (requestedId && requestedId !== own?.id) {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) return json({ error: "Forbidden" }, 403);
      contractorId = requestedId;
    }
    if (!contractorId) return json({ error: "Fiche entrepreneur introuvable." }, 404);

    const { data: profile } = await admin
      .from("contractor_compatibility_profiles")
      .select("answers")
      .eq("contractor_id", contractorId)
      .maybeSingle();

    const answers = (profile?.answers ?? {}) as any;
    const notes: string[] = [
      ...(answers.critical_notes ?? []),
      ...Object.values(answers.projects ?? {}).map((p: any) => p?.condition_note).filter(Boolean),
    ].filter((n: string) => typeof n === "string" && n.trim().length > 3);

    if (notes.length === 0) return json({ ok: true, inferred: 0, reason: "no_free_text" });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ ok: false, error: "AI gateway indisponible" }, 503);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "Tu analyses les notes d'un entrepreneur québécois en excavation/fondations/drainage. " +
              "Extrait UNIQUEMENT des préférences déductibles du texte, en français. " +
              "Réponds en JSON: {\"inferences\":[{\"title\":\"...\",\"detail\":\"...\",\"dimension\":\"...\",\"key\":\"...\"}]}. " +
              "N'invente rien. Maximum 5 éléments.",
          },
          { role: "user", content: notes.join("\n---\n").slice(0, 4000) },
        ],
      }),
    });

    if (res.status === 429) return json({ ok: false, error: "rate_limited" }, 429);
    if (!res.ok) return json({ ok: false, error: `AI ${res.status}` }, 502);

    const ai = await res.json();
    const raw = ai?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
    } catch {
      parsed = {};
    }
    const inferences = Array.isArray(parsed?.inferences) ? parsed.inferences.slice(0, 5) : [];
    if (!inferences.length) return json({ ok: true, inferred: 0 });

    await admin.from("contractor_compatibility_insights").insert(
      inferences.map((i: any) => ({
        contractor_id: contractorId,
        insight_type: "inferred_preference",
        title_fr: String(i?.title ?? "Préférence déduite").slice(0, 200),
        detail_fr: i?.detail ? String(i.detail).slice(0, 1000) : null,
        evidence: { source: "free_text" },
        proposed_change: { dimension: i?.dimension ?? null, key: i?.key ?? null },
        status: "suggested",
      })),
    );

    return json({ ok: true, inferred: inferences.length });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
