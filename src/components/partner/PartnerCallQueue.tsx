/**
 * UNPRO — Partner Call Queue
 * Shows next 30 calls with status buttons + generate-more.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Phone, Globe, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  business_name: string | null;
  city: string | null;
  phone: string | null;
  website: string | null;
}
interface Assignment {
  id: string;
  status: string;
  lead: Lead | null;
}

const STATUSES: { key: string; label: string; tone: string }[] = [
  { key: "called",         label: "Appelé",       tone: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  { key: "no_answer",      label: "Pas de rép.",  tone: "bg-white/5 text-white/70 border-white/10" },
  { key: "interested",     label: "Intéressé",    tone: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  { key: "not_interested", label: "Refus",        tone: "bg-red-500/15 text-red-300 border-red-500/30" },
  { key: "callback",       label: "Rappeler",     tone: "bg-blue-500/15 text-blue-300 border-blue-500/30" },
];

export default function PartnerCallQueue({ partnerId }: { partnerId: string }) {
  const [items, setItems] = useState<Assignment[]>([]);
  const [allCount, setAllCount] = useState(0);
  const [todoCount, setTodoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("partner_call_assignments" as any)
      .select("id,status,lead:entrepreneur_leads(id,business_name,city,phone,website)")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: true })
      .limit(30);
    const rows = (data as any) ?? [];
    setItems(rows);
    setAllCount(rows.length);
    setTodoCount(rows.filter((r: any) => r.status === "todo").length);
    setLoading(false);
  }, [partnerId]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, status } : it));
    setTodoCount((c) => Math.max(0, c - (status !== "todo" ? 1 : 0)));
    await supabase.from("partner_call_assignments" as any)
      .update({ status, called_at: new Date().toISOString() })
      .eq("id", id);
  }

  async function generate() {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("partner-calls-generate", { body: {} });
    setGenerating(false);
    if (error) {
      const msg = (error as any)?.message || "Erreur";
      toast({ title: "Impossible", description: msg });
      return;
    }
    const inserted = (data as any)?.inserted ?? 0;
    toast({ title: `${inserted} nouveaux appels ajoutés` });
    await load();
  }

  const allDone = allCount > 0 && todoCount === 0;
  const done = allCount - todoCount;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Mes 30 prochains appels</h2>
          <p className="text-xs text-white/50">{done}/{allCount} traités · {todoCount} restants</p>
        </div>
        <Button
          onClick={generate}
          disabled={!allDone || generating || (allCount === 0 ? false : false)}
          className="bg-amber-500 hover:bg-amber-400 text-[#060B14] disabled:opacity-40"
          title={!allDone && allCount > 0 ? "Termine ta liste avant d'en générer plus" : ""}
        >
          {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : (allCount === 0 ? "Générer 30 appels" : "Générer 30 nouveaux")}
        </Button>
      </div>

      {loading ? (
        <div className="text-white/40 text-sm py-8 text-center">Chargement…</div>
      ) : items.length === 0 ? (
        <div className="text-white/40 text-sm py-10 text-center">
          Aucun appel pour l'instant. Clique sur « Générer 30 appels » pour démarrer.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const isTodo = it.status === "todo";
            const lead = it.lead;
            return (
              <li key={it.id} className={`rounded-xl border p-3 transition ${isTodo ? "border-white/10 bg-white/[0.03]" : "border-white/5 bg-white/[0.015] opacity-60"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{lead?.business_name || "Sans nom"}</div>
                    <div className="text-xs text-white/50 truncate">{lead?.city || "—"}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {lead?.phone && (
                      <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 px-2.5 py-1.5 text-xs">
                        <Phone className="w-3.5 h-3.5" />{lead.phone}
                      </a>
                    )}
                    {lead?.website && (
                      <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-lg bg-white/5 border border-white/10 text-white/70 px-2 py-1.5 text-xs">
                        <Globe className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button key={s.key} onClick={() => setStatus(it.id, s.key)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition ${it.status === s.key ? s.tone : "border-white/10 text-white/50 hover:text-white hover:border-white/20"}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
