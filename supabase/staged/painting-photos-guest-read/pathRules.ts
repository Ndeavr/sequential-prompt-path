// Pure authorization rule for painting-photos analysis (staged, not deployed).
// Guests: guest/<uuid>/<file>. Signed-in: <auth.uid()>/<file>. Admin: any valid path.
const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const FILE = "[A-Za-z0-9_.-]{1,120}";
const GUEST_RE = new RegExp(`^guest/${UUID}/${FILE}$`, "i");
const OWNER_RE = new RegExp(`^(${UUID})/${FILE}$`, "i");

export type Caller = { userId: string | null; isAdmin: boolean };

export function canAnalyzePaintingPath(path: unknown, caller: Caller): boolean {
  if (typeof path !== "string" || path.includes("..")) return false;
  if (GUEST_RE.test(path)) return true; // unguessable per-upload folder
  const m = OWNER_RE.exec(path);
  if (!m) return false;
  if (caller.isAdmin) return true;
  return !!caller.userId && m[1].toLowerCase() === caller.userId.toLowerCase();
}
