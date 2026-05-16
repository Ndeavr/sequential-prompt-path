/**
 * permissionManager — Contextual, progressive permission orchestration.
 *
 * RULES
 * - Never request permissions on page load.
 * - Only request when the user has expressed intent (orb tap, upload button,
 *   matching phase, post-booking, etc.).
 * - When denied, respect a cooldown window before re-prompting.
 * - Always degrade gracefully — never block the conversation.
 *
 * Persistence
 * - Local-first: `unpro.perm.{kind}.deniedAt` in localStorage (or sessionStorage
 *   for ephemeral kinds like location). When a `user_sessions` row exists, the
 *   caller can opt-in to sync (handled outside this module).
 */

export type PermissionKind = "mic" | "camera" | "location" | "notifications";
export type PermissionStatus = "granted" | "denied" | "prompt" | "cooldown" | "unsupported";

const COOLDOWN_MS: Record<PermissionKind, number> = {
  mic: 24 * 60 * 60 * 1000, // 24h
  camera: 7 * 24 * 60 * 60 * 1000, // 7d
  notifications: 14 * 24 * 60 * 60 * 1000, // 14d
  location: 0, // session-scoped (sessionStorage, see below)
};

const storageFor = (kind: PermissionKind): Storage | null => {
  if (typeof window === "undefined") return null;
  return kind === "location" ? window.sessionStorage : window.localStorage;
};

const key = (kind: PermissionKind) => `unpro.perm.${kind}.deniedAt`;

function readDeniedAt(kind: PermissionKind): number | null {
  const store = storageFor(kind);
  if (!store) return null;
  const raw = store.getItem(key(kind));
  if (!raw) return null;
  const ts = Number(raw);
  return Number.isFinite(ts) ? ts : null;
}

export function recordDeny(kind: PermissionKind): void {
  const store = storageFor(kind);
  if (!store) return;
  store.setItem(key(kind), String(Date.now()));
}

export function clearDeny(kind: PermissionKind): void {
  storageFor(kind)?.removeItem(key(kind));
}

export function isInCooldown(kind: PermissionKind): boolean {
  const deniedAt = readDeniedAt(kind);
  if (!deniedAt) return false;
  // location: session-scoped — any deny within the session counts.
  if (kind === "location") return true;
  return Date.now() - deniedAt < COOLDOWN_MS[kind];
}

/**
 * Best-effort current status — does NOT trigger a prompt.
 */
export async function getStatus(kind: PermissionKind): Promise<PermissionStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (isInCooldown(kind)) return "cooldown";

  try {
    const perm = (navigator as any).permissions;
    if (!perm?.query) return "prompt";

    const nameMap: Record<PermissionKind, string> = {
      mic: "microphone",
      camera: "camera",
      location: "geolocation",
      notifications: "notifications",
    };
    const result = await perm.query({ name: nameMap[kind] as PermissionName });
    return (result.state as PermissionStatus) ?? "prompt";
  } catch {
    return "prompt";
  }
}

/**
 * Trigger the real browser prompt. The CALLER is responsible for surfacing the
 * humanized reason copy in the UI BEFORE invoking this function so the request
 * never feels random.
 */
export async function request(kind: PermissionKind): Promise<PermissionStatus> {
  if (typeof window === "undefined") return "unsupported";
  if (isInCooldown(kind)) return "cooldown";

  try {
    switch (kind) {
      case "mic": {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        clearDeny("mic");
        return "granted";
      }
      case "camera": {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        clearDeny("camera");
        return "granted";
      }
      case "location": {
        await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 8000,
            maximumAge: 5 * 60 * 1000,
          });
        });
        clearDeny("location");
        return "granted";
      }
      case "notifications": {
        if (!("Notification" in window)) return "unsupported";
        const result = await Notification.requestPermission();
        if (result === "granted") {
          clearDeny("notifications");
          return "granted";
        }
        recordDeny("notifications");
        return "denied";
      }
    }
  } catch (err) {
    const name = (err as any)?.name;
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      recordDeny(kind);
      return "denied";
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      // Device missing entirely — treat as denied for this session but no cooldown.
      return "denied";
    }
    return "denied";
  }
}

/**
 * Convenience copy for UI surfaces. Always French-first, premium tone.
 */
export const PERMISSION_COPY: Record<PermissionKind, string> = {
  mic: "Activez le micro pour parler avec Alex.",
  camera: "Vous pouvez prendre une photo si vous voulez que je regarde.",
  location: "Pour trouver les bons professionnels près de chez vous, puis-je utiliser votre position ?",
  notifications: "Voulez-vous recevoir les mises à jour de votre demande ?",
};
