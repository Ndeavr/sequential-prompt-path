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
  | "cancelled"
  | "paid"
  | "activated"
  | "out_of_area"
  | "bad_match"
  | "callback_needed"
  | "archived_test";

/** Libellés francophones canoniques des statuts de rendez-vous. */
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  requested: "Demandé",
  under_review: "En révision",
  accepted: "Accepté",
  declined: "Refusé",
  scheduled: "Planifié",
  confirmed: "Confirmé",
  reschedule_requested: "Report demandé",
  completed: "Terminé",
  cancelled: "Annulé",
  paid: "Payé",
  activated: "Activé",
  out_of_area: "Hors secteur",
  bad_match: "Mauvais match",
  callback_needed: "À rappeler",
  archived_test: "Archive de test",
};

export const APPOINTMENT_STATUS_VARIANTS: Record<
  AppointmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  requested: "secondary",
  under_review: "outline",
  accepted: "default",
  declined: "destructive",
  scheduled: "default",
  confirmed: "default",
  reschedule_requested: "outline",
  completed: "default",
  cancelled: "destructive",
  paid: "default",
  activated: "default",
  out_of_area: "outline",
  bad_match: "outline",
  callback_needed: "secondary",
  archived_test: "outline",
};

/** Statuts que l'admin peut appliquer manuellement depuis le tableau des rendez-vous. */
export const ADMIN_ASSIGNABLE_STATUSES: AppointmentStatus[] = [
  "requested",
  "under_review",
  "accepted",
  "declined",
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "paid",
  "activated",
  "out_of_area",
  "bad_match",
  "callback_needed",
];

/** Statuts exclus des tableaux opérationnels et des statistiques. */
export const NON_OPERATIONAL_STATUSES: AppointmentStatus[] = ["archived_test"];


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
