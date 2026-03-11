import type { AgentTask } from "@/hooks/useAgentOrchestrator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot, Brain, TrendingUp, Zap, Shield, Activity, Palette,
  Code, Search, Megaphone, BarChart3, HeadphonesIcon, Eye,
  Check, X, AlertTriangle, Clock, ChevronRight, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const urgencyConfig: Record<string, { color: string; icon: typeof AlertTriangle }> = {
  critical: { color: "bg-destructive text-destructive-foreground", icon: AlertTriangle },
  high: { color: "bg-orange-500/20 text-orange-400 border border-orange-500/30", icon: Zap },
  medium: { color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30", icon: Clock },
  low: { color: "bg-muted text-muted-foreground", icon: Activity },
};

const domainIcons: Record<string, typeof Bot> = {
  system: Brain, engineering: Code, product: Eye, design: Palette,
  media: Palette, marketing: Megaphone, growth: TrendingUp,
  seo: Search, leads: Zap, data: BarChart3, revenue: Shield,
  operations: Activity, support: HeadphonesIcon,
};

interface Props {
  tasks: AgentTask[];
  isLoading: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

const AgentTaskQueue = ({ tasks, isLoading, onApprove, onReject }: Props) => {
  const proposed = tasks.filter(t => t.status === "proposed");
  const approved = tasks.filter(t => t.status === "approved");
  const rejected = tasks.filter(t => t.status === "rejected");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Proposed */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-400" />
          En attente ({proposed.length})
        </h3>

        {proposed.length === 0 ? (
          <Card className="glass-surface border-border/30">
            <CardContent className="py-8 text-center">
              <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Aucune proposition. Lancez une analyse.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {proposed.map((task, i) => {
                const urg = urgencyConfig[task.urgency] ?? urgencyConfig.medium;
                const UrgIcon = urg.icon;
                const DIcon = domainIcons[task.agent_domain] ?? Bot;

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card className="glass-surface border-border/30 hover:border-primary/30 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <DIcon className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-[10px] text-muted-foreground">{task.agent_name}</span>
                              <Badge className={`text-[9px] px-1 py-0 ${urg.color}`}>
                                <UrgIcon className="h-2.5 w-2.5 mr-0.5" />
                                {task.urgency}
                              </Badge>
                              <Badge variant="outline" className="text-[9px] px-1 py-0">
                                {task.impact_score}
                              </Badge>
                              {task.auto_executable && (
                                <Badge className="text-[9px] px-1 py-0 bg-green-500/20 text-green-400 border border-green-500/30">
                                  auto
                                </Badge>
                              )}
                            </div>

                            <h4 className="font-semibold text-xs text-foreground">{task.task_title}</h4>
                            {task.task_description && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{task.task_description}</p>
                            )}

                            {Array.isArray(task.action_plan) && task.action_plan.length > 0 && (
                              <div className="mt-1.5 space-y-0.5">
                                {task.action_plan.slice(0, 3).map((step, j) => (
                                  <div key={j} className="flex items-start gap-1 text-[10px] text-muted-foreground">
                                    <ChevronRight className="h-2.5 w-2.5 mt-0.5 text-primary shrink-0" />
                                    <span>{step}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <p className="text-[9px] text-muted-foreground mt-1.5">
                              {formatDistanceToNow(new Date(task.proposed_at), { addSuffix: true, locale: fr })}
                            </p>
                          </div>

                          <div className="flex flex-col gap-1.5 shrink-0">
                            <Button size="sm" className="gap-1 rounded-lg h-7 text-[10px] px-2" onClick={() => onApprove(task.id)}>
                              <Check className="h-3 w-3" /> OK
                            </Button>
                            <Button size="sm" variant="ghost" className="gap-1 rounded-lg h-7 text-[10px] px-2 text-muted-foreground" onClick={() => onReject(task.id)}>
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Approved & Rejected summary */}
      {(approved.length > 0 || rejected.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {approved.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                <Check className="h-3 w-3 text-green-400" /> Approuvées ({approved.length})
              </h4>
              <div className="space-y-1">
                {approved.slice(0, 3).map(t => (
                  <div key={t.id} className="p-2 rounded-lg bg-green-500/5 border border-green-500/20">
                    <p className="text-[10px] font-medium text-foreground truncate">{t.task_title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {rejected.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1">
                <X className="h-3 w-3 text-muted-foreground" /> Rejetées ({rejected.length})
              </h4>
              <div className="space-y-1">
                {rejected.slice(0, 3).map(t => (
                  <div key={t.id} className="p-2 rounded-lg bg-muted/30 border border-border/30">
                    <p className="text-[10px] font-medium text-foreground truncate line-through opacity-60">{t.task_title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AgentTaskQueue;
