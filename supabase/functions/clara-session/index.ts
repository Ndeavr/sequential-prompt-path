/**
 * clara-session — Raccord canonique unique de la continuité Clara.
 *
 * AUTORITÉ CANONIQUE : `public.alex_sessions` (+ `public.alex_messages`).
 * `alex_conversation_sessions` n'est plus une source de vérité : pont de
 * compatibilité temporaire uniquement.
 *
 * Cette fonction ne crée aucune table ni aucun second moteur. Elle orchestre
 * uniquement les enregistrements existants :
 *   - start    : reprend la session par jeton, sinon par compte, sinon crée.
 *   - append   : journalise un message réel dans la conversation canonique.
 *   - context  : fusionne des RÉFÉRENCES métier (jamais des copies de données).
 *   - promote  : rattache la session anonyme au compte authentifié, puis
 *                réclame de façon idempotente les artefacts anonymes référencés.
 *
 * Garanties : appartenance vérifiée, idempotence, refus explicite, aucune
 * donnée privée dans l'URL, aucun envoi sortant.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Références autorisées dans `context_json`. Rien d'autre n'est conservé. */
const CONTEXT_KEYS = [
  "active_property_id",
  "active_project_id",
  "active_lead_id",
  "selected_match_id",
  "appointment_id",
  "selected_contractor_id",
  "contractor_id",
  "pricing_quote_id",
  "checkout_session_id",
  "visitor_id",
  "current_intent",
  "detected_role",
  "current_route",
] as const;

/** Références métier vérifiées en base avant enregistrement. */
const VALIDATED_KEYS = [
  "active_property_id",
  "active_project_id",
  "active_lead_id",
  "selected_match_id",
  "appointment_id",
  "selected_contractor_id",
  "contractor_id",
  "pricing_quote_id",
] as const;

/** Champs libres non métier (aucune donnée privée). */
const FREE_TEXT_KEYS = ["current_intent", "detected_role", "current_route", "visitor_id"] as const;

/** Horodatage par clé scalaire : empêche un appareil en retard d'écraser un contexte plus récent. */
const REF_TS_KEY = "__ref_ts";

/** Références multiples (listes d'identifiants d'artefacts anonymes). */
const CONTEXT_LIST_KEYS = [
  "quote_analysis_ids",
  "verification_run_ids",
  "visual_analysis_ids",
] as const;

