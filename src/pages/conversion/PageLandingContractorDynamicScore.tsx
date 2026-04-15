/**
 * PageLandingContractorDynamicScore
 * Dynamic landing page generated for each contractor prospect.
 * Shows their AIPP score, lost revenue, plan recommendation.
 * Accessed via /contractor/score/:token
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  TrendingUp, DollarSign, Star, MapPin, Sparkles,
  ArrowRight, Shield, Eye, MessageSquare, BarChart3,
  Loader2, AlertTriangle, Zap, Clock,
} from "lucide-react";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const ScoreGauge = ({ score, label, color }: { score: number; label: string; color: string }) => (
  <div className="space-y-1">
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{score}</span>
    </div>
    <Progress value={score} className={`h-1.5 ${color}`} />
  </div>
);

const PageLandingContractorDynamicScore = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      // Try outbound_email_tokens first
      const { data: tokenData, error: tokenErr } = await supabase
        .from("outbound_email_tokens")
        .select("*")
        .eq("id", token!)
        .maybeSingle();

      if (tokenErr || !tokenData) {
        setError("Lien invalide ou expiré.");
        setLoading(false);
        return;
      }

      // Get enriched data if available
      let enriched = null;
      if (tokenData.prospect_id) {
        const { data: ep } = await supabase
          .from("contractor_enriched_profiles")
          .select("*")
          .eq("lead_id", tokenData.prospect_id)
          .maybeSingle();
        enriched = ep;
      }

      setData({
        company_name: tokenData.company_name || "Votre entreprise",
        city: tokenData.city || "Québec",
        category: tokenData.category || "Services résidentiels",
        score: tokenData.score || 42,
        revenue_lost: tokenData.revenue_lost || 35000,
        reviews_count: enriched?.reviews_count || 0,
        rating: enriched?.rating || 0,
        rbq_status: enriched?.rbq_status,
        visibility: 35,
        trust: enriched?.rbq_status === "active" ? 80 : 30,
        conversion: 45,
        content: 28,
      });
    } catch (e: any) {
      setError("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = () => {
    toast.success("Redirection vers l'activation...");
    navigate("/entrepreneur/onboarding-voice");
  };

  const handleTalkToAlex = () => {
    navigate("/alex");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <AlertTriangle className="h-10 w-10 text-amber-400" />
        <p className="text-foreground font-medium">{error || "Données non disponibles"}</p>
        <Button onClick={() => navigate("/")} variant="outline" size="sm">Retour</Button>
      </div>
    );
  }

  const scoreColor = data.score >= 70 ? "text-green-400" : data.score >= 40 ? "text-amber-400" : "text-red-400";
  const slotsLeft = Math.max(1, Math.min(3, 5 - Math.floor(data.score / 25)));

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full bg-primary/5 blur-[150px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full bg-accent/5 blur-[120px]" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="text-center space-y-3">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Diagnostic IA personnalisé
          </Badge>

          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            {data.company_name}
          </h1>

          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{data.city}</span>
            <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5" />{data.rating > 0 ? `${data.rating}/5` : "N/A"}</span>
          </div>
        </motion.div>

        {/* Score Card */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.1 }}
          className="relative p-6 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50"
        >
          <div className="text-center mb-6">
            <p className="text-xs text-muted-foreground mb-2">Score AIPP</p>
            <div className={`text-5xl font-black ${scoreColor}`}>{data.score}</div>
            <p className="text-xs text-muted-foreground mt-1">/100</p>
          </div>

          <div className="space-y-3">
            <ScoreGauge score={data.visibility} label="Visibilité" color="" />
            <ScoreGauge score={data.trust} label="Confiance" color="" />
            <ScoreGauge score={data.conversion} label="Conversion" color="" />
            <ScoreGauge score={data.content} label="Contenu" color="" />
          </div>
        </motion.div>

        {/* Revenue Loss */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
          className="p-4 rounded-2xl bg-red-950/20 border border-red-500/20"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/10">
              <DollarSign className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-red-300/70">Revenus perdus estimés / an</p>
              <p className="text-2xl font-bold text-red-400">
                {data.revenue_lost.toLocaleString("fr-CA")} $
              </p>
            </div>
          </div>
        </motion.div>

        {/* Breakdown */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { icon: Eye, label: "Visibilité IA", value: `${data.visibility}%`, sub: "Faible" },
            { icon: Shield, label: "Confiance", value: data.rbq_status === "active" ? "RBQ ✓" : "Non vérifié", sub: data.rbq_status === "active" ? "Actif" : "Manquant" },
            { icon: BarChart3, label: "Avis Google", value: data.reviews_count || "0", sub: data.reviews_count > 10 ? "Bon" : "Insuffisant" },
            { icon: TrendingUp, label: "Conversion", value: `${data.conversion}%`, sub: "À améliorer" },
          ].map((item, i) => (
            <div key={i} className="p-3 rounded-xl bg-card/30 border border-border/30">
              <item.icon className="h-4 w-4 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-bold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.sub}</p>
            </div>
          ))}
        </motion.div>

        {/* Urgency Banner */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
          className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 flex items-center gap-3"
        >
          <Clock className="h-5 w-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-300">
              {slotsLeft} place{slotsLeft > 1 ? "s" : ""} disponible{slotsLeft > 1 ? "s" : ""} dans votre secteur
            </p>
            <p className="text-xs text-amber-400/60">Territoire {data.city} — {data.category}</p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <Button
            onClick={handleActivate}
            className="w-full gap-2 rounded-xl h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:opacity-90"
          >
            <Zap className="h-5 w-5" />
            Activer mes rendez-vous
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleTalkToAlex}
            variant="outline"
            className="w-full gap-2 rounded-xl h-10"
          >
            <MessageSquare className="h-4 w-4" />
            Parler à Alex — Assistant IA
          </Button>
        </motion.div>

        {/* Trust signals */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-4"
        >
          <span>✓ Gratuit</span>
          <span>✓ Sans engagement</span>
          <span>✓ Résultat instantané</span>
        </motion.div>
      </div>
    </div>
  );
};

export default PageLandingContractorDynamicScore;
