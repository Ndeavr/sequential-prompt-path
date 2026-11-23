// Pure helpers for inbound SMS classification (no Deno APIs). Inbound text is stored verbatim.

export type InboundIntent = "stop" | "help" | "start_request" | "auto_reply" | "question" | "positive" | "general";

const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[’`]/g, "'");

const STOP_KEYWORD = /^\s*(stop|stopall|arret|arrete|arretez|unsubscribe|cancel|end|quit|desabonner|desabonnement|desinscrire|retirer|remove)\s*[!.]*\s*$/;
const REFUSAL = /\b(stop|arret(e|ez)?|unsubscribe|desabonn\w*|desinscri\w*|pas interess\w*|non merci|no thanks?|not interested|retirez[- ]moi|retire[- ]moi|enlevez[- ]moi|enleve[- ]moi|ne (plus )?(m'|me )?(ecri\w*|texte\w*|contacte\w*|appel\w*)|ne plus (recevoir|me contacter|m'ecrire)|ne pas (me |m')(contacter|texter|ecrire|appeler)|remove me|take me off|do not (contact|text|message)|don't (contact|text|message)|leave me alone|laissez[- ]moi tranquille|harcel\w*|spam|pas besoin|no need|tann\w*|arretez d'envoyer|ce numero est (reserve|dedie) aux clients)\b/;
const NO_ONLY = /^\s*(non|no|nope)\s*[!.]*\s*$/;
const AUTO = /(reponse automatique|message automatique|auto[- ]?reply|automatic reply|out of office|absent du bureau|je suis (presentement )?absent|de retour le|ne pas repondre|do not reply|this number (does not|cannot) (receive|accept)|ce numero ne (peut|recoit)|nous avons bien recu votre message|thank you for your message|thanks for your message|merci de nous avoir (envoye|ecrit)|a lu votre message|message d'absence|after hours|heures d'ouverture|bureaux sont (presentement |actuellement )?fermes|bien recu votre (message|demande)|votre message a ete recu|si vous communiquez avec nous pour une urgence|nous serons bientot avec vous|merci pour votre message[, ].{0,40}(rappel|reviendr|contact))/;
const HELP = /^\s*(help|aide|info)\s*[!?.]*\s*$/;
const START = /^\s*(start|unstop|yes start|commencer)\s*[!.]*\s*$/;
const POSITIVE = /^\s*(oui|yes|ok|okay|d'accord|daccord|parfait|interesse\w*|ca m'interesse|je suis interesse\w*)\s*[!.]*\s*$/;

export function classifyInbound(body: string, optOutType = ""): InboundIntent {
  const t = (optOutType || "").toUpperCase();
  if (t === "STOP") return "stop";
  if (t === "HELP") return "help";
  if (t === "START") return "start_request";
  const b = fold(body ?? "").trim();
  if (!b) return "general";
  if (STOP_KEYWORD.test(b) || REFUSAL.test(b) || NO_ONLY.test(b)) return "stop";
  if (AUTO.test(b)) return "auto_reply";
  if (HELP.test(b)) return "help";
  if (START.test(b)) return "start_request";
  if (POSITIVE.test(b)) return "positive";
  if (b.includes("?") || /\b(combien|comment|pourquoi|quand|qui|quoi|c'est quoi|how|what|why|when|who|price|prix)\b/.test(b)) return "question";
  return "general";
}

export function normalizeE164(raw: string): string {
  const d = String(raw ?? "").replace(/\D/g, "");
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `+${d}`;
  return d ? `+${d}` : "";
}

export function maskPhone(e164: string): string {
  return e164 ? `${e164.slice(0, 2)}…${e164.slice(-4)}` : "";
}
