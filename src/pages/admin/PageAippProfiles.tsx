/**
 * UNPRO — AIPP Profiles List (Admin)
 * Cinematic Dark — moderate, publish, unpublish profiles.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, Plus, ShieldCheck } from "lucide-react";

export default function PageAippProfiles() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

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

  const verifyRbq = async (id: string) => {
    setVerifyingId(id);
    try {
      const { data, error } = await supabase.functions.invoke("aipp-verify-rbq", {
        body: { profile_id: id },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Échec");
      toast.success(`RBQ : ${data.rbq_status}${data.rbq_number ? ` (${data.rbq_number})` : ""}`);
    } catch (e: any) {
      toast.error(e.message || "Erreur vérification RBQ");
    } finally {
      setVerifyingId(null);
    }
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
          {rows.map((r) => (
            <Card key={r.id} className="bg-white/[0.04] border-white/10">
              <CardContent className="p-4 flex items-center justify-between gap-4">
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
                <div className="flex gap-2 shrink-0">
                  <Link to={`/ai-indexed-profiles/${r.slug}`} target="_blank">
                    <Button size="sm" variant="ghost"><ExternalLink className="w-4 h-4" /></Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => verifyRbq(r.id)} disabled={verifyingId === r.id}>
                    <ShieldCheck className="w-4 h-4 mr-1" />
                    {verifyingId === r.id ? "Vérif…" : "RBQ"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggle(r.id, r.public_status)}>
                    {r.public_status === "published" ? "Dépublier" : "Publier"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && rows.length === 0 && (
            <p className="text-white/60">Aucun profil. <Link to="/admin/aipp-import" className="text-cyan-300">Importer le premier →</Link></p>
          )}
        </div>
      </div>
    </div>
  );
}
