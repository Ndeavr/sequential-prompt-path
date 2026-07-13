/**
 * ContractorBookingDemo — Interactive homepage animation.
 * Alex analyzes → recommends Isolation Solution Royal → user picks a slot → booked.
 *
 * DEMO-ONLY: no Supabase writes, no SMS, no real appointment created.
 * The main CTA opens the real Alex flow via useAlexVoice().openAlex().
 *
 * TODO(i18n): copy is fr-CA only for now; EN translation to be added when the
 * unicorn homepage adopts i18n. Do not invent EN strings ahead of that switch.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  CalendarClock,
  CheckCircle2,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Loader2,
  RotateCcw,
} from "lucide-react";
import MonogramBadge from "@/features/contractorProfile/logo/MonogramBadge";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

/* ---------------- Demo-only constants ---------------- */
// Demo-only: never persisted, never triggers real booking or SMS.
const DEMO_CONTRACTOR = {
  name: "Isolation Solution Royal",
  category: "Isolation d'entretoit",
  territory: "Terrebonne et Rive-Nord",
} as const;

const DEMO_DATES = [
  { key: "mar14", label: "Mardi 14" },
  { key: "mer15", label: "Mercredi 15" },
  { key: "jeu16", label: "Jeudi 16" },
] as const;

const DEMO_SLOTS = ["9 h", "10 h", "13 h", "15 h"] as const;

const DEMO_AUTO_PICK = { dateKey: "mer15", slot: "10 h" };

type DemoStep = "analyzing" | "recommendation" | "availability" | "booking" | "confirmed";

const DEMO_TIMINGS: Record<DemoStep, number> = {
  analyzing: 1500,
  recommendation: 2500,
  availability: 2200,
  booking: 900,
  confirmed: 2500,
};

const RESTART_PAUSE_MS = 2000;

const ORDER: DemoStep[] = ["analyzing", "recommendation", "availability", "booking", "confirmed"];

