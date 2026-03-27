/**
 * AlexBookingDraftService — Draft lifecycle, contact injection, auth resume.
 */

import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export interface BookingDraftData {
  sessionToken: string;
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

export class AlexBookingDraftService {
  async upsertDraft(data: BookingDraftData) {
    const { data: result, error } = await (supabase
      .from("alex_booking_drafts") as any)
      .upsert({
        session_id: data.sessionToken,
        user_id: data.userId || null,
        contractor_id: data.contractorId || null,
        service_type: data.serviceType || null,
        city: data.city || null,
        project_summary: data.projectSummary || null,
        preferred_time_window: data.preferredTimeWindow || null,
        contact_first_name: data.contactFirstName || null,
        contact_phone: data.contactPhone || null,
        contact_email: data.contactEmail || null,
        booking_status: data.contactPhone ? "contact_captured" : "draft",
      }, { onConflict: "session_id" })
      .select()
      .single();

    return error ? null : result;
  }

  async captureContact(sessionToken: string, firstName: string, phone: string, email?: string) {
    const token = supabase.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    const resp = await fetch(`${FUNCTIONS_BASE}/alex-capture-contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ session_token: sessionToken, first_name: firstName, phone, email }),
    });
    return resp.json();
  }

  async promoteToCalendarReady(draftId: string) {
    await (supabase.from("alex_booking_drafts") as any)
      .update({ booking_status: "ready_for_calendar" })
      .eq("id", draftId);
  }

  async markCalendarOpened(draftId: string) {
    await (supabase.from("alex_booking_drafts") as any)
      .update({ booking_status: "calendar_opened" })
      .eq("id", draftId);
  }

  async markAbandoned(sessionToken: string) {
    await (supabase.from("alex_booking_drafts") as any)
      .update({ booking_status: "abandoned" })
      .eq("session_id", sessionToken)
      .eq("booking_status", "draft");
  }
}

export const alexBookingDraftService = new AlexBookingDraftService();
