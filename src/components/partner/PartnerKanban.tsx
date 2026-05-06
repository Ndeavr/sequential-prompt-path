import { LEAD_STATUS_PIPELINE } from "@/lib/leadConsent";
import { ConsentBadge } from "./ConsentBadge";
import { LeadOriginBadge } from "./LeadOriginBadge";

export function PartnerKanban({ leads, onOpen }: { leads: any[]; onOpen: (id: string) => void }) {
  const grouped: Record<string, any[]> = {};
  LEAD_STATUS_PIPELINE.forEach(c => grouped[c.key] = []);
  leads.forEach(l => { (grouped[l.lead_status] ??= []).push(l); });

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="flex gap-3 px-4 sm:px-0 pb-2 min-w-max">
        {LEAD_STATUS_PIPELINE.map(col => (
          <div key={col.key} className="w-64 shrink-0">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-xs font-semibold text-white/80">{col.label}</span>
              <span className="text-[10px] text-white/40 bg-white/5 px-1.5 rounded">{grouped[col.key].length}</span>
            </div>
            <div className="space-y-2 min-h-[80px]">
              {grouped[col.key].map(l => (
                <button key={l.id} onClick={() => onOpen(l.id)}
                  className="w-full text-left rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 p-3 transition">
                  <div className="text-sm font-medium text-white truncate">{l.business_name || l.contact_name || "Sans nom"}</div>
                  <div className="text-[11px] text-white/50 truncate">{[l.trade, l.city].filter(Boolean).join(" · ")}</div>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <ConsentBadge lead={l} />
                    {l.potential_score ? <span className="text-[10px] text-amber-400">{l.potential_score}/100</span> : null}
                  </div>
                  <div className="mt-1.5"><LeadOriginBadge origin={l.lead_origin} /></div>
                </button>
              ))}
              {grouped[col.key].length === 0 && (
                <div className="text-[11px] text-white/30 text-center py-4">—</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
