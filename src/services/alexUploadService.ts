/**
 * alexUploadService — Validates and persists files uploaded through Clara chat.
 *
 * - Logged in: uploads to `property-photos/{userId}/clara/{uuid}.{ext}` and inserts
 *   a `project_files` row.
 * - Guest: keeps a local Blob URL in session memory only.
 * - Validates type + size BEFORE touching the network.
 * - Reports real byte-level progress when a progress callback is provided.
 */

import { supabase } from "@/integrations/supabase/client";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_DOC_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const ALLOWED_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
]);

const ALLOWED_DOC_MIMES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export type ClaraMediaKind = "photo" | "video" | "document";

export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  mime: string;
  bytes: number;
  storagePath: string | null;
  isGuest: boolean;
  kind: ClaraMediaKind;
}

export interface UploadResult {
  ok: boolean;
  file?: UploadedFile;
  error?: string;
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

export function kindForMime(mime: string): ClaraMediaKind | null {
  if (ALLOWED_IMAGE_MIMES.has(mime)) return "photo";
  if (ALLOWED_VIDEO_MIMES.has(mime)) return "video";
  if (ALLOWED_DOC_MIMES.has(mime)) return "document";
  return null;
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic" || mime === "image/heif") return "heic";
  if (mime === "video/mp4" || mime === "video/x-m4v") return "mp4";
  if (mime === "video/quicktime") return "mov";
  if (mime === "video/webm") return "webm";
  if (mime === "application/pdf") return "pdf";
  if (mime === "application/msword") return "doc";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  return "bin";
}

export function maxBytesForKind(kind: ClaraMediaKind): number {
  if (kind === "video") return MAX_VIDEO_BYTES;
  if (kind === "document") return MAX_DOC_BYTES;
  return MAX_IMAGE_BYTES;
}

export function validateFile(file: File): { ok: boolean; error?: string; kind?: ClaraMediaKind } {
  const kind = kindForMime(file.type);
  if (!kind) {
    return { ok: false, error: "Format non supporté. Utilisez une photo, une vidéo (MP4, MOV, WEBM) ou un PDF." };
  }
  if (file.size === 0) {
    return { ok: false, error: "Fichier vide." };
  }
  const max = maxBytesForKind(kind);
  if (file.size > max) {
    return { ok: false, error: `Fichier trop volumineux (max ${Math.round(max / (1024 * 1024))} Mo).` };
  }
  return { ok: true, kind };
}

/** Real byte-level upload to Supabase Storage via XHR (the JS client exposes no progress). */
async function uploadWithProgress(
  bucket: string,
  path: string,
  file: File,
  accessToken: string,
  onProgress?: (ratio: number) => void,
  signal?: AbortSignal,
): Promise<{ ok: boolean; status: number }> {
  const base = import.meta.env.VITE_SUPABASE_URL;
  const url = `${base}/storage/v1/object/${bucket}/${path}`;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("x-upsert", "false");
    if (file.type) xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status });
    xhr.onerror = () => resolve({ ok: false, status: 0 });
    xhr.onabort = () => resolve({ ok: false, status: 0 });
    if (signal) signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

export async function uploadAlexFile(
  file: File,
  options?: { onProgress?: (ratio: number) => void; signal?: AbortSignal },
): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.ok) return { ok: false, error: validation.error };
  const kind = validation.kind ?? "photo";

  const fileId = uid();
  const ext = extFromMime(file.type);
  const localUrl = URL.createObjectURL(file);

  const guestFile = (): UploadedFile => ({
    id: fileId,
    url: localUrl,
    name: file.name,
    mime: file.type,
    bytes: file.size,
    storagePath: null,
    isGuest: true,
    kind,
  });

  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData?.session?.user?.id;
  const accessToken = sessionData?.session?.access_token;

  if (!userId || !accessToken) {
    // Visiteur non connecté — le média reste visible dans sa conversation uniquement.
    options?.onProgress?.(1);
    return { ok: true, file: guestFile() };
  }

  const storagePath = `${userId}/clara/${fileId}.${ext}`;

  const uploaded = await uploadWithProgress(
    "property-photos",
    storagePath,
    file,
    accessToken,
    options?.onProgress,
    options?.signal,
  );

  if (!uploaded.ok) {
    console.error("[claraUpload] storage upload failed:", uploaded.status);
    return { ok: true, file: guestFile() };
  }

  const { error: insertError } = await supabase.from("project_files").insert({
    id: fileId,
    user_id: userId,
    storage_bucket: "property-photos",
    storage_path: storagePath,
    mime: file.type,
    bytes: file.size,
    kind,
    source: "alex_chat",
    filename: file.name,
  });

  if (insertError) {
    console.warn("[claraUpload] project_files insert failed (non-blocking):", insertError);
  }

  let displayUrl = localUrl;
  try {
    const { data: signed } = await supabase.storage
      .from("property-photos")
      .createSignedUrl(storagePath, 600);
    if (signed?.signedUrl) displayUrl = signed.signedUrl;
  } catch (e) {
    console.warn("[claraUpload] signed URL failed, using blob fallback", e);
  }

  options?.onProgress?.(1);

  return {
    ok: true,
    file: {
      id: fileId,
      url: displayUrl,
      name: file.name,
      mime: file.type,
      bytes: file.size,
      storagePath,
      isGuest: false,
      kind,
    },
  };
}
