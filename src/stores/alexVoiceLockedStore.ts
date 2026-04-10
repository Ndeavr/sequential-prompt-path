/**
 * alexVoiceLockedStore — Zustand store for locked voice session.
 * 
 * RULES:
 * - Source of truth for voice overlay visibility
 * - Cannot auto-close during stabilization window (4s)
 * - Only explicit user action or fatal error can close
 * - Mounted OUTSIDE fragile React subtrees
 */
import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type LockedVoiceState =
  | "idle"
  | "requesting_permission"
  | "opening_session"
  | "stabilizing"        // 4-second window — NO auto-close allowed
  | "session_ready"
  | "listening"
  | "capturing_voice"
  | "processing_stt"
  | "processing_response"
  | "speaking"
  | "awaiting_user"
  | "error_recoverable"
  | "error_fatal"
  | "closing";

// Allowed transitions map
const ALLOWED_TRANSITIONS: Record<LockedVoiceState, LockedVoiceState[]> = {
  idle: ["requesting_permission", "opening_session"],
  requesting_permission: ["opening_session", "error_fatal", "error_recoverable", "closing"],
  opening_session: ["stabilizing", "error_recoverable", "error_fatal", "closing"],
  stabilizing: ["session_ready", "speaking", "listening", "error_recoverable", "error_fatal"],
  session_ready: ["listening", "speaking", "capturing_voice", "error_recoverable", "closing"],
  listening: ["capturing_voice", "processing_stt", "speaking", "error_recoverable", "closing"],
  capturing_voice: ["processing_stt", "listening", "speaking", "error_recoverable", "closing"],
  processing_stt: ["processing_response", "listening", "speaking", "error_recoverable", "closing"],
  processing_response: ["speaking", "listening", "error_recoverable", "closing"],
  speaking: ["awaiting_user", "listening", "capturing_voice", "error_recoverable", "closing"],
  awaiting_user: ["listening", "capturing_voice", "speaking", "error_recoverable", "closing"],
  error_recoverable: ["listening", "opening_session", "stabilizing", "closing", "error_fatal"],
  error_fatal: ["closing", "idle"],
  closing: ["idle"],
};

// States during which auto-close is BLOCKED
const STABILIZATION_STATES: LockedVoiceState[] = [
  "stabilizing",
  "opening_session",
  "requesting_permission",
];

interface VoiceSessionLog {
  sessionId: string;
  openedAt: string;
  openReason: string;
}

interface AlexVoiceLockedState {
  // Core state
  machineState: LockedVoiceState;
  isOverlayOpen: boolean;
  sessionId: string | null;
  sessionLog: VoiceSessionLog | null;
  
  // Feature context
  feature: string;
  
  // Error
  errorMessage: string | null;
  errorType: string | null;
  recoveryAttempts: number;
  
  // Heartbeat
  heartbeatFailures: number;
  lastHeartbeatAt: number | null;
  
  // Stabilization
  stabilizationEnd: number | null;
  
  // Transcripts for fallback
  transcriptsForFallback: Array<{ role: "user" | "alex"; text: string }>;

  // Actions
  openVoiceSession: (feature?: string, openReason?: string) => void;
  closeVoiceSession: (closeReason: string) => void;
  transitionTo: (newState: LockedVoiceState, reason?: string) => boolean;
  setError: (type: string, message: string, recoverable: boolean) => void;
  clearError: () => void;
  incrementHeartbeatFailure: () => void;
  resetHeartbeat: () => void;
  addTranscript: (role: "user" | "alex", text: string) => void;
  
  // Guards
  canAutoClose: () => boolean;
  isInStabilization: () => boolean;
}

