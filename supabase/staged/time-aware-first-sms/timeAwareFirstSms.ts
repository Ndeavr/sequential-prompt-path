// STAGED (non déployé) — premier SMS de prospection dont la question d'appel dépend de
// l'heure locale RÉELLE d'envoi (America/Toronto). Module pur, sans import : copié tel quel
// dans supabase/functions/_shared/ au moment d'une release approuvée.
//
// Le brouillon garde le jeton QUESTION_TOKEN; sendSms() le résout à l'instant de l'appel
// fournisseur. Hors créneau de question (avant 8 h / dès 19 h) → aucun envoi, report.
// La fenêtre canonique sendWindow.ts (plus stricte : SMS lun-ven 9-17 h, sam 10-13 h,
// dim bloqué) reste appliquée en plus, inchangée.

export const TIME_AWARE_TEMPLATE_KEY = "time_aware_first_touch_v1";
export const QUESTION_TOKEN = "[QUESTION_HORAIRE]";
export const SEND_TIME_ZONE = "America/Toronto";

/** Coordonnées LCAP/CASL (identité + adresse postale approuvée + moyen de contact). */
export const TIME_AWARE_SMS_CONFIG = {
  casl_contact_line: "UNPRO, 281, rue Saint-Paul, Montréal H2Y 1H1, unpro.ca/contact",
} as const;

export type QuestionSlot = "morning" | "afternoon" | "evening";

const QUESTIONS: Record<QuestionSlot, string> = {
  morning: "Vous auriez 5 minutes aujourd'hui pour en discuter?",
  afternoon: "Vous auriez 5 minutes cet après-midi pour en discuter?",
  evening: "Vous auriez 5 minutes demain pour en discuter?",
};

/** Minutes depuis minuit, heure locale du destinataire. */
export function localMinutes(at: Date, timeZone: string = SEND_TIME_ZONE): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(at);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? NaN);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? NaN);
  return h * 60 + m;
}

/** 8:00 ≤ t < 11:00 matin · 11:00 ≤ t < 16:00 après-midi · 16:00 ≤ t < 19:00 demain · sinon null. */
export function questionSlotAt(at: Date, timeZone: string = SEND_TIME_ZONE): QuestionSlot | null {
  const t = localMinutes(at, timeZone);
  if (!Number.isFinite(t)) return null;
  if (t >= 480 && t < 660) return "morning";
  if (t >= 660 && t < 960) return "afternoon";
  if (t >= 960 && t < 1140) return "evening";
  return null;
}

export function questionAt(at: Date, timeZone: string = SEND_TIME_ZONE): string | null {
  const slot = questionSlotAt(at, timeZone);
  return slot ? QUESTIONS[slot] : null;
}

/** Prochain 8:00 local strictement après `at` si hors créneau (borne basse du report). */
export function nextQuestionSlotStart(at: Date, timeZone: string = SEND_TIME_ZONE): Date {
  if (questionSlotAt(at, timeZone)) return at;
  // Avance minute par minute jusqu'à 8:00 local (≤ 13 h), robuste aux changements d'heure.
  let probe = new Date(Math.floor(at.getTime() / 60000) * 60000 + 60000);
  for (let i = 0; i < 26 * 60; i++) {
    if (localMinutes(probe, timeZone) === 480) return probe;
    probe = new Date(probe.getTime() + 60000);
  }
  return new Date(at.getTime() + 86400000);
}

const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’-]{1,29}$/;
function senderName(v: unknown): string | null {
  const s = typeof v === "string" ? v.normalize("NFC").trim() : "";
  if (!NAME_RE.test(s) || (s === s.toUpperCase() && s.length > 3)) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Brouillon (jeton non résolu). `greeting` = résultat de buildSmsGreeting() existant
 * (smsGreeting.ts) : prénom fiable → « Bonjour Marc, », entreprise → « Bonjour à l'équipe de X, »,
 * sinon salutation naturelle « Bonjour à vous, » (jamais de crochets ni de nom inventé).
 */
export function renderTimeAwareFirstSmsDraft(input: {
  greeting: { text: string; kind: "first_name" | "company" | "generic" };
  sender_first_name?: unknown;
}): string {
  const hello = input.greeting.kind === "generic" ? "Bonjour à vous," : input.greeting.text;
  const sender = senderName(input.sender_first_name);
  const who = sender ? `ici ${sender} d'UNPRO (unpro.ca).` : "ici UNPRO (unpro.ca).";
  return [
    `${hello} ${who}`,
    "Nous avons créé une nouvelle façon d'aider les entrepreneurs à rencontrer des clients grâce à l'intelligence artificielle, sans multiplier les soumissions inutiles.",
    QUESTION_TOKEN,
    "Répondez OUI si ça vous intéresse, ou STOP pour ne plus être contacté.",
    TIME_AWARE_SMS_CONFIG.casl_contact_line,
  ].join(" ");
}

export type ResolvedTimeAware =
  | { ok: true; body: string; slot: QuestionSlot | null; resolved_at: string }
  | { ok: false; reason: "outside_question_hours"; not_before: string };

/** Résolution à l'instant d'envoi. Corps sans jeton → inchangé. Jamais d'envoi avec jeton restant. */
export function resolveTimeAwareQuestion(body: string, sendAt: Date, timeZone: string = SEND_TIME_ZONE): ResolvedTimeAware {
  if (!body.includes(QUESTION_TOKEN)) return { ok: true, body, slot: null, resolved_at: sendAt.toISOString() };
  const slot = questionSlotAt(sendAt, timeZone);
  if (!slot) return { ok: false, reason: "outside_question_hours", not_before: nextQuestionSlotStart(sendAt, timeZone).toISOString() };
  return { ok: true, body: body.split(QUESTION_TOKEN).join(QUESTIONS[slot]), slot, resolved_at: sendAt.toISOString() };
}
