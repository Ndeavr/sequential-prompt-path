/**
 * Module 4 — Activation Start Page
 * Calendar connection, first steps, dashboard entry.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, BarChart3, MessageCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PageActivationStart() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-lg mx-auto px-4 py-3">
          <p className="text-sm font-bold text-foreground">Mise en route</p>
          <p className="text-xs text-muted-foreground">Vérifiez vos droits et configurez votre profil</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5 pb-36">
        {/* Plan status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border/50 bg-card p-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Activation à vérifier</p>
              <p className="text-xs text-muted-foreground">Cette page ne certifie pas le paiement. Les droits de 12 mois nécessitent une confirmation serveur.</p>
            </div>
          </div>
        </motion.div>

        {/* Calendar connection is not performed by this screen. Never simulate a successful OAuth handshake. */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-primary/20 bg-card p-5 space-y-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Configurer votre agenda</p>
              <p className="text-xs text-muted-foreground mt-1">
                La connexion Google Calendar ne s'effectue pas sur cette page. Aucun rendez-vous n'est activé ici.
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/pro")}>
            Ouvrir mon espace entrepreneur
          </Button>
        </motion.div>

        {/* Dashboard entry */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-border/50 bg-card p-5 space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Votre cockpit</p>
              <p className="text-xs text-muted-foreground">Retrouvez votre profil et les fonctionnalités disponibles dans votre espace entrepreneur.</p>
            </div>
          </div>
        </motion.div>

        {/* Appointments banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 to-secondary/5 border border-primary/20 p-4"
        >
          <p className="text-sm font-bold text-foreground">Rendez-vous exclusifs : offre distincte</p>
          <p className="text-xs text-muted-foreground mt-1">
            L'activation du profil à 350 $ couvre 12 mois de présence UNPRO. Elle n'inclut ni ne garantit de rendez-vous.
          </p>
        </motion.div>
      </div>

      {/* Sticky bottom */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-background/90 backdrop-blur-xl border-t border-border/30 p-4">
        <div className="max-w-lg mx-auto space-y-2">
          <Button
            size="lg"
            variant="premium"
            className="w-full h-12 rounded-xl text-base"
            onClick={() => navigate("/pro")}
          >
            <BarChart3 className="w-4 h-4 mr-2" /> Entrer dans mon cockpit
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full h-10 rounded-xl text-sm"
            onClick={() => navigate("/alex/voice/realtime")}
          >
            <MessageCircle className="w-4 h-4 mr-2" /> Parler à Clara
          </Button>
        </div>
      </div>
    </div>
  );
}
