import type { AgentRegistryEntry } from "@/hooks/useAgentOrchestrator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot, Brain, TrendingUp, Zap, Shield, Activity, Palette,
  Code, Search, Users, HeadphonesIcon, BarChart3, Megaphone,
  Cpu, Pause, Play, Eye,
} from "lucide-react";
import { motion } from "framer-motion";

const domainIcons: Record<string, typeof Bot> = {
  system: Brain,
  engineering: Code,
  product: Eye,
  design: Palette,
  media: Palette,
  marketing: Megaphone,
  growth: TrendingUp,
  seo: Search,
  leads: Zap,
  data: BarChart3,
  revenue: Shield,
  operations: Activity,
  support: HeadphonesIcon,
};

const layerColors: Record<string, string> = {
  chief: "bg-primary text-primary-foreground",
  executive: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  operational: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  micro: "bg-muted text-muted-foreground",
};

const autonomyLabels: Record<string, string> = {
  propose: "Propose",
  semi_auto: "Semi-auto",
  full_auto: "Full auto",
};

interface Props {
  agents: AgentRegistryEntry[];
  onToggle: (args: { agentKey: string; newStatus: string }) => void;
  selectedLayer: string | null;
  onSelectLayer: (layer: string | null) => void;
}

const AgentHierarchyTree = ({ agents, onToggle, selectedLayer, onSelectLayer }: Props) => {
  const layers = ["chief", "executive", "operational", "micro"] as const;
  const layerLabels: Record<string, string> = {
    chief: "Orchestrateur",
    executive: "Directeurs",
    operational: "Opérationnels",
    micro: "Micro-agents",
  };

  const filtered = selectedLayer ? agents.filter(a => a.layer === selectedLayer) : agents;
  const grouped = layers.reduce((acc, l) => {
    acc[l] = filtered.filter(a => a.layer === l);
    return acc;
  }, {} as Record<string, AgentRegistryEntry[]>);

  return (
    <div className="space-y-4">
      {/* Layer filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          size="sm"
          variant={selectedLayer === null ? "default" : "outline"}
          className="rounded-xl text-xs h-7"
          onClick={() => onSelectLayer(null)}
        >
          Tous ({agents.length})
        </Button>
        {layers.map(l => {
          const count = agents.filter(a => a.layer === l).length;
          return (
            <Button
              key={l}
              size="sm"
              variant={selectedLayer === l ? "default" : "outline"}
              className="rounded-xl text-xs h-7"
              onClick={() => onSelectLayer(selectedLayer === l ? null : l)}
            >
              {layerLabels[l]} ({count})
            </Button>
          );
        })}
      </div>

      {/* Agent grid */}
      {layers.map(layer => {
        const layerAgents = grouped[layer];
        if (!layerAgents || layerAgents.length === 0) return null;

        return (
          <div key={layer}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <Cpu className="h-3 w-3" />
              {layerLabels[layer]} · Couche {layers.indexOf(layer) + 1}
            </h3>
            <div className={`grid gap-2 ${
              layer === "chief" ? "grid-cols-1" :
              layer === "executive" ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" :
              "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            }`}>
              {layerAgents.map((agent, i) => {
                const Icon = domainIcons[agent.domain] ?? Bot;
                const isActive = agent.status === "active";

                return (
                  <motion.div
                    key={agent.agent_key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className={`glass-surface border-border/30 transition-all ${
                      isActive ? "hover:border-primary/30" : "opacity-50"
                    } ${layer === "chief" ? "border-primary/40" : ""}`}>
                      <CardContent className={`${layer === "chief" ? "p-4" : "p-3"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`shrink-0 ${layer === "chief" ? "w-10 h-10" : "w-8 h-8"} rounded-xl bg-primary/10 flex items-center justify-center`}>
                              <Icon className={`${layer === "chief" ? "h-5 w-5" : "h-4 w-4"} text-primary`} />
                            </div>
                            <div className="min-w-0">
                              <p className={`${layer === "chief" ? "text-sm" : "text-xs"} font-semibold text-foreground truncate`}>
                                {agent.agent_name}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                <Badge className={`text-[9px] px-1 py-0 ${layerColors[layer]}`}>
                                  {layer}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] px-1 py-0">
                                  {autonomyLabels[agent.autonomy_level]}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0"
                            onClick={() => onToggle({
                              agentKey: agent.agent_key,
                              newStatus: isActive ? "paused" : "active",
                            })}
                          >
                            {isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          </Button>
                        </div>

                        {layer !== "micro" && agent.mission && (
                          <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2">
                            {agent.mission}
                          </p>
                        )}

                        {agent.tasks_executed > 0 && (
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                            <span>{agent.tasks_executed} tâches</span>
                            <span>·</span>
                            <span className={agent.success_rate > 70 ? "text-green-400" : "text-orange-400"}>
                              {agent.success_rate.toFixed(0)}% succès
                            </span>
                          </div>
                        )}

                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          isActive ? "bg-green-400" : "bg-muted-foreground"
                        } ${isActive ? "animate-pulse" : ""}`} />
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AgentHierarchyTree;
