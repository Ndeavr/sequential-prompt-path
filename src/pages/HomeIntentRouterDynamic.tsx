/**
 * HomeIntentRouterDynamic — Entry point that detects role and routes to adaptive landing.
 * Shows role selection grid if no role detected. Zero friction.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Home, Wrench, Building2, Briefcase } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import UnproIcon from "@/components/brand/UnproIcon";
import { cn } from "@/lib/utils";

const ROLES = [
  { id: "homeowner", label: "Propriétaire", sub: "J'ai un projet ou un problème", icon: Home, href: "/homeowner" },
  { id: "contractor", label: "Entrepreneur", sub: "Je veux des rendez-vous", icon: Wrench, href: "/contractor" },
  { id: "condo", label: "Gestionnaire condo", sub: "Je gère une copropriété", icon: Building2, href: "/condo" },
  { id: "professional", label: "Professionnel", sub: "Je veux rejoindre le réseau", icon: Briefcase, href: "/professional" },
] as const;

export default function HomeIntentRouterDynamic() {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Votre projet, notre match | IA 24/7</title>
        <meta name="description" content="Décrivez votre besoin en 5 secondes. UNPRO trouve le bon professionnel et vous donne un rendez-vous garanti." />
        <link rel="canonical" href="https://unpro.ca" />
      </Helmet>

      <div className="relative flex flex-col items-center justify-center min-h-[85vh] px-5 text-center">
        {/* Aura */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6"
        >
          <UnproIcon size={32} variant="blue" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-3xl md:text-4xl font-bold text-foreground mb-2 font-display"
        >
          Bienvenue sur UNPRO
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="text-base text-muted-foreground mb-10 max-w-sm"
        >
          Qui êtes-vous? On adapte tout pour vous.
        </motion.p>

        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          {ROLES.map((role, i) => {
            const Icon = role.icon;
            return (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.07, duration: 0.3 }}
                whileTap={{ scale: 0.96 }}
                whileHover={{ scale: 1.03 }}
                onMouseEnter={() => setHoveredId(role.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => navigate(role.href)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-2xl border p-5 transition-all duration-200",
                  "bg-card/60 backdrop-blur-sm",
                  hoveredId === role.id
                    ? "border-primary/40 bg-primary/[0.05] shadow-[0_0_24px_hsl(var(--primary)/0.12)]"
                    : "border-border/40",
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  hoveredId === role.id ? "bg-primary/15 text-primary" : "bg-muted/50 text-muted-foreground",
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-foreground">{role.label}</span>
                <span className="text-[11px] text-muted-foreground leading-tight">{role.sub}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
