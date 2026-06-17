import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ContactVerificationRow {
  id: string;
  business_name: string;
  contact_person_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  phone_type: "mobile" | "landline" | "voip" | "unknown" | "invalid" | null;
  website: string | null;
  google_business_url: string | null;
  rbq_number: string | null;
  rbq_business_name: string | null;
  rbq_status: string | null;
  neq_number: string | null;
  neq_business_name: string | null;
  neq_status: string | null;
  match_confidence: "high" | "medium" | "low" | "conflict";
  match_reasons: Array<{ signal: string; score: number; detail?: string }>;
  verification_status: string;
  best_contact_method: string | null;
  manual_contact_priority_score: number;
  last_contacted_at: string | null;
  next_followup_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContactVerificationNote {
  id: string;
  contact_verification_id: string;
  admin_id: string | null;
  note: string;
  created_at: string;
}

export type FilterKey =
  | "all" | "new" | "needs_manual_review" | "verified" | "contacted" | "replied"
  | "landline_only" | "email_available" | "no_email" | "conflict"
  | "high" | "medium" | "low";

export function useContactVerificationQueue(filter: FilterKey = "all") {
  const [rows, setRows] = useState<ContactVerificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("contact_verification_queue" as any)
      .select("*")
      .order("manual_contact_priority_score", { ascending: false })
      .limit(500);

    switch (filter) {
      case "new":
      case "needs_manual_review":
      case "verified":
      case "contacted":
      case "replied":
        q = q.eq("verification_status", filter); break;
      case "landline_only":
        q = q.eq("phone_type", "landline"); break;
      case "email_available":
        q = q.not("email", "is", null); break;
      case "no_email":
        q = q.is("email", null); break;
      case "conflict":
        q = q.eq("match_confidence", "conflict"); break;
      case "high":
      case "medium":
      case "low":
        q = q.eq("match_confidence", filter); break;
    }

    const { data, error } = await q;
    if (!error && data) setRows(data as any);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, reload: load };
}

export async function updateVerificationStatus(
  id: string,
  status: string,
  extra: Partial<ContactVerificationRow> = {}
) {
  return supabase.from("contact_verification_queue" as any).update({
    verification_status: status,
    ...extra,
  }).eq("id", id);
}

export async function addVerificationNote(contact_verification_id: string, note: string) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase.from("contact_verification_notes" as any).insert({
    contact_verification_id,
    admin_id: user?.id ?? null,
    note,
  });
}

export async function listVerificationNotes(id: string): Promise<ContactVerificationNote[]> {
  const { data } = await supabase
    .from("contact_verification_notes" as any)
    .select("*")
    .eq("contact_verification_id", id)
    .order("created_at", { ascending: false });
  return (data as any) ?? [];
}
