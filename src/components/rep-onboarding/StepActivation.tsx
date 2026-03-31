import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Eye, Send, CreditCard, Smartphone, Mail,
  ArrowRight, Sparkles, BarChart3
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import type { ImportMode, SeedData } from "@/pages/recruitment/PageRepresentativeOnboarding";

interface Props {
  mode: ImportMode;
  seed: SeedData;
  contractorId: string | null;
  sessionId: string | null;
  aippScore: number | null;
}

export default function StepActivation({ mode, seed, contractorId, sessionId, aippScore }: Props) {
  const navigate = useNavigate();
  const [sendingLink, setSendingLink] = useState<"sms" | "email" | null>(null);

  const sendSecureLink = async (via: "sms" | "email") => {
    if (!sessionId) return;
    setSendingLink(via);
    try {
      await supabase.from("contractor_import_followups" as any).insert({
        import_session_id: sessionId,
        followup_type: `secure_link_${via}`,
        destination_email: via === "email" ? seed.email : null,
        destination_phone: via === "sms" ? seed.phone : null,
        status: "sent",
        sent_at: new Date().toISOString(),
      } as any);
      toast.success(via === "sms" ? "Lien envoyé par SMS" : "Lien envoyé par email");
    } catch {
      toast.error("Erreur d'envoi");
    } finally { setSendingLink(null); }
  };

  const actions = [
    {
      icon: Eye,
      label: "Voir mon profil privé",
      desc: "Consultez le profil complet généré",
      onClick: () => contractorId && navigate(`/pro`),
      primary: false,
    },
    {
      icon: CreditCard,
      label: "Activer mon plan",
      desc: "Choisissez le plan aligné à vos objectifs",
      onClick: () => navigate("/entrepreneurs/plans"),
      primary: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Score summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/40 bg-gradient-to-br from-card to-primary/5 p-6 text-center shadow-lg"
      >
        <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
        <h2 className="text-xl font-bold text-foreground mb-1">Votre base est prête</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {seed.business_name} — Score AIPP : {aippScore || "—"}/100
        </p>
        <div className="flex items-center justify-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">
            La prochaine étape : compléter les éléments stratégiques et activer votre visibilité.
          </span>
        </div>
      </motion.div>

      {/* Action cards */}
      <div className="space-y-3">
        {actions.map((a, i) => {
          const Icon = a.icon;
          return (
            <motion.button
              key={a.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={a.onClick}
              className={`w-full text-left rounded-2xl border p-5 flex items-center gap-4 transition-all ${
                a.primary
                  ? "border-primary/30 bg-primary/5 shadow-md hover:shadow-lg"
                  : "border-border/40 bg-card hover:border-primary/20"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                a.primary ? "bg-primary/15" : "bg-muted/50"
              }`}>
                <Icon className={`w-5 h-5 ${a.primary ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{a.label}</h3>
                <p className="text-[11px] text-muted-foreground">{a.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          );
        })}
      </div>

      {/* Send secure link */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground text-center">Recevoir mon lien sécurisé</p>
        <div className="flex gap-3">
          {seed.phone && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => sendSecureLink("sms")}
              disabled={sendingLink === "sms"}
              className="flex-1 h-12 rounded-xl border border-border/40 bg-card text-sm font-medium text-foreground flex items-center justify-center gap-2 hover:border-primary/30 transition-colors disabled:opacity-50"
            >
              <Smartphone className="w-4 h-4" />
              {sendingLink === "sms" ? "Envoi..." : "Par SMS"}
            </motion.button>
          )}
          {seed.email && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => sendSecureLink("email")}
              disabled={sendingLink === "email"}
              className="flex-1 h-12 rounded-xl border border-border/40 bg-card text-sm font-medium text-foreground flex items-center justify-center gap-2 hover:border-primary/30 transition-colors disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              {sendingLink === "email" ? "Envoi..." : "Par email"}
            </motion.button>
          )}
        </div>
      </div>

      {/* Plan recommendation */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate("/entrepreneurs/plans")}
        className="w-full text-xs text-primary font-medium text-center hover:underline"
      >
        Voir le plan recommandé selon mes objectifs →
      </motion.button>
    </div>
  );
}