export const useAlexVoiceLockedStore = create<AlexVoiceLockedState>((set, get) => ({
  machineState: "idle",
  isOverlayOpen: false,
  sessionId: null,
  sessionLog: null,
  feature: "general",
  errorMessage: null,
  errorType: null,
  recoveryAttempts: 0,
  heartbeatFailures: 0,
  lastHeartbeatAt: null,
  stabilizationEnd: null,
  transcriptsForFallback: [],

  openVoiceSession: (feature = "general", openReason = "user_initiated") => {
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    set({
      isOverlayOpen: true,
      sessionId,
      feature,
      machineState: "requesting_permission",
      errorMessage: null,
      errorType: null,
      recoveryAttempts: 0,
      heartbeatFailures: 0,
      lastHeartbeatAt: Date.now(),
      stabilizationEnd: null,
      transcriptsForFallback: [],
      sessionLog: { sessionId, openedAt: now, openReason },
    });

    // Log to DB (fire and forget)
    supabase.from("voice_session_logs").insert({
      session_id: sessionId,
      status: "active",
      open_reason: openReason,
    }).then(() => {});

    // Log state transition
    logTransition(sessionId, "idle", "requesting_permission", openReason);
  },

  closeVoiceSession: (closeReason: string) => {
    const state = get();
    
    // GUARD: Cannot close during stabilization unless fatal
    if (state.isInStabilization() && closeReason !== "error_fatal" && closeReason !== "user_explicit_close") {
      console.warn("[VoiceLockedStore] Close blocked during stabilization. Reason:", closeReason);
      return;
    }
    
    const prevState = state.machineState;
    
    set({
      isOverlayOpen: false,
      machineState: "idle",
      sessionId: null,
      errorMessage: null,
      errorType: null,
      stabilizationEnd: null,
      heartbeatFailures: 0,
    });

    // Log close
    if (state.sessionId) {
      logTransition(state.sessionId, prevState, "closing", closeReason);
      supabase.from("voice_session_logs").update({
        status: "closed",
        close_reason: closeReason,
        closed_at: new Date().toISOString(),
      }).eq("session_id", state.sessionId).then(() => {});
    }
  },

  transitionTo: (newState: LockedVoiceState, reason?: string) => {
    const state = get();
    const current = state.machineState;
    
    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[current];
    if (!allowed?.includes(newState)) {
      console.warn(`[VoiceLockedStore] Blocked transition ${current} → ${newState}. Reason: ${reason}`);
      return false;
    }

    // If entering stabilization, set the 4-second window
    let stabilizationEnd = state.stabilizationEnd;
    if (newState === "stabilizing") {
      stabilizationEnd = Date.now() + 4000;
    }

    set({
      machineState: newState,
      stabilizationEnd,
    });

    if (state.sessionId) {
      logTransition(state.sessionId, current, newState, reason || "");
    }

    return true;
  },

  setError: (type: string, message: string, recoverable: boolean) => {
    const state = get();
    
    if (recoverable) {
      set({
        machineState: "error_recoverable",
        errorMessage: message,
        errorType: type,
        recoveryAttempts: state.recoveryAttempts + 1,
      });
    } else {
      set({
        machineState: "error_fatal",
        errorMessage: message,
        errorType: type,
      });
    }

    // Log error
    if (state.sessionId) {
      supabase.from("voice_session_errors").insert({
        session_id: state.sessionId,
        error_type: type,
        error_message: message,
        recoverable,
      }).then(() => {});
    }
  },

  clearError: () => set({ errorMessage: null, errorType: null }),

  incrementHeartbeatFailure: () => {
    const state = get();
    const newCount = state.heartbeatFailures + 1;
    set({ heartbeatFailures: newCount });
    
    if (newCount >= 3) {
      state.setError("heartbeat_lost", "Connexion perdue. Tentative de reconnexion…", true);
    }
  },

  resetHeartbeat: () => set({ heartbeatFailures: 0, lastHeartbeatAt: Date.now() }),

  addTranscript: (role, text) => {
    set(s => ({
      transcriptsForFallback: [...s.transcriptsForFallback, { role, text }],
    }));
  },

  canAutoClose: () => {
    const state = get();
    if (!state.isOverlayOpen) return false;
    if (STABILIZATION_STATES.includes(state.machineState)) return false;
    if (state.stabilizationEnd && Date.now() < state.stabilizationEnd) return false;
    return true;
  },

  isInStabilization: () => {
    const state = get();
    if (STABILIZATION_STATES.includes(state.machineState)) return true;
    if (state.stabilizationEnd && Date.now() < state.stabilizationEnd) return true;
    return false;
  },
}));

// Helper: log state transition to DB
function logTransition(sessionId: string, from: string, to: string, reason: string) {
  supabase.from("voice_session_state_transitions").insert({
    session_id: sessionId,
    from_state: from,
    to_state: to,
    transition_reason: reason,
  }).then(() => {});
}
