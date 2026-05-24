/**
 * UNPRO — AIPP Profiles List (Admin)
 * Cinematic Dark — moderate, publish, verify RBQ/NEQ, detect methods, view proofs.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { ExternalLink, Plus, ShieldCheck, FileSearch, Sparkles } from "lucide-react";

export default function PageAippProfiles() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [proofsOpen, setProofsOpen] = useState(false);
  const [proofsRows, setProofsRows] = useState<any[]>([]);
  const [proofsTitle, setProofsTitle] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("aipp_profiles" as any)
      .select("id, slug, company_name, primary_trade, primary_city, public_status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    setRows(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (id: string, status: string) => {
    const next = status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("aipp_profiles" as any)
      .update({ public_status: next })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(next === "published" ? "Publié" : "Dépublié");
    load();
  };

  const invokeFn = async (
    id: string,
    fn: "aipp-verify-rbq" | "aipp-verify-neq" | "aipp-detect-methods",
    label: string,
  ) => {
    setBusyId(id); setBusyAction(fn);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body: { profile_id: id } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Échec");
      if (fn === "aipp-verify-rbq") toast.success(`RBQ : ${data.rbq_status}${data.rbq_number ? ` (${data.rbq_number})` : ""}`);
      else if (fn === "aipp-verify-neq") toast.success(`NEQ : ${data.neq_status}${data.neq_number ? ` (${data.neq_number})` : ""}`);
      else toast.success(`${data.detected ?? 0} méthode(s) détectée(s)`);
    } catch (e: any) {
      toast.error(`${label} — ${e.message || "erreur"}`);
    } finally {
      setBusyId(null); setBusyAction(null);
    }
  };

  const openProofs = async (id: string, name: string) => {
    const { data } = await supabase
      .from("aipp_detected_methods" as any)
      .select("service_name, method, material, evidence_snippet, source_url, confidence, confirmed_by_contractor")
      .eq("profile_id", id)
      .order("confidence", { ascending: false });
    setProofsRows(data ?? []);
    setProofsTitle(name);
    setProofsOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AIPP — Profils</h1>
            <p className="text-white/60 mt-1">{rows.length} profil(s)</p>
          </div>
          <Link to="/admin/aipp-import">
            <Button><Plus className="w-4 h-4 mr-1" /> Nouvel import</Button>
          </Link>
        </header>

        {loading && <p className="text-white/60">Chargement…</p>}

        <div className="grid gap-3">
          {rows.map((r) => {
            const busy = (a: string) => busyId === r.id && busyAction === a;
            return (
              <Card key={r.id} className="bg-white/[0.04] border-white/10">
                <CardContent className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-white truncate">{r.company_name}</span>
                      <Badge variant={r.public_status === "published" ? "default" : "secondary"}>
                        {r.public_status}
                      </Badge>
                    </div>
                    <div className="text-xs text-white/60 mt-1">
                      {r.primary_trade}{r.primary_city ? ` · ${r.primary_city}` : ""} · /{r.slug}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <Link to={`/ai-indexed-profiles/${r.slug}`} target="_blank">
                      <Button size="sm" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
                    </Link>
                    <Button size="sm" variant="outline" onClick={() => invokeFn(r.id, "aipp-verify-rbq", "RBQ")} disabled={busy("aipp-verify-rbq")}>
                      <ShieldCheck className="w-4 h-4 mr-1" />{busy("aipp-verify-rbq") ? "…" : "RBQ"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => invokeFn(r.id, "aipp-verify-neq", "NEQ")} disabled={busy("aipp-verify-neq")}>
                      <ShieldCheck className="w-4 h-4 mr-1" />{busy("aipp-verify-neq") ? "…" : "NEQ"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => invokeFn(r.id, "aipp-detect-methods", "Méthodes")} disabled={busy("aipp-detect-methods")}>
                      <Sparkles className="w-4 h-4 mr-1" />{busy("aipp-detect-methods") ? "…" : "Méthodes"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openProofs(r.id, r.company_name)}>
                      <FileSearch className="w-4 h-4 mr-1" /> Preuves
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggle(r.id, r.public_status)}>
                      {r.public_status === "published" ? "Dépublier" : "Publier"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!loading && rows.length === 0 && (
            <p className="text-white/60">Aucun profil. <Link to="/admin/aipp-import" className="text-cyan-300">Importer le premier →</Link></p>
          )}
        </div>
      </div>

      <Sheet open={proofsOpen} onOpenChange={setProofsOpen}>
        <SheetContent side="right" className="bg-[#050816] text-white border-white/10 w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-white">Preuves détectées — {proofsTitle}</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            {proofsRows.length === 0 && <p className="text-white/60 text-sm">Aucune méthode détectée. Lancez « Méthodes ».</p>}
            {proofsRows.map((p, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{p.service_name}</span>
                  <Badge variant={p.confidence >= 0.7 ? "default" : "secondary"}>
                    {Math.round(p.confidence * 100)}%
                  </Badge>
                </div>
                <div className="text-xs text-white/70">
                  {p.method && <span>{p.method}</span>}
                  {p.material && <span> · {p.material}</span>}
                </div>
                {p.evidence_snippet && (
                  <p className="text-xs text-white/60 italic border-l-2 border-cyan-500/40 pl-2 mt-1">
                    « {p.evidence_snippet} »
                  </p>
                )}
                {p.source_url && (
                  <a href={p.source_url} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 hover:underline">
                    Source ↗
                  </a>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
