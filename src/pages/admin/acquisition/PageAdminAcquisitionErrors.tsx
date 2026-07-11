import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Check, EyeOff, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { usePipelineErrors, useUpdatePipelineError } from "@/hooks/usePipelineAudit";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = [
  "all", "scraping", "deduplication", "phone_validation", "email", "sms",
  "tracking", "onboarding", "stripe", "webhook", "activation", "profile", "matching", "alex",
];

export default function PageAdminAcquisitionErrors() {
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const errors = usePipelineErrors(statusFilter);
  const update = useUpdatePipelineError();

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return errors.data ?? [];
    return (errors.data ?? []).filter((e) => e.category === categoryFilter);
  }, [errors.data, categoryFilter]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    for (const e of filtered) (g[e.category] ??= []).push(e);
    return g;
  }, [filtered]);

  async function repair(errorId: string, fn: string | null) {
    if (!fn) { toast.error("Aucune fonction de réparation associée."); return; }
    try {
      const { error } = await supabase.functions.invoke(fn, { body: { error_id: errorId } });
      if (error) throw error;
      toast.success(`Réparation ${fn} lancée`);
      await update.mutateAsync({ id: errorId, status: "repaired" });
    } catch (e: any) {
      toast.error(e?.message ?? "Échec réparation");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link to="/admin/acquisition/pipeline"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
            <h1 className="text-2xl font-semibold">Erreurs pipeline</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Erreurs consolidées par catégorie — cliquez sur réparer pour lancer la fonction correspondante.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Ouvertes</SelectItem>
              <SelectItem value="acknowledged">Acquittées</SelectItem>
              <SelectItem value="repaired">Réparées</SelectItem>
              <SelectItem value="ignored">Ignorées</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c === "all" ? "Toutes catégories" : c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {errors.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Aucune erreur {statusFilter === "open" ? "ouverte" : statusFilter} — le pipeline est propre.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base capitalize">{cat.replace(/_/g, " ")}</CardTitle>
                  <Badge variant="secondary">{items.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map((e) => (
                  <div key={e.id} className="rounded-lg border p-3 text-sm space-y-2">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <div className="font-medium">{e.error_code}</div>
                        <div className="text-muted-foreground">{e.error_message}</div>
                        {e.recommended_action && (
                          <div className="text-xs text-muted-foreground mt-1">
                            💡 {e.recommended_action}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">×{e.occurrences}</Badge>
                        {e.step_key && <Badge variant="outline" className="text-[10px]">{e.step_key}</Badge>}
                        {e.repair_function && (
                          <Button size="sm" variant="secondary" onClick={() => repair(e.id, e.repair_function)}>
                            <Wrench className="w-3.5 h-3.5 mr-1.5" />
                            Réparer
                          </Button>
                        )}
                        {statusFilter === "open" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: e.id, status: "acknowledged" })}>
                              <Check className="w-3.5 h-3.5 mr-1.5" />
                              Acquitter
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => update.mutate({ id: e.id, status: "ignored" })}>
                              <EyeOff className="w-3.5 h-3.5 mr-1.5" />
                              Ignorer
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-muted-foreground tabular-nums">
                      Première : {new Date(e.first_seen_at).toLocaleString("fr-CA")} · Dernière : {new Date(e.last_seen_at).toLocaleString("fr-CA")}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