/* ---------------- Root ---------------- */
export default function ContractorBookingDemo() {
  const { openAlex } = useAlexVoice();
  const reduce = useReducedMotion();

  const [step, setStep] = useState<DemoStep>("analyzing");
  const [selected, setSelected] = useState<{ dateKey: string; slot: string } | null>(null);
  const [inView, setInView] = useState(true);
  const timerRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const goto = useCallback((next: DemoStep) => {
    setStep(next);
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setSelected(null);
    setStep("analyzing");
  }, []);

  // Intersection observer — pause when off-screen
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Timeline
  useEffect(() => {
    if (reduce) {
      // Show final state directly, no loop
      setStep("confirmed");
      setSelected(DEMO_AUTO_PICK);
      return;
    }
    if (!inView) {
      clearTimer();
      return;
    }

    // Auto-pick during availability step
    if (step === "availability" && !selected) {
      const pickAt = window.setTimeout(() => {
        setSelected(DEMO_AUTO_PICK);
      }, 1400);
      const nextAt = window.setTimeout(() => {
        goto("booking");
      }, DEMO_TIMINGS.availability);
      timerRef.current = nextAt;
      return () => {
        window.clearTimeout(pickAt);
        window.clearTimeout(nextAt);
      };
    }

    if (step === "confirmed") {
      timerRef.current = window.setTimeout(() => {
        setSelected(null);
        setStep("analyzing");
      }, DEMO_TIMINGS.confirmed + RESTART_PAUSE_MS);
      return () => clearTimer();
    }

    const idx = ORDER.indexOf(step);
    const next = ORDER[idx + 1];
    if (!next) return;
    timerRef.current = window.setTimeout(() => goto(next), DEMO_TIMINGS[step]);
    return () => clearTimer();
  }, [step, inView, reduce, selected, goto]);

  const handleSlotClick = (dateKey: string, slot: string) => {
    if (step !== "availability") return;
    clearTimer();
    setSelected({ dateKey, slot });
    // jump forward to booking → confirmed
    window.setTimeout(() => goto("booking"), 250);
  };

  const handleCta = () => {
    openAlex("home_intent", "booking_demo_cta");
  };

  const benefits = useMemo(
    () => [
      { icon: Sparkles, label: "Une recommandation compatible" },
      { icon: CalendarClock, label: "Des disponibilités visibles" },
      { icon: CheckCircle2, label: "Un rendez-vous confirmé" },
    ],
    [],
  );

  return (
    <section
      ref={rootRef}
      className="relative z-10 px-4 mt-8 mb-6"
      aria-label="Démonstration de recommandation et de réservation"
    >
      <div className="max-w-6xl mx-auto grid gap-6 md:grid-cols-2 md:items-center">
        {/* Header + benefits + CTA */}
        <div className="order-1 md:order-1">
          <p
            className="text-[11px] font-bold tracking-[0.14em] mb-2"
            style={{ color: "#2563FF" }}
          >
            UNE RECOMMANDATION. UN RENDEZ-VOUS.
          </p>
          <h2
            className="text-[22px] md:text-[28px] font-extrabold leading-tight tracking-tight mb-2"
            style={{ color: "#0B1220" }}
          >
            Trouvez le bon professionnel et réservez directement.
          </h2>
          <p className="text-[13px] md:text-[14px] leading-relaxed mb-4" style={{ color: "#475467" }}>
            Alex analyse votre besoin, vous recommande un entrepreneur compatible et vous
            présente ses disponibilités réelles.
          </p>

          {/* Mobile: animation slot is rendered in the second column below, but we
              want it visually right after the subtitle on mobile. We reorder via CSS. */}
          <div className="hidden md:block">
            <ul className="space-y-2 mb-5">
              {benefits.map((b) => (
                <li key={b.label} className="flex items-center gap-2 text-[13px]" style={{ color: "#0B1220" }}>
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full"
                    style={{ background: "rgba(37,99,255,0.10)", color: "#2563FF" }}
                  >
                    <b.icon size={15} />
                  </span>
                  <span className="font-medium">{b.label}</span>
                </li>
              ))}
            </ul>
            <CtaRow onPrimary={handleCta} onReset={reset} />
          </div>
        </div>

        {/* Animation stage */}
        <div className="order-2 md:order-2">
          <DemoStage
            step={step}
            selected={selected}
            onSlotClick={handleSlotClick}
          />
        </div>

        {/* Mobile CTA + benefits (after animation) */}
        <div className="order-3 md:hidden">
          <CtaRow onPrimary={handleCta} onReset={reset} />
          <ul className="mt-4 grid grid-cols-1 gap-2">
            {benefits.map((b) => (
              <li
                key={b.label}
                className="flex items-center gap-2 text-[13px] uc-glass-strong px-3 py-2"
                style={{ color: "#0B1220", borderRadius: 14 }}
              >
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0"
                  style={{ background: "rgba(37,99,255,0.10)", color: "#2563FF" }}
                >
                  <b.icon size={15} />
                </span>
                <span className="font-medium">{b.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA row ---------------- */
function CtaRow({ onPrimary, onReset }: { onPrimary: () => void; onReset: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <button
        onClick={onPrimary}
        className="uc-hover-lift inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full text-[14px] font-semibold text-white"
        style={{
          background: "linear-gradient(135deg,#2563FF,#3B82F6)",
          boxShadow: "0 10px 24px -8px rgba(37,99,255,0.55)",
        }}
      >
        Trouver mon professionnel
        <ArrowRight size={16} />
      </button>
      <button
        onClick={onReset}
        className="inline-flex items-center justify-center gap-2 px-4 h-11 rounded-full text-[13px] font-semibold"
        style={{
          color: "#0B1220",
          background: "rgba(255,255,255,0.6)",
          border: "1px solid rgba(11,18,32,0.10)",
        }}
      >
        <RotateCcw size={14} />
        Revoir la démonstration
      </button>
    </div>
  );
}

/* ---------------- Stage frame ---------------- */
function DemoStage({
  step,
  selected,
  onSlotClick,
}: {
  step: DemoStep;
  selected: { dateKey: string; slot: string } | null;
  onSlotClick: (dateKey: string, slot: string) => void;
}) {
  return (
    <div
      className="uc-glass-strong relative mx-auto w-full max-w-[380px] p-4 md:p-5"
      style={{ borderRadius: 28, minHeight: 440 }}
    >
      <AlexBubble step={step} />

      <div className="mt-3 relative" style={{ minHeight: 340 }}>
        <AnimatePresence mode="wait" initial={false}>
          {step === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35 }}
            >
              <AnalyzingChecks />
            </motion.div>
          )}

          {(step === "recommendation" || step === "availability" || step === "booking") && (
            <motion.div
              key="reco"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: step === "availability" || step === "booking" ? -6 : 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <ContractorBookingCard compact={step !== "recommendation"} />

              {step === "availability" && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                  className="mt-3"
                >
                  <SlotPicker selected={selected} onSlotClick={onSlotClick} />
                </motion.div>
              )}

              {step === "booking" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="mt-3"
                >
                  <BookingProgress selected={selected} />
                </motion.div>
              )}
            </motion.div>
          )}

          {step === "confirmed" && (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35 }}
            >
              <ConfirmationCard selected={selected} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------- Alex bubble ---------------- */
function AlexBubble({ step }: { step: DemoStep }) {
  const message =
    step === "analyzing"
      ? "Vous souhaitez améliorer l'isolation de votre entretoit à Terrebonne."
      : step === "recommendation" || step === "availability" || step === "booking"
        ? "Pour l'isolation de votre entretoit, je vous propose Isolation Solution Royal."
        : "Vous n'avez pas eu à comparer trois entrepreneurs. Alex a trouvé un professionnel compatible et réservé votre rendez-vous.";

  return (
    <div
      className="flex items-start gap-2 rounded-2xl px-3 py-2.5"
      style={{
        background: "rgba(37,99,255,0.06)",
        border: "1px solid rgba(37,99,255,0.14)",
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold"
        style={{ background: "linear-gradient(135deg,#2563FF,#3B82F6)" }}
      >
        A
      </div>
      <p className="text-[12.5px] leading-snug" style={{ color: "#0B1220" }}>
        {message}
      </p>
    </div>
  );
}

/* ---------------- Analyzing checks ---------------- */
function AnalyzingChecks() {
  const items = [
    "Analyse du projet",
    "Vérification de la région",
    "Compatibilité du service",
    "Disponibilités",
  ];
  return (
    <ul className="space-y-2 mt-1">
      {items.map((label, i) => (
        <motion.li
          key={label}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.25, duration: 0.3 }}
          className="flex items-center gap-2 text-[12.5px] font-medium"
          style={{ color: "#0B1220" }}
        >
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.25 + 0.15, type: "spring", stiffness: 400 }}
            className="inline-flex items-center justify-center w-5 h-5 rounded-full"
            style={{ background: "#16A34A", color: "white" }}
          >
            <CheckCircle2 size={13} />
          </motion.span>
          {label}
        </motion.li>
      ))}
      <li className="flex items-center gap-1 pl-7 text-[11px]" style={{ color: "#667085" }}>
        <Dot delay={0} />
        <Dot delay={0.15} />
        <Dot delay={0.3} />
      </li>
    </ul>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <motion.span
      className="inline-block w-1.5 h-1.5 rounded-full"
      style={{ background: "#94A3B8" }}
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1.2, repeat: Infinity, delay }}
    />
  );
}

