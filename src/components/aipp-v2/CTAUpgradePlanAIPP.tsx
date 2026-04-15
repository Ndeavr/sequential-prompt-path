import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export default function CTAUpgradePlanAIPP() {
  return (
    <div className="bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 rounded-2xl p-5 text-center">
      <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
      <h3 className="text-base font-semibold text-foreground mb-1">Améliorez votre score AIPP</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Nos experts IA optimisent votre présence pour que ChatGPT, Perplexity et Google vous recommandent.
      </p>
      <Link
        to="/entrepreneur"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
      >
        Activer mon profil UNPRO
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
