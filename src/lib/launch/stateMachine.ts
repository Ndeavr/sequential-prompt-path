/**
 * UNPRO — Launch Mode state machine (client mirror of supabase/_shared/launch.ts).
 */
export const LAUNCH_STATES = [
  "DISCOVERED", "ENRICHING", "ENRICHED",
  "SCORING", "SCORED",
  "MESSAGING", "MESSAGED", "DELIVERED",
  "REPLIED",
  "CHECKOUT_SENT", "PAID", "ACTIVATED",
  "BLOCKED", "FAILED", "STOPPED",
] as const;
export type LaunchState = typeof LAUNCH_STATES[number];

export const STATE_LABELS: Record<LaunchState, string> = {
  DISCOVERED: "Découvert",
  ENRICHING: "Enrichissement",
  ENRICHED: "Enrichi",
  SCORING: "Analyse IA",
  SCORED: "Scoré",
  MESSAGING: "Message en cours",
  MESSAGED: "Message envoyé",
  DELIVERED: "Livré",
  REPLIED: "Répondu",
  CHECKOUT_SENT: "Checkout envoyé",
  PAID: "💰 Payé",
  ACTIVATED: "✅ Activé",
  BLOCKED: "Bloqué",
  FAILED: "Échec",
  STOPPED: "Arrêté",
};
