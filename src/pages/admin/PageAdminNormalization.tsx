import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, PlayCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Sample = {
  id: string;
  before: { email: unknown; phone: unknown; website: unknown; company: unknown };
  after: { email: string | null; phone: string | null; website: string | null; company: string | null; status: string };
  errors: Record<string, string>;
};

type Counters = Record<string, number>;

export default function PageAdminNormalization() {
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [counters, setCounters] = useState<Counters | null>(null);
  const [samples, setSamples] = useState<Sample[]>([]);

  async function run(mode: "dry" | "apply") {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("acq-normalize-repair", {
        body: { dry_run: mode === "dry", sample_size: 20 },
      });
      if (error) throw error;
      setCounters(data.counters);
      setSamples(data.sample_before_after ?? []);
      setDryRun(mode === "dry");
      toast.success(mode === "dry" ? "Analyse terminée" : "Réparation appliquée");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="alex-immersive min-h-screen p-6 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-readable">Normalisation des leads</h1>
          <p className="text-readable-secondary">
            Couche universelle de nettoyage : emails, téléphones, sites web, noms d'entreprise, tags Resend.
          </p>
        </header>

        <Card className="glass-strong">
          <CardHeader>
            <CardTitle>Console de réparation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => run("dry")} disabled={loading} variant="secondary">
              {loading && dryRun ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              Analyser (dry-run)
            </Button>
            <Button onClick={() => run("apply")} disabled={loading}>
              {loading && !dryRun ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Appliquer la réparation
            </Button>
          </CardContent>
        </Card>

        {counters && (
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Résultats {dryRun ? "(simulation)" : "(appliqués)"}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(counters).map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-wide text-readable-muted">{k.replace(/_/g, " ")}</div>
                    <div className="text-2xl font-semibold text-readable">{v}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {samples.length > 0 && (
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle>Échantillon avant / après (20)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-readable-muted">
                      <th className="py-2 pr-4">Champ</th>
                      <th className="py-2 pr-4">Avant</th>
                      <th className="py-2 pr-4">Après</th>
                      <th className="py-2 pr-4">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {samples.map((s) =>
                      (["email", "phone", "website", "company"] as const).map((field) => {
                        const before = (s.before as any)[field];
                        const after = (s.after as any)[field];
                        if (before == after) return null;
                        return (
                          <tr key={`${s.id}-${field}`} className="border-t border-white/10">
                            <td className="py-2 pr-4 text-readable-muted">{field}</td>
                            <td className="py-2 pr-4 text-readable-secondary font-mono text-xs break-all">{String(before ?? "—")}</td>
                            <td className="py-2 pr-4 text-readable font-mono text-xs break-all">{String(after ?? "—")}</td>
                            <td className="py-2 pr-4 text-readable-secondary">{s.after.status}</td>
                          </tr>
                        );
                      }),
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
