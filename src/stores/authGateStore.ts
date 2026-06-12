/**
 * authGateStore — opens the inline/sheet auth card and remembers a pending
 * action so it can be replayed once the user is signed in.
 *
 * Reason types:
 *  - first_intent          : Alex suggests login after the first captured intent.
 *  - book / quote / save_project / personalized_reco / save_lead : action gates.
 */
import { create } from "zustand";

export type AuthGateReason =
  | "first_intent"
  | "book"
  | "quote"
  | "save_project"
  | "personalized_reco"
  | "save_lead";

export type AuthGateChannel = "email" | "sms";

export type AuthGateVariant = "inline" | "sheet";

interface State {
  isOpen: boolean;
  reason: AuthGateReason | null;
  variant: AuthGateVariant;
  channel: AuthGateChannel;
  pendingAction: (() => void) | null;
  open: (opts: {
    reason: AuthGateReason;
    variant?: AuthGateVariant;
    pendingAction?: () => void;
  }) => void;
  close: () => void;
  setChannel: (c: AuthGateChannel) => void;
}

const PENDING_KEY = "unpro_auth_pending_path";

export const useAuthGateStore = create<State>((set, get) => ({
  isOpen: false,
  reason: null,
  variant: "inline",
  channel: "email",
  pendingAction: null,
  open: ({ reason, variant = "inline", pendingAction }) => {
    // For magic link returns: remember current path so we can come back.
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(PENDING_KEY, window.location.pathname + window.location.search);
      }
    } catch {}
    set({ isOpen: true, reason, variant, pendingAction: pendingAction ?? null });
  },
  close: () => set({ isOpen: false, reason: null, pendingAction: null }),
  setChannel: (channel) => set({ channel }),
}));

export const AUTH_GATE_DISMISS_KEY = "unpro_auth_gate_dismissed";
export const AUTH_GATE_PENDING_PATH_KEY = PENDING_KEY;
