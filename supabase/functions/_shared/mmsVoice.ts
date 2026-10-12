/**
 * UNPRO — MMS commercial avec message vocal joint (variante de campagne).
 * Logique pure + préparation média. AUCUN envoi ici : le dispatch reste
 * soumis à commercialSendGate (CASL revue humaine, STOP, gate, cap).
 * Ne jamais convertir silencieusement en SMS si le média est refusé.
 */

export const MMS_VOICE_VERSION = "v1";
export const HEYGEN_VOICE_ID = "a0bfd5153d704b3b9ab5c5c0334461af"; // « Sheeps Wearing Masks »
export const VOICE_SETTINGS = { speed: 1.04, pause_s: [0.25, 0.35] } as const;
export const MMS_BUCKET = "media-assets";
export const GENERIC_MEDIA_PATH = `mms/voice/${MMS_VOICE_VERSION}-generic/unpro-msg.mp3`;
export const MAX_MMS_BYTES = 600 * 1024; // limite opérateur Canada prudente
export const ALLOWED_MEDIA_MIME = new Set(["audio/mpeg", "audio/mp3"]);

const BLOCKED_NAMES = new Set([
  "info", "infos", "entreprise", "inconnu", "inconnue", "unknown", "admin", "contact",
  "service", "services", "ventes", "sales", "bureau", "office", "client", "test",
  "inc", "ltee", "ltée", "enr", "monsieur", "madame", "mr", "mme", "na", "n/a", "null",
]);

/** Prénom fiable : renseigné, une personne, jamais inféré d'un email/nom de société. */
export function reliableFirstName(
  firstName: string | null | undefined,
  businessName?: string | null,
): string | null {
  const raw = (firstName ?? "").trim();
  if (!raw || raw.length < 2 || raw.length > 30) return null;
  if (/[@\d_/\\]|\.(com|ca)\b/i.test(raw)) return null;
  if (!/^[\p{L}][\p{L}'’-]*( [\p{L}][\p{L}'’-]*)?$/u.test(raw)) return null;
  if (BLOCKED_NAMES.has(raw.toLowerCase())) return null;
  if (raw === raw.toUpperCase() && raw.length > 3) return null; // sigles type "ABC"
  const biz = (businessName ?? "").trim().toLowerCase();
  if (biz && biz === raw.toLowerCase()) return null;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Script prononcé (UNPRO écrit dans l'interface, « un pro point cé-a » prononcé). */
export function voiceScript(firstName: string | null): string {
  const hello = firstName ? `Salut ${firstName}!` : "Salut!";
  return `${hello} Ici Yanick d'un pro point cé-a. On trouve des clients pour ton entreprise grâce à l'intelligence artificielle! Si tu veux savoir comment, clique sur le lien!`;
}

/** Clé de cache : un clip par prénom normalisé + version + voix (pas par prospect). */
export async function personalizedCacheKey(firstName: string): Promise<string> {
  const norm = firstName.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const data = new TextEncoder().encode(`${MMS_VOICE_VERSION}|${HEYGEN_VOICE_ID}|${norm}|${voiceScript(firstName)}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `mms/voice/${MMS_VOICE_VERSION}-p/${hex.slice(0, 32)}/unpro-msg.mp3`; // non prédictible
}

export type MediaChoice = { kind: "personalized" | "generic"; path: string; firstName: string | null };

/** Personnalisé seulement si prénom fiable ET clip déjà en cache; sinon générique. */
export async function chooseMedia(
  firstName: string | null | undefined,
  businessName: string | null | undefined,
  hasCachedClip: (path: string) => Promise<boolean>,
): Promise<MediaChoice> {
  const name = reliableFirstName(firstName, businessName);
  if (name) {
    const path = await personalizedCacheKey(name);
    if (await hasCachedClip(path)) return { kind: "personalized", path, firstName: name };
  }
  return { kind: "generic", path: GENERIC_MEDIA_PATH, firstName: null };
}

export function mmsBody(link: string): string {
  return `UNPRO : Un court message de Yanick pour vous. Découvrez votre fiche et l'activation à 350 $ : ${link} Répondez STOP pour vous désabonner.`;
}

export type MediaCheck = { ok: true } | { ok: false; reason: string };

/** Contrôle anonyme (HEAD+GET) du vrai MediaUrl avant tout dispatch. */
export async function verifyMediaUrl(url: string, fetchImpl: typeof fetch = fetch): Promise<MediaCheck> {
  if (!url.startsWith("https://")) return { ok: false, reason: "media_not_https" };
  if (/heygen\.ai/i.test(url)) return { ok: false, reason: "media_temporary_host" };
  try {
    const head = await fetchImpl(url, { method: "HEAD" });
    if (!head.ok) return { ok: false, reason: `media_http_${head.status}` };
    const type = (head.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!ALLOWED_MEDIA_MIME.has(type)) return { ok: false, reason: `media_bad_mime:${type || "none"}` };
    const len = Number(head.headers.get("content-length") ?? 0);
    if (!len || len > MAX_MMS_BYTES) return { ok: false, reason: "media_size" };
    const get = await fetchImpl(url, { method: "GET" });
    if (!get.ok) return { ok: false, reason: `media_get_${get.status}` };
    const buf = await get.arrayBuffer();
    if (buf.byteLength !== len) return { ok: false, reason: "media_size_mismatch" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "media_unreachable" };
  }
}

/** Ré-téléverse un objet avec le bon Content-Type (service role uniquement). */
export async function ensureAudioMime(admin: any, path: string): Promise<boolean> {
  const { data, error } = await admin.storage.from(MMS_BUCKET).download(path);
  if (error || !data) return false;
  const { error: upErr } = await admin.storage.from(MMS_BUCKET).upload(path, data, {
    contentType: "audio/mpeg", upsert: true, cacheControl: "31536000",
  });
  return !upErr;
}

export type MmsPreflight = {
  senderMmsEnabled: boolean;
  country: string; // ISO du destinataire
  caslReviewed: boolean;
  optedOut: boolean;
  gateOpen: boolean;
  dailyCapRemaining: number;
  media: MediaCheck;
};

/** Fail-closed : un seul « non » bloque le dispatch. Jamais de repli SMS automatique. */
export function mmsDispatchDecision(p: MmsPreflight): { dispatch: boolean; status: string } {
  if (p.optedOut) return { dispatch: false, status: "opted_out" };
  if (!p.caslReviewed) return { dispatch: false, status: "casl_not_reviewed" };
  if (!p.gateOpen) return { dispatch: false, status: "gate_closed" };
  if (p.dailyCapRemaining <= 0) return { dispatch: false, status: "daily_cap_reached" };
  if (p.country !== "CA") return { dispatch: false, status: "country_not_supported" };
  if (!p.senderMmsEnabled) return { dispatch: false, status: "media_not_supported" };
  if (!p.media.ok) return { dispatch: false, status: "fallback_pending_approval" };
  return { dispatch: true, status: "ready" };
}

/** Code d'erreur Twilio → échec MMS stocké, jamais renvoyé en SMS. */
export function classifyMmsFailure(code: number | null | undefined): string {
  if ([12300, 11751, 30019, 21620, 21623].includes(Number(code))) return "fallback_pending_approval";
  return "mms_failed";
}

/** Coût estimé avant montée en charge (USD, ordre de grandeur, à confirmer). */
export function estimateCost(personalizedCount: number, mmsCount: number) {
  const ttsPerClip = 0.01, mmsEach = 0.0220;
  return {
    tts_usd: +(personalizedCount * ttsPerClip).toFixed(2),
    mms_usd: +(mmsCount * mmsEach).toFixed(2),
  };
}
