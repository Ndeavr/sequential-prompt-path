/**
 * « Montrez vos réalisations » — palier gratuit (V1).
 *
 * Vérité serveur : `submit_portfolio_project` (plafond 10/entreprise, verrou,
 * compte vérifié, propriété), `moderate_portfolio_project` (admin seulement),
 * `public_portfolio_feed` (10 dernières réalisations APPROUVÉES). Ce module ne
 * fait que préparer, téléverser et lire; il ne décide jamais d'une publication.
 * Le palier gratuit ne compte jamais comme activation payée.
 */
import { supabase } from "@/integrations/supabase/client";

export const PORTFOLIO_BUCKET = "portfolio-submissions";
export const FREE_PORTFOLIO_LIMIT = 10;
export const MAX_PHOTOS = 4;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const FREE_PORTFOLIO_PATH = "/entrepreneurs/realisations";

export interface PortfolioDraft {
  clientRequestId: string;
  title: string;
  serviceName: string;
  city: string;
  description: string;
  businessName: string;
  contactEmail: string;
  contactPhone: string;
  photoRights: boolean;
  showCompanyName: boolean;
  beforeIndex: number | null;
  afterIndex: number | null;
  /** « AAAA-MM » déclaré par l'entrepreneur, facultatif ("" = non renseigné). Jamais lu dans l'EXIF. */
  completedMonth: string;
}

export function emptyDraft(): PortfolioDraft {
  return {
    clientRequestId: crypto.randomUUID(), title: "", serviceName: "", city: "", description: "",
    businessName: "", contactEmail: "", contactPhone: "", photoRights: false, showCompanyName: true,
    beforeIndex: null, afterIndex: null, completedMonth: "",
  };
}

/** "" accepté (facultatif); sinon AAAA-MM réel, entre 1950 et le mois courant (heure de Montréal). */
export function completionMonthValid(v: string, now = new Date()): boolean {
  if (!v) return true;
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(v);
  if (!m) return false;
  const current = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: "America/Toronto" }).format(now).slice(0, 7);
  return Number(m[1]) >= 1950 && v <= current;
}

/** « Réalisé en novembre 2026 » — seulement si le mois a été déclaré. */
export function completionLabel(month: string | null | undefined, lang: "fr" | "en"): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(month ?? "");
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 15));
  const txt = new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
  return lang === "fr" ? `Réalisé en ${txt}` : `Completed in ${txt}`;
}

export type DraftField = "title" | "serviceName" | "city" | "description" | "photos" | "photoRights" | "business" | "contact" | "completedMonth";

