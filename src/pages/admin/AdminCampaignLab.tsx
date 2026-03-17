/**
 * UNPRO — AI Campaign Lab
 * Admin dashboard for auto-generated campaigns, suggestions, and templates.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Brain, Rocket, Zap, MapPin, Sparkles, RefreshCw, Loader2,
  Check, X, Play, Trash2, Pencil, TrendingUp,
  Truck, Building2, CreditCard, Signpost, Share2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const PLACEMENT_ICONS: Record<string, React.ElementType> = {
  truck_wrap: Truck, condo_lobby: Building2, business_card: CreditCard, yard_sign: Signpost, social_ad: Share2,
};
const TYPE_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  expansion: { label: "Expansion géo", color: "text-blue-400", icon: MapPin },
  feature_boost: { label: "Feature boost", color: "text-emerald-400", icon: Rocket },
  placement_optimization: { label: "Placement opti", color: "text-amber-400", icon: Zap },
};
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-[hsl(220,14%,50%)]/20 text-[hsl(220,14%,50%)]",
  active: "bg-emerald-500/20 text-emerald-400",
  paused: "bg-amber-500/20 text-amber-400",
  completed: "bg-blue-500/20 text-blue-400",
};

export default function AdminCampaignLab() {
  const qc = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["auto-campaigns"],
    queryFn: async () => {
      const { data } = await supabase.from("auto_campaigns" as any).select("*").order("created_at", { ascending: false }).limit(50);
      return (data || []) as any[];
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["campaign-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("campaign_templates_ai" as any).select("*").order("performance_score", { ascending: false }).limit(20);
      return (data || []) as any[];
    },
  });

  const { data: generations = [] } = useQuery({
    queryKey: ["campaign-generations"],
    queryFn: async () => {
      const { data } = await supabase.from("campaign_generations" as any).select("*").order("created_at", { ascending: false }).limit(50);
      return (data || []) as any[];
    },
  });

  const runGenerator = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("campaign-generator");
      if (error) throw error;
      toast.success(`${data?.campaignsGenerated || 0} campagnes générées`);
      qc.invalidateQueries({ queryKey: ["auto-campaigns"] });
      qc.invalidateQueries({ queryKey: ["campaign-generations"] });
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setGenerating(false);
    }
  };

  const activateCampaign = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("auto_campaigns" as any).update({ status: "active", updated_at: new Date().toISOString() }).eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["auto-campaigns"] }); toast.success("Campagne activée"); },
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("auto_campaigns" as any).delete().eq("id", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["auto-campaigns"] }); },
  });

  const draftCampaigns = campaigns.filter((c: any) => c.status === "draft");
  const activeCampaigns = campaigns.filter((c: any) => c.status === "active");

  return (
    <div className="min-h-screen bg-[hsl(228,33%,4%)] text-[hsl(220,20%,93%)] p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center">
              <Brain className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AI Campaign Lab</h1>
              <p className="text-sm text-[hsl(220,14%,50%)]">Campagnes auto-générées par l'IA</p>
            </div>
          </div>
          <Button
            onClick={runGenerator}
            disabled={generating}
            className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 text-white shadow-[0_0_20px_-4px_hsl(200,70%,50%/0.4)]"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Génération..." : "Générer campagnes"}
          </Button>
        </motion.div>

        {/* Suggestions (drafts) */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[hsl(220,14%,50%)] uppercase tracking-wider">
            Suggestions IA ({draftCampaigns.length})
          </h2>
          {draftCampaigns.length === 0 ? (
            <div className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-8 text-center">
              <Sparkles className="h-8 w-8 text-[hsl(220,14%,50%)]/30 mx-auto mb-2" />
              <p className="text-sm text-[hsl(220,14%,50%)]">Lancez le générateur pour voir les suggestions</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draftCampaigns.map((c: any, i: number) => {
                const typeInfo = TYPE_LABELS[c.source_pattern?.type] || TYPE_LABELS.expansion;
                const TypeIcon = typeInfo.icon;
                const PlIcon = PLACEMENT_ICONS[c.placement_type] || Signpost;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-5 space-y-3 hover:border-[hsl(228,18%,20%)] transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <Badge className={`${STATUS_STYLES.draft} border-0 text-[10px]`}>Draft</Badge>
                      {c.expected_lift_pct > 0 && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                          <TrendingUp className="h-3 w-3" />+{c.expected_lift_pct}%
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-[hsl(220,14%,50%)]">
                      <TypeIcon className={`h-3 w-3 ${typeInfo.color}`} />
                      <span>{typeInfo.label}</span>
                      <span>•</span>
                      <PlIcon className="h-3 w-3" />
                      <span>{c.placement_type?.replace("_", " ")}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[hsl(220,14%,50%)]">
                      <MapPin className="h-3 w-3" />
                      <span>{c.target_city || "—"}</span>
                      <span>•</span>
                      <span className="capitalize">{c.feature}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-[10px] gap-1 bg-emerald-600/80 hover:bg-emerald-500 border-0"
                        onClick={() => activateCampaign.mutate(c.id)}
                      >
                        <Play className="h-3 w-3" />Activer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[10px] text-[hsl(220,14%,50%)]"
                        onClick={() => deleteCampaign.mutate(c.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Active campaigns */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[hsl(220,14%,50%)] uppercase tracking-wider">
            Campagnes actives ({activeCampaigns.length})
          </h2>
          <div className="bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl divide-y divide-[hsl(228,18%,13%)]">
            {activeCampaigns.length === 0 && (
              <div className="p-6 text-center text-sm text-[hsl(220,14%,50%)]">Aucune campagne active</div>
            )}
            {activeCampaigns.map((c: any) => {
              const typeInfo = TYPE_LABELS[c.source_pattern?.type] || TYPE_LABELS.expansion;
              return (
                <div key={c.id} className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <Rocket className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-[10px] text-[hsl(220,14%,50%)]">
                      {c.target_city} • {c.feature} • {typeInfo.label}
                    </p>
                  </div>
                  <Badge className={`${STATUS_STYLES.active} border-0 text-[10px]`}>Active</Badge>
                </div>
              );
            })}
          </div>
        </div>

        {/* Templates */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[hsl(220,14%,50%)] uppercase tracking-wider">
            Templates IA ({templates.length})
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {templates.length === 0 && (
              <div className="flex-shrink-0 w-60 bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-5 text-center">
                <p className="text-xs text-[hsl(220,14%,50%)]">Aucun template</p>
              </div>
            )}
            {templates.map((t: any) => (
              <div key={t.id} className="flex-shrink-0 w-60 bg-[hsl(228,25%,7%)]/80 border border-[hsl(228,18%,13%)] rounded-2xl p-4 space-y-2">
                <Badge className="bg-blue-500/20 text-blue-400 border-0 text-[10px]">{t.template_type}</Badge>
                <p className="text-xs">
                  <span className="capitalize">{t.feature}</span> • {t.placement_type?.replace("_", " ")}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  Score: {t.performance_score}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
