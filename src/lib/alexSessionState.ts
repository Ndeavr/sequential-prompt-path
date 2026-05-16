/**
 * alexSessionState — Session-scoped (sessionStorage) memory for the Alex
 * conversation. Ensures Alex greets only ONCE per browser tab session and never
 * re-introduces itself when the overlay is reopened or chat mode is toggled.
 *
 * Strictly event-driven: nothing here triggers a session. Callers read these
 * flags before deciding whether to seed a greeting / first message.
 */

const K_GREETED = "unpro.alex.hasGreeted";
const K_VOICE_STARTED = "unpro.alex.voiceStarted";
const K_USER_INITIATED = "unpro.alex.userInitiated";
const K_LAST_INTERACTION = "unpro.alex.lastInteractionAt";

const store = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
};

const setFlag = (key: string) => { try { store()?.setItem(key, "1"); } catch {} };
const getFlag = (key: string): boolean => {
  try { return store()?.getItem(key) === "1"; } catch { return false; }
};
const clearFlag = (key: string) => { try { store()?.removeItem(key); } catch {} };

export const markGreeted = () => setFlag(K_GREETED);
export const hasGreeted = () => getFlag(K_GREETED);

export const markVoiceStarted = () => setFlag(K_VOICE_STARTED);
export const wasVoiceStarted = () => getFlag(K_VOICE_STARTED);
export const clearVoiceStarted = () => clearFlag(K_VOICE_STARTED);

export const markUserInitiated = () => setFlag(K_USER_INITIATED);
export const wasUserInitiated = () => getFlag(K_USER_INITIATED);

export const touchInteraction = () => {
  try { store()?.setItem(K_LAST_INTERACTION, new Date().toISOString()); } catch {}
};
export const getLastInteractionAt = (): string | null => {
  try { return store()?.getItem(K_LAST_INTERACTION) ?? null; } catch { return null; }
};

/** Full reset — only for explicit user "Réinitialiser" / hard retry. */
export const resetSession = () => {
  clearFlag(K_GREETED);
  clearFlag(K_VOICE_STARTED);
  clearFlag(K_USER_INITIATED);
  clearFlag(K_LAST_INTERACTION);
};
