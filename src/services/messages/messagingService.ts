/**
 * UNPRO — Homeowner Messaging Service
 * In-app notification system with frequency limits and French templates.
 * Channels: in_app (now), email/sms (future).
 */
import { supabase } from "@/integrations/supabase/client";

export type MessageCategory =
  | "grant_opportunity"
  | "completion_reminder"
  | "score_improved"
  | "recommended_work"
  | "neighborhood_activity"
  | "seasonal_maintenance"
  | "document_suggestion"
  | "contractor_approval";

export type MessagePriority = "low" | "normal" | "high" | "urgent";

export interface HomeownerMessage {
  id: string;
  user_id: string;
  property_id: string | null;
  category: string;
  title_fr: string;
  body_fr: string;
  priority: string;
  is_read: boolean;
  read_at: string | null;
  action_url: string | null;
  action_label_fr: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

interface CreateMessageInput {
  userId: string;
  propertyId?: string;
  category: MessageCategory;
  titleFr: string;
  bodyFr: string;
  priority?: MessagePriority;
  actionUrl?: string;
  actionLabelFr?: string;
  metadata?: Record<string, any>;
  expiresAt?: string;
}

/**
 * Check frequency limits before sending.
 */
async function canSendMessage(userId: string, category: string): Promise<boolean> {
  // Fetch rule
  const { data: rule } = await supabase
    .from("message_frequency_rules")
    .select("*")
    .eq("category", category)
    .eq("is_active", true)
    .maybeSingle();

  if (!rule) return true; // No rule = allow

  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Check daily limit
  if (rule.max_per_day != null && rule.max_per_day > 0) {
    const { count } = await supabase
      .from("homeowner_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category", category)
      .gte("created_at", dayAgo);
    if ((count || 0) >= rule.max_per_day) return false;
  }

  // Check weekly limit
  if (rule.max_per_week != null && rule.max_per_week > 0) {
    const { count } = await supabase
      .from("homeowner_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category", category)
      .gte("created_at", weekAgo);
    if ((count || 0) >= rule.max_per_week) return false;
  }

  // Check cooldown
  if (rule.cooldown_hours) {
    const cooldownSince = new Date(now.getTime() - rule.cooldown_hours * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("homeowner_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("category", category)
      .gte("created_at", cooldownSince);
    if ((count || 0) > 0) return false;
  }

  return true;
}

/**
 * Send a message with frequency checks.
 */
export async function sendMessage(input: CreateMessageInput): Promise<boolean> {
  const allowed = await canSendMessage(input.userId, input.category);
  if (!allowed) return false;

  const { error } = await supabase.from("homeowner_messages").insert({
    user_id: input.userId,
    property_id: input.propertyId || null,
    category: input.category,
    title_fr: input.titleFr,
    body_fr: input.bodyFr,
    priority: input.priority || "normal",
    channel: "in_app",
    action_url: input.actionUrl || null,
    action_label_fr: input.actionLabelFr || null,
    metadata: input.metadata || {},
    expires_at: input.expiresAt || null,
  });

  return !error;
}

/**
 * Fetch messages for a user.
 */
export async function fetchMessages(
  userId: string,
  options?: { unreadOnly?: boolean; limit?: number; propertyId?: string }
): Promise<HomeownerMessage[]> {
  let query = supabase
    .from("homeowner_messages")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(options?.limit || 50);

  if (options?.unreadOnly) query = query.eq("is_read", false);
  if (options?.propertyId) query = query.eq("property_id", options.propertyId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as HomeownerMessage[];
}

/**
 * Mark message(s) as read.
 */
export async function markAsRead(messageIds: string[]): Promise<void> {
  await supabase
    .from("homeowner_messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .in("id", messageIds);
}

/**
 * Get unread count.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("homeowner_messages")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count || 0;
}

// ─── French Message Templates ───

export const MESSAGE_TEMPLATES = {
  grant_opportunity: (programName: string, amount: number | null) => ({
    titleFr: `Subvention disponible : ${programName}`,
    bodyFr: `Votre propriété pourrait être admissible au programme ${programName}${amount ? ` — jusqu'à ${amount.toLocaleString("fr-CA")} $` : ""}. Consultez votre tableau de bord pour en savoir plus.`,
    actionLabelFr: "Voir les subventions",
  }),
  completion_reminder: (section: string, pct: number) => ({
    titleFr: `Complétez votre passeport : ${section}`,
    bodyFr: `Votre Passeport Maison est à ${pct}%. Ajoutez les informations manquantes pour améliorer la précision de votre score et débloquer de nouvelles recommandations.`,
    actionLabelFr: "Compléter maintenant",
  }),
  score_improved: (oldScore: number, newScore: number) => ({
    titleFr: `Score amélioré : ${oldScore} → ${newScore}`,
    bodyFr: `Félicitations ! Votre score maison est passé de ${oldScore} à ${newScore} grâce aux informations ajoutées récemment.`,
    actionLabelFr: "Voir mon score",
  }),
  recommended_work: (workType: string) => ({
    titleFr: `Travaux recommandés : ${workType}`,
    bodyFr: `Selon l'analyse de votre propriété, des travaux de ${workType.toLowerCase()} pourraient améliorer significativement votre score maison et votre confort.`,
    actionLabelFr: "Voir les détails",
  }),
  seasonal_maintenance: (season: string) => ({
    titleFr: `Entretien ${season} — aide-mémoire`,
    bodyFr: `C'est le moment idéal pour votre entretien ${season.toLowerCase()}. Consultez la liste des tâches recommandées pour votre propriété.`,
    actionLabelFr: "Voir les tâches",
  }),
} as const;