/** Miroir client des contrôles serveur (le serveur reste l'autorité). */
export function validateDraft(d: PortfolioDraft, photoCount: number, needsBusiness: boolean): DraftField[] {
  const errors: DraftField[] = [];
  const t = d.title.trim(); const s = d.serviceName.trim(); const c = d.city.trim();
  if (photoCount < 1 || photoCount > MAX_PHOTOS) errors.push("photos");
  if (t.length < 3 || t.length > 120) errors.push("title");
  if (s.length < 2 || s.length > 80) errors.push("serviceName");
  if (c.length < 2 || c.length > 80 || /\d/.test(c)) errors.push("city");
  if (d.description.trim().length > 600) errors.push("description");
  if (!completionMonthValid(d.completedMonth ?? "")) errors.push("completedMonth");
  if (!d.photoRights) errors.push("photoRights");
  if (needsBusiness) {
    const n = d.businessName.trim();
    if (n.length < 2 || n.length > 120) errors.push("business");
    const email = d.contactEmail.trim(); const phone = d.contactPhone.replace(/[^0-9+]/g, "");
    if ((!email && phone.length < 10) || (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) errors.push("contact");
  }
  return errors;
}

const SERVER_ERRORS: Record<string, { fr: string; en: string }> = {
  auth_required: { fr: "Connectez-vous pour enregistrer votre réalisation.", en: "Sign in to save your project." },
  account_not_verified: { fr: "Confirmez d’abord votre courriel ou votre téléphone.", en: "Please confirm your email or phone first." },
  free_limit_reached: { fr: "Vous avez atteint vos 10 projets gratuits.", en: "You have reached your 10 free projects." },
  rate_limited: { fr: "Trop d’envois en peu de temps. Réessayez dans une heure.", en: "Too many submissions. Try again in an hour." },
  photo_rights_required: { fr: "Confirmez que vous avez le droit de publier ces photos.", en: "Confirm you have the right to publish these photos." },
  photo_count_1_to_4: { fr: "Ajoutez de 1 à 4 photos.", en: "Add 1 to 4 photos." },
  photo_missing_or_invalid: { fr: "Une photo n’a pas été reçue. Réessayez l’envoi.", en: "A photo was not received. Retry the upload." },
  photo_not_owned: { fr: "Une photo n’a pas été reçue. Réessayez l’envoi.", en: "A photo was not received. Retry the upload." },
  city_must_be_general: { fr: "Indiquez seulement la ville, sans adresse.", en: "Enter the city only, no address." },
  business_name_required: { fr: "Indiquez le nom de votre entreprise.", en: "Enter your business name." },
  business_contact_required: { fr: "Indiquez le courriel ou le téléphone de l’entreprise.", en: "Enter the business email or phone." },
  invalid_email: { fr: "Courriel de l’entreprise invalide.", en: "Invalid business email." },
  invalid_title: { fr: "Le titre doit contenir de 3 à 120 caractères.", en: "Title must be 3–120 characters." },
  invalid_service: { fr: "Indiquez le type de travaux.", en: "Enter the type of work." },
  invalid_description: { fr: "Le commentaire est limité à 600 caractères.", en: "Comment is limited to 600 characters." },
};

export function portfolioErrorMessage(raw: unknown, lang: "fr" | "en"): string {
  const text = raw instanceof Error ? raw.message : typeof raw === "object" && raw && "message" in raw ? String((raw as { message: unknown }).message) : String(raw ?? "");
  const code = Object.keys(SERVER_ERRORS).find((k) => text.includes(k));
  if (code) return SERVER_ERRORS[code][lang];
  return lang === "fr" ? "L’envoi n’a pas abouti. Vos informations sont conservées; réessayez." : "Submission failed. Your details are kept; please retry.";
}

export function quotaLabel(used: number, lang: "fr" | "en"): string {
  const n = Math.max(0, Math.min(used, FREE_PORTFOLIO_LIMIT));
  return lang === "fr" ? `${n}/${FREE_PORTFOLIO_LIMIT} projets gratuits` : `${n}/${FREE_PORTFOLIO_LIMIT} free projects`;
}

/** Ré-encode l'image en JPEG : retire EXIF et géolocalisation, réduit la taille. */
export async function sanitizeImage(file: File, maxSide = 1600): Promise<Blob> {
  if (!ACCEPTED_TYPES.includes(file.type as (typeof ACCEPTED_TYPES)[number])) throw new Error("unsupported_type");
  if (file.size > 25 * 1024 * 1024) throw new Error("too_large");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob || blob.size > MAX_UPLOAD_BYTES) throw new Error("too_large");
  return blob;
}

// ---- Brouillon local (reprise après connexion) -----------------------------
const DRAFT_KEY = "unpro_portfolio_draft_v1";
export interface StoredDraft { draft: PortfolioDraft; photos: string[] }

export function saveDraftLocally(draft: PortfolioDraft, photoDataUrls: string[]): boolean {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, photos: photoDataUrls }));
    return true;
  } catch {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, photos: [] })); } catch { /* noop */ }
    return false;
  }
}
export function readDraftLocally(): StoredDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed?.draft?.clientRequestId) return null;
    return { draft: { ...emptyDraft(), ...parsed.draft }, photos: Array.isArray(parsed.photos) ? parsed.photos.slice(0, MAX_PHOTOS) : [] };
  } catch { return null; }
}
export function clearDraftLocally() { try { localStorage.removeItem(DRAFT_KEY); } catch { /* noop */ } }

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
export async function dataUrlToBlob(url: string): Promise<Blob> {
  return (await fetch(url)).blob();
}

// ---- Serveur ------------------------------------------------------------------
export function photoPath(userId: string, clientRequestId: string, index: number): string {
  return `${userId}/${clientRequestId}/${index + 1}.jpg`;
}

/** Téléverse les photos manquantes; un fichier déjà reçu n'est jamais renvoyé. */
export async function uploadPhotos(userId: string, clientRequestId: string, blobs: Blob[]): Promise<string[]> {
  const paths: string[] = [];
  for (let i = 0; i < blobs.length; i++) {
    const path = photoPath(userId, clientRequestId, i);
    const { error } = await supabase.storage.from(PORTFOLIO_BUCKET).upload(path, blobs[i], { contentType: "image/jpeg", upsert: false });
    if (error && !/exists|duplicate/i.test(error.message)) throw error;
    paths.push(path);
  }
  return paths;
}