const MAX_LIST = 25;
const MAX_MESSAGES = 40;
const MAX_TEXT = 8000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function str(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/**
 * Filtrage de forme uniquement. La validation d'appartenance est faite ensuite
 * en base (`validateReferences`) : une clé autorisée ne suffit jamais.
 */
function sanitizeContextPatch(raw: unknown): {
  patch: Record<string, unknown>;
  rejected: string[];
} {
  const patch: Record<string, unknown> = {};
  const rejected: string[] = [];
  if (!raw || typeof raw !== "object") return { patch, rejected };
  const input = raw as Record<string, unknown>;

  for (const key of CONTEXT_KEYS) {
    if (!(key in input)) continue;
    const value = input[key];
    if (value === null) {
      patch[key] = null;
      continue;
    }
    const text = str(value, 200);
    if (!text) {
      rejected.push(key);
      continue;
    }
    if ((VALIDATED_KEYS as readonly string[]).includes(key) && !UUID_RE.test(text)) {
      rejected.push(key);
      continue;
    }
    if (key === "checkout_session_id" && !/^cs_[A-Za-z0-9_]{8,}$/.test(text)) {
      rejected.push(key);
      continue;
    }
    if ((FREE_TEXT_KEYS as readonly string[]).includes(key) && !/^[\w\-./:? ]{1,200}$/.test(text)) {
      rejected.push(key);
      continue;
    }
    patch[key] = text;
  }

  for (const key of CONTEXT_LIST_KEYS) {
    if (!(key in input)) continue;
    const value = input[key];
    if (!Array.isArray(value)) {
      rejected.push(key);
      continue;
    }
    const valid = value.filter((v): v is string => typeof v === "string" && UUID_RE.test(v));
    if (valid.length !== value.length) rejected.push(key);
    patch[key] = Array.from(new Set(valid)).slice(0, MAX_LIST);
  }

  return { patch, rejected };
}

function mergeContext(
  current: Record<string, unknown>,
  patch: Record<string, unknown>,
  clientTs: number,
): { context: Record<string, unknown>; stale: string[] } {
  const next: Record<string, unknown> = { ...current };
  const stamps: Record<string, number> = {
    ...((current[REF_TS_KEY] as Record<string, number>) ?? {}),
  };
  const stale: string[] = [];

  for (const [key, value] of Object.entries(patch)) {
    if ((CONTEXT_LIST_KEYS as readonly string[]).includes(key)) {
      // Union déduplicquée : l'ordre d'arrivée des appareils n'a aucune importance.
      const existing = Array.isArray(next[key]) ? (next[key] as string[]) : [];
      next[key] = Array.from(new Set([...existing, ...(value as string[])])).slice(0, MAX_LIST);
      continue;
    }
    // Écriture concurrente : un appareil en retard n'écrase pas un contexte plus récent.
    const previous = stamps[key];
    if (typeof previous === "number" && previous > clientTs) {
      stale.push(key);
      continue;
    }
    stamps[key] = clientTs;
    if (value === null) {
      delete next[key];
      continue;
    }
    next[key] = value;
  }

  next[REF_TS_KEY] = stamps;
  return { context: next, stale };
}

type SessionRow = {
  id: string;
  user_id: string | null;
  session_token: string;
  auth_state: string;
  current_step: string;
  language: string;
  resolved_role: string | null;
  last_intent: string | null;
  project_type: string | null;
  project_city: string | null;
  recommended_contractor_id: string | null;
  context_json: Record<string, unknown> | null;
  updated_at: string;
};

const SESSION_COLUMNS =
  "id,user_id,session_token,auth_state,current_step,language,resolved_role,last_intent,project_type,project_city,recommended_contractor_id,context_json,updated_at";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, serviceKey);

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // Identité : jamais déduite du corps de la requête.
  let userId: string | null = null;
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (token && token !== anonKey) {
    const { data } = await createClient(url, anonKey).auth.getUser(token);
    userId = data?.user?.id ?? null;
  }

  const action = str(body.action, 20) ?? "start";
  const sessionToken = str(body.session_token, 100);

  async function loadByToken(t: string): Promise<SessionRow | null> {
    const { data } = await admin
      .from("alex_sessions")
      .select(SESSION_COLUMNS)
      .eq("session_token", t)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as SessionRow) ?? null;
  }

  async function loadLatestForUser(uid: string): Promise<SessionRow | null> {
    const { data } = await admin
      .from("alex_sessions")
      .select(SESSION_COLUMNS)
      .eq("user_id", uid)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as SessionRow) ?? null;
  }

  async function loadMessages(sessionId: string) {
    const { data } = await admin
      .from("alex_messages")
      .select("id,sender,message,message_type,created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .limit(MAX_MESSAGES);
    return (data ?? []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      role: m.sender === "user" ? "user" : "assistant",
      text: (m.message as string) ?? "",
      type: (m.message_type as string) ?? "text",
      created_at: m.created_at as string,
    }));
  }

  /** Une session appartenant à un autre compte n'est jamais réutilisée. */
  function ownedByCaller(session: SessionRow): boolean {
    if (!session.user_id) return true;
    return !!userId && session.user_id === userId;
  }

  /** Propriété admissible : appartient au compte, ou encore anonyme. */
  function ownable(owner: string | null | undefined): boolean {
    if (!owner) return true;
    return !!userId && owner === userId;
  }

  async function row(table: string, columns: string, id: string) {
    const { data } = await admin.from(table).select(columns).eq("id", id).maybeSingle();
    return (data as Record<string, unknown> | null) ?? null;
  }

  /**
   * Validation serveur obligatoire : un UUID valide mais étranger à la
   * conversation ou au compte est refusé, jamais enregistré.
   */
  async function validateReferences(
    patch: Record<string, unknown>,
    context: Record<string, unknown>,
    session: SessionRow,
  ): Promise<{ accepted: Record<string, unknown>; refused: string[] }> {
    const accepted: Record<string, unknown> = {};
    const refused: string[] = [];
    const resolve = (key: string) => (patch[key] as string) ?? (context[key] as string) ?? null;

    for (const [key, value] of Object.entries(patch)) {
      if (value === null || !(VALIDATED_KEYS as readonly string[]).includes(key)) {
        if (!(CONTEXT_LIST_KEYS as readonly string[]).includes(key)) {
          accepted[key] = value;
          continue;
        }
      }
      const id = value as string;

      switch (key) {
        case "active_project_id": {
          const r = await row("projects", "id,user_id", id);
          if (r && ownable(r.user_id as string | null)) accepted[key] = id;
          else refused.push(key);
          break;
        }
        case "active_lead_id": {
          const r = await row("leads", "id,owner_profile_id,property_id", id);
          if (r && ownable(r.owner_profile_id as string | null)) accepted[key] = id;
          else refused.push(key);
          break;
        }
        case "active_property_id": {
          const r = await row("properties", "id,user_id", id);
          if (r && ownable(r.user_id as string | null)) accepted[key] = id;
          else refused.push(key);
          break;
        }
        case "selected_match_id": {
          const r = await row("matches", "id,lead_id,contractor_id", id);
          const lead = resolve("active_lead_id");
          if (r && lead && r.lead_id === lead) accepted[key] = id;
          else refused.push(key);
          break;
        }
        case "appointment_id": {
          const r = await row("appointments", "id,lead_id,contractor_id,homeowner_user_id", id);
          const lead = resolve("active_lead_id");
          const okLead = !lead || r?.lead_id === lead;
          const okOwner = ownable((r?.homeowner_user_id as string | null) ?? null);
          if (r && okLead && okOwner) accepted[key] = id;
          else refused.push(key);
          break;
        }
        case "contractor_id": {
          const r = await row("contractors", "id,user_id", id);
          if (r && ownable(r.user_id as string | null)) accepted[key] = id;
          else refused.push(key);
          break;
        }
        case "selected_contractor_id": {
          const r = await row("contractors", "id", id);
          if (r) accepted[key] = id;
          else refused.push(key);
          break;
        }
        case "pricing_quote_id": {
          const r = await row("contractor_pricing_quotes", "id,contractor_id,user_id", id);
          const contractor = resolve("contractor_id");
          const okContractor = !contractor || r?.contractor_id === contractor;
          if (r && okContractor && ownable((r.user_id as string | null) ?? null)) accepted[key] = id;
          else refused.push(key);
          break;
        }
        case "quote_analysis_ids": {
          const ids: string[] = [];
          for (const one of value as string[]) {
            const r = await row("quote_analyses", "id,user_id", one);
            if (r && ownable(r.user_id as string | null)) ids.push(one);
          }
          if (ids.length !== (value as string[]).length) refused.push(key);
          if (ids.length) accepted[key] = ids;
          break;
        }
        case "verification_run_ids": {
          const ids: string[] = [];
          const visitor = resolve("visitor_id");
          for (const one of value as string[]) {
            const r = await row("contractor_verification_runs", "id,user_id,visitor_id", one);
            if (!r) continue;
            const mine = ownable(r.user_id as string | null);
            const sameVisitor = !r.user_id && !!visitor && r.visitor_id === visitor;
            if (mine || sameVisitor) ids.push(one);
          }
          if (ids.length !== (value as string[]).length) refused.push(key);
          if (ids.length) accepted[key] = ids;
          break;
        }
        case "visual_analysis_ids": {
          const ids: string[] = [];
          for (const one of value as string[]) {
            const r = await row("visual_analyses", "id,user_id,session_id", one);
            if (!r) continue;
            const mine = ownable(r.user_id as string | null);
            const sameSession =
              !r.user_id &&
              (r.session_id === session.session_token || r.session_id === session.id);
            if (mine || sameSession) ids.push(one);
          }
          if (ids.length !== (value as string[]).length) refused.push(key);
          if (ids.length) accepted[key] = ids;
          break;
        }
        default:
          accepted[key] = value;
      }
    }

    return { accepted, refused };
  }

  function serialize(session: SessionRow) {
    return {
      session_id: session.id,
      session_token: session.session_token,
      auth_state: session.auth_state,
      current_step: session.current_step,
      language: session.language,
      role: session.resolved_role,
      last_intent: session.last_intent,
      project_type: session.project_type,
      project_city: session.project_city,
      recommended_contractor_id: session.recommended_contractor_id,
      context: session.context_json ?? {},
    };
  }

  try {
    // ── start : reprise stricte, sinon création ──
    if (action === "start") {
      let session: SessionRow | null = sessionToken ? await loadByToken(sessionToken) : null;

      if (session && !ownedByCaller(session)) session = null;

      // Reprise multiappareil : même compte, autre navigateur.
      if (!session && userId) session = await loadLatestForUser(userId);

      if (session) {
        // Rattachement immédiat si la session anonyme est reprise connectée.
        if (userId && !session.user_id) {
          const { data: promoted } = await admin
            .from("alex_sessions")
            .update({ user_id: userId, auth_state: "authenticated", updated_at: new Date().toISOString() })
            .eq("id", session.id)
            .select(SESSION_COLUMNS)
            .maybeSingle();
          if (promoted) session = promoted as SessionRow;
        }
        return json({
          ...serialize(session),
          resumed: true,
          messages: await loadMessages(session.id),
        });
      }

      const newToken = sessionToken ?? crypto.randomUUID();
      const { data: created, error } = await admin
        .from("alex_sessions")
        .insert({
          session_token: newToken,
          user_id: userId,
          session_type: str(body.entrypoint, 40) ?? "chat",
          language: str(body.language, 10) ?? "fr",
          auth_state: userId ? "authenticated" : "guest",
          current_step: "listening",
          context_json: {},
        })
        .select(SESSION_COLUMNS)
        .single();

      if (error || !created) return json({ error: "session_start_failed" }, 500);
      return json({ ...serialize(created as SessionRow), resumed: false, messages: [] });
    }

    if (!sessionToken) return json({ error: "session_token_required" }, 400);
    const session = await loadByToken(sessionToken);
    if (!session) return json({ error: "session_not_found" }, 404);
    if (!ownedByCaller(session)) return json({ error: "not_your_session" }, 403);

    // ── append : message réel dans la conversation canonique ──
    if (action === "append") {
      const text = str(body.text, MAX_TEXT);
      const sender = body.role === "assistant" ? "assistant" : "user";
      if (!text) return json({ error: "empty_message" }, 400);

      const clientId = str(body.client_message_id, 80);
      if (clientId) {
        const { data: existing } = await admin
          .from("alex_messages")
          .select("id")
          .eq("session_id", session.id)
          .contains("metadata", { client_message_id: clientId })
          .maybeSingle();
        if (existing) return json({ ok: true, message_id: existing.id, deduplicated: true });
      }

      const { data: inserted, error } = await admin
        .from("alex_messages")
        .insert({
          session_id: session.id,
          sender,
          message: text,
          message_type: str(body.message_type, 30) ?? "text",
          metadata: clientId ? { client_message_id: clientId } : {},
        })
        .select("id")
        .single();

      if (error || !inserted) return json({ error: "append_failed" }, 500);

      await admin
        .from("alex_sessions")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", session.id);

      return json({ ok: true, message_id: inserted.id, deduplicated: false });
    }

    // ── brief : état compact pour rouvrir un autre canal (voix) sans repartir à zéro ──
    // Aucune nouvelle session, aucune copie métier : uniquement l'état courant,
    // les derniers tours utiles et la question réellement en attente.
    if (action === "brief") {
      const all = await loadMessages(session.id);
      const recent = all.slice(-6);
      const lastAssistant = [...all].reverse().find((m) => m.role === "assistant") ?? null;
      const lastIndex = lastAssistant ? all.lastIndexOf(lastAssistant) : -1;
      const answeredAfter = lastIndex >= 0 && all.slice(lastIndex + 1).some((m) => m.role === "user");
      const pendingQuestion =
        lastAssistant && !answeredAfter && /\?\s*$/.test(lastAssistant.text.trim())
          ? lastAssistant.text.trim()
          : null;

      const context = (session.context_json ?? {}) as Record<string, unknown>;
      const refs: Record<string, unknown> = {};
      for (const key of CONTEXT_KEYS) {
        if (context[key]) refs[key] = context[key];
      }

      return json({
        session_id: session.id,
        has_conversation: all.length > 0,
        current_step: session.current_step,
        last_intent: session.last_intent,
        project_type: session.project_type,
        project_city: session.project_city,
        language: session.language,
        role: session.resolved_role,
        pending_question: pendingQuestion,
        recent,
        refs,
      });
    }


    // ── context : fusion de références uniquement ──
    if (action === "context") {
      const currentContext = (session.context_json ?? {}) as Record<string, unknown>;
      const { patch, rejected } = sanitizeContextPatch(body.patch);
      if (Object.keys(patch).length === 0) {
        return json({ ok: true, context: currentContext, changed: false, rejected });
      }

      // Une clé autorisée ne suffit pas : l'appartenance est vérifiée en base.
      const { accepted, refused } = await validateReferences(patch, currentContext, session);
      const allRejected = [...new Set([...rejected, ...refused])];
      if (Object.keys(accepted).length === 0) {
        return json({ ok: true, context: currentContext, changed: false, rejected: allRejected });
      }

      const clientTs = typeof body.client_ts === "number" ? body.client_ts : Date.now();
      const { context: merged, stale } = mergeContext(currentContext, accepted, clientTs);

      const { data: updated, error } = await admin
        .from("alex_sessions")
        .update({ context_json: merged, updated_at: new Date().toISOString() })
        .eq("id", session.id)
        .select(SESSION_COLUMNS)
        .maybeSingle();
      if (error || !updated) return json({ error: "context_update_failed" }, 500);
      return json({
        ok: true,
        context: (updated as SessionRow).context_json ?? {},
        changed: true,
        rejected: allRejected,
        stale,
      });
    }

    // ── promote : rattachement au compte + réclamation idempotente ──
    if (action === "promote") {
      if (!userId) return json({ error: "auth_required" }, 401);

      let current = session;
      if (!current.user_id) {
        const { data: promoted } = await admin
          .from("alex_sessions")
          .update({ user_id: userId, auth_state: "authenticated", updated_at: new Date().toISOString() })
          .eq("id", current.id)
          .is("user_id", null)
          .select(SESSION_COLUMNS)
          .maybeSingle();
        if (promoted) current = promoted as SessionRow;
        await admin
          .from("alex_booking_drafts")
          .update({ user_id: userId })
          .eq("session_id", current.session_token)
          .is("user_id", null);
      }

      const context = (current.context_json ?? {}) as Record<string, unknown>;
      const claimed: Record<string, string[]> = {
        quote_analyses: [],
        verification_runs: [],
        visual_analyses: [],
        refused: [],
      };

      const listOf = (key: string): string[] =>
        Array.isArray(context[key])
          ? Array.from(
              new Set((context[key] as string[]).filter((id) => UUID_RE.test(id))),
            ).slice(0, MAX_LIST)
          : [];

      const visitorId = typeof context.visitor_id === "string" ? context.visitor_id : null;

      /**
       * Réclamation : un identifiant présent dans le contexte ne suffit jamais.
       * L'artefact doit déjà appartenir au compte, ou être anonyme ET rattaché
       * à cette même conversation (jeton de session / visiteur).
       */
      async function claim(
        table: string,
        bucket: string,
        ids: string[],
        anonymousProof: (row: Record<string, unknown>) => boolean,
        columns: string,
      ) {
        for (const id of ids) {
          const { data: found } = await admin
            .from(table)
            .select(columns)
            .eq("id", id)
            .maybeSingle();
          const r = found as Record<string, unknown> | null;
          if (!r) continue;
          const owner = r.user_id as string | null;
          if (owner && owner !== userId) {
            // Appartenance ambiguë : refus explicite, jamais d'écrasement.
            claimed.refused.push(id);
            continue;
          }
          if (!owner) {
            if (!anonymousProof(r)) {
              claimed.refused.push(id);
              continue;
            }
            await admin.from(table).update({ user_id: userId }).eq("id", id).is("user_id", null);
          }
          claimed[bucket].push(id);
        }
      }

      await claim("quote_analyses", "quote_analyses", listOf("quote_analysis_ids"), () => true, "id,user_id");

      await claim(
        "contractor_verification_runs",
        "verification_runs",
        listOf("verification_run_ids"),
        (r) => !!visitorId && r.visitor_id === visitorId,
        "id,user_id,visitor_id",
      );

      await claim(
        "visual_analyses",
        "visual_analyses",
        listOf("visual_analysis_ids"),
        (r) => r.session_id === current.session_token || r.session_id === current.id,
        "id,user_id,session_id",
      );

      return json({
        ...serialize(current),
        promoted: true,
        claimed,
        messages: await loadMessages(current.id),
      });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (e) {
    console.error("clara-session", String(e));
    return json({ error: "internal_error" }, 500);
  }
});
