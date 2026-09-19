/**
 * UNPRO — ONE CLARA : client de la continuité conversationnelle canonique.
 *
 * AUTORITÉ CANONIQUE : la session Clara serveur (`alex_sessions` + `alex_messages`),
 * orchestrée par la fonction `clara-session`.
 *
 * Règles :
 *  - un seul identifiant de conversation par navigateur, persistant;
 *  - la conversation ne conserve que des RÉFÉRENCES métier, jamais des copies;
 *  - la reprise multiappareil vient du serveur, jamais du stockage local;
 *  - aucune donnée privée n'est placée dans l'URL.
 */
import { supabase } from "@/integrations/supabase/client";

const TOKEN_KEY = "unpro_clara_session_token";

export interface ClaraMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  type?: string;
  created_at?: string;
}

export interface ClaraSessionState {
  session_id: string;
  session_token: string;
  auth_state: string;
  current_step: string;
  language: string;
  role: string | null;
  last_intent: string | null;
  project_type: string | null;
  project_city: string | null;
  recommended_contractor_id: string | null;
  context: Record<string, unknown>;
  messages: ClaraMessage[];
  resumed: boolean;
}

/**
 * Références métier admissibles. Aucune donnée métier n'est dupliquée ici.
 * Le serveur revalide l'appartenance de chaque identifiant avant de l'enregistrer :
 * un identifiant valide mais étranger à la conversation est refusé.
 */
export interface ClaraContextPatch {
  active_property_id?: string | null;
  active_project_id?: string | null;
  active_lead_id?: string | null;
  selected_match_id?: string | null;
  appointment_id?: string | null;
  selected_contractor_id?: string | null;
  contractor_id?: string | null;
  pricing_quote_id?: string | null;
  checkout_session_id?: string | null;
  visitor_id?: string | null;
  current_intent?: string | null;
  detected_role?: string | null;
  current_route?: string | null;
  quote_analysis_ids?: string[];
  verification_run_ids?: string[];
  visual_analysis_ids?: string[];
  /** Avancement du parcours (aucune donnée métier copiée). */
  workflow?: Record<string, unknown> | null;
}

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* stockage indisponible : la reprise serveur prend le relais */
  }
}

/** Jeton de conversation stable pour ce navigateur (créé une seule fois). */
export function getClaraSessionToken(): string {
  if (typeof window === "undefined") return "";
  const existing = safeGet(TOKEN_KEY);
  if (existing) return existing;
  const fresh =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `clara_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  safeSet(TOKEN_KEY, fresh);
  return fresh;
}

export function peekClaraSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return safeGet(TOKEN_KEY);
}

function rememberToken(token: string | undefined | null) {
  if (token) safeSet(TOKEN_KEY, token);
}

async function call<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("clara-session", {
    body: { action, ...payload },
  });
  if (error) throw new Error(error.message || "clara_session_unavailable");
  const result = data as T & { error?: string };
  if (result && typeof result === "object" && "error" in result && result.error) {
    throw new Error(String(result.error));
  }
  return result;
}

/** La session canonique n'est démarrée qu'une fois par onglet, même si plusieurs
 *  surfaces (chat, voix) la demandent en même temps. */
let sessionReady: Promise<ClaraSessionState> | null = null;

/**
 * Crée ou reprend LA conversation : même onglet, après rafraîchissement,
 * après réouverture, et sur un second appareil avec le même compte.
 */
export async function startOrResumeClaraSession(options: {
  language?: string;
  entrypoint?: string;
} = {}): Promise<ClaraSessionState> {
  const promise = call<ClaraSessionState>("start", {
    session_token: peekClaraSessionToken() ?? getClaraSessionToken(),
    language: options.language ?? "fr",
    entrypoint: options.entrypoint ?? "clara_box",
  }).then((state) => {
    rememberToken(state.session_token);
    return state;
  });
  sessionReady = promise.catch(() => {
    sessionReady = null;
    throw new Error("clara_session_unavailable");
  });
  return promise;
}

/**
 * Nouvelle conversation demandée par l'utilisateur.
 * Un jeton neuf est généré et le serveur crée une VRAIE session canonique
 * (aucune reprise de l'ancienne, ni par jeton, ni par compte). Le compte,
 * le profil, la maison et les préférences ne sont jamais touchés.
 */
export async function startNewClaraSession(options: {
  language?: string;
  entrypoint?: string;
} = {}): Promise<ClaraSessionState> {
  const freshToken =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `clara_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  safeSet(TOKEN_KEY, freshToken);
  const promise = call<ClaraSessionState>("start", {
    session_token: freshToken,
    force_new: true,
    language: options.language ?? "fr",
    entrypoint: options.entrypoint ?? "clara_reset",
  }).then((state) => {
    rememberToken(state.session_token);
    return state;
  });
  sessionReady = promise.catch(() => {
    sessionReady = null;
    throw new Error("clara_session_unavailable");
  });
  return promise;
}



/** Garantit qu'une session existe côté serveur avant toute écriture. */
export async function ensureClaraSession(): Promise<void> {
  if (!sessionReady) {
    sessionReady = startOrResumeClaraSession();
  }
  await sessionReady.catch(() => undefined);
}

/** Journalise un message réel dans la conversation canonique (idempotent). */
export async function appendClaraMessage(input: {
  role: "user" | "assistant";
  text: string;
  messageType?: string;
  clientMessageId?: string;
}): Promise<void> {
  if (!input.text.trim()) return;
  // Un message réel n'est jamais perdu parce que la session n'était pas encore prête.
  await ensureClaraSession();
  const token = peekClaraSessionToken();
  if (!token) return;
  await call("append", {
    session_token: token,
    role: input.role,
    text: input.text,
    message_type: input.messageType,
    client_message_id: input.clientMessageId,
  });
}


/**
 * Enregistre des références métier dans la conversation.
 * `client_ts` permet au serveur d'ignorer une écriture plus ancienne provenant
 * d'un second appareil : aucun contexte récent n'est écrasé silencieusement.
 */
export async function saveClaraContext(patch: ClaraContextPatch): Promise<void> {
  const token = peekClaraSessionToken();
  if (!token) return;
  await call("context", { session_token: token, patch, client_ts: Date.now() });
}

/** Version tolérante : la continuité ne doit jamais bloquer un parcours métier. */
export function rememberClaraReferences(patch: ClaraContextPatch): void {
  void saveClaraContext(patch).catch(() => {});
}

/**
 * Rattache la conversation anonyme au compte après OTP/OAuth, puis réclame
 * les artefacts anonymes référencés. Idempotent; refuse ce qui appartient
 * déjà à un autre compte.
 */
export async function promoteClaraSession(): Promise<ClaraSessionState | null> {
  const token = peekClaraSessionToken();
  if (!token) return null;
  const state = await call<ClaraSessionState>("promote", { session_token: token });
  rememberToken(state.session_token);
  return state;
}

/** Ajoute une référence d'artefact sans écraser les précédentes. */
export async function rememberClaraArtifact(
  kind: "quote_analysis_ids" | "verification_run_ids" | "visual_analysis_ids",
  id: string,
): Promise<void> {
  if (!id) return;
  await saveClaraContext({ [kind]: [id] } as ClaraContextPatch);
}
