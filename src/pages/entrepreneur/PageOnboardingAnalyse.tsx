import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, BarChart3, Globe, Star, MapPin, Shield } from "lucide-react";

export default function PageOnboardingAnalyse() {
  const navigate = useNavigate();

  // Mock analysis data — will be replaced by real enrichment data
  const analysis = {
    visibility_score: 62,
    reviews_score: 78,
    website_score: 45,
    seo_score: 38,
    trust_score: 55,
    opportunities: [
      "Votre fiche Google n'est pas optimisée pour les recherches locales",
      "Vous n'apparaissez pas dans les résultats IA (ChatGPT, Gemini)",
      "Vos avis Google ne sont pas mis en valeur sur votre site",
      "Aucune page de service dédiée détectée",
    ],
    strengths: [
      "Bonne note Google (4.2/5)",
      "Numéro de téléphone vérifié",
      "Présence sur Google Maps confirmée",
    ],
  };

  const scoreColor = (score: number) =>
    score >= 70 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Analyse de votre visibilité
          </h1>
          <p className="text-xs text-muted-foreground">Étape 2/5 — Votre diagnostic IA</p>
        </div>
      </div>

      {/* Overall Score */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-2">Score de visibilité IA</p>
          <p className={`text-5xl font-black ${scoreColor(analysis.visibility_score)}`}>
            {analysis.visibility_score}<span className="text-lg text-muted-foreground">/100</span>
          </p>
          <Badge variant="outline" className="mt-2 text-amber-400 border-amber-400/30">
            Potentiel non exploité
          </Badge>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Avis Google", score: analysis.reviews_score, icon: Star },
          { label: "Site Web", score: analysis.website_score, icon: Globe },
          { label: "SEO Local", score: analysis.seo_score, icon: MapPin },
          { label: "Confiance", score: analysis.trust_score, icon: Shield },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <item.icon className={`h-4 w-4 ${scoreColor(item.score)}`} />
              <div>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className={`text-lg font-bold ${scoreColor(item.score)}`}>{item.score}%</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Opportunities */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-red-400">🔴 Opportunités manquées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analysis.opportunities.map((opp, i) => (
            <p key={i} className="text-xs text-muted-foreground flex gap-2">
              <span className="text-red-400">•</span> {opp}
            </p>
          ))}
        </CardContent>
      </Card>

      {/* Strengths */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-emerald-400">✓ Points forts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analysis.strengths.map((s, i) => (
            <p key={i} className="text-xs text-muted-foreground flex gap-2">
              <span className="text-emerald-400">✓</span> {s}
            </p>
          ))}
        </CardContent>
      </Card>

      {/* CTA */}
      <Button className="w-full" size="lg" onClick={() => navigate("/entrepreneur/onboarding/plan")}>
        Voir mon plan recommandé
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
