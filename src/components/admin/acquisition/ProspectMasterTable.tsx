import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ExternalLink } from "lucide-react";

type Prospect = {
  id: string;
  business_name: string;
  trade: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  aipp_score: number | null;
  recommended_plan: string | null;
  enrichment_status: string;
  outreach_status: string;
  payment_status: string;
  activation_status: string;
  last_action_at: string | null;
  next_action: string | null;
  review_count: number | null;
  review_rating: number | null;
};

export function ProspectMasterTable({
  prospects,
  onSelect,
  selectedId,
  statusColors,
}: {
  prospects: Prospect[];
  onSelect: (p: Prospect) => void;
  selectedId?: string;
  statusColors: Record<string, string>;
}) {
  if (prospects.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-zinc-400">
        Aucun prospect. Lance un scrape pour commencer.
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-zinc-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Entreprise</th>
              <th className="text-left px-4 py-3">Métier</th>
              <th className="text-left px-4 py-3">Ville</th>
              <th className="text-left px-4 py-3">Contact</th>
              <th className="text-right px-4 py-3">AIPP</th>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-left px-4 py-3">Outreach</th>
              <th className="text-left px-4 py-3">Paiement</th>
              <th className="text-left px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {prospects.map((p) => {
              const isSelected = selectedId === p.id;
              return (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p)}
                  className={`border-t border-white/5 cursor-pointer hover:bg-white/5 transition ${
                    isSelected ? "bg-blue-500/10" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-medium">{p.business_name}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.trade ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400">{p.city ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">
                    {p.email && <div>{p.email}</div>}
                    {p.phone && <div>{p.phone}</div>}
                    {!p.email && !p.phone && "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.aipp_score != null ? (
                      <span
                        className={`font-mono font-semibold ${
                          p.aipp_score >= 70 ? "text-emerald-400" :
                          p.aipp_score >= 40 ? "text-amber-400" : "text-red-400"
                        }`}
                      >
                        {Math.round(p.aipp_score)}
                      </span>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-300 capitalize">
                    {p.recommended_plan ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColors[p.outreach_status] ?? ""}>
                      {p.outreach_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColors[p.payment_status] ?? ""}>
                      {p.payment_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/contractor/ai-score/${p.id}`, "_blank");
                        }}
                        title="Voir landing"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {p.website_url && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(p.website_url!, "_blank");
                          }}
                          title="Voir site"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
