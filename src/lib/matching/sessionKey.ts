/** The one existing matching-profile key shared by Clara, pricing and the wizard. */
export function getMatchingSessionKey(): string {
  const storageKey = "unpro_matching_session_key";
  try {
    const existing = localStorage.getItem(storageKey);
    if (existing && existing.length >= 8) return existing;
    const key = `mp_${crypto.randomUUID()}`;
    localStorage.setItem(storageKey, key);
    return key;
  } catch { return `mp_${Math.random().toString(36).slice(2)}${Date.now()}`; }
}
