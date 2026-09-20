/**
 * UNPRO — ONE CLARA : pont entre le canal vocal et la conversation canonique.
 *
 * La voix n'est PAS une seconde Clara : elle lit l'état de la conversation
 * canonique (`clara-session` → `alex_sessions` + `alex_messages`) avant de
 * parler, puis écrit chaque tour parlé dans cette même conversation.
 *
 * Règles :
 *  - aucune session, mémoire ou historique vocal séparé;
 *  - chaque parole devient un message normal, visible dans le chat;
 *  - écriture idempotente : aucun doublon après reconnexion ou rafraîchissement.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  appendClaraMessage,
  ensureClaraSession,
  peekClaraSessionToken,
} from "@/services/clara/claraSession";

export interface ClaraVoiceBrief {
  session_id: string;
  has_conversation: boolean;
  current_step: string | null;
  last_intent: string | null;
  project_type: string | null;
  project_city: string | null;
  language: string | null;
  role: string | null;
  pending_question: string | null;
  recent: Array<{ role: "user" | "assistant"; text: string }>;
  refs: Record<string, unknown>;
}

export const CLARA_VOICE_MESSAGE_EVENT = "clara-voice-message";
export const CLARA_VOICE_CLOSED_EVENT = "clara-voice-closed";
export const CLARA_CONTRACTOR_VOICE_REQUEST_EVENT = "clara-contractor-voice-request";
export const CLARA_CONTRACTOR_VOICE_FINISHED_EVENT = "clara-contractor-voice-finished";
export const CLARA_CONTRACTOR_TRANSITION_TEXT =
  "Je vois, vous aimeriez obtenir plus de contrats. Commençons par analyser votre entreprise…";

/**
 * Le micro est un MODE, jamais une session : la conversation canonique doit
 * exister AVANT que la voix parle, sinon la voix repartirait de zéro.
 */
export async function ensureClaraVoiceSession(): Promise<void> {
  await ensureClaraSession();
}

/** État compact de la conversation active. `null` si rien n'est disponible. */
export async function loadClaraVoiceBrief(): Promise<ClaraVoiceBrief | null> {
  await ensureClaraVoiceSession();
  const session_token = peekClaraSessionToken();
  if (!session_token) return null;
  try {
    const { data, error } = await supabase.functions.invoke("clara-session", {
      body: { action: "brief", session_token },
    });
    if (error || !data || (data as { error?: string }).error) return null;
    return data as ClaraVoiceBrief;
  } catch {
    return null;
  }
}

/**
 * Consigne de reprise envoyée à l'agent vocal : résumé + derniers tours +
 * question en attente. Jamais l'historique brut complet.
 */
export function buildVoiceResumeContext(brief: ClaraVoiceBrief | null): string | null {
  if (!brief || !brief.has_conversation) return null;

  const facts: string[] = [];
  if (brief.project_type) facts.push(`Projet : ${brief.project_type}`);
  if (brief.project_city) facts.push(`Ville : ${brief.project_city}`);
  if (brief.last_intent) facts.push(`Intention : ${brief.last_intent}`);
  if (brief.current_step) facts.push(`Étape : ${brief.current_step}`);

  const turns = brief.recent
    .map((m) => `${m.role === "user" ? "Client" : "Clara"} : ${m.text}`)
    .join("\n");

  const lines = [
    "CONTINUITÉ — même conversation, canal vocal.",
    "Tu poursuis une conversation déjà commencée. Ne te présente pas.",
    "Ne recommence pas la conversation. Ne redemande jamais une information déjà connue.",
    "Interprète la prochaine phrase du client comme une réponse ou une continuation.",
  ];
  if (facts.length > 0) lines.push(`État connu — ${facts.join(" · ")}`);
  if (turns) lines.push(`Derniers échanges :\n${turns}`);
  if (brief.pending_question) {
    lines.push(
      `Question déjà posée et affichée à l'écran : « ${brief.pending_question} » — attends la réponse du client sans la reposer à voix haute, et traite sa première phrase comme la réponse à cette question.`,
    );
  }
  return lines.join("\n");
}

/**
 * Premier message vocal :
 *  - question déjà affichée → très courte relance d'écoute, jamais une salutation
 *    ni la question répétée (une chaîne vide laisserait le message d'accueil par
 *    défaut du fournisseur s'imposer);
 *  - conversation en cours sans question → courte relance de continuité;
 *  - aucune conversation → `null` : la salutation habituelle s'applique.
 */
export function buildVoiceFirstMessage(brief: ClaraVoiceBrief | null): string | null {
  if (!brief || !brief.has_conversation) return null;
  if (brief.pending_question) return "Je vous écoute.";
  return "Je vous écoute, on continue.";
}

/* ─── Écriture des tours parlés dans la conversation canonique ─── */

const RUN_KEY = "unpro_clara_voice_run";
let sequence = 0;
let lastUserText = "";
let lastAssistantText = "";
let writeQueue: Promise<unknown> = Promise.resolve();


function runId(): string {
  try {
    const existing = window.sessionStorage.getItem(RUN_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 12)
        : `${Date.now().toString(36)}`;
    window.sessionStorage.setItem(RUN_KEY, fresh);
    return fresh;
  } catch {
    return "voice";
  }
}

/** Nouvelle ouverture de la voix : nouveau lot d'identifiants déterministes. */
export function beginClaraVoiceRun(): void {
  try {
    window.sessionStorage.setItem(
      RUN_KEY,
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().slice(0, 12)
        : `${Date.now().toString(36)}`,
    );
  } catch {
    /* stockage indisponible : la déduplication serveur reste en place */
  }
  sequence = 0;
  lastUserText = "";
  lastAssistantText = "";
}

/**
 * Transforme une parole en message normal de la conversation canonique et
 * l'expose immédiatement dans le chat.
 */
export function recordClaraVoiceTurn(role: "user" | "assistant", raw: string): void {
  const text = (raw ?? "").trim();
  if (!text) return;

  // Une même réponse renvoyée deux fois par le canal vocal n'est pas dupliquée.
  if (role === "user" && text === lastUserText) return;
  if (role === "assistant" && text === lastAssistantText) return;
  if (role === "user") lastUserText = text;
  else lastAssistantText = text;

  const clientMessageId = `voice:${runId()}:${++sequence}`;

  // Les tours parlés sont écrits en série : l'ordre chronologique réel du
  // dialogue est conservé côté serveur, même si la voix va plus vite.
  writeQueue = writeQueue
    .then(() =>
      appendClaraMessage({
        role,
        text,
        messageType: "voice",
        clientMessageId,
      }),
    )
    .catch(() => {
      /* la continuité serveur reprend au prochain chargement */
    });


  try {
    window.dispatchEvent(
      new CustomEvent(CLARA_VOICE_MESSAGE_EVENT, { detail: { id: clientMessageId, role, text } }),
    );
  } catch {
    /* environnement sans DOM */
  }
}

/** Signale la fermeture de la voix : le chat recharge l'état serveur. */
export function notifyClaraVoiceClosed(): void {
  try {
    window.dispatchEvent(new CustomEvent(CLARA_VOICE_CLOSED_EVENT));
  } catch {
    /* environnement sans DOM */
  }
}
