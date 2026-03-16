import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Play, Pause, Settings, Eye } from "lucide-react";
import type { AutomationAgent } from "@/services/automationService";
import AgentDetailDrawer from "./AgentDetailDrawer";

const categoryColors: Record<string, string> = {
  trigger: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  build: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  optimization: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  strategic: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

function freqLabel(a: AutomationAgent) {
  if (a.frequency_type === "minutes") return `${a.frequency_value}min`;
  if (a.frequency_type === "hours") return `${a.frequency_value}h`;
  if (a.frequency_type === "daily") return "Quotidien";
  if (a.frequency_type === "weekly") return "Hebdo";
  return "Manuel";
}

function relTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "À l'instant";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return d.toLocaleDateString("fr-CA");
}

interface Props {
  agents: AutomationAgent[];
  onToggle: (id: string, enabled: boolean) => void;
  onRun: (id: string) => void;
  isRunning: boolean;
}

export default function AutomationAgentTable({ agents, onToggle, onRun, isRunning }: Props) {
  const [selected, setSelected] = useState<AutomationAgent | null>(null);

  return (
    <>
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs w-8">On</TableHead>
              <TableHead className="text-xs">Agent</TableHead>
              <TableHead className="text-xs hidden sm:table-cell">Cat.</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Fréq.</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Dernier run</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Max/run</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map(a => (
              <TableRow key={a.id} className={!a.is_enabled ? "opacity-50" : ""}>
                <TableCell className="p-2">
                  <Switch checked={a.is_enabled} onCheckedChange={v => onToggle(a.id, v)} />
                </TableCell>
                <TableCell className="p-2">
                  <p className="text-sm font-medium leading-tight">{a.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{a.key}</p>
                </TableCell>
                <TableCell className="p-2 hidden sm:table-cell">
                  <Badge variant="outline" className={`text-[10px] ${categoryColors[a.category] ?? ""}`}>{a.category}</Badge>
                </TableCell>
                <TableCell className="p-2 hidden md:table-cell text-xs">{freqLabel(a)}</TableCell>
                <TableCell className="p-2 hidden lg:table-cell text-xs text-muted-foreground">{relTime(a.last_run_at)}</TableCell>
                <TableCell className="p-2 hidden md:table-cell text-xs">{a.max_jobs_per_run}</TableCell>
                <TableCell className="p-2 text-right space-x-1">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onRun(a.id)} disabled={isRunning || !a.is_enabled}>
                    <Play className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelected(a)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {agents.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">Aucun agent configuré</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <AgentDetailDrawer agent={selected} onClose={() => setSelected(null)} />
    </>
  );
}
