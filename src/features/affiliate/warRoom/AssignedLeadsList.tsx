/**
 * AssignedLeadsList — today's leads from `contractor_leads` for the current affiliate.
 * Uses RLS: SELECT restricted via `is_affiliate_owner(assigned_affiliate_id)`.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LeadActionBar } from "./LeadActionBar";
import type { PersonalSmsAffiliate } from "./PersonalSmsSheet";
import { Badge } from "@/components/ui/badge";
import { formatPhoneDisplay } from "@/features/affiliate/lib/phoneUtils";

interface Row {
  id: string;
  company_name: string | null;
  first_name: string | null;
  full_name: string | null;
  city: string | null;
  category_primary: string | null;
  phone_e164: string | null;
  contact_status: string | null;
  next_follow_up_at: string | null;
  personal_sms_sent_at: string | null;
}

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  to_contact: { label: "À contacter", tone: "bg-primary/10 text-primary border-primary/30" },
  personal_sms_sent: { label: "SMS perso envoyé", tone: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" },
  unpro_sms_sent: { label: "SMS UNPRO", tone: "bg-blue-500/10 text-blue-500 border-blue-500/30" },
  called: { label: "Appelé", tone: "bg-amber-500/10 text-amber-500 border-amber-500/30" },
  clicked: { label: "A cliqué", tone: "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/30" },
  trial_1dollar: { label: "Essai 1 $", tone: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40" },
  subscribed: { label: "Abonné", tone: "bg-emerald-600/15 text-emerald-500 border-emerald-500/40" },
  not_interested: { label: "Pas intéressé", tone: "bg-muted text-muted-foreground border-border/40" },
};

export function AssignedLeadsList({ affiliate }: { affiliate: PersonalSmsAffiliate }) {
  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-assigned-leads", affiliate.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("contractor_leads")
        .select("id, company_name, first_name, full_name, city, category_primary, phone_e164, contact_status, next_follow_up_at, personal_sms_sent_at")
        .eq("assigned_affiliate_id", affiliate.id)
        .order("next_follow_up_at", { ascending: true, nullsFirst: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  if (isLoading) {
    return <div className="rounded-2xl border border-border/40 bg-card p-8 text-center text-sm text-muted-foreground">Chargement…</div>;
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-8 text-center text-sm text-muted-foreground">
        Aucun prospect assigné pour l'instant. L'admin doit vous en assigner.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const status = r.contact_status ?? "to_contact";
        const s = STATUS_LABELS[status] ?? STATUS_LABELS.to_contact;
        return (
          <li key={r.id} className="rounded-2xl border border-border/40 bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-foreground truncate">
                  {r.company_name ?? "Sans nom"}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[r.category_primary, r.city].filter(Boolean).join(" · ")}
                </div>
                {r.phone_e164 && (
                  <div className="text-xs font-mono text-muted-foreground mt-1">
                    {formatPhoneDisplay(r.phone_e164)}
                  </div>
                )}
              </div>
              <Badge variant="outline" className={s.tone}>{s.label}</Badge>
            </div>
            <LeadActionBar
              lead={{
                id: r.id,
                first_name: r.first_name,
                full_name: r.full_name,
                company_name: r.company_name,
                city: r.city,
                phone_e164: r.phone_e164,
              }}
              affiliate={affiliate}
            />
          </li>
        );
      })}
    </ul>
  );
}
