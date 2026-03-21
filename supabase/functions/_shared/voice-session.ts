/**
 * VoiceSession — State machine for a real-time Alex voice session.
 *
 * States: idle → listening → thinking → speaking → listening (loop)
 * Interrupt at any point → back to listening.
 */

export type VoiceSessionState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceSessionContext {
  sessionId: string;
  userId: string | null;
  /** Display name for UI transcript */
  userName: string | null;
  /** Preferred spoken name for TTS (may differ from userName) */
  preferredSpokenName: string | null;
  state: VoiceSessionState;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  currentPage?: string;
  activeProperty?: string;
  isAuthenticated: boolean;
  userRole?: string;
  hasScore?: boolean;
  createdAt: string;
  lastActivityAt: string;
  interruptCount: number;
  turnCount: number;
}

export function createSession(params: {
  sessionId: string;
  userId?: string | null;
  userName?: string | null;
  preferredSpokenName?: string | null;
  context?: Record<string, unknown>;
}): VoiceSessionContext {
  return {
    sessionId: params.sessionId,
    userId: params.userId ?? null,
    userName: params.userName ?? null,
    preferredSpokenName: params.preferredSpokenName ?? params.userName ?? null,
    state: "idle",
    messages: [],
    currentPage: (params.context?.currentPage as string) ?? undefined,
    activeProperty: (params.context?.activeProperty as string) ?? undefined,
    isAuthenticated: Boolean(params.context?.isAuthenticated),
    userRole: (params.context?.userRole as string) ?? undefined,
    hasScore: Boolean(params.context?.hasScore),
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    interruptCount: 0,
    turnCount: 0,
  };
}

export function transitionState(
  session: VoiceSessionContext,
  to: VoiceSessionState
): VoiceSessionContext {
  session.state = to;
  session.lastActivityAt = new Date().toISOString();
  return session;
}

export function addUserMessage(
  session: VoiceSessionContext,
  content: string
): VoiceSessionContext {
  session.messages.push({ role: "user", content });
  session.turnCount++;
  session.lastActivityAt = new Date().toISOString();
  return session;
}

export function addAssistantMessage(
  session: VoiceSessionContext,
  content: string
): VoiceSessionContext {
  session.messages.push({ role: "assistant", content });
  session.lastActivityAt = new Date().toISOString();
  return session;
}

export function recordInterrupt(
  session: VoiceSessionContext
): VoiceSessionContext {
  session.interruptCount++;
  session.lastActivityAt = new Date().toISOString();
  return session;
}

export function buildContextString(session: VoiceSessionContext): string {
  const parts: string[] = [];
  if (session.currentPage) parts.push(`Page actuelle: ${session.currentPage}`);
  if (session.activeProperty) parts.push(`Propriété active: ${session.activeProperty}`);
  if (session.isAuthenticated) parts.push(`Utilisateur connecté: oui`);
  if (session.userRole) parts.push(`Rôle: ${session.userRole}`);
  if (session.hasScore) parts.push(`Score maison existant: oui`);
  if (session.preferredSpokenName) parts.push(`Prénom pour la voix: ${session.preferredSpokenName}`);
  else if (session.userName) parts.push(`Prénom: ${session.userName}`);
  return parts.length > 0 ? "\n" + parts.join("\n") : "";
}
