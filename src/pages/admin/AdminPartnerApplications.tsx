import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Pause, RefreshCw, Eye } from "lucide-react";
import { PARTNER_ROLE_LABEL } from "@/lib/partnerTerms";

interface Row {
  id: string; user_id: string | null; email: string;
  first_name: string | null; last_name: string | null; company: string | null; city: string | null;
  partner_status: string; partner_application_status: string; partner_type: string;
  application_submitted_at: string | null; admin_notes: string | null;
  application_data: any;
}

const STATUS_FILTERS = ["pending", "under_review", "approved", "rejected", "suspended"] as const;

export default function AdminPartnerApplications() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [active, setActive] = useState<Row | null>(null);
  const [terms, setTerms] = useState<any[]>([]);
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from("partners" as any).select("*").order("application_submitted_at", { ascending: false });
    if (filter !== "all") q = q.eq("partner_application_status", filter);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows((data as any) ?? []); setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (p: Row) => {
    setActive(p); setNotes(p.admin_notes || "");
    const { data } = await supabase
      .from("partner_terms_acceptance" as any)
      .select("*")
      .eq("partner_id", p.id)
      .order("accepted_at", { ascending: false });
    setTerms((data as any) ?? []);
  };

  const action = async (kind: "approve" | "reject" | "suspend") => {
    if (!active) return;
    const { error } = await supabase.functions.invoke(`${kind}-partner-application`, {
      body: { partner_id: active.id, admin_notes: notes },
    });
    if (error) return toast.error(error.message);
    toast.success("Action exécutée");
    setActive(null); load();
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-white">
      <header className="border-b border-white/10 px-6 py-4 flex flex-wrap items-center gap-3 justify-between">
        <h1 className="text-xl font-semibold">Demandes Partenaires</h1>
        <div className="flex gap-2 items-center">
          <select value={filter} onChange={e=>setFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white">
            <option value="all">Tous</option>
            {STATUS_FILTERS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={load} className="border-white/20 text-white hover:bg-white/5">
            <RefreshCw className="h-3 w-3 mr-1" /> Actualiser
          </Button>
        </div>
      </header>

      <main className="p-6">
        {loading ? <div className="text-white/60">Chargement…</div> : rows.length === 0 ? (
          <div className="text-white/60">Aucune demande.</div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-white/50">
                <tr>
                  <th className="text-left p-3">Partenaire</th>
                  <th className="text-left p-3">Courriel</th>
                  <th className="text-left p-3">Rôle</th>
                  <th className="text-left p-3">Ville</th>
                  <th className="text-left p-3">Statut</th>
                  <th className="text-left p-3">Soumise</th>
                  <th className="text-right p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="p-3">{[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}</td>
                    <td className="p-3 text-white/70">{p.email}</td>
                    <td className="p-3 text-white/80">{PARTNER_ROLE_LABEL[p.partner_type as keyof typeof PARTNER_ROLE_LABEL] || p.partner_type}</td>
                    <td className="p-3 text-white/60">{p.city || "—"}</td>
                    <td className="p-3"><Pill v={p.partner_application_status} /></td>
                    <td className="p-3 text-white/50 text-xs">{p.application_submitted_at ? new Date(p.application_submitted_at).toLocaleDateString("fr-CA") : "—"}</td>
                    <td className="p-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => openDetail(p)} className="border-white/20 text-white hover:bg-white/5">
                        <Eye className="h-3 w-3 mr-1" /> Détail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Sheet open={!!active} onOpenChange={(o)=>!o && setActive(null)}>
        <SheetContent className="bg-[#060B14] border-white/10 text-white w-full sm:max-w-xl overflow-y-auto">
          {active && (
            <>
              <SheetHeader>
                <SheetTitle className="text-white">{[active.first_name, active.last_name].filter(Boolean).join(" ") || active.email}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4 text-sm">
                <Detail k="Courriel" v={active.email} />
                <Detail k="Entreprise" v={active.company || "—"} />
                <Detail k="Ville" v={active.city || "—"} />
                <Detail k="Rôle demandé" v={PARTNER_ROLE_LABEL[active.partner_type as keyof typeof PARTNER_ROLE_LABEL] || active.partner_type} />
                <Detail k="Statut" v={active.partner_application_status} />

                <section className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-1 text-xs">
                  <div className="text-white/50 mb-1">Données soumises</div>
                  <pre className="whitespace-pre-wrap text-white/80">{JSON.stringify(active.application_data ?? {}, null, 2)}</pre>
                </section>

                <section className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
                  <div className="text-white/50 mb-1">Acceptation des termes</div>
                  {terms.length === 0 ? <div className="text-white/40">Aucune acceptation enregistrée.</div> :
                    terms.map(t => (
                      <div key={t.id} className="border-t border-white/5 pt-2 mt-2 first:border-t-0 first:pt-0 first:mt-0">
                        <div>Version {t.terms_version} · {t.role}</div>
                        <div className="text-white/50">{new Date(t.accepted_at).toLocaleString("fr-CA")} · IP {t.ip_address || "—"}</div>
                      </div>
                    ))}
                </section>

                <section className="space-y-1.5">
                  <div className="text-xs text-white/50">Note admin</div>
                  <Textarea value={notes} onChange={e=>setNotes(e.target.value)} className="bg-white/5 border-white/10 text-white" rows={3} />
                </section>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
                  <Button onClick={()=>action("approve")} className="bg-emerald-500 text-black hover:bg-emerald-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Approuver
                  </Button>
                  <Button variant="outline" onClick={()=>action("reject")} className="border-red-500/30 text-red-300 hover:bg-red-500/10">
                    <XCircle className="h-3 w-3 mr-1" /> Refuser
                  </Button>
                  <Button variant="outline" onClick={()=>action("suspend")} className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10">
                    <Pause className="h-3 w-3 mr-1" /> Suspendre
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Pill({ v }: { v: string }) {
  const cls =
    v === "approved" ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" :
    v === "rejected" ? "bg-red-500/10 text-red-300 border-red-500/20" :
    v === "suspended" ? "bg-amber-500/10 text-amber-300 border-amber-500/20" :
    "bg-white/5 text-white/70 border-white/10";
  return <span className={`text-[11px] px-2 py-0.5 rounded-full border ${cls}`}>{v}</span>;
}
function Detail({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between text-xs"><span className="text-white/50">{k}</span><span className="text-white/90">{v}</span></div>;
}
