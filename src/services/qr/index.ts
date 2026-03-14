/**
 * UNPRO — QR Services
 * QR generation, token resolution, scan logging, and contribution management.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───
export type QrType = "property_plate" | "electrical_panel" | "jobsite_temporary";
export type ContributionStatus = "pending" | "approved" | "rejected" | "expired";

export interface QrCodeRecord {
  id: string;
  property_id: string;
  qr_type: QrType;
  token: string;
  label: string | null;
  is_active: boolean;
  project_id: string | null;
  contractor_id: string | null;
  public_project_type: string | null;
  public_city: string | null;
  public_status: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface QrResolution {
  valid: boolean;
  reason?: string;
  qr_type?: QrType;
  qr_id?: string;
  property_id?: string;
  owner_id?: string;
  project_type?: string;
  city?: string;
  status?: string;
  contractor_id?: string;
}

export interface ContributionInput {
  property_id: string;
  qr_code_id?: string;
  contractor_id?: string;
  contributor_name?: string;
  contributor_phone?: string;
  contributor_email?: string;
  work_type: string;
  work_description?: string;
  work_date?: string;
  cost_estimate?: number;
  photo_paths?: string[];
  document_paths?: string[];
}

// ─── QR Generation ───
export function buildQrUrl(token: string): string {
  const base = window.location.origin;
  return `${base}/qr/${token}`;
}

export async function createPropertyQr(input: {
  property_id: string;
  qr_type: QrType;
  label?: string;
  project_id?: string;
  contractor_id?: string;
  public_project_type?: string;
  public_city?: string;
  expires_days?: number;
  created_by: string;
}): Promise<QrCodeRecord> {
  const expires_at = input.expires_days
    ? new Date(Date.now() + input.expires_days * 86400000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("property_qr_codes" as any)
    .insert({
      property_id: input.property_id,
      qr_type: input.qr_type,
      label: input.label ?? null,
      project_id: input.project_id ?? null,
      contractor_id: input.contractor_id ?? null,
      public_project_type: input.public_project_type ?? null,
      public_city: input.public_city ?? null,
      expires_at,
      created_by: input.created_by,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as any;
}

// ─── Token Resolution (via security definer function) ───
export async function resolveQrToken(token: string): Promise<QrResolution> {
  const { data, error } = await supabase.rpc("resolve_qr_token", { _token: token });
  if (error) throw error;
  return (data as any) ?? { valid: false, reason: "no_response" };
}

// ─── Scan Logging ───
export async function logQrScan(input: {
  qr_code_id: string;
  scanned_by?: string;
  scanner_role?: string;
  scan_context?: string;
}): Promise<void> {
  await supabase.from("qr_scan_events" as any).insert({
    qr_code_id: input.qr_code_id,
    scanned_by: input.scanned_by ?? null,
    scanner_role: input.scanner_role ?? null,
    scan_context: input.scan_context ?? null,
    user_agent: navigator.userAgent.substring(0, 200),
  });
}

// ─── Contributions ───
export async function submitContribution(input: ContributionInput): Promise<string> {
  const { data, error } = await supabase
    .from("contractor_contributions" as any)
    .insert({
      property_id: input.property_id,
      qr_code_id: input.qr_code_id ?? null,
      contractor_id: input.contractor_id ?? null,
      contributor_name: input.contributor_name ?? null,
      contributor_phone: input.contributor_phone ?? null,
      contributor_email: input.contributor_email ?? null,
      work_type: input.work_type,
      work_description: input.work_description ?? null,
      work_date: input.work_date ?? null,
      cost_estimate: input.cost_estimate ?? null,
      photo_paths: input.photo_paths ?? [],
      document_paths: input.document_paths ?? [],
    })
    .select("id")
    .single();

  if (error) throw error;
  return (data as any).id;
}

export async function getPropertyContributions(propertyId: string) {
  const { data, error } = await supabase
    .from("contractor_contributions" as any)
    .select("*, contractors(business_name, logo_url)")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as any[];
}

export async function reviewContribution(
  contributionId: string,
  decision: "approved" | "rejected",
  reviewNote?: string,
  userId?: string
): Promise<void> {
  const { error } = await supabase
    .from("contractor_contributions" as any)
    .update({
      status: decision,
      owner_review_note: reviewNote ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId ?? null,
    })
    .eq("id", contributionId);

  if (error) throw error;

  // If approved, create a property event
  if (decision === "approved") {
    const { data: contrib } = await supabase
      .from("contractor_contributions" as any)
      .select("*")
      .eq("id", contributionId)
      .single();

    if (contrib) {
      const c = contrib as any;
      await supabase.from("property_events").insert({
        property_id: c.property_id,
        event_type: "contractor_contribution",
        title: `Travaux: ${c.work_type}`,
        description: c.work_description ?? null,
        contractor_id: c.contractor_id ?? null,
        event_date: c.work_date ?? new Date().toISOString().split("T")[0],
        cost: c.cost_estimate ?? null,
        user_id: userId!,
        metadata: {
          contribution_id: contributionId,
          contributor_name: c.contributor_name,
          photo_count: (c.photo_paths ?? []).length,
        },
      });
    }
  }
}

// ─── Owner QR list ───
export async function getPropertyQrCodes(propertyId: string) {
  const { data, error } = await supabase
    .from("property_qr_codes" as any)
    .select("*")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as QrCodeRecord[];
}

// ─── Upload contribution file ───
export async function uploadContributionFile(
  propertyId: string,
  file: File,
  folder: "photos" | "documents" = "photos"
): Promise<string> {
  const path = `contributions/${propertyId}/${folder}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("property-photos").upload(path, file);
  if (error) throw error;
  return path;
}
