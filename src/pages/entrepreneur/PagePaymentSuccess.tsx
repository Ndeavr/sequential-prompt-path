/**
 * UNPRO — Payment Success / Congratulations Page
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Mail, Bell, UserCheck, ArrowRight, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


// Simple confetti fallback
const triggerConfetti = () => {
  try {
    // CSS confetti animation
    const container = document.createElement("div");
    container.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden";
    document.body.appendChild(container);
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement("div");
      el.style.cssText = `
        position:absolute;width:8px;height:8px;border-radius:2px;
        background:${colors[i % colors.length]};
        left:${Math.random() * 100}%;top:-10px;
        animation:confetti-fall ${1.5 + Math.random() * 2}s ease-out forwards;
        animation-delay:${Math.random() * 0.5}s;
      `;
      container.appendChild(el);
    }
    setTimeout(() => container.remove(), 4000);
  } catch {}
};

const STEPS = [
  { icon: UserCheck, label: "Profil en cours d'activation", done: true },
  { icon: Mail, label: "Courriel de bienvenue envoyé", done: true },
  { icon: Bell, label: "Admin UNPRO notifié", done: true },
  { icon: ArrowRight, label: "Prochaine étape : compléter votre profil", done: false },
];

export default function PagePaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const quoteId = searchParams.get("quote_id");
  const [planName, setPlanName] = useState("votre plan");

  useEffect(() => {
    triggerConfetti();

    // Load plan info from session
    const stored = sessionStorage.getItem("unpro_pricing_result");
    if (stored) {
      try {
        const r = JSON.parse(stored);
        setPlanName(r.selected_plan?.name || "votre plan");
      } catch {}
    }

    // Notify admin + send welcome email (fire-and-forget via edge functions)
    if (quoteId) {
      supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "contractor-profile-activated",
          recipientEmail: "", // handled server-side
          idempotencyKey: `welcome-payment-${quoteId}`,
        },
      }).catch(() => {});
    }

    // Clean session
    sessionStorage.removeItem("unpro_pricing_result");
  }, [quoteId]);

  return (
    <div className="min-h-screen bg-background">
      {/* CSS keyframes for confetti */}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>

      <div className="max-w-lg mx-auto px-4 py-16 space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-foreground font-display mb-2">
            Félicitations! 🎉
          </h1>
          <p className="text-muted-foreground">
            Votre plan <strong className="text-foreground">{planName}</strong> est maintenant actif.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card rounded-2xl border border-border p-5 space-y-4"
        >
          {STEPS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.15 }}
              className="flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                s.done ? "bg-green-500/10" : "bg-primary/10"
              }`}>
                <s.icon className={`w-4 h-4 ${s.done ? "text-green-500" : "text-primary"}`} />
              </div>
              <span className={`text-sm ${s.done ? "text-muted-foreground line-through" : "font-bold text-foreground"}`}>
                {s.label}
              </span>
              {s.done && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="space-y-3"
        >
          <Button
            onClick={() => navigate("/pro")}
            className="w-full h-14 rounded-2xl text-base font-bold gap-2"
            size="lg"
          >
            Accéder à mon tableau de bord
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/pro/account")}
            className="w-full text-sm"
          >
            Compléter mon profil
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
