/**
 * UNPRO — Alex Bottom Sheet Launcher
 * The center Alex button in mobile bottom nav with role-aware quick actions.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Mic, MessageSquare, Search, Star, CalendarCheck, Building2, AlertTriangle, LayoutDashboard } from "lucide-react";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useNavigationContext } from "@/hooks/useNavigationContext";
import type { UserRole } from "@/types/navigation";

const alexActionsByRole: Record<UserRole | "guest", { label: string; icon: React.ElementType; path?: string; action?: string }[]> = {
  guest: [
    { label: "Trouver un entrepreneur", icon: Search, path: "/search" },
    { label: "Vérifier un entrepreneur", icon: Star, path: "/verifier-entrepreneur" },
    { label: "Planifier un projet", icon: CalendarCheck, path: "/describe-project" },
    { label: "Créer un compte", icon: Sparkles, path: "/login" },
  ],
  homeowner: [
    { label: "Décrire mon projet", icon: MessageSquare, path: "/dashboard/projects/new" },
    { label: "Vérifier un entrepreneur", icon: Star, path: "/verifier-entrepreneur" },
    { label: "Réserver un rendez-vous", icon: CalendarCheck, path: "/dashboard/appointments" },
    { label: "Voir mes projets", icon: Building2, path: "/dashboard/projects/new" },
  ],
  contractor: [
    { label: "Voir mes opportunités", icon: CalendarCheck, path: "/pro/leads" },
    { label: "Compléter mon profil", icon: Sparkles, path: "/pro/profile" },
    { label: "Améliorer mon score AIPP", icon: Star, path: "/pro/aipp-score" },
    { label: "Acheter des rendez-vous", icon: LayoutDashboard, path: "/pro/billing" },
  ],
  partner: [
    { label: "Mes dossiers", icon: Building2, path: "/dashboard/syndicates" },
    { label: "Trouver un entrepreneur", icon: Search, path: "/search" },
    { label: "Planifier une démo", icon: CalendarCheck, path: "/alex" },
    { label: "Parler à Alex", icon: Mic, action: "voice" },
  ],
  admin: [
    { label: "Voir alertes critiques", icon: AlertTriangle, path: "/admin" },
    { label: "Métriques clés", icon: LayoutDashboard, path: "/admin" },
    { label: "Ouvrir admin", icon: LayoutDashboard, path: "/admin" },
    { label: "Parler à Alex", icon: Mic, action: "voice" },
  ],
};

export default function AlexBottomSheetLauncherUNPRO() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const { activeRole } = useNavigationContext();

  const actions = alexActionsByRole[activeRole as UserRole | "guest"] || alexActionsByRole.guest;

  const handleAction = (item: typeof actions[0]) => {
    setIsOpen(false);
    if (item.action === "voice") {
      openAlex("general");
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <>
      {/* Center Alex Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-1"
        aria-label="Alex"
      >
        <div className="w-11 h-11 -mt-5 rounded-full bg-primary shadow-lg shadow-primary/30 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-[10px] font-medium text-primary mt-0.5">Alex</span>
      </button>

      {/* Bottom Sheet */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl border-t border-border/20 safe-area-bottom"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">Alex peut vous aider</h3>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="p-1 rounded-full hover:bg-muted transition-colors">
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="space-y-2">
                  {actions.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleAction(item)}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{item.label}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => { setIsOpen(false); openAlex("general"); }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 transition-colors"
                >
                  <Mic className="w-4 h-4" />
                  Parler à Alex
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
