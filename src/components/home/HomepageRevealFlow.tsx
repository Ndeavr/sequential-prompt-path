/**
 * UNPRO — Homepage Reveal Flow
 * 
 * Progressive AI reveal: Alex bubble → Contractor card → CTA
 * Skippable on scroll/tap. Runs once per session.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Link } from "react-router-dom";
import {
  CheckCircle2, MapPin, Star, ArrowRight, Shield, Sparkles,
} from "lucide-react";
import UnproIcon from "@/components/brand/UnproIcon";

/* ─── Session guard: only animate once ─── */
const SESSION_KEY = "unpro_reveal_seen";
const hasSeenReveal = () => {
  try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
};
const markRevealSeen = () => {
  try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
};

/* ─── Timing constants ─── */
const STEP_DELAYS = {
  bubble: 600,
  card: 1800,
  cta: 3000,
  secondary: 3600,
} as const;

/* ─── Fallback contractor data ─── */
const FALLBACK_CONTRACTOR = {
  name: "Isolation Solution Royal",
  score: 92,
  location: "Laval · Montréal",
  badge: "Recommandé UNPRO",
  services: ["Isolation", "Vermiculite", "Barrage de glace"],
  avatar: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face",
  reviews: 247,
  rating: 4.9,
};

export default function HomepageRevealFlow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-40px" });
  const [step, setStep] = useState(0);
  const [skipped, setSkipped] = useState(hasSeenReveal());
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Skip handler
  const skipAll = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
    setStep(5);
    setSkipped(true);
    markRevealSeen();
  }, []);

  // Timeline
  useEffect(() => {
    if (!isInView || skipped) {
      if (skipped) setStep(5);
      return;
    }

    const schedule = (delay: number, s: number) => {
      const t = setTimeout(() => setStep(s), delay);
      timerRef.current.push(t);
    };

    schedule(STEP_DELAYS.bubble, 1);   // Alex bubble
    schedule(STEP_DELAYS.card, 2);     // Card reveal
    schedule(STEP_DELAYS.cta, 3);      // Primary CTA
    schedule(STEP_DELAYS.secondary, 4); // Secondary CTAs
    schedule(STEP_DELAYS.secondary + 400, 5); // Done

    markRevealSeen();

    return () => {
      timerRef.current.forEach(clearTimeout);
      timerRef.current = [];
    };
  }, [isInView, skipped]);

  const c = FALLBACK_CONTRACTOR;

  return (
    <section
      ref={containerRef}
      className="relative px-5 py-14 md:py-20 overflow-hidden"
      onClick={() => step < 5 && skipAll()}
    >
      {/* Background ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[120px] opacity-60"
          style={{ background: "radial-gradient(ellipse, hsl(var(--primary) / 0.08), transparent 70%)" }}
        />
      </div>

      <div className="relative z-10 max-w-lg mx-auto space-y-5">

        {/* ═══ STEP 1 — Alex Bubble ═══ */}
        <AnimatePresence>
          {step >= 1 && (
            <motion.div
              initial={{ opacity: 0, x: -32, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.5, type: "spring", stiffness: 120, damping: 14 }}
              className="flex items-end gap-3"
            >
              {/* Alex avatar */}
              <div className="shrink-0 relative">
                <div className="h-10 w-10 rounded-full overflow-hidden shadow-soft border-2 border-card">
                  <UnproIcon size={40} variant="blue" />
                </div>
                {/* Green dot */}
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-card" />
              </div>

              {/* Message bubble */}
              <div className="glass-card rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  J'ai trouvé le match parfait pour vous. 👇
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ STEP 2 — Contractor Card Reveal ═══ */}
        <AnimatePresence>
          {step >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 64, scale: 0.96, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="premium-card rounded-2xl overflow-hidden">
                {/* Badge header */}
                <div className="flex items-center gap-2 px-5 pt-4 pb-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider bg-primary/10 text-primary"
                  >
                    <Sparkles className="h-3 w-3" />
                    {c.badge}
                  </motion.div>
                </div>

                {/* Card body */}
                <div className="px-5 pb-5 space-y-4">
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 shadow-soft border border-border/40">
                      <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-base font-bold text-foreground truncate">{c.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-meta text-muted-foreground">{c.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex items-center">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} className="h-3 w-3 fill-current text-warning" />
                          ))}
                        </div>
                        <span className="text-caption font-semibold text-foreground">{c.rating}</span>
                        <span className="text-caption text-muted-foreground">({c.reviews} avis)</span>
                      </div>
                    </div>

                    {/* Score */}
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 160, damping: 12 }}
                      className="shrink-0 h-14 w-14 rounded-full flex items-center justify-center border-2 border-primary/20"
                      style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))" }}
                    >
                      <div className="text-center">
                        <span className="font-display text-lg font-bold text-primary leading-none">{c.score}</span>
                        <span className="block text-[8px] font-bold text-primary/60">/100</span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Services */}
                  <div className="flex flex-wrap gap-2">
                    {c.services.map((s, i) => (
                      <motion.span
                        key={s}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + i * 0.1 }}
                        className="rounded-full px-3 py-1 text-caption font-semibold bg-muted/60 text-muted-foreground border border-border/40"
                      >
                        {s}
                      </motion.span>
                    ))}
                  </div>

                  {/* Verification badges */}
                  <div className="flex items-center gap-3 pt-1">
                    {[
                      { icon: Shield, label: "RBQ vérifié" },
                      { icon: CheckCircle2, label: "Assurances OK" },
                    ].map((b, i) => (
                      <motion.div
                        key={b.label}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.12 }}
                        className="flex items-center gap-1.5"
                      >
                        <b.icon className="h-3.5 w-3.5 text-success" />
                        <span className="text-caption font-medium text-muted-foreground">{b.label}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Glow pulse at finish */}
                <motion.div
                  className="absolute inset-0 rounded-2xl pointer-events-none"
                  initial={{ boxShadow: "0 0 0 0 transparent" }}
                  animate={{
                    boxShadow: [
                      "0 0 0 0 hsl(var(--primary) / 0)",
                      "0 0 24px 4px hsl(var(--primary) / 0.12)",
                      "0 0 0 0 hsl(var(--primary) / 0)",
                    ],
                  }}
                  transition={{ duration: 1.5, delay: 0.3, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ STEP 3 — Primary CTA ═══ */}
        <AnimatePresence>
          {step >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to="/book/isolation-solution-royal"
                className="w-full h-14 rounded-full flex items-center justify-center gap-3 text-sm font-bold cta-gradient active:scale-[0.97] transition-transform"
              >
                <span>Planifier un rendez-vous</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ STEP 4 — Secondary CTAs ═══ */}
        <AnimatePresence>
          {step >= 4 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              {[
                { label: "Passeport Maison", to: "/dashboard" },
                { label: "Passeport Condo", to: "/condos" },
                { label: "Je suis entrepreneur", to: "/signature" },
              ].map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex-1 h-11 rounded-xl flex items-center justify-center text-meta font-semibold bg-card border border-border/60 text-muted-foreground hover:border-primary/25 hover:text-foreground transition-all active:scale-[0.97]"
                >
                  {item.label}
                </Link>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Skip hint */}
        <AnimatePresence>
          {step > 0 && step < 5 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="text-center text-caption text-muted-foreground pt-2"
            >
              Touchez pour passer
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
