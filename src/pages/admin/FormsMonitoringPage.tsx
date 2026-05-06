import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Mail, AlertTriangle, Check, Clock } from "lucide-react";
import { toast } from "sonner";

interface Submission {
  id: string;
  form_type: string;
  status: string;
  reference_code: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  source_page: string | null;
  utm_source: string | null;
  retry_count: number;
  last_error: string | null;
  email_user_sent: boolean;
  email_admin_sent: boolean;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-500/15 text-blue-300",
  processing: "bg-amber-500/15 text-amber-300",
  sent: "bg-emerald-500/15 text-emerald-300",
  failed: "bg-red-500/15 text-red-300",
  dead: "bg-zinc-700 text-zinc-300",
};

export default function FormsMonitoringPage() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    let q = (supabase.from("form_submissions" as any) as any)
      .select("*").order("created_at", { ascending: false }).limit(200);
    if (filterType !== "all") q = q.eq("form_type", filterType);
    if (filterStatus !== "all") q = q.eq("status", filterStatus);
    const { data, error } = await q;
    if (error) toast.error(error.message);
    else setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterType, filterStatus]);

  const filtered = rows.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.email?.toLowerCase().includes(s) ||
      r.first_name?.toLowerCase().includes(s) ||
      r.last_name?.toLowerCase().includes(s) ||
      r.reference_code?.toLowerCase().includes(s) ||
      r.company?.toLowerCase().includes(s)
    );
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayCount = rows.filter(r => new Date(r.created_at) >= today).length;
  const failedCount = rows.filter(r => r.status === "failed" || r.status === "dead").length;
  const pendingCount = rows.filter(r => r.status === "received" || r.status === "processing").length;

  const resend = async (id: string) => {
    const { error } = await supabase.functions.invoke("process-form-submission", { body: { submission_id: id } });
    if (error) toast.error(error.message); else { toast.success("Renvoi déclenché."); setTimeout(load, 1500); }
  };

  const exportCsv = () => {
    const headers = ["created_at","form_type","status","reference_code","first_name","last_name","email","phone","company","utm_source","source_page","retry_count","last_error"];
    const csv = [headers.join(","), ...filtered.map(r => headers.map(h => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a"); a.href = url; a.download = `form_submissions_${Date.now()}.csv`; a.click();
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Monitoring des formulaires</h1>
            <p className="text-sm text-muted-foreground">Toutes les soumissions UNPRO en temps réel.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>
            <Button size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />Actualiser
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Kpi label="Aujourd'hui" value={todayCount} icon={<Check className="w-4 h-4" />} />
          <Kpi label="En attente" value={pendingCount} icon={<Clock className="w-4 h-4" />} />
          <Kpi label="Échecs" value={failedCount} icon={<AlertTriangle className="w-4 h-4 text-red-400" />} />
          <Kpi label="Total visibles" value={rows.length} icon={<Mail className="w-4 h-4" />} />
        </div>

        <div className="flex gap-2 flex-wrap mb-4">
          <Input placeholder="Rechercher (nom, courriel, référence…)" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="partner_application">Partenaire</SelectItem>
              <SelectItem value="condo_priority_access">Copropriété</SelectItem>
              <SelectItem value="contact">Contact</SelectItem>
              <SelectItem value="contractor_onboarding">Onboarding</SelectItem>
              <SelectItem value="alex_callback">Rappel Alex</SelectItem>
              <SelectItem value="quote_upload">Devis</SelectItem>
              <SelectItem value="project_analysis">Analyse projet</SelectItem>
              <SelectItem value="contractor_signup">Devenir entrepreneur</SelectItem>
              <SelectItem value="newsletter">Infolettre</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Statut" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous statuts</SelectItem>
              <SelectItem value="received">Reçu</SelectItem>
              <SelectItem value="processing">En cours</SelectItem>
              <SelectItem value="sent">Envoyé</SelectItem>
              <SelectItem value="failed">Échec</SelectItem>
              <SelectItem value="dead">Mort</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/40 text-xs font-medium text-muted-foreground hidden md:grid">
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-3">Contact</div>
            <div className="col-span-2">Référence</div>
            <div className="col-span-1">Emails</div>
            <div className="col-span-1">Statut</div>
            <div className="col-span-1 text-right">Action</div>
          </div>
          {filtered.map(r => (
            <div key={r.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-3 py-3 border-t border-border/40 text-sm items-center">
              <div className="md:col-span-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("fr-CA")}</div>
              <div className="md:col-span-2 text-xs">{r.form_type}</div>
              <div className="md:col-span-3">
                <div className="font-medium">{[r.first_name, r.last_name].filter(Boolean).join(" ") || "—"}</div>
                <div className="text-xs text-muted-foreground">{r.email} {r.phone ? `• ${r.phone}` : ""}</div>
              </div>
              <div className="md:col-span-2 font-mono text-xs">{r.reference_code}</div>
              <div className="md:col-span-1 flex gap-1">
                <span title="User" className={`text-[10px] px-1.5 py-0.5 rounded ${r.email_user_sent ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-700 text-zinc-400"}`}>U</span>
                <span title="Admin" className={`text-[10px] px-1.5 py-0.5 rounded ${r.email_admin_sent ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-700 text-zinc-400"}`}>A</span>
              </div>
              <div className="md:col-span-1">
                <Badge className={STATUS_COLORS[r.status] || ""}>{r.status}</Badge>
              </div>
              <div className="md:col-span-1 md:text-right">
                <Button variant="outline" size="sm" onClick={() => resend(r.id)}>Renvoyer</Button>
              </div>
              {r.last_error && (
                <div className="md:col-span-12 text-xs text-red-400 bg-red-500/5 rounded px-2 py-1 mt-1">
                  ⚠ {r.last_error} (essais : {r.retry_count})
                </div>
              )}
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">Aucune soumission.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">{icon}{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
