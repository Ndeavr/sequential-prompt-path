/**
 * UNPRO — Property Completion Engine
 * Generates and manages micro-tasks for property passport completion.
 */
import { supabase } from "@/integrations/supabase/client";

export interface CompletionTask {
  id: string;
  task_key: string;
  title_fr: string;
  description_fr: string | null;
  section_key: string;
  field_key: string | null;
  priority: number;
  estimated_minutes: number;
  points: number;
  status: "pending" | "completed" | "dismissed";
}

/** Master task definitions — used to seed tasks for new properties */
const TASK_DEFINITIONS: Array<Omit<CompletionTask, "id" | "status">> = [
  // Basic info
  { task_key: "add_property_type", title_fr: "Ajouter le type de propriété", description_fr: "Unifamiliale, condo, multilogement", section_key: "basic_info", field_key: "property_type", priority: 90, estimated_minutes: 1, points: 10 },
  { task_key: "add_year_built", title_fr: "Ajouter l'année de construction", description_fr: null, section_key: "basic_info", field_key: "year_built", priority: 85, estimated_minutes: 1, points: 10 },
  { task_key: "add_square_footage", title_fr: "Ajouter la superficie", description_fr: "En pieds carrés", section_key: "basic_info", field_key: "square_footage", priority: 80, estimated_minutes: 1, points: 10 },
  { task_key: "add_lot_size", title_fr: "Ajouter la taille du terrain", description_fr: null, section_key: "basic_info", field_key: "lot_size", priority: 60, estimated_minutes: 1, points: 5 },

  // Structure & systems
  { task_key: "add_heating_type", title_fr: "Ajouter le type de chauffage", description_fr: "Électrique, au gaz, thermopompe...", section_key: "structure_systems", field_key: "heating_type", priority: 85, estimated_minutes: 1, points: 15 },
  { task_key: "add_roof_year", title_fr: "Ajouter l'année du toit", description_fr: "Quand a-t-il été refait?", section_key: "structure_systems", field_key: "roof_year", priority: 80, estimated_minutes: 1, points: 15 },
  { task_key: "add_foundation_type", title_fr: "Ajouter le type de fondation", description_fr: "Béton coulé, blocs...", section_key: "structure_systems", field_key: "foundation_type", priority: 70, estimated_minutes: 1, points: 10 },
  { task_key: "add_plumbing_year", title_fr: "Ajouter l'année de la plomberie", description_fr: null, section_key: "structure_systems", field_key: "plumbing_year", priority: 65, estimated_minutes: 1, points: 10 },

  // Energy
  { task_key: "add_insulation_info", title_fr: "Ajouter les infos d'isolation", description_fr: "Type et épaisseur si connus", section_key: "energy_equipment", field_key: "insulation", priority: 75, estimated_minutes: 2, points: 15 },
  { task_key: "add_windows_year", title_fr: "Ajouter l'année des fenêtres", description_fr: null, section_key: "energy_equipment", field_key: "windows_year", priority: 70, estimated_minutes: 1, points: 10 },
  { task_key: "add_water_heater", title_fr: "Ajouter le type de chauffe-eau", description_fr: "Loué ou acheté?", section_key: "energy_equipment", field_key: "water_heater", priority: 60, estimated_minutes: 1, points: 10 },

  // Documents
  { task_key: "upload_panel_photo", title_fr: "Photographier le panneau électrique", description_fr: "Photo claire de votre panneau principal", section_key: "documents_photos", field_key: "panel_photo", priority: 75, estimated_minutes: 3, points: 20 },
  { task_key: "upload_tax_bill", title_fr: "Téléverser le compte de taxes", description_fr: "Dernier avis de taxes municipales", section_key: "documents_photos", field_key: "tax_bill", priority: 70, estimated_minutes: 3, points: 15 },
  { task_key: "upload_invoice", title_fr: "Téléverser une facture de travaux", description_fr: "Facture d'un entrepreneur", section_key: "documents_photos", field_key: "invoice", priority: 50, estimated_minutes: 3, points: 10 },

  // Renovations
  { task_key: "add_renovation_history", title_fr: "Ajouter un historique de rénovation", description_fr: "Quels travaux ont été faits et quand?", section_key: "renovations", field_key: "renovation_list", priority: 70, estimated_minutes: 5, points: 20 },
];

/**
 * Seed completion tasks for a property (idempotent).
 */
export async function seedCompletionTasks(propertyId: string) {
  const { data: existing } = await supabase
    .from("property_completion_tasks")
    .select("task_key")
    .eq("property_id", propertyId);

  const existingKeys = new Set((existing || []).map((t) => t.task_key));
  const toInsert = TASK_DEFINITIONS.filter((t) => !existingKeys.has(t.task_key)).map((t) => ({
    ...t,
    property_id: propertyId,
    status: "pending",
  }));

  if (toInsert.length === 0) return;

  const { error } = await supabase.from("property_completion_tasks").insert(toInsert);
  if (error) throw error;
}

/**
 * Get the next recommended tasks (up to 3).
 */
export async function getNextTasks(propertyId: string, limit = 3): Promise<CompletionTask[]> {
  const { data, error } = await supabase
    .from("property_completion_tasks")
    .select("*")
    .eq("property_id", propertyId)
    .eq("status", "pending")
    .order("priority", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as CompletionTask[];
}

/**
 * Get completion stats for a property.
 */
export async function getCompletionStats(propertyId: string) {
  const { data, error } = await supabase
    .from("property_completion_tasks")
    .select("status, points")
    .eq("property_id", propertyId);

  if (error) throw error;

  const tasks = data || [];
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const totalPoints = tasks.reduce((s, t) => s + (t.points || 0), 0);
  const earnedPoints = tasks.filter((t) => t.status === "completed").reduce((s, t) => s + (t.points || 0), 0);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { total, completed, dismissed: tasks.filter((t) => t.status === "dismissed").length, pct, totalPoints, earnedPoints };
}

/**
 * Complete a task.
 */
export async function completeTask(taskId: string) {
  const { error } = await supabase
    .from("property_completion_tasks")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw error;
}

/**
 * Dismiss a task.
 */
export async function dismissTask(taskId: string) {
  const { error } = await supabase
    .from("property_completion_tasks")
    .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw error;
}
