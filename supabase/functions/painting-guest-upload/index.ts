// Private anonymous photo upload for the residential painting calculator.
// STAGED ONLY: deploy this + the rate-limit SQL before the Storage RLS cutover.
// No file listing/read permissions are granted to anonymous browsers.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const BUCKET = "painting-photos";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SIGNED_URL_LIFETIME = 7 * 24 * 60 * 60;

const defaultOrigins = [
  "https://unpro.ca",
  "https://www.unpro.ca",
  "https://id-preview--ba1eabf3-fd1c-40fe-9856-3812a70f9869.lovable.app",
];

function corsFor(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsFor(origin),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function magicMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)) {
    return "image/png";
  }
  if (bytes.length >= 12 &&
      bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 &&
      bytes[8] === 87 && bytes[9] === 69 && bytes[10] === 66 && bytes[11] === 80) {
    return "image/webp";
  }
  return null;
}

async function keyedFingerprint(ip: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const hmac = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(ip)));
  return Array.from(hmac, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? "";
  const extraOrigins = (Deno.env.get("PAINTING_UPLOAD_ALLOWED_ORIGINS") ?? "")
    .split(",").map((value) => value.trim()).filter(Boolean);
  const allowedOrigins = new Set([...defaultOrigins, ...extraOrigins]);

  if (!allowedOrigins.has(origin)) {
    return new Response("Forbidden origin", { status: 403 });
  }
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsFor(origin) });
  }
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
    return json({ error: "multipart_required" }, 415, origin);
  }
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_IMAGE_BYTES + 1024 * 1024) {
    return json({ error: "file_too_large" }, 413, origin);
  }

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const rateSecret = Deno.env.get("PAINTING_UPLOAD_RATE_SECRET");
  if (!url || !serviceKey || !rateSecret || rateSecret.length < 32) {
    return json({ error: "upload_temporarily_unavailable" }, 503, origin);
  }

  try {
    const form = await request.formData();
    const value = form.get("file");
    if (!(value instanceof File)) return json({ error: "file_required" }, 400, origin);
    if (value.size === 0 || value.size > MAX_IMAGE_BYTES) {
      return json({ error: "invalid_size" }, 413, origin);
    }

    const bytes = new Uint8Array(await value.arrayBuffer());
    const mime = magicMime(bytes);
    if (!mime || (value.type && value.type !== mime)) {
      return json({ error: "unsupported_image" }, 415, origin);
    }

    // Best-effort per-IP throttle; production gateway must prevent spoofed forwarded headers.
    // A non-browser client can forge Origin, so CORS alone is never a security boundary.
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const ip = request.headers.get("cf-connecting-ip")?.trim() ||
      request.headers.get("x-real-ip")?.trim() || forwarded;
    if (!ip || ip.length > 128) return json({ error: "upload_temporarily_unavailable" }, 503, origin);
    const fingerprint = await keyedFingerprint(ip, rateSecret);
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: admitted, error: quotaError } = await admin.rpc(
      "try_painting_guest_upload",
      { p_fingerprint: fingerprint },
    );
    if (quotaError) return json({ error: "upload_temporarily_unavailable" }, 503, origin);
    if (admitted !== true) return json({ error: "too_many_uploads" }, 429, origin);

    const ext = mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp";
    const storagePath = `guest/${crypto.randomUUID()}.${ext}`;
    const storage = admin.storage.from(BUCKET);
    const { error: uploadError } = await storage.upload(storagePath, bytes, {
      contentType: mime,
      upsert: false,
      cacheControl: "3600",
    });
    if (uploadError) return json({ error: "upload_failed" }, 502, origin);

    const { data: signed, error: signedError } = await storage.createSignedUrl(
      storagePath, SIGNED_URL_LIFETIME,
    );
    if (signedError || !signed?.signedUrl) {
      await storage.remove([storagePath]);
      return json({ error: "signing_failed" }, 502, origin);
    }
    return json({ publicUrl: signed.signedUrl, storagePath }, 200, origin);
  } catch {
    return json({ error: "invalid_upload" }, 400, origin);
  }
});
