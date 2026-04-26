/**
 * alexUploadService — Validates and persists files uploaded through Alex chat.
 *
 * - Logged in: uploads to `property-photos/{userId}/alex/{uuid}.{ext}` and inserts
 *   a `project_files` row.
 * - Guest: keeps a local Blob URL in session memory only.
 * - Validates type + size BEFORE touching the network.
 */

import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  mime: string;
  bytes: number;
  storagePath: string | null;
  isGuest: boolean;
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

function extFromMime(mime: string): string {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic" || mime === "image/heif") return "heic";
  return "bin";
}

export function validateFile(file: File): { ok: boolean; error?: string } {
  if (!ALLOWED_MIMES.has(file.type)) {
    return { ok: false, error: "Format non supporté. Utilisez JPG, PNG, WEBP ou HEIC." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Fichier trop volumineux (max 10 Mo)." };
  }
  if (file.size === 0) {
    return { ok: false, error: "Fichier vide." };
  }
  return { ok: true };
}

export async function uploadAlexFile(file: File): Promise<UploadResult> {
  const validation = validateFile(file);
  if (!validation.ok) return { ok: false, error: validation.error };

  const fileId = uid();
  const ext = extFromMime(file.type);
  const localUrl = URL.createObjectURL(file);

  // Try authenticated upload to Supabase Storage
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;

  if (!userId) {
    // Guest path — keep blob URL in session only
    return {
      ok: true,
      file: {
        id: fileId,
        url: localUrl,
        name: file.name,
        mime: file.type,
        bytes: file.size,
        storagePath: null,
        isGuest: true,
      },
    };
  }

  const storagePath = `${userId}/alex/${fileId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("property-photos")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[alexUpload] storage upload failed:", uploadError);
    // Soft-fail: still show thumbnail locally so the chat keeps moving
    return {
      ok: true,
      file: {
        id: fileId,
        url: localUrl,
        name: file.name,
        mime: file.type,
        bytes: file.size,
        storagePath: null,
        isGuest: true,
      },
    };
  }

  // Insert metadata row (non-blocking failure mode)
  const { error: insertError } = await supabase.from("project_files").insert({
    id: fileId,
    user_id: userId,
    storage_bucket: "property-photos",
    storage_path: storagePath,
    mime: file.type,
    bytes: file.size,
    kind: "photo",
    source: "alex_chat",
    filename: file.name,
  });

  if (insertError) {
    console.warn("[alexUpload] project_files insert failed (non-blocking):", insertError);
  }

  // Build a signed URL for display (10 min)
  let displayUrl = localUrl;
  try {
    const { data: signed } = await supabase.storage
      .from("property-photos")
      .createSignedUrl(storagePath, 600);
    if (signed?.signedUrl) displayUrl = signed.signedUrl;
  } catch (e) {
    console.warn("[alexUpload] signed URL failed, using blob fallback", e);
  }

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
    },
  };
}
