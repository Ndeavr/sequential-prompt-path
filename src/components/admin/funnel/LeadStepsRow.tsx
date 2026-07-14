import type { FunnelLead } from "@/hooks/useFunnelDebug";
import { Check, X, Minus } from "lucide-react";

function fmt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("fr-CA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export const STEP_LABELS: Record<string, string> = {
  scraped: "Scrapé",
  mobile_valid: "Mobile",
  sms_queued: "SMS Q",
  sms_sent: "SMS Env",
  sms_delivered: "SMS Liv",
  link_clicked: "Clic",
  landing_view: "Landing",
  alex_started: "Alex",
  signup_started: "Signup",
  signup_completed: "Signup ✓",
  checkout_opened: "Checkout",
  payment_completed: "Paiement",
  account_activated: "Activé",
};

export default function LeadStepsRow({
  lead,
  steps,
  onClick,
}: {
  lead: FunnelLead;
  steps: string[];
  onClick?: () => void;
}) {
  const breakIdx = lead.first_break ? steps.indexOf(lead.first_break.step) : -1;
  return (
    <tr
      className="border-b border-border/20 hover:bg-white/5 cursor-pointer"
      onClick={onClick}
    >
      <td className="p-2 text-xs">
        <div className="font-mono">{lead.phone ?? "—"}</div>
        <div className="text-muted-foreground truncate max-w-[180px]">
          {lead.company_name ?? "—"}
        </div>
        <div className="text-muted-foreground text-[10px]">
          {lead.category ?? "—"} · {lead.city ?? "—"}
        </div>
      </td>
      {steps.map((s, i) => {
        const cell = lead.steps[s];
        const isBreak = i === breakIdx;
        return (
          <td
            key={s}
            className={`p-1 text-center align-middle ${isBreak ? "bg-red-500/20 ring-1 ring-red-500/60" : ""}`}
          >
            {cell?.ok ? (
              <div className="flex flex-col items-center text-emerald-400">
                <Check className="w-3 h-3" />
                <span className="text-[9px] font-mono opacity-70">{fmt(cell.at)}</span>
              </div>
            ) : isBreak ? (
              <div className="flex flex-col items-center text-red-400" title={lead.first_break?.reason}>
                <X className="w-3 h-3" />
                <span className="text-[9px] truncate max-w-[70px]">
                  {lead.first_break?.reason?.slice(0, 24) ?? ""}
                </span>
              </div>
            ) : (
              <Minus className="w-3 h-3 text-muted-foreground/40 mx-auto" />
            )}
          </td>
        );
      })}
    </tr>
  );
}