/* ---------------- Contractor card ---------------- */
function ContractorBookingCard({ compact }: { compact: boolean }) {
  return (
    <div
      className="p-3.5 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.9)",
        border: "1px solid rgba(11,18,32,0.08)",
        boxShadow: "0 12px 28px -14px rgba(11,18,32,0.20)",
      }}
    >
      <div className="flex items-start gap-3">
        <MonogramBadge
          monogram={{ initials: "ISR", bg: "#2563FF", fg: "#FFFFFF" }}
          size={compact ? 44 : 54}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[13.5px] font-bold leading-tight" style={{ color: "#0B1220" }}>
              {DEMO_CONTRACTOR.name}
            </p>
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(22,163,74,0.10)", color: "#166534" }}
            >
              <ShieldCheck size={10} /> Vérifiée
            </span>
          </div>
          <p className="text-[11.5px] mt-0.5" style={{ color: "#475467" }}>
            {DEMO_CONTRACTOR.category}
          </p>
          <p className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: "#667085" }}>
            <MapPin size={11} /> {DEMO_CONTRACTOR.territory}
          </p>
        </div>
      </div>

      <div className="mt-2.5 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10.5px] font-semibold"
          style={{ background: "rgba(37,99,255,0.10)", color: "#1D4ED8" }}
        >
          <Sparkles size={11} /> Compatible avec votre projet
        </span>
      </div>

      {!compact ? null : null}

      {!compact && (
        <>
          <p className="text-[12.5px] mt-3" style={{ color: "#0B1220" }}>
            Voulez-vous planifier un rendez-vous maintenant?
          </p>
          <div
            className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 h-9 rounded-full text-[12.5px] font-semibold text-white w-full"
            style={{
              background: "linear-gradient(135deg,#2563FF,#3B82F6)",
              boxShadow: "0 8px 18px -8px rgba(37,99,255,0.5)",
            }}
          >
            Voir les disponibilités
            <ArrowRight size={13} />
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Slot picker ---------------- */
function SlotPicker({
  selected,
  onSlotClick,
}: {
  selected: { dateKey: string; slot: string } | null;
  onSlotClick: (dateKey: string, slot: string) => void;
}) {
  const [activeDate, setActiveDate] = useState<string>(selected?.dateKey ?? DEMO_AUTO_PICK.dateKey);
  useEffect(() => {
    if (selected) setActiveDate(selected.dateKey);
  }, [selected]);

  return (
    <div
      className="p-3 rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.85)",
        border: "1px solid rgba(11,18,32,0.08)",
      }}
    >
      <p className="text-[12px] font-bold mb-2" style={{ color: "#0B1220" }}>
        Choisissez votre plage horaire
      </p>
      <div className="flex gap-1.5 mb-2">
        {DEMO_DATES.map((d) => {
          const isActive = activeDate === d.key;
          return (
            <button
              key={d.key}
              onClick={() => setActiveDate(d.key)}
              className="px-2.5 h-8 rounded-full text-[11.5px] font-semibold transition-colors"
              style={{
                background: isActive ? "#2563FF" : "rgba(11,18,32,0.05)",
                color: isActive ? "white" : "#0B1220",
              }}
            >
              {d.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {DEMO_SLOTS.map((slot) => {
          const isSelected = selected?.dateKey === activeDate && selected?.slot === slot;
          return (
            <button
              key={slot}
              onClick={() => onSlotClick(activeDate, slot)}
              className="h-9 rounded-lg text-[12px] font-semibold transition-all"
              style={{
                background: isSelected ? "#2563FF" : "rgba(11,18,32,0.05)",
                color: isSelected ? "white" : "#0B1220",
                boxShadow: isSelected ? "0 6px 14px -6px rgba(37,99,255,0.6)" : "none",
              }}
            >
              {slot}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Booking progress ---------------- */
function BookingProgress({ selected }: { selected: { dateKey: string; slot: string } | null }) {
  const dateLabel = DEMO_DATES.find((d) => d.key === selected?.dateKey)?.label ?? "Mercredi 15";
  return (
    <div
      className="p-3 rounded-2xl flex items-center gap-3"
      style={{
        background: "rgba(255,255,255,0.85)",
        border: "1px solid rgba(11,18,32,0.08)",
      }}
    >
      <Loader2 size={18} className="animate-spin" color="#2563FF" />
      <div className="flex-1">
        <p className="text-[12.5px] font-semibold" style={{ color: "#0B1220" }}>
          Réservation en cours…
        </p>
        <p className="text-[11px]" style={{ color: "#667085" }}>
          {dateLabel} — {selected?.slot ?? "10 h"}
        </p>
        <div
          className="mt-1.5 h-1 w-full rounded-full overflow-hidden"
          style={{ background: "rgba(11,18,32,0.08)" }}
        >
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.85, ease: "easeInOut" }}
            className="h-full"
            style={{ background: "linear-gradient(90deg,#2563FF,#3B82F6)" }}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------------- Confirmation ---------------- */
function ConfirmationCard({ selected }: { selected: { dateKey: string; slot: string } | null }) {
  const slot = selected?.slot ?? DEMO_AUTO_PICK.slot;
  return (
    <div
      className="p-4 rounded-2xl text-center"
      style={{
        background: "rgba(255,255,255,0.92)",
        border: "1px solid rgba(22,163,74,0.20)",
        boxShadow: "0 14px 32px -18px rgba(22,163,74,0.35)",
      }}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 14 }}
        className="mx-auto w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: "#16A34A" }}
      >
        <CheckCircle2 size={30} color="white" strokeWidth={2.5} />
      </motion.div>
      <h3 className="text-[17px] font-extrabold mt-2" style={{ color: "#0B1220" }}>
        C'est fait!
      </h3>
      <p className="text-[12.5px] mt-1" style={{ color: "#475467" }}>
        Votre rendez-vous avec <span className="font-semibold">Isolation Solution Royal</span> est confirmé.
      </p>

      <ul className="mt-3 space-y-1 text-[12px]" style={{ color: "#0B1220" }}>
        <li>Mercredi 15 juillet</li>
        <li>{slot}</li>
        <li>Terrebonne</li>
        <li style={{ color: "#667085" }}>Confirmation envoyée par SMS.</li>
      </ul>

      <p
        className="mt-3 text-[11.5px] leading-snug px-2 py-2 rounded-xl"
        style={{ background: "rgba(37,99,255,0.06)", color: "#1D4ED8" }}
      >
        Vous n'avez pas eu à comparer trois entrepreneurs. Alex a trouvé un
        professionnel compatible et réservé votre rendez-vous.
      </p>
    </div>
  );
}
