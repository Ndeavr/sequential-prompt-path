import AdminLayout from "@/layouts/AdminLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Mail, Clock, ChevronDown, ChevronUp, Pencil, Eye, Pause, Play } from "lucide-react";
import { toast } from "sonner";

export default function PageOutboundSequences() {
  const navigate = useNavigate();
  const [sequences, setSequences] = useState<any[]>([]);
  const [steps, setSteps] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data: seqs } = await supabase.from("outbound_sequences").select("*").order("created_at", { ascending: false });
    setSequences(seqs || []);
    if (seqs?.length) {
      const ids = seqs.map(s => s.id);
      const { data: allSteps } = await supabase.from("outbound_sequence_steps").select("*").in("sequence_id", ids).order("step_order");
      const grouped: Record<string, any[]> = {};
      (allSteps || []).forEach(s => {
        if (!grouped[s.sequence_id]) grouped[s.sequence_id] = [];
        grouped[s.sequence_id].push(s);
      });
      setSteps(grouped);
    }
    setLoading(false);
  }

  function toggle(id: string) {
    setExpanded(expanded === id ? null : id);
  }

  async function toggleStep(stepId: string, active: boolean) {
    await supabase.from("outbound_sequence_steps").update({ is_active: !active }).eq("id", stepId);
    toast.success(active ? "Étape désactivée" : "Étape activée");
    load();
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/outbound")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold">Séquences Email</h1>
          <p className="text-sm text-muted-foreground">Librairie de séquences outbound UNPRO</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Chargement…</div>
      ) : sequences.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="py-12 text-center">
            <Mail className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Aucune séquence</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sequences.map(seq => {
            const seqSteps = steps[seq.id] || [];
            const isExpanded = expanded === seq.id;
            return (
              <Card key={seq.id} className="border-border/40">
                <CardHeader className="pb-2 cursor-pointer" onClick={() => toggle(seq.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-sm">{seq.sequence_name}</CardTitle>
                      <Badge variant="outline" className="text-xs">{seq.language?.toUpperCase()}</Badge>
                      <Badge variant="outline" className="text-xs">{seq.target_type}</Badge>
                      {seq.is_default && <Badge className="bg-primary/20 text-primary text-xs">Défaut</Badge>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={seq.is_active ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"} >
                        {seq.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
                    <div className="text-xs text-muted-foreground mb-3">{seqSteps.length} étapes</div>
                    {seqSteps.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Aucune étape configurée</p>
                    ) : (
                      <div className="space-y-3">
                        {seqSteps.map((step, i) => (
                          <div key={step.id} className={`border rounded-lg p-4 ${step.is_active ? "border-border/40" : "border-border/20 opacity-60"}`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">{step.step_order}</div>
                                <span className="font-medium text-sm">{step.step_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" /> J+{step.delay_days}
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => toggleStep(step.id, step.is_active)}>
                                  {step.is_active ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                </Button>
                              </div>
                            </div>
                            <div className="bg-muted/50 rounded p-3 text-sm space-y-1">
                              <p className="text-xs text-muted-foreground">Objet:</p>
                              <p className="font-medium text-sm">{step.subject_template}</p>
                              <p className="text-xs text-muted-foreground mt-2">Corps:</p>
                              <p className="text-sm whitespace-pre-line line-clamp-4">{step.body_template}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  </AdminLayout>
  );
}
