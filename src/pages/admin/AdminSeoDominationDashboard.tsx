/**
 * UNPRO — SEO Domination Dashboard
 * Manage SEO generation queue, pages, and metrics.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Sparkles, Loader2, Play, FileText, TrendingUp,
  Eye, MousePointerClick, BarChart3, Clock, CheckCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  processing: "bg-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  error: "bg-red-500/20 text-red-400",
};

export default function AdminSeoDominationDashboard() {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [queueCity, setQueueCity] = useState("Montréal");
  const [queueProblem, setQueueProblem] = useState("");

  const { data: pages = [] } = useQuery({
    queryKey: ["seo-pages-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("seo_pages").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: queue = [] } = useQuery({
    queryKey: ["seo-queue"],
    queryFn: async () => {
      const { data } = await supabase.from("seo_generation_queue" as any).select("*").order("created_at", { ascending: false }).limit(50);
      return (data || []) as any[];
    },
  });

  const { data: metrics = [] } = useQuery({
    queryKey: ["seo-metrics"],
    queryFn: async () => {
      const { data } = await supabase.from("seo_metrics" as any).select("*").order("updated_at", { ascending: false }).limit(50);
      return (data || []) as any[];
    },
  });

  const runGenerator = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-generator", { body: { action: "generate", batchSize: 5 } });
      if (error) throw error;
      toast.success(`${data?.generated || 0} pages générées`);
      qc.invalidateQueries({ queryKey: ["seo-pages-admin"] });
      qc.invalidateQueries({ queryKey: ["seo-queue"] });
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setGenerating(false);
    }
  };

  const addToQueue = async () => {
    if (!queueProblem.trim()) return;
    try {
      const { data, error } = await supabase.functions.invoke("seo-generator", {
        body: { action: "queue", items: [{ city: queueCity, problem: queueProblem }] },
      });
      if (error) throw error;
      toast.success(`${data?.queued || 0} ajouté à la queue`);
      setQueueProblem("");
      qc.invalidateQueries({ queryKey: ["seo-queue"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const publishedCount = pages.filter(p => p.is_published).length;
  const pendingQueue = queue.filter((q: any) => q.status === "pending").length;
  const totalClicks = metrics.reduce((sum: number, m: any) => sum + (m.clicks || 0), 0);

  return (
    <div className="min-h-screen bg-[hsl(228,33%,4%)] text-[hsl(220,20%,93%)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 flex items-center justify-center">
              <Globe className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">SEO Domination Engine</h1>
              <p className="text-sm text-[hsl(220,14%,50%)]">Génération automatique de pages SEO</p>
            </div>
          </div>
          <Button
            onClick={runGenerator}
            disabled={generating}
            className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-0 text-white"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Génération..." : "Générer pages"}
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Pages totales", value: pages.length, icon: FileText, color: "text-blue-400" },
            { label: "Publiées", value: publishedCount, icon: CheckCircle, color: "text-emerald-400" },
            { label: "Queue en attente", value: pendingQueue, icon: Clock, color: "text-amber-400" },
            { label: "Clics totaux", value: totalClicks, icon: MousePointerClick, color: "text-purple-400" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-4"
            >
              <s.icon className={`h-5 w-5 mb-2 ${s.color}`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-[10px] text-[hsl(220,14%,50%)]">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Add to Queue */}
        <div className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-3">Ajouter à la queue</h2>
          <div className="flex gap-3 flex-wrap">
            <select
              value={queueCity}
              onChange={(e) => setQueueCity(e.target.value)}
              className="text-xs bg-[hsl(228,25%,12%)] border border-[hsl(228,18%,18%)] rounded-xl px-3 py-2 text-[hsl(220,20%,93%)]"
            >
              {["Montréal", "Laval", "Québec", "Longueuil", "Gatineau", "Sherbrooke", "Trois-Rivières"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Problème (ex: condensation fenêtres)"
              value={queueProblem}
              onChange={(e) => setQueueProblem(e.target.value)}
              className="flex-1 min-w-[200px] text-xs bg-[hsl(228,25%,12%)] border border-[hsl(228,18%,18%)] rounded-xl px-3 py-2 text-[hsl(220,20%,93%)] placeholder:text-[hsl(220,14%,30%)]"
            />
            <Button size="sm" onClick={addToQueue} disabled={!queueProblem.trim()} className="rounded-xl gap-1">
              <Play className="h-3 w-3" /> Ajouter
            </Button>
          </div>
        </div>

        {/* Queue */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[hsl(220,14%,50%)] uppercase tracking-wider">Queue de génération</h2>
          <div className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl divide-y divide-[hsl(228,18%,13%)]">
            {queue.length === 0 && <div className="p-6 text-center text-sm text-[hsl(220,14%,50%)]">Queue vide</div>}
            {queue.slice(0, 15).map((q: any) => (
              <div key={q.id} className="flex items-center gap-3 p-3">
                <Globe className="h-4 w-4 text-[hsl(220,14%,50%)] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">{q.problem} — {q.city}</p>
                  <p className="text-[9px] text-[hsl(220,14%,50%)]">{new Date(q.created_at).toLocaleString("fr-CA")}</p>
                </div>
                <Badge className={`${STATUS_STYLES[q.status]} border-0 text-[9px]`}>{q.status}</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Pages */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[hsl(220,14%,50%)] uppercase tracking-wider">Pages générées ({pages.length})</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.slice(0, 12).map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Badge className={`${p.is_published ? "bg-emerald-500/20 text-emerald-400" : "bg-[hsl(220,14%,50%)]/20 text-[hsl(220,14%,50%)]"} border-0 text-[9px]`}>
                    {p.is_published ? "Publiée" : "Brouillon"}
                  </Badge>
                  <span className="text-[9px] text-[hsl(220,14%,50%)]">{p.page_type}</span>
                </div>
                <p className="text-sm font-medium line-clamp-2">{p.title}</p>
                <p className="text-[10px] text-[hsl(220,14%,50%)] line-clamp-1">/{p.slug}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