export interface SubmitResult { result: "created" | "already_submitted"; id: string; status: string; used?: number }

export async function submitPortfolio(d: PortfolioDraft, paths: string[]): Promise<SubmitResult> {
  const { data, error } = await supabase.rpc("submit_portfolio_project", {
    p_client_request_id: d.clientRequestId,
    p_business_name: d.businessName.trim(),
    p_contact_email: d.contactEmail.trim(),
    p_contact_phone: d.contactPhone.trim(),
    p_title: d.title.trim(),
    p_service_name: d.serviceName.trim(),
    p_city: d.city.trim(),
    p_description: d.description.trim(),
    p_photo_paths: paths,
    p_before_path: d.beforeIndex !== null ? paths[d.beforeIndex] ?? null : null,
    p_after_path: d.afterIndex !== null ? paths[d.afterIndex] ?? null : null,
    p_photo_rights: d.photoRights,
    p_show_company_name: d.showCompanyName,
  } as never);
  if (error) throw error;
  return data as unknown as SubmitResult;
}

/** Mois de réalisation déclaré (auteur seulement, projet en attente). "" efface. */
export async function setProjectCompletion(id: string, month: string): Promise<void> {
  const { error } = await supabase.rpc("set_portfolio_project_completion" as never, { p_id: id, p_month: month ? `${month}-01` : null } as never);
  if (error) throw error;
}

export interface FreeQuota { authenticated: boolean; contractor_id?: string | null; used: number; approved: number; limit: number }
export async function fetchMyQuota(): Promise<FreeQuota> {
  const { data, error } = await supabase.rpc("my_portfolio_free_quota" as never);
  if (error) throw error;
  const q = (data ?? {}) as Partial<FreeQuota>;
  return { authenticated: !!q.authenticated, contractor_id: q.contractor_id ?? null, used: q.used ?? 0, approved: q.approved ?? 0, limit: q.limit ?? FREE_PORTFOLIO_LIMIT };
}

export interface FeedProject {
  id: string; title: string; service_name: string | null; city: string | null; description: string | null;
  photo_paths: string[]; before_path: string | null; after_path: string | null;
  company_name: string | null; author_verified: boolean; published_at: string;
  photoUrls: string[];
  beforeUrl?: string | null;
  afterUrl?: string | null;
  /** Mois déclaré « AAAA-MM-01 » ou null; clé d'auteur opaque (diversité seulement). */
  completed_month?: string | null;
  author_key?: string | null;
  /** Réalisation approuvée de l'entrepreneur connecté (épinglée, jamais filtrée). */
  is_own?: boolean;
}

export const PORTFOLIO_STATUS_LABEL: Record<string, { fr: string; en: string }> = {
  pending: { fr: "En attente d’approbation", en: "Awaiting approval" },
  approved: { fr: "Approuvée et affichée", en: "Approved and shown" },
  rejected: { fr: "Non retenue", en: "Not accepted" },
  withdrawn: { fr: "Retirée", en: "Withdrawn" },
};

export interface MyPortfolioItem {
  id: string; title: string; status: string; review_reason: string | null; thumbUrl: string | null;
}
export interface MyPortfolio { items: MyPortfolioItem[]; approved: FeedProject[] }

/**
 * Réalisations de l'entrepreneur CONNECTÉ seulement : filtrées sur SA fiche
 * (RLS propriétaire + filtre explicite — même un admin ne voit ici que la
 * sienne). Les approuvées sont rendues au format du fil pour être épinglées.
 */
