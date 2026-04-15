import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, TrendingUp, DollarSign, MapPin, Star, Calendar, Sparkles, ArrowRight, Clock, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useTrackClick, useAlexContext, useCreateBookingSession, useConvertProspect } from "@/hooks/useEmailConversion";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const PageLandingPersonalizedAIPP = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: clickData, isLoading: clickLoading } = useTrackClick(token);
  const { data: alexData, isLoading: alexLoading } = useAlexContext(token);
  const bookingMutation = useCreateBookingSession();
  const convertMutation = useConvertProspect();
  const [showAlex, setShowAlex] = useState(false);

  const lead = clickData?.lead;
  const context = alexData?.context;
  const companyName = lead?.company_name || context?.company_name || "Votre entreprise";
  const city = lead?.city || context?.city || "Votre ville";
  const category = lead?.category || context?.category || "Services résidentiels";

  // Mock AIPP score (would come from real calculation)
  const aippScore = 42;
  const revenueLost = Math.round((100 - aippScore) * 850);
  const slotsLeft = Math.max(1, Math.min(3, Math.floor(Math.random() * 3) + 1));

  const isLoading = clickLoading || alexLoading;

  const handleBookDemo = () => {
    if (!token) return;
    bookingMutation.mutate(
      { token, company_name: companyName, city, category },
      {
        onSuccess: () => {
          convertMutation.mutate({ token, company_name: companyName, city, category });
          toast.success("Rendez-vous réservé!");
          navigate(`/entrepreneur/onboarding-voice`);
        },
        onError: () => toast.error("Erreur — réessayez"),
      }
    );
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowAlex(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Analyse de votre visibilité...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Hero - Score Reveal */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ duration: 0.5 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 via-background to-primary/5 border border-primary/20 p-6 text-center space-y-4"
        >
          <div className="flex items-center justify-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">{city}</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{companyName}</h1>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">{category}</p>

          {/* Score Ring */}
          <div className="relative inline-flex items-center justify-center w-28 h-28">
            <svg width={112} height={112} className="-rotate-90">
              <circle cx={56} cy={56} r={48} fill="none" stroke="hsl(var(--muted))" strokeWidth={8} />
              <circle cx={56} cy={56} r={48} fill="none" stroke="hsl(var(--primary))" strokeWidth={8}
                strokeDasharray={2 * Math.PI * 48} strokeDashoffset={2 * Math.PI * 48 * (1 - aippScore / 100)}
                strokeLinecap="round" className="transition-all duration-1000" />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-bold text-foreground">{aippScore}</span>
              <span className="text-[10px] text-muted-foreground font-medium">/100</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Score de visibilité AIPP</p>
        </motion.div>

        {/* Revenue Lost */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.2 }}
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-semibold text-foreground">Argent laissé sur la table</h2>
          </div>
          <p className="text-2xl font-bold text-destructive">{revenueLost.toLocaleString("fr-CA")} $ / an</p>
          <p className="text-xs text-muted-foreground">
            Basé sur votre score AIPP et le marché {category.toLowerCase()} à {city}
          </p>
        </motion.div>

        {/* Insights Cards */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3"
        >
          {[
            { icon: TrendingUp, label: "Croissance potentielle", value: "+35%", color: "text-emerald-500" },
            { icon: Star, label: "Positionnement", value: "Top 20%", color: "text-amber-500" },
            { icon: Users, label: "Leads mensuels", value: "12-18", color: "text-primary" },
            { icon: Clock, label: "Premier RDV", value: "< 7 jours", color: "text-emerald-500" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border/30 bg-card p-3 space-y-1">
              <item.icon className={`h-4 w-4 ${item.color}`} />
              <p className="text-lg font-bold text-foreground">{item.value}</p>
              <p className="text-[10px] text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Scarcity Badge */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20"
        >
          <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-semibold text-amber-600">
            Il reste {slotsLeft} place{slotsLeft > 1 ? "s" : ""} pour {city}
          </span>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.5 }}
        >
          <Button
            onClick={handleBookDemo}
            disabled={bookingMutation.isPending}
            className="w-full h-14 text-base font-semibold gap-2 rounded-xl"
            size="lg"
          >
            {bookingMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Calendar className="h-5 w-5" />
                Réserver une démo avec Alex
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </motion.div>

        {/* Alex Assist Panel */}
        {showAlex && alexData?.greeting && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Alex — Assistant IA</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{alexData.greeting}</p>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/alex")}>
              <Sparkles className="h-3 w-3" /> Parler avec Alex
            </Button>
          </motion.div>
        )}

        {/* Recommendations */}
        <motion.div
          initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.6 }}
          className="rounded-xl border border-border/30 bg-card p-4 space-y-3"
        >
          <h3 className="text-sm font-semibold text-foreground">Recommandations</h3>
          {[
            "Optimiser votre profil Google Business",
            "Activer la prise de rendez-vous en ligne",
            "Améliorer vos avis clients (cible: 4.5★)",
          ].map((rec, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-primary">{i + 1}</span>
              </div>
              <p className="text-sm text-muted-foreground">{rec}</p>
            </div>
          ))}
        </motion.div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-[11px] text-muted-foreground">Propulsé par UNPRO — Intelligence artificielle pour entrepreneurs</p>
        </div>
      </div>
    </div>
  );
};

export default PageLandingPersonalizedAIPP;
