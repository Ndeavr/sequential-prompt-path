import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Eye, TrendingUp, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScoreRing from "@/components/ui/score-ring";

const PageEntrepreneurScoreResult = () => {
  const navigate = useNavigate();
  const [score, setScore] = useState(0);
  const [visibility, setVisibility] = useState("faible");
  const [oppMin, setOppMin] = useState(0);
  const [oppMax, setOppMax] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [showAlex, setShowAlex] = useState(false);

  useEffect(() => {
    const s = sessionStorage.getItem("unpro_lead_score");
    if (!s) {
      navigate("/entrepreneur");
      return;
    }
    setScore(Number(s));
    setVisibility(sessionStorage.getItem("unpro_lead_visibility") || "faible");
    setOppMin(Number(sessionStorage.getItem("unpro_lead_opp_min") || 0));
    setOppMax(Number(sessionStorage.getItem("unpro_lead_opp_max") || 0));
    setBusinessName(sessionStorage.getItem("unpro_lead_name") || "");

    // Trigger Alex after 3s
    const timer = setTimeout(() => setShowAlex(true), 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const visibilityColor = visibility === "moyenne" ? "text-warning" : visibility === "très faible" ? "text-destructive" : "text-accent";
  const visibilityBg = visibility === "moyenne" ? "bg-warning/10" : visibility === "très faible" ? "bg-destructive/10" : "bg-accent/10";

  const improvements = [
    { label: "Données structurées manquantes", impact: "+12 pts", done: false },
    { label: "Aucun avis Google connecté", impact: "+8 pts", done: false },
    { label: "Fiche entreprise incomplète", impact: "+10 pts", done: false },
    { label: "Pas de photos de projets", impact: "+6 pts", done: false },
    { label: "Certifications non vérifiées", impact: "+5 pts", done: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl p-8 border border-border shadow-lg text-center mb-6"
        >
          <p className="text-sm text-muted-foreground mb-2">Résultat pour</p>
          <h1 className="text-2xl font-bold text-foreground mb-6">{businessName}</h1>

          <div className="flex justify-center mb-6">
            <ScoreRing score={score} size={140} strokeWidth={10} label="AIPP" />
          </div>

          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${visibilityBg} ${visibilityColor} font-semibold text-sm mb-4`}>
            <Eye className="w-4 h-4" />
            Visibilité IA : {visibility}
          </div>

          <p className="text-muted-foreground text-sm">
            Score basé sur votre présence en ligne, vos données structurées et votre préparation IA.
          </p>
        </motion.div>

        {/* Opportunity Estimator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-md mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-success" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">Estimation d'opportunités</h2>
              <p className="text-xs text-muted-foreground">Projets potentiels par mois</p>
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-center">
            <p className="text-3xl font-extrabold text-foreground mb-1">
              {oppMin} – {oppMax} <span className="text-lg font-normal text-muted-foreground">projets/mois</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Votre profil est sous-optimisé. Avec un score de 75+, ce chiffre pourrait doubler.
            </p>
          </div>
        </motion.div>

        {/* Improvements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl p-6 border border-border shadow-md mb-6"
        >
          <h2 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Ce qui vous fait perdre des clients
          </h2>

          <div className="space-y-3">
            {improvements.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-destructive/40" />
                  )}
                  <span className="text-sm text-foreground">{item.label}</span>
                </div>
                <span className="text-xs font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">{item.impact}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTAs */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate("/entrepreneur/pricing")}
            size="lg"
            className="w-full h-14 text-lg font-bold gap-2 rounded-xl"
          >
            Optimiser mon profil
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/login")}
            size="lg"
            className="w-full h-12 gap-2 rounded-xl"
          >
            Voir l'analyse complète
          </Button>
        </div>

        {/* Alex Intervention */}
        {showAlex && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-4 left-4 right-4 max-w-lg mx-auto bg-card rounded-2xl p-5 border border-primary/20 shadow-2xl z-50"
          >
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground text-sm mb-1">Alex d'UnPRO</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Je vois exactement ce qui bloque votre visibilité. En quelques minutes, je peux optimiser votre profil et vous connecter avec des clients qualifiés. On le fait ensemble ?
                </p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={() => navigate("/entrepreneur/pricing")} className="gap-1 text-xs">
                    Oui, allons-y <ArrowRight className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAlex(false)} className="text-xs">
                    Plus tard
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PageEntrepreneurScoreResult;
