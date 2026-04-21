/**
 * UNPRO — Personalized Outreach Landing Page
 */
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useOutreachTarget } from "@/hooks/useOutreachTarget";
import { motion } from "framer-motion";
import { Globe, MapPin, Shield, CheckCircle2, Clock, AlertTriangle, Search, Eye, Target, Sparkles, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.1 } } };

export default function PageOutreachLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("t");
  const navigate = useNavigate();
  const { model, loading, error, trackEvent, confirmIdentity } = useOutreachTarget(slug || "", token);
  const [confirmed, setConfirmed] = useState(false);

  if (loading) return (
    <div className="min-h-screen bg-[#060B14] flex items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Chargement de votre analyse…</div>
    </div>
  );

  if (error || !model) return (
    <div className="min-h-screen bg-[#060B14] flex items-center justify-center text-muted-foreground">
      <p>Cette analyse n'est plus disponible.</p>
    </div>
  );

  const handleConfirm = async () => {
    await confirmIdentity();
    setConfirmed(true);
    trackEvent("identity_confirmed");
  };

  const handleLaunchAudit = () => {
    trackEvent("continue_audit_clicked");
    if (model.preAuditId && model.contractorId) {
      navigate(`/contractor/aipp-audit/${model.contractorId}`);
    } else {
      navigate(`/audit?source=outreach&target=${model.targetId}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-foreground">
      {/* Hero */}
      <motion.section className="relative px-4 pt-16 pb-12 md:pt-24 md:pb-16 max-w-4xl mx-auto text-center" {...fadeUp}>
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none rounded-3xl" />
        <h1 className="font-display text-3xl md:text-4xl font-bold mb-4 leading-tight">
          Nous avons commencé à analyser la présence numérique de{" "}
          <span className="text-primary">{model.businessName}</span>.
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
          UNPRO détecte vos signaux publics réels pour révéler ce qui aide votre visibilité, ce qui la bloque, et ce qu'il faut corriger en priorité.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" onClick={handleLaunchAudit} className="gap-2">
            {model.primaryCtaLabel} <ArrowRight className="w-4 h-4" />
          </Button>
          {model.secondaryCtaLabel && (
            <Button size="lg" variant="outline" onClick={handleLaunchAudit}>
              {model.secondaryCtaLabel}
            </Button>
          )}
        </div>
      </motion.section>

      {/* Identity Confirmation Strip */}
      {model.confirmationRequired && !confirmed && (
        <motion.section className="max-w-2xl mx-auto px-4 mb-8" {...fadeUp} transition={{ delay: 0.2 }}>
          <div className="rounded-2xl border border-border/50 bg-card/50 backdrop-blur-md p-6">
            <p className="text-sm text-muted-foreground mb-3">Est-ce bien votre entreprise ?</p>
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Entreprise détectée : <strong>{model.businessName}</strong></div>
              {model.city && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Ville : <strong>{model.city}</strong></div>}
              {model.websiteUrl && <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Site détecté : <strong>{model.websiteUrl}</strong></div>}
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /> Statut : Analyse préparée</div>
            </div>
            <div className="flex gap-3">
              <Button size="sm" onClick={handleConfirm}>Oui, c'est bien moi</Button>
              <Button size="sm" variant="ghost" onClick={() => navigate(`/audit?source=outreach&target=${model.targetId}`)}>
                Modifier les informations
              </Button>
            </div>
          </div>
        </motion.section>
      )}

      {confirmed && (
        <motion.div className="max-w-2xl mx-auto px-4 mb-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <span className="text-sm text-green-300">Identité confirmée. Votre analyse complète est prête.</span>
          </div>
        </motion.div>
      )}

      {/* Audit Preview */}
      <motion.section className="max-w-2xl mx-auto px-4 mb-8" {...fadeUp} transition={{ delay: 0.3 }}>
        <div className="rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md p-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" /> Aperçu de votre analyse
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Nous avons déjà détecté une partie de votre empreinte publique. Confirmez votre entreprise pour générer votre lecture complète.</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {["Site web détecté", "Présence Google potentielle", "Signaux de confiance en validation", "Score complet prêt après confirmation"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Detected Signals Snapshot */}
      {model.detectedSignals.length > 0 && (
        <motion.section className="max-w-2xl mx-auto px-4 mb-8" variants={stagger} initial="initial" animate="animate">
          <h2 className="font-semibold text-lg mb-4">Ce que nous avons déjà détecté</h2>
          <div className="grid gap-2">
            {model.detectedSignals.map((sig, i) => (
              <motion.div key={i} variants={fadeUp} className="flex items-center gap-3 rounded-xl border border-border/30 bg-card/20 backdrop-blur-sm px-4 py-3 text-sm">
                {sig.status === "detected" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                ) : sig.status === "pending" ? (
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span>{sig.label}</span>
                <span className="ml-auto text-xs text-muted-foreground capitalize">{sig.status === "detected" ? "validé" : sig.status === "pending" ? "en validation" : "indisponible"}</span>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Why It Matters */}
      <motion.section className="max-w-4xl mx-auto px-4 mb-12" {...fadeUp} transition={{ delay: 0.5 }}>
        <h2 className="font-semibold text-xl mb-6 text-center">Pourquoi cela compte</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Eye, title: "Être trouvé", body: "Votre entreprise peut exister en ligne sans être clairement visible au bon moment." },
            { icon: Target, title: "Être compris", body: "Les IA et Google peuvent mal interpréter vos services, vos zones ou votre valeur." },
            { icon: Sparkles, title: "Être choisi", body: "Même si vous êtes trouvé, des signaux faibles peuvent ralentir la conversion." },
          ].map((card) => (
            <div key={card.title} className="rounded-2xl border border-border/30 bg-card/20 backdrop-blur-sm p-6 text-center">
              <card.icon className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground">{card.body}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Founder Eligibility */}
      {model.founderMode && (
        <motion.section className="max-w-2xl mx-auto px-4 mb-8" {...fadeUp}>
          <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 backdrop-blur-md p-6">
            <div className="flex items-center gap-2 mb-3">
              <Crown className="w-5 h-5 text-yellow-400" />
              <h3 className="font-semibold text-yellow-300">Accès prioritaire possible</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Certaines zones et catégories seront verrouillées plus tôt que d'autres. Si votre potentiel est confirmé, vous pourriez accéder à une offre fondateur réservée.
            </p>
            <Button variant="outline" size="sm" className="border-yellow-500/30 text-yellow-300" onClick={handleLaunchAudit}>
              Vérifier mon admissibilité
            </Button>
          </div>
        </motion.section>
      )}

      {/* Recommendation Teaser */}
      <motion.section className="max-w-2xl mx-auto px-4 mb-8" {...fadeUp}>
        <div className="rounded-2xl border border-border/30 bg-card/20 backdrop-blur-sm p-6 text-center">
          <h3 className="font-semibold mb-2">Votre potentiel semble réel</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Si vos signaux actuels sont confirmés, UNPRO pourra vous recommander le niveau d'activation le plus adapté à votre situation.
          </p>
        </div>
      </motion.section>

      {/* Trust Strip */}
      <motion.section className="max-w-4xl mx-auto px-4 mb-12" {...fadeUp}>
        <div className="flex flex-wrap justify-center gap-4">
          {["Données réelles", "Lecture claire", "Recommandation immédiate", "Activation possible"].map((badge) => (
            <div key={badge} className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/30 bg-card/10 text-xs text-muted-foreground">
              <Shield className="w-3 h-3 text-primary" />
              {badge}
            </div>
          ))}
        </div>
      </motion.section>

      {/* CTA Bridge */}
      <motion.section className="max-w-2xl mx-auto px-4 pb-16 text-center" {...fadeUp}>
        <p className="text-muted-foreground mb-6">
          Le plus rentable maintenant est de voir votre analyse complète et de corriger vos 3 blocages prioritaires.
        </p>
        <Button size="lg" onClick={handleLaunchAudit} className="gap-2">
          Lancer mon analyse complète <ArrowRight className="w-4 h-4" />
        </Button>
      </motion.section>
    </div>
  );
}
