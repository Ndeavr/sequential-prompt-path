/**
 * UNPRO — Project Types
 */

export type ProjectStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled";

export interface Project {
  id: string;
  userId: string;
  propertyId: string;
  categoryId?: string;
  title: string;
  description?: string;
  status: ProjectStatus;
  budgetMin?: number;
  budgetMax?: number;
  timeline?: string;
  urgency?: string;
  cityId?: string;
  createdAt: string;
  updatedAt: string;
}
