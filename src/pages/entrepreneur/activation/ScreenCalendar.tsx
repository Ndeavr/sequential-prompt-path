/**
 * Screen 6 — Calendar Connection
 * Google Calendar OAuth + simple availability + sticky CTA.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Check, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useActivationFunnel } from "@/hooks/useActivationFunnel";
import { useHesitationRescue } from "@/hooks/useHesitationRescue";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";

const DAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const TIME_SLOTS = ["8h-12h", "12h-17h", "17h-20h"];

export default function ScreenCalendar() {
  const navigate = useNavigate();
  const { state, updateFunnel } = useActivationFunnel();
  const [selectedDays, setSelectedDays] = useState<string[]>(["Lun", "Mar", "Mer", "Jeu", "Ven"]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>(["8h-12h", "12h-17h"]);
  const [connected, setConnected] = useState(state.calendar_connected);
  useHesitationRescue({ screenKey: "calendar" });

  const handleConnect = () => {
    setConnected(true);
    updateFunnel({ calendar_connected: true });
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const toggleSlot = (slot: string) => {
    setSelectedSlots(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
  };

  const handleContinue = () => navigate("/entrepreneur/activer/plan");

  return (
    <FunnelLayout currentStep="assets_studio" showProgress={false}>
      <motion.div
        className="max-w-md mx-auto pb-28 sm:pb-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-foreground mb-1">Connectez votre calendrier</h1>
        <p className="text-sm text-muted-foreground mb-6">Recevez des rendez-vous directement dans votre agenda.</p>

        {/* Google Calendar connect */}
        <div className="rounded-xl border border-border/50 bg-card/50 p-4 mb-6">
          {connected ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Google Calendar connecté</p>
                <p className="text-xs text-muted-foreground">Vos rendez-vous seront synchronisés</p>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="w-full h-12 rounded-xl" onClick={handleConnect}>
              <Calendar className="w-5 h-5 mr-2" />
              Connecter Google Calendar
            </Button>
          )}
        </div>

        {/* Availability selector */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-foreground mb-3">Disponibilités</h3>
          <div className="mb-4">
            <p className="text-xs text-muted-foreground mb-2">Jours disponibles</p>
            <div className="flex gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                    selectedDays.includes(day)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/50 text-muted-foreground"
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Plages horaires</p>
            <div className="flex gap-2">
              {TIME_SLOTS.map(slot => (
                <button
                  key={slot}
                  onClick={() => toggleSlot(slot)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                    selectedSlots.includes(slot)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/50 text-muted-foreground"
                  )}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop CTAs */}
        <div className="space-y-3 hidden sm:block">
          <Button size="lg" className="w-full h-14 text-base font-semibold rounded-xl" onClick={handleContinue}>
            Voir mon plan recommandé
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button variant="ghost" className="w-full text-sm text-muted-foreground" onClick={handleContinue}>
            <SkipForward className="w-4 h-4 mr-2" />
            Passer pour l'instant
          </Button>
        </div>
      </motion.div>

      <StickyMobileCTA
        label="Voir mon plan recommandé"
        onClick={handleContinue}
        icon={<ArrowRight className="w-5 h-5 mr-2" />}
        secondaryLabel="Passer pour l'instant"
        secondaryOnClick={handleContinue}
        secondaryIcon={<SkipForward className="w-4 h-4 mr-2" />}
      />
    </FunnelLayout>
  );
}
