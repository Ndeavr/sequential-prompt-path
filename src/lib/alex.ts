/**
 * Alex Foundation — Typed helper functions for all Alex data operations.
 *
 * Tables used:
 *   conversations          — session/thread tracking
 *   conversation_messages  — message history per conversation
 *   alex_persistent_memory — extracted facts, preferences, decisions
 *   alex_outreach_queue    — scheduled proactive outreach
 *
 * All functions use the typed Supabase client. All are async.
 * All return null on error (never throw).
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MessageRole = "user" | "assistant" | "system" | "tool_result";

export type AlexMemoryType =
  | "fact"
  | "preference"
  | "project"
  | "decision"
  | "follow_up";

export interface Conversation {
  id: string;
  user_id: string;
  session_type: string | null;
  channel: string | null;
  current_intent: string | null;
  current_stage: string | null;
  metadata: Json | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  role: string;
  message_text: string | null;
  structured_payload: Json | null;
  intent: string | null;
  stage: string | null;
  ui_actions: Json | null;
  agent_calls: Json | null;
  memory_updates: Json | null;
  created_at: string;
}

export interface AlexMemory {
  id: string;
  user_id: string;
  memory_type: string;
  key: string;
  value: Json;
  confidence: number;
  source_thread_id: string | null;
  expires_at: string | null;
  last_confirmed_at: string | null;
  created_at: string;
}

export interface OutreachQueueRow {
  id: string;
  user_id: string;
  trigger_type: string;
  trigger_payload: Json;
  message_text: string | null;
  quick_replies: Json | null;
  priority: number;
  channel: string;
  scheduled_at: string;
  status: string;
  cancelled_reason: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface OutreachQueueInsert {
  user_id: string;
  trigger_type: string;
  trigger_payload: Json;
  message_text?: string | null;
  quick_replies?: Json | null;
  priority?: number;
  channel?: string;
  scheduled_at: string;
  status?: string;
  cancelled_reason?: string | null;
}

// ---------------------------------------------------------------------------
// Conversations
// ---------------------------------------------------------------------------

export async function getConversation(
  conversationId: string
): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .maybeSingle();
    if (error) {
      console.error("[alex] getConversation error:", error.message);
      return null;
    }
    return data as Conversation | null;
  } catch {
    return null;
  }
}

export async function createConversation(
  userId: string,
  sessionType: string,
  metadata?: Json
): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        session_type: sessionType,
        metadata: metadata ?? null,
      })
      .select()
      .single();
    if (error) {
      console.error("[alex] createConversation error:", error.message);
      return null;
    }
    return data as Conversation;
  } catch {
    return null;
  }
}

export async function updateConversation(
  conversationId: string,
  updates: {
    current_intent?: string | null;
    current_stage?: string | null;
    metadata?: Json | null;
  }
): Promise<Conversation | null> {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .update(updates)
      .eq("id", conversationId)
      .select()
      .single();
    if (error) {
      console.error("[alex] updateConversation error:", error.message);
      return null;
    }
    return data as Conversation;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Conversation Messages
// ---------------------------------------------------------------------------

export async function getConversationMessages(
  conversationId: string,
  limit = 50
): Promise<ConversationMessage[]> {
  try {
    const { data, error } = await supabase
      .from("conversation_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) {
      console.error("[alex] getConversationMessages error:", error.message);
      return [];
    }
    return (data ?? []) as ConversationMessage[];
  } catch {
    return [];
  }
}

export async function addMessage(
  conversationId: string,
  role: MessageRole,
  messageText: string | null,
  structuredPayload?: Json | null,
  intent?: string | null,
  stage?: string | null
): Promise<ConversationMessage | null> {
  try {
    const { data, error } = await supabase
      .from("conversation_messages")
      .insert({
        conversation_id: conversationId,
        role,
        message_text: messageText,
        structured_payload: structuredPayload ?? null,
        intent: intent ?? null,
        stage: stage ?? null,
      })
      .select()
      .single();
    if (error) {
      console.error("[alex] addMessage error:", error.message);
      return null;
    }
    return data as ConversationMessage;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Alex Persistent Memory
// ---------------------------------------------------------------------------

export async function getAlexMemory(
  userId: string,
  limit = 100
): Promise<AlexMemory[]> {
  try {
    const { data, error } = await supabase
      .from("alex_persistent_memory")
      .select("*")
      .eq("user_id", userId)
      .or("expires_at.is.null,expires_at.gt.now()")
      .order("confidence", { ascending: false })
      .limit(limit);
    if (error) {
      console.error("[alex] getAlexMemory error:", error.message);
      return [];
    }
    return (data ?? []) as AlexMemory[];
  } catch {
    return [];
  }
}

export async function upsertAlexMemory(
  userId: string,
  key: string,
  value: Json,
  memoryType: AlexMemoryType,
  confidence = 1.0
): Promise<AlexMemory | null> {
  try {
    const { data, error } = await supabase
      .from("alex_persistent_memory")
      .upsert(
        {
          user_id: userId,
          key,
          value,
          memory_type: memoryType,
          confidence,
          last_confirmed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,key" }
      )
      .select()
      .single();
    if (error) {
      console.error("[alex] upsertAlexMemory error:", error.message);
      return null;
    }
    return data as AlexMemory;
  } catch {
    return null;
  }
}

export async function deleteAlexMemory(
  userId: string,
  key: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("alex_persistent_memory")
      .delete()
      .eq("user_id", userId)
      .eq("key", key);
    if (error) {
      console.error("[alex] deleteAlexMemory error:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Outreach Queue
// ---------------------------------------------------------------------------

export async function enqueueOutreach(
  row: OutreachQueueInsert
): Promise<OutreachQueueRow | null> {
  try {
    const { data, error } = await supabase
      .from("alex_outreach_queue")
      .insert(row)
      .select()
      .single();
    if (error) {
      console.error("[alex] enqueueOutreach error:", error.message);
      return null;
    }
    return data as OutreachQueueRow;
  } catch {
    return null;
  }
}

export async function getPendingOutreach(
  userId: string
): Promise<OutreachQueueRow[]> {
  try {
    const { data, error } = await supabase
      .from("alex_outreach_queue")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("scheduled_at", { ascending: true });
    if (error) {
      console.error("[alex] getPendingOutreach error:", error.message);
      return [];
    }
    return (data ?? []) as OutreachQueueRow[];
  } catch {
    return [];
  }
}
