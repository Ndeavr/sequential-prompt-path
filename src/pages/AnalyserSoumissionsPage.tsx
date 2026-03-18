import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, Shield, AlertTriangle, CheckCircle2, ArrowRight, Eye } from "lucide-react";
import { motion } from "framer-motion";
import PageHero from "@/components/shared/PageHero";
import CTASection from "@/components/shared/CTASection";

export default function AnalyserSoumissionsPage() {
  return (
    <>
      <Helmet>
        <title>Analyser mes soumissions | UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        <PageHero
          title="Analyser mes soumissions"
          subtitle="Comparez vos soumissions de rénovation avec l'intelligence artificielle. Repérez les oublis, les écarts de prix et les clauses douteuses."
          compact
        />

        {/* Upload area */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-dashed border-2 border-primary/30 hover:border-primary/50 transition-colors">
            <CardContent className="p-10 text-center space-y-4">
              <Upload className="h-12 w-12 text-primary/40 mx-auto" />
              <h3 className="text-lg font-semibold text-foreground">Téléversez vos soumissions</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Glissez vos fichiers PDF, photos ou documents ici. Notre IA analysera chaque soumission en détail.
              </p>
              <Button size="lg" className="gap-2">
                <Upload className="h-4 w-4" /> Téléverser une soumission
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI analysis capabilities */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: <Eye className="h-6 w-6" />, title: "Repérer les oublis", desc: "L'IA identifie les postes manquants que vous n'auriez pas remarqués." },
            { icon: <CheckCircle2 className="h-6 w-6" />, title: "Comparer les inclusions", desc: "Voyez exactement ce qui est inclus et exclu dans chaque soumission." },
            { icon: <AlertTriangle className="h-6 w-6" />, title: "Détecter les anomalies", desc: "Prix suspects, clauses inhabituelles, garanties absentes." },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}>
              <Card className="h-full">
                <CardContent className="p-5 space-y-3">
                  <div className="text-primary">{item.icon}</div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Sample comparison preview */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <h2 className="text-xl font-bold text-foreground mb-4">Exemple d'analyse</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              { name: "Toitures Laval Pro", price: "12 500 $", inclusions: ["Bardeaux GAF", "Protection glace", "Nettoyage"], exclusions: ["Soffites", "Fascia"], warranty: "25 ans", anomaly: false },
              { name: "Couvreur Express", price: "9 800 $", inclusions: ["Bardeaux BP", "Nettoyage"], exclusions: ["Protection glace", "Soffites", "Ventilation"], warranty: "10 ans", anomaly: true },
            ].map((q, i) => (
              <Card key={i} className={q.anomaly ? "border-warning/50" : ""}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-foreground">{q.name}</h4>
                    <span className="text-lg font-bold text-foreground">{q.price}</span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-green-600 font-medium">Inclus :</span> {q.inclusions.join(", ")}</div>
                    <div><span className="text-destructive font-medium">Exclus :</span> {q.exclusions.join(", ")}</div>
                    <div><span className="text-muted-foreground">Garantie :</span> {q.warranty}</div>
                  </div>
                  {q.anomaly && (
                    <div className="flex items-center gap-2 text-warning text-xs font-medium">
                      <AlertTriangle className="h-3.5 w-3.5" /> Protection glace manquante — risque d'infiltration
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Trust block */}
        <Card className="bg-muted/30">
          <CardContent className="p-6 flex items-start gap-4">
            <Shield className="h-8 w-8 text-primary shrink-0" />
            <div>
              <h3 className="font-semibold text-foreground">Vos documents sont privés</h3>
              <p className="text-sm text-muted-foreground mt-1">Vos soumissions ne sont jamais partagées, jamais indexées, et réservées exclusivement à votre compte. Analyse confidentielle garantie.</p>
            </div>
          </CardContent>
        </Card>

        <CTASection
          title="Prêt à analyser?"
          description="Téléversez vos soumissions et obtenez une analyse détaillée en quelques minutes."
          primaryCta={{ label: "Analyser maintenant", to: "/dashboard/quotes/upload" }}
          secondaryCta={{ label: "Parler à Alex", to: "/parler-a-alex" }}
          variant="accent"
        />
      </div>
    </>
  );
}
