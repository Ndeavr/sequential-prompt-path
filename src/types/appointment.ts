/**
 * UNPRO — Appointment Types
 */

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Appointment {
  id: string;
  homeownerId: string;
  contractorId: string;
  propertyId: string;
  scheduledAt: string;
  duration: number; // minutes
  status: AppointmentStatus;
  type: "standard" | "priority" | "emergency";
  notes?: string;
  createdAt: string;
}
