import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Mail, Phone, Sparkles } from "lucide-react";
import {
  useKanbanLeads, useMoveLeadStage,
} from "@/hooks/useAcquisitionMachine";
import { KANBAN_STAGES, type KanbanLead, type KanbanStage } from "@/services/acquisitionMachineService";

function LeadCard({
  lead,
  onClick,
  onDragStart,
}: {
  lead: KanbanLead;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="cursor-grab active:cursor-grabbing rounded-lg bg-card border border-border/50 p-3 hover:border-primary/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold truncate">{lead.company_name ?? "—"}</p>
        {lead.total_priority_score != null && (
          <Badge variant="outline" className="text-[10px] shrink-0">
            {Math.round(lead.total_priority_score)}
          </Badge>
        )}
      </div>
      {lead.contact_name && (
        <p className="text-xs text-muted-foreground truncate">{lead.contact_name}</p>
      )}
      {lead.specialty && (
        <p className="text-[10px] uppercase text-primary/80 mt-1 tracking-wide">{lead.specialty}</p>
      )}
      {lead.hook_summary && (
        <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2 italic">"{lead.hook_summary}"</p>
      )}
    </motion.div>
  );
}

export default function PageAcquisitionKanban() {
  const { data: leads, isLoading } = useKanbanLeads();
  const move = useMoveLeadStage();
  const [selected, setSelected] = useState<KanbanLead | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, KanbanLead[]>();
    KANBAN_STAGES.forEach((s) => map.set(s.key, []));
    (leads ?? []).forEach((l) => {
      const key = (l.pipeline_stage ?? "new") as string;
      const bucket = KANBAN_STAGES.find((s) => s.key === key)?.key ?? "new";
      map.get(bucket)?.push(l);
    });
    return map;
  }, [leads]);

  const onDrop = (stage: KanbanStage) => {
    if (!draggedId) return;
    move.mutate({ leadId: draggedId, stage });
    setDraggedId(null);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/acquisition">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Cockpit</Button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl font-black">Pipeline CRM · Acquisition</h1>
            <p className="text-xs text-muted-foreground">{leads?.length ?? 0} leads · drag & drop entre les colonnes</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]"><Sparkles className="h-3 w-3 mr-1" /> Realtime</Badge>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {KANBAN_STAGES.map((stage) => {
          const items = grouped.get(stage.key) ?? [];
          return (
            <div
              key={stage.key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(stage.key as KanbanStage)}
              className="shrink-0 w-72 bg-card/30 backdrop-blur rounded-xl border border-border/40 p-3"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${stage.color}`} />
                  <h3 className="text-sm font-semibold">{stage.label}</h3>
                </div>
                <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[60px]">
                {items.map((l) => (
                  <LeadCard
                    key={l.id}
                    lead={l}
                    onClick={() => setSelected(l)}
                    onDragStart={() => setDraggedId(l.id)}
                  />
                ))}
                {items.length === 0 && !isLoading && (
                  <p className="text-[11px] text-muted-foreground text-center py-4">Vide</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.company_name ?? "Lead sans nom"}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                {selected.contact_name && (
                  <Card><CardContent className="p-3">
                    <p className="text-[10px] uppercase text-muted-foreground mb-1">Contact</p>
                    <p className="font-medium">{selected.contact_name}</p>
                  </CardContent></Card>
                )}
                {selected.specialty && (
                  <div className="flex items-center gap-2"><Badge>{selected.specialty}</Badge></div>
                )}
                {selected.hook_summary && (
                  <Card><CardContent className="p-3">
                    <p className="text-[10px] uppercase text-muted-foreground mb-1">Hook</p>
                    <p className="text-sm italic">"{selected.hook_summary}"</p>
                  </CardContent></Card>
                )}
                <div className="flex flex-col gap-2">
                  {selected.email && (
                    <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm hover:text-primary">
                      <Mail className="h-4 w-4" /> {selected.email}
                    </a>
                  )}
                  <Link to={`/admin/outbound/leads/${selected.id}`} className="flex items-center gap-2 text-sm hover:text-primary">
                    <ExternalLink className="h-4 w-4" /> Voir profil complet outbound
                  </Link>
                </div>
                <div className="border-t pt-3">
                  <p className="text-[10px] uppercase text-muted-foreground mb-2">Déplacer vers</p>
                  <div className="grid grid-cols-2 gap-2">
                    {KANBAN_STAGES.map((s) => (
                      <Button
                        key={s.key}
                        variant="outline"
                        size="sm"
                        className="text-xs justify-start"
                        onClick={() => {
                          move.mutate({ leadId: selected.id, stage: s.key as KanbanStage });
                          setSelected(null);
                        }}
                      >
                        <span className={`h-2 w-2 rounded-full ${s.color} mr-2`} /> {s.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
