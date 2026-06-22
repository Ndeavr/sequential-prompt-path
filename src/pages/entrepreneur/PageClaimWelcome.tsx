/**
 * UNPRO — Post-Activation Welcome / Gamification
 * Route: /entrepreneur/bienvenue
 *
 * Replaces the generic "Payment successful" screen. Sells the next action,
 * not the past one. Score checklist drives improvement loop.
 */
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Check, Camera, ShieldCheck, FileBadge, MapPin, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChecklistItem = {
  key: string;
  label: string;
  pts: number;
  icon: typeof Camera;
  href?: string;
};

const CHECKLIST: ChecklistItem[] = [
  { key: "insurance", label: "Ajouter votre assurance", pts: 8, icon: ShieldCheck, href: "/pro/profile" },
  { key: "photos", label: "Ajouter des photos de projets", pts: 12, icon: Camera, href: "/pro/profile" },
  { key: "licenses", label: "Vérifier vos licences RBQ", pts: 10, icon: FileBadge, href: "/pro/profile" },
  { key: "google", label: "Connecter votre profil Google", pts: 15, icon: MapPin, href: "/pro/profile" },
];

const STARTING_SCORE = 63;

export default function PageClaimWelcome() {
  const [params] = useSearchParams();
  const slug = params.get("slug") ?? "";
  const [done, setDone] = useState<Record<string, boolean>>({});

  const score = useMemo(() => {
    return CHECKLIST.reduce((acc, c) => acc + (done[c.key] ? c.pts : 0), STARTING_SCORE);
  }, [done]);

  const pct = Math.min(100, score);

  return (
    <div className="alex-immersive min-h-[100svh] bg-[#050816] text-white">
      <Helmet>
        <title>Bienvenue sur UNPRO · Profil activé</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <main className="max-w-xl mx-auto px-4 pt-12 pb-24 space-y-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="text-center space-y-3"
        >
          <div className="inline-flex items-center gap-2 text-amber-300 text-sm">
            <Sparkles className="w-4 h-4" /> Profil activé
          </div>
          <h1 className="text-4xl font-bold leading-tight">Bienvenue.</h1>
          <p className="text-white/70">Votre profil est en ligne.</p>
        </motion.div>

        {/* Score ring */}
        <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-transparent p-8 flex items-center gap-6">
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
              <motion.circle
                cx="50" cy="50" r="44" fill="none"
                stroke="rgb(251,191,36)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 44 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 44 * (1 - pct / 100) }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl font-bold text-amber-300">{score}</div>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-widest text-white/60">Visibilité actuelle</div>
            <div className="text-lg font-semibold">Score AIPP</div>
            <div className="text-xs text-white/60">Premier match estimé : <span className="text-white">3–12 jours</span></div>
          </div>
        </div>

        {/* Checklist */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Améliorez votre score
            <span className="text-xs text-amber-300 font-normal">+45 pts disponibles</span>
          </h2>

          <div className="space-y-2">
            {CHECKLIST.map((item) => {
              const Icon = item.icon;
              const isDone = !!done[item.key];
              return (
                <button
                  key={item.key}
                  onClick={() => setDone((d) => ({ ...d, [item.key]: !d[item.key] }))}
                  className={`w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                    isDone
                      ? "border-amber-400/40 bg-amber-400/5"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDone ? "bg-amber-400 text-black" : "bg-white/5 text-white/70"
                  }`}>
                    {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium ${isDone ? "text-amber-300" : "text-white"}`}>
                      {item.label}
                    </div>
                    <div className="text-xs text-white/50">+{item.pts} pts visibilité</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/40" />
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-3 pt-2">
          <Link to="/pro">
            <Button size="lg" className="h-14 w-full text-base font-semibold bg-amber-400 text-black hover:bg-amber-300">
              Aller à mon tableau de bord <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
          {slug && (
            <Link to={`/entrepreneur/${slug}`}>
              <Button size="lg" variant="ghost" className="h-12 w-full text-white/70 hover:text-white">
                Voir mon profil public
              </Button>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
