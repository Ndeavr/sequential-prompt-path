/**
 * AlexInvisibleBookingFlow — Prepares booking drafts in background.
 * Persists even for unauthenticated users. Restores after login.
 */

import { supabase } from "@/integrations/supabase/client";

export interface BookingDraftInput {
  sessionId: string;
  userId?: string | null;
  contractorId?: string | null;
  serviceType?: string;
  city?: string;
  projectSummary?: string;
  preferredTimeWindow?: string;
  contactFirstName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface BookingDraft {
  id: string;
  sessionId: string;
  bookingStatus: string;
  contractorId?: string | null;
  serviceType?: string;
  city?: string;
  projectSummary?: string;
}

export async function prepareBookingDraft(input: BookingDraftInput): Promise<BookingDraft | null> {
  const { data, error } = await supabase
    .from("alex_booking_drafts" as any)
    .upsert(
      {
        session_id: input.sessionId,
        user_id: input.userId || null,
        contractor_id: input.contractorId || null,
        service_type: input.serviceType || null,
        city: input.city || null,
        project_summary: input.projectSummary || null,
        preferred_time_window: input.preferredTimeWindow || null,
        contact_first_name: input.contactFirstName || null,
        contact_phone: input.contactPhone || null,
        contact_email: input.contactEmail || null,
        booking_status: "draft",
      },
      { onConflict: "session_id" }
    )
    .select()
    .single();

  if (error || !data) return null;
  const d = data as any;
  return {
    id: d.id,
    sessionId: d.session_id,
    bookingStatus: d.booking_status,
    contractorId: d.contractor_id,
    serviceType: d.service_type,
    city: d.city,
    projectSummary: d.project_summary,
  };
}

export async function resumeBookingAfterAuth(sessionId: string, userId: string): Promise<BookingDraft | null> {
  // Link the draft to the authenticated user
  const { data, error } = await supabase
    .from("alex_booking_drafts" as any)
    .update({ user_id: userId } as any)
    .eq("session_id", sessionId)
    .eq("booking_status", "draft")
    .select()
    .single();

  if (error || !data) return null;
  const d = data as any;
  return {
    id: d.id,
    sessionId: d.session_id,
    bookingStatus: d.booking_status,
    contractorId: d.contractor_id,
    serviceType: d.service_type,
    city: d.city,
    projectSummary: d.project_summary,
  };
}

export async function promoteToBooking(draftId: string): Promise<boolean> {
  const { error } = await supabase
    .from("alex_booking_drafts" as any)
    .update({ booking_status: "promoted" } as any)
    .eq("id", draftId);
  return !error;
}

// ─── Momentum Logging ───

export async function logMomentumEvent(
  sessionId: string,
  eventType: string,
  momentumScore: number,
  metadata?: Record<string, any>
): Promise<void> {
  await supabase.from("alex_momentum_events" as any).insert({
    session_id: sessionId,
    event_type: eventType,
    momentum_score: momentumScore,
    metadata: metadata || {},
  });
}

// ─── Soft Objection Logging ───

export async function logSoftObjection(
  sessionId: string,
  objectionType: string,
  detectedText: string,
  answerUsed: string
): Promise<void> {
  await supabase.from("alex_soft_objections" as any).insert({
    session_id: sessionId,
    objection_type: objectionType,
    detected_text: detectedText,
    answer_used: answerUsed,
    resolved: true,
  });
}
