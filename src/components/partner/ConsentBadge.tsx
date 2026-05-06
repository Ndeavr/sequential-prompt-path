import { CONSENT_LABELS, consentTone, type LeadLike } from "@/lib/leadConsent";
import { ShieldAlert, ShieldCheck, ShieldQuestion, ShieldX } from "lucide-react";

const TONE: Record<string, { cls: string; icon: any }> = {
  red:    { cls: "bg-red-500/10 text-red-300 border-red-500/30",     icon: ShieldAlert },
  yellow: { cls: "bg-amber-500/10 text-amber-300 border-amber-500/30", icon: ShieldQuestion },
  green:  { cls: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30", icon: ShieldCheck },
  black:  { cls: "bg-black/40 text-white/70 border-white/20",         icon: ShieldX },
};

export function ConsentBadge({ lead }: { lead: LeadLike & { consent_status?: string | null } }) {
  const t = consentTone(lead);
  const { cls, icon: Icon } = TONE[t];
  const label = CONSENT_LABELS[lead.consent_status ?? "unknown"] ?? "Inconnu";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}
