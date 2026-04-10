/**
 * UNPRO Condos — Voting & Assemblies Page (wired to Supabase)
 */
import { useState } from "react";
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Vote, CheckCircle2, Clock, Calendar, Users } from "lucide-react";
import { useSyndicates } from "@/hooks/useSyndicate";
import { useAssemblies, useCreateAssembly } from "@/hooks/useCondoData";
import { EmptyState } from "@/components/shared";
import { toast } from "sonner";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  planned: { label: "Planifiée", variant: "outline" },
  in_progress: { label: "En cours", variant: "default" },
  completed: { label: "Terminée", variant: "secondary" },
  cancelled: { label: "Annulée", variant: "secondary" },
};

const typeLabels: Record<string, string> = {
  annual: "Assemblée annuelle",
  special: "Assemblée spéciale",
  extraordinary: "Assemblée extraordinaire",
};

export default function CondoVotingPage() {
  const { data: syndicates } = useSyndicates();
  const syndicateId = syndicates?.[0]?.id;
  const { data: assemblies, isLoading } = useAssemblies(syndicateId);
  const createAssembly = useCreateAssembly();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", scheduled_date: "", assembly_type: "annual", location: "" });

  const handleCreate = async () => {
    if (!form.title || !form.scheduled_date || !syndicateId) return;
    try {
      await createAssembly.mutateAsync({ ...form, syndicate_id: syndicateId });
      toast.success("Assemblée créée");
      setDialogOpen(false);
      setForm({ title: "", scheduled_date: "", assembly_type: "annual", location: "" });
    } catch {
      toast.error("Erreur lors de la création");
    }
  };

  return (
    <CondoLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Assemblées & votes</h1>
            <p className="text-sm text-muted-foreground mt-1">Gérez les assemblées générales et les résolutions du syndicat</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl gap-2">
                <Plus className="h-4 w-4" /> Nouvelle assemblée
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Créer une assemblée</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-sm font-medium mb-1 block">Titre</label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="AG annuelle 2026" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Type</label>
                  <select
                    value={form.assembly_type}
                    onChange={(e) => setForm({ ...form, assembly_type: e.target.value })}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="annual">Assemblée annuelle</option>
                    <option value="special">Assemblée spéciale</option>
                    <option value="extraordinary">Assemblée extraordinaire</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Date et heure</label>
                  <Input type="datetime-local" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Lieu (optionnel)</label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Salle communautaire, local 101" />
                </div>
                <Button onClick={handleCreate} disabled={createAssembly.isPending || !form.title || !form.scheduled_date} className="w-full rounded-xl">
                  {createAssembly.isPending ? "Création…" : "Créer l'assemblée"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        ) : !assemblies?.length ? (
          <EmptyState
            icon={<Vote className="h-10 w-10 text-primary/40" />}
            message="Aucune assemblée planifiée. Créez votre première assemblée pour commencer."
          />
        ) : (
          <div className="space-y-4">
            {assemblies.map((assembly: any) => {
              const st = statusLabels[assembly.status] || statusLabels.planned;
              return (
                <Card key={assembly.id} className="border-border/30 hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${assembly.status === "completed" ? "bg-muted/50" : "bg-primary/10"}`}>
                          <Vote className={`h-5 w-5 ${assembly.status === "completed" ? "text-muted-foreground" : "text-primary"}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{assembly.title}</p>
                          <p className="text-xs text-muted-foreground">{typeLabels[assembly.assembly_type] || assembly.assembly_type}</p>
                        </div>
                      </div>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>

                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(assembly.scheduled_date).toLocaleDateString("fr-CA", { dateStyle: "long" })}
                      </div>
                      {assembly.location && (
                        <div className="flex items-center gap-1">
                          📍 {assembly.location}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        Quorum : {assembly.quorum_required}%
                      </div>
                    </div>

                    {assembly.quorum_reached && (
                      <div className="flex items-center gap-2 text-xs text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Quorum atteint
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </CondoLayout>
  );
}
