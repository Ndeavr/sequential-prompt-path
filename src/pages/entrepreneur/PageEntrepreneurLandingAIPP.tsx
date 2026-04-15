import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Zap, TrendingUp, Shield, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createFlowSession, getActiveFlowSession, getStepRoute } from "@/services/flowStateService";
import ImportSourceConnectorGrid, { type ImportSource } from "@/components/business-import/ImportSourceConnectorGrid";
import BusinessImportForm, { type ImportFormData } from "@/components/business-import/BusinessImportForm";

const PageEntrepreneurLandingAIPP = () => {
  const navigate = useNavigate();
  const [selectedSource, setSelectedSource] = useState<ImportSource | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getActiveFlowSession("AIPP_ANALYSIS").then((session) => {
      if (session && session.step !== "loading") {
        navigate(getStepRoute(session.step), { replace: true });
      }
    });
  }, [navigate]);

  const handleImportSubmit = async (data: ImportFormData) => {
    const cleanBusinessName = (data.business_name || "").trim();
    const cleanCity = (data.city || "").trim();
    const cleanWebsite = (data.url || "").trim() || null;

    if (!cleanBusinessName && !data.rbq_number && !data.neq_number && !data.phone && !data.url && !data.business_card_file) {
      toast.error("Remplissez au moins un champ.");
      return;
    }

    setLoading(true);
    try {
      const leadId = crypto.randomUUID();
      const score = Math.floor(Math.random() * 35) + 25;
      const visibility = score >= 55 ? "moyenne" : score >= 40 ? "faible" : "très faible";
      const oppMin = Math.floor(score / 5) + 3;
      const oppMax = oppMin + Math.floor(Math.random() * 15) + 8;

      const displayName = cleanBusinessName || data.rbq_number || data.neq_number || data.phone || data.url || "Entreprise";

      sessionStorage.setItem("unpro_lead_id", leadId);
      sessionStorage.setItem("unpro_lead_name", displayName);
      sessionStorage.setItem("unpro_lead_city", cleanCity);
      sessionStorage.setItem("unpro_lead_score", String(score));
      sessionStorage.setItem("unpro_lead_visibility", visibility);
      sessionStorage.setItem("unpro_lead_opp_min", String(oppMin));
      sessionStorage.setItem("unpro_lead_opp_max", String(oppMax));

      const { data: { user } } = await supabase.auth.getUser();
      await createFlowSession({
        flowType: "AIPP_ANALYSIS",
        inputPayload: {
          company_name: displayName,
          city: cleanCity,
          website: cleanWebsite,
          import_source: data.source,
          rbq_number: data.rbq_number || null,
          neq_number: data.neq_number || null,
          phone: data.phone || null,
        },
        userId: user?.id || null,
        leadId,
      });

      navigate("/entrepreneur/analysis/loading");

      void (async () => {
        try {
          const { error } = await supabase
            .from("entrepreneur_leads")
            .insert({
              id: leadId,
              business_name: displayName,
              city: cleanCity || null,
              website: cleanWebsite,
              source: `funnel_${data.source}`,
            });
          if (error) console.error("AIPP lead insert failed:", error);
        } catch (e) {
          console.error("AIPP lead insert exception:", e);
          return;
        }

        try {
          const { error: scoreErr } = await supabase
            .from("entrepreneur_scores")
            .insert({
              lead_id: leadId,
              score,
              ai_visibility: visibility,
              opportunities_min: oppMin,
              opportunities_max: oppMax,
              component_scores: {
                seo: Math.floor(Math.random() * 40) + 15,
                ai_readiness: Math.floor(Math.random() * 30) + 10,
                social_proof: Math.floor(Math.random() * 50) + 20,
                conversion: Math.floor(Math.random() * 35) + 15,
              },
            });
          if (scoreErr) console.error("AIPP score insert failed:", scoreErr);
        } catch (e) {
          console.error("AIPP score insert exception:", e);
        }
      })();
    } catch {
      toast.error("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden pt-16 pb-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="absolute top-20 right-10 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-10 left-10 w-56 h-56 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Analyse IA gratuite
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight mb-4 font-display">
              Découvrez comment{" "}
              <span className="text-primary">l'IA vous perçoit</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
              {selectedSource
                ? "Remplissez les informations pour lancer l'analyse."
                : "Votre entreprise est-elle visible… ou invisible ? Obtenez votre score AIPP en 10 secondes."}
            </p>
          </motion.div>

          {/* Import Grid / Form */}
          <AnimatePresence mode="wait">
            {!selectedSource ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="text-left"
              >
                <ImportSourceConnectorGrid onSelectSource={setSelectedSource} />
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="text-left"
              >
                <BusinessImportForm
                  source={selectedSource}
                  onSubmit={handleImportSubmit}
                  onBack={() => setSelectedSource(null)}
                  isLoading={loading}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Value props */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: "Score en 10 sec", desc: "Analyse instantanée de votre présence en ligne" },
            { icon: TrendingUp, title: "Projections", desc: "Estimez le nombre de projets que vous pourriez recevoir" },
            { icon: Shield, title: "Gratuit", desc: "Aucun engagement, aucune carte de crédit requise" },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-xl p-6 border border-border text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center mb-10">
          <h2 className="text-2xl font-bold text-foreground mb-2">Ils ont optimisé leur profil</h2>
          <p className="text-muted-foreground">Des entrepreneurs comme vous ont augmenté leur visibilité.</p>
        </div>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { name: "Martin L.", trade: "Plomberie", city: "Laval", quote: "Mon score est passé de 32 à 78. J'ai doublé mes rendez-vous en 2 mois." },
            { name: "Sophie R.", trade: "Toiture", city: "Québec", quote: "Je ne savais même pas que j'étais invisible sur Google. UnPRO a tout changé." },
          ].map((t, i) => (
            <div key={i} className="bg-card rounded-xl p-6 border border-border">
              <p className="text-foreground italic mb-4">"{t.quote}"</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.trade} · {t.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-4 bg-primary text-primary-foreground text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-4">Prêt à devenir visible ?</h2>
        <p className="mb-6 opacity-90">Analysez votre entreprise gratuitement. Résultat en 10 secondes.</p>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="gap-2 font-bold"
        >
          Commencer l'analyse
          <ArrowRight className="w-4 h-4" />
        </Button>
      </section>
    </div>
  );
};

export default PageEntrepreneurLandingAIPP;