export async function fetchMyPortfolio(): Promise<MyPortfolio | null> {
  const q = await fetchMyQuota();
  if (!q.authenticated || !q.contractor_id) return null;
  const [{ data: c }, { data, error }] = await Promise.all([
    supabase.from("contractors").select("business_name,public_status").eq("id", q.contractor_id).maybeSingle(),
    supabase.from("contractor_portfolio_projects")
      .select("id,title,status,review_reason,service_name,city,description,gallery_urls,before_image_url,after_image_url,show_company_name,published_at,completed_month")
      .eq("contractor_id", q.contractor_id).order("created_at", { ascending: false }).limit(20),
  ]);
  if (error) throw error;
  type Row = { id: string; title: string; status: string; review_reason: string | null; service_name: string | null; city: string | null;
    description: string | null; gallery_urls: unknown; before_image_url: string | null; after_image_url: string | null;
    show_company_name: boolean | null; published_at: string | null; completed_month: string | null };
  const rows = (data ?? []) as unknown as Row[];
  const pathsOf = (r: Row) => (Array.isArray(r.gallery_urls) ? r.gallery_urls.filter((x): x is string => typeof x === "string") : []);
  const all = [...new Set(rows.flatMap((r) => [...pathsOf(r), r.before_image_url, r.after_image_url].filter((x): x is string => !!x)))];
  const url = new Map<string, string>();
  if (all.length) {
    const { data: signed } = await supabase.storage.from(PORTFOLIO_BUCKET).createSignedUrls(all, 3600);
    for (const s of signed ?? []) if (s.path && s.signedUrl) url.set(s.path, s.signedUrl);
  }
  const biz = (c as { business_name?: string | null; public_status?: string | null } | null) ?? null;
  return {
    items: rows.map((r) => ({ id: r.id, title: r.title, status: r.status, review_reason: r.review_reason, thumbUrl: url.get(pathsOf(r)[0] ?? "") ?? null })),
    approved: rows.filter((r) => r.status === "approved" && r.published_at).map((r) => ({
      id: r.id, title: r.title, service_name: r.service_name, city: r.city, description: r.description,
      photo_paths: pathsOf(r), before_path: r.before_image_url, after_path: r.after_image_url,
      company_name: r.show_company_name ? biz?.business_name ?? null : null,
      author_verified: biz?.public_status === "verified_active", published_at: r.published_at!,
      photoUrls: pathsOf(r).map((p) => url.get(p)).filter((u): u is string => !!u),
      beforeUrl: r.before_image_url ? url.get(r.before_image_url) ?? null : null,
      afterUrl: r.after_image_url ? url.get(r.after_image_url) ?? null : null,
      completed_month: r.completed_month, is_own: true,
    })),
  };
}

export interface FeedCursor { publishedAt: string; id: string }

/** Curseur du lot suivant (tri published_at DESC, id DESC) — lots distincts, jamais répétés. */
export function nextFeedCursor(batch: Pick<FeedProject, "id" | "published_at">[]): FeedCursor | null {
  if (batch.length < FEED_BATCH_SIZE) return null;
  const last = batch[batch.length - 1];
  return { publishedAt: last.published_at, id: last.id };
}
export const FEED_BATCH_SIZE = 10;

/**
 * Lot initial = exactement les 10 dernières réalisations approuvées; avec un
 * curseur, le lot DISTINCT suivant. URLs signées de courte durée.
 */
export async function fetchInspirationFeed(cursor?: FeedCursor | null): Promise<FeedProject[]> {
  const { data, error } = cursor
    ? await supabase.rpc("public_portfolio_feed_before" as never, { p_before_published_at: cursor.publishedAt, p_before_id: cursor.id } as never)
    : await supabase.rpc("public_portfolio_feed" as never);
  if (error) throw error;
  const rows = ((data ?? []) as Omit<FeedProject, "photoUrls">[]).slice(0, FEED_BATCH_SIZE);
  const allPaths = [...new Set(rows.flatMap((r) => [...(r.photo_paths ?? []), r.before_path, r.after_path].filter((x): x is string => !!x)))];
  const urlByPath = new Map<string, string>();
  if (allPaths.length) {
    const { data: signed, error: signError } = await supabase.storage.from(PORTFOLIO_BUCKET).createSignedUrls(allPaths, 3600);
    if (signError) throw signError;
    for (const s of signed ?? []) if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
  }
  // Métadonnées facultatives (mois déclaré, clé d'auteur) : en cas d'échec, le fil reste servi sans elles.
  const meta = new Map<string, { completed_month: string | null; author_key: string | null }>();
  if (rows.length) {
    const { data: m } = await supabase.rpc("public_portfolio_feed_meta" as never, { p_ids: rows.map((r) => r.id) } as never);
    for (const x of ((m ?? []) as { id: string; completed_month: string | null; author_key: string | null }[])) meta.set(x.id, x);
  }
  return rows.map((r) => ({
    ...r,
    completed_month: meta.get(r.id)?.completed_month ?? null,
    author_key: meta.get(r.id)?.author_key ?? null,
    photoUrls: (r.photo_paths ?? []).map((p) => urlByPath.get(p)).filter((u): u is string => !!u),
    beforeUrl: r.before_path ? urlByPath.get(r.before_path) ?? null : null,
    afterUrl: r.after_path ? urlByPath.get(r.after_path) ?? null : null,
  }));
}
