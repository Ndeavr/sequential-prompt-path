/**
 * UNPRO — Appointment Types
 */

export type AppointmentStatus =
  | "requested"
  | "under_review"
  | "accepted"
  | "declined"
  | "scheduled"
  | "confirmed"
  | "reschedule_requested"
  | "completed"
  | "cancelled";

export interface Appointment {
  id: string;
  homeowner_user_id: string;
  contractor_id: string;
  property_id?: string | null;
  lead_id?: string | null;
  status: AppointmentStatus;
  preferred_date?: string | null;
  preferred_time_window?: string | null;
  scheduled_at?: string | null;
  contact_preference?: string | null;
  notes?: string | null;
  urgency_level?: string | null;
  budget_range?: string | null;
  timeline?: string | null;
  project_category?: string | null;
  homeowner_confirmed?: boolean;
  contractor_confirmed?: boolean;
  cancellation_reason?: string | null;
  reschedule_reason?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentFeedback {
  id: string;
  appointment_id: string;
  lead_id: string;
  property_id?: string | null;
  homeowner_profile_id?: string | null;
  contractor_id?: string | null;
  rating: number;
  was_on_time?: boolean | null;
  was_professional?: boolean | null;
  would_recommend?: boolean | null;
  comment?: string | null;
  created_at: string;
}
