import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, Clock, Zap, Sparkles, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props { userId?: string; }

const PRIORITY_COLORS: Record<string, string> = {
  critical: "border-destructive/40 bg-destructive/5",
  high: "border-warning/40 bg-warning/5",
  medium: "border-primary/30 bg-primary/5",
  low: "border-muted-foreground/20 bg-muted/30",
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-destructive",
  high: "bg-warning",
  medium: "bg-primary",
  low: "bg-muted-foreground",
};

export default function AuthorityTaskEngine({ userId }: Props) {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["authority-tasks", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("authority_tasks")
        .select("*")
        .eq("user_id", userId!)
        .in("status", ["pending", "in_progress"])
        .order("display_order", { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "done") update.completed_at = new Date().toISOString();
      await supabase.from("authority_tasks").update(update).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["authority-tasks"] }),
  });

  const generatePlan = async () => {
    if (!userId) return;
    setGenerating(true);
    try {
      // Insert sample AI-generated tasks
      const sampleTasks = [
        { title: "Rédiger article AEO : isolation toiture Montréal", description: "Article expert ciblant les requêtes AI pour l'isolation de toiture", duration_minutes: 30, priority: "high", task_type: "content" },
        { title: "Publier post LinkedIn : tendances rénovation 2026", description: "Partager les insights du dernier article sur LinkedIn", duration_minutes: 10, priority: "medium", task_type: "distribution" },
        { title: "Répondre sur Reddit : r/HomeImprovement", description: "Apporter une réponse experte avec lien vers le guide", duration_minutes: 15, priority: "medium", task_type: "signal" },
        { title: "Optimiser meta-descriptions pages SEO", description: "Améliorer 5 pages avec meta-descriptions AEO-optimisées", duration_minutes: 20, priority: "high", task_type: "seo" },
        { title: "Analyser performance contenu semaine", description: "Revoir les métriques et ajuster la stratégie", duration_minutes: 15, priority: "low", task_type: "analysis" },
      ];

      await supabase.from("authority_tasks").insert(
        sampleTasks.map((t, i) => ({
          ...t,
          user_id: userId,
          display_order: i,
          due_date: new Date().toISOString().split("T")[0],
          source: "ai",
        }))
      );
      qc.invalidateQueries({ queryKey: ["authority-tasks"] });
      toast.success("Plan du jour généré par Alex !");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-foreground font-display">Your next moves</h2>
          <p className="text-sm text-muted-foreground">Tâches générées par l'IA pour maximiser votre impact</p>
        </div>
        <Button
          onClick={generatePlan}
          disabled={generating}
          size="sm"
          className="gap-2 bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 shadow-[var(--shadow-glow)]"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Générer le plan du jour
        </Button>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              className={`group rounded-2xl border p-4 backdrop-blur-sm transition-all hover:shadow-[var(--shadow-md)] ${PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium}`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => updateTask.mutate({ id: task.id, status: task.status === "pending" ? "in_progress" : "done" })}
                  className="mt-0.5 transition-transform hover:scale-110"
                >
                  {task.status === "in_progress" ? (
                    <Play className="h-5 w-5 text-primary fill-primary/20" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[task.priority] ?? PRIORITY_DOT.medium}`} />
                    <h3 className="text-sm font-semibold text-foreground truncate">{task.title}</h3>
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{task.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />
                  {task.duration_minutes}m
                </div>

                <button
                  onClick={() => updateTask.mutate({ id: task.id, status: "done" })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <CheckCircle2 className="h-5 w-5 text-success hover:scale-110 transition-transform" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!isLoading && tasks.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border/50 bg-muted/20">
            <Zap className="h-8 w-8 mx-auto text-primary/40 mb-3" />
            <p className="text-sm text-muted-foreground">Aucune tâche en cours</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Générez votre plan du jour pour commencer</p>
          </div>
        )}
      </div>
    </motion.section>
  );
}
