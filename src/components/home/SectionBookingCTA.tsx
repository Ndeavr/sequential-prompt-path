/**
 * SectionBookingCTA — Homepage booking section with smart slot preview.
 * Shows next available slots and drives to booking flow.
 */
import { motion } from "framer-motion";
import { Calendar, Clock, ArrowRight, Shield, CheckCircle2, Sparkles, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { Link } from "react-router-dom";

const SMART_SLOTS = [
  { day: "Demain", time: "10h00", label: "Le plus rapide", variant: "success" as const },
  { day: "Mer.", time: "14h00", label: "Recommandé", variant: "primary" as const },
  { day: "Ven.", time: "9h00", label: "Disponible", variant: "muted" as const },
];

export default function SectionBookingCTA() {
  const { openAlex } = useAlexVoice();

  return (
    <section className="px-5 py-14 md:py-20">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-[22px] sm:text-[28px] md:text-[36px] font-bold text-foreground leading-tight">
            Réservez en <span className="text-primary">30 secondes</span>
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Pas de formulaire. Pas d'attente. Un rendez-vous confirmé avec le bon entrepreneur.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="glass-card rounded-3xl p-5 sm:p-7 space-y-5">
            {/* Smart slots preview */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                Prochaines disponibilités
              </p>
              <div className="grid grid-cols-3 gap-2">
                {SMART_SLOTS.map((slot) => (
                  <div
                    key={`${slot.day}-${slot.time}`}
                    className={`rounded-xl border p-3 text-center transition-all cursor-pointer hover:shadow-md ${
                      slot.variant === "success"
                        ? "border-success/30 bg-success/5"
                        : slot.variant === "primary"
                          ? "border-primary/30 bg-primary/5"
                          : "border-border/40 bg-muted/20"
                    }`}
                  >
                    <p className="text-sm font-bold text-foreground">{slot.day}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center mt-0.5">
                      <Clock className="h-3 w-3" /> {slot.time}
                    </p>
                    {slot.label && (
                      <span className={`mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        slot.variant === "success"
                          ? "text-success bg-success/10"
                          : slot.variant === "primary"
                            ? "text-primary bg-primary/10"
                            : "text-muted-foreground bg-muted/40"
                      }`}>
                        {slot.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Trust signals */}
            <div className="flex items-center gap-4 justify-center text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-success" /> Rendez-vous garanti</span>
              <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-primary" /> Entrepreneur vérifié</span>
            </div>

            {/* CTAs */}
            <div className="space-y-2.5">
              <Button
                onClick={() => openAlex("general")}
                size="lg"
                className="w-full h-12 rounded-xl gap-2 text-sm font-bold"
              >
                <Mic className="h-4 w-4" /> Parler à Alex pour réserver
              </Button>
              <Link
                to="/describe-project"
                className="w-full h-11 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold bg-card border border-border text-foreground hover:bg-muted/50 transition-all"
              >
                Décrire mon projet <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Alex micro-prompt */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex items-center justify-center gap-2"
        >
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <p className="text-xs text-muted-foreground italic">
            "Je m'occupe de tout. Dites-moi ce dont vous avez besoin."
          </p>
        </motion.div>
      </div>
    </section>
  );
}
