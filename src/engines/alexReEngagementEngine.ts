/**
 * AlexReEngagementControlEngine
 * 
 * Client-side engine that tracks user inactivity and triggers
 * smart re-engagement messages with a hard limit of 3.
 * 
 * Thresholds: T+30s → #1, T+90s → #2, T+180s → #3, T+240s → STOP
 * RULE: NEVER more than 3 re-engagements. NEVER "Êtes-vous là?"
 */

export type ConversationActivityState = "active" | "passive";

export interface ReEngagementMessage {
  index: number;
  text: string;
  delayMs: number;
}

const RE_ENGAGEMENT_MESSAGES: ReEngagementMessage[] = [
  {
    index: 1,
    text: "Je peux analyser votre situation ou vous proposer un créneau dès maintenant.",
    delayMs: 30_000,
  },
  {
    index: 2,
    text: "Je suis prêt quand vous voulez. Vous pouvez aussi envoyer une photo.",
    delayMs: 90_000,
  },
  {
    index: 3,
    text: "Je reste disponible. Vous pouvez revenir ici à tout moment.",
    delayMs: 180_000,
  },
];

const PASSIVE_THRESHOLD_MS = 240_000;
const MAX_REENGAGEMENTS = 3;

export type ReEngagementCallback = (message: ReEngagementMessage) => void;
export type PassiveCallback = () => void;

export class AlexReEngagementControlEngine {
  private timers: ReturnType<typeof setTimeout>[] = [];
  private count = 0;
  private state: ConversationActivityState = "active";
  private onReEngage: ReEngagementCallback;
  private onPassive: PassiveCallback;

  constructor(onReEngage: ReEngagementCallback, onPassive: PassiveCallback) {
    this.onReEngage = onReEngage;
    this.onPassive = onPassive;
  }

  /** Call on every user action (message, tap, voice input) */
  trackActivity(): void {
    this.clearTimers();
    this.count = 0;
    this.state = "active";
    this.scheduleReEngagements();
  }

  /** Start monitoring (call once when conversation begins) */
  start(): void {
    this.count = 0;
    this.state = "active";
    this.scheduleReEngagements();
  }

  /** Full stop — no more timers */
  stop(): void {
    this.clearTimers();
    this.state = "passive";
  }

  getState(): ConversationActivityState {
    return this.state;
  }

  getCount(): number {
    return this.count;
  }

  private scheduleReEngagements(): void {
    this.clearTimers();

    for (const msg of RE_ENGAGEMENT_MESSAGES) {
      const timer = setTimeout(() => {
        if (this.state === "passive" || this.count >= MAX_REENGAGEMENTS) return;
        this.count++;
        this.onReEngage(msg);
      }, msg.delayMs);
      this.timers.push(timer);
    }

    // Passive threshold
    const passiveTimer = setTimeout(() => {
      if (this.count >= MAX_REENGAGEMENTS) {
        this.state = "passive";
        this.onPassive();
      }
    }, PASSIVE_THRESHOLD_MS);
    this.timers.push(passiveTimer);
  }

  private clearTimers(): void {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  destroy(): void {
    this.clearTimers();
  }
}
