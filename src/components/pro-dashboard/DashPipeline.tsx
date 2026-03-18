/**
 * Pipeline — Rendez-vous columns
 */
import { motion } from "framer-motion";
import { CalendarDays, Clock, CheckCircle2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Appt {
  id: string;
  status: string;
  project_category?: string | null;
  notes?: string | null;
  preferred_date?: string | null;
  urgency_level?: string | null;
}

interface Props {
  appointments: Appt[];
}

const COLUMNS = [
  { key: "requested", label: "Nouveaux", icon: Clock, color: "text-warning" },
  { key: "accepted", label: "Acceptés", icon: CheckCircle2, color: "text-primary" },
  { key: "scheduled", label: "Planifiés", icon: CalendarDays, color: "text-accent" },
  { key: "completed", label: "Complétés", icon: Trophy, color: "text-success" },
] as const;

export default function DashPipeline({ appointments }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-primary" />
        <span className="text-xs font-bold text-foreground uppercase tracking-wider">Rendez-vous</span>
        <Badge variant="outline" className="ml-auto text-[10px]">{appointments.length} total</Badge>
      </div>

      {appointments.length === 0 ? (
        <div className="text-center py-8">
          <CalendarDays className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Aucun rendez-vous pour le moment</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Complétez votre profil pour recevoir vos premiers rendez-vous exclusifs.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {COLUMNS.map(col => {
            const items = appointments.filter(a =>
              col.key === "requested" ? (a.status === "requested" || a.status === "under_review") :
              col.key === "accepted" ? (a.status === "accepted") :
              a.status === col.key
            );
            return (
              <div key={col.key} className="rounded-lg border border-border/20 bg-muted/[0.03] p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <col.icon className={`w-3.5 h-3.5 ${col.color}`} />
                  <span className="text-[11px] font-semibold text-foreground">{col.label}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{items.length}</span>
                </div>
                {items.slice(0, 3).map(appt => (
                  <div key={appt.id} className="rounded-md bg-card/40 border border-border/15 p-2 space-y-1">
                    <p className="text-[11px] font-medium text-foreground truncate">
                      {appt.project_category || "Projet"}
                    </p>
                    {appt.preferred_date && (
                      <p className="text-[9px] text-muted-foreground">{appt.preferred_date}</p>
                    )}
                    {col.key === "pending" && (
                      <div className="flex gap-1 mt-1">
                        <Button size="sm" className="h-5 text-[9px] px-2 rounded bg-primary/15 text-primary hover:bg-primary/25">Accepter</Button>
                        <Button size="sm" variant="ghost" className="h-5 text-[9px] px-2 rounded text-muted-foreground">Refuser</Button>
                      </div>
                    )}
                  </div>
                ))}
                {items.length > 3 && (
                  <p className="text-[9px] text-muted-foreground text-center">+{items.length - 3} autres</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
