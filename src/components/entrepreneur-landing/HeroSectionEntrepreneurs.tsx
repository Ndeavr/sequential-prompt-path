import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, MapPin, ShieldCheck, Zap, Globe, Megaphone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function HeroSectionEntrepreneurs({ onTrackCta }: Props) {
  const navigate = useNavigate();

  const bullets = [
    { icon: Globe, text: "Pas besoin de refaire votre site web" },
    { icon: Megaphone, text: "Pas besoin de comprendre le SEO" },
    { icon: Zap, text: "Pas besoin de gérer des pubs compliquées" },
    { icon: FileText, text: "Pas besoin de courir après trop de soumissions" },
  ];

  return (
    <section className="relative overflow-hidden pt-16 pb-20 px-4">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-accent/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Left — Copy */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Places limitées par ville
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground leading-tight font-display">
              Vous faites déjà le travail.
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                UNPRO vous amène les clients.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-lg">
              Rendez-vous qualifiés. Clients sérieux. Pas de leads partagés à 5 ou 6 concurrents.
            </p>

            <ul className="space-y-2.5">
              {bullets.map((b, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="flex items-center gap-2.5 text-sm text-foreground/80"
                >
                  <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center shrink-0">
                    <b.icon className="w-3.5 h-3.5 text-success" />
                  </div>
                  {b.text}
                </motion.li>
              ))}
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                size="lg"
                className="gap-2 font-bold text-base"
                onClick={() => { onTrackCta("hero_score", "hero"); navigate("/entrepreneur/score"); }}
              >
                Voir mon score actuel
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="gap-2"
                onClick={() => { onTrackCta("hero_alex", "hero"); navigate("/alex"); }}
              >
                <MessageCircle className="w-4 h-4" />
                Parler à Alex
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="gap-2 text-muted-foreground"
                onClick={() => { onTrackCta("hero_city", "hero"); document.getElementById("section-territories")?.scrollIntoView({ behavior: "smooth" }); }}
              >
                <MapPin className="w-4 h-4" />
                Vérifier ma ville
              </Button>
            </div>
          </motion.div>

          {/* Right — Score + Revenue Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4"
          >
            {/* AIPP Score Preview */}
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Score pré-UNPRO</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warning/10 text-warning">Partiellement visible</span>
              </div>
              <div className="flex items-end gap-3">
                <div className="text-5xl font-extrabold text-foreground font-display">41</div>
                <div className="text-lg text-muted-foreground mb-1.5">/100</div>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "41%" }}
                  transition={{ delay: 0.6, duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-warning to-destructive"
                />
              </div>
              <p className="text-xs text-muted-foreground">Visibilité IA · Confiance · Présence locale</p>
            </div>

            {/* Revenue Lost Preview */}
            <div className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenus laissés sur la table</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-destructive font-display">~4 200$</span>
                <span className="text-sm text-muted-foreground">/mois</span>
              </div>
              <p className="text-xs text-muted-foreground">Basé sur votre domaine et votre zone — estimation IA</p>
            </div>

            {/* Scarcity Badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/20 bg-primary/5">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="text-xs text-foreground/80">
                <span className="font-bold text-primary">3 places restantes</span> pour Couvreur · Montréal Nord
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
