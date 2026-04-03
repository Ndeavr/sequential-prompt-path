/**
 * All conversation bubble components for the Alex ad preview
 */
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Check, Calendar, Star, Shield, MapPin, Clock, Bot } from "lucide-react";
import iceDamImage from "@/assets/ice-dam-roof.jpg";
import { SCENARIO, BOOKING_SLOTS } from "./data";

import type { Variants } from "framer-motion";

const bubbleIn: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ─── Alex Avatar ─── */
function AlexAvatar({ speaking = false }: { speaking?: boolean }) {
  return (
    <div className="relative flex-shrink-0">
      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      {speaking && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary/40"
          animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </div>
  );
}

/* ─── Typing Indicator ─── */
export function TypingIndicator() {
  return (
    <motion.div variants={bubbleIn} initial="hidden" animate="visible" className="flex items-end gap-2">
      <AlexAvatar speaking />
      <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-muted/60 border border-border/50">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── User Image Upload ─── */
export function UserImageUpload() {
  return (
    <motion.div variants={bubbleIn} initial="hidden" animate="visible" className="flex justify-end">
      <div className="max-w-[75%]">
        <div className="rounded-2xl rounded-br-md overflow-hidden border border-border/50 shadow-lg">
          <div className="relative">
            <motion.img
              src={iceDamImage}
              alt="Barrage de glace sur toiture"
              className="w-full h-auto object-cover"
              width={320}
              height={240}
              initial={{ scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            />
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border border-border/40 text-[10px] text-muted-foreground">
              <Camera className="w-3 h-3" /> Photo uploadée
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── User Text Message ─── */
export function UserTextMessage({ text }: { text: string }) {
  return (
    <motion.div variants={bubbleIn} initial="hidden" animate="visible" className="flex justify-end">
      <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-2.5 bg-primary text-primary-foreground text-sm">
        {text}
      </div>
    </motion.div>
  );
}

/* ─── Alex Text Response ─── */
export function AlexTextResponse({ text, speaking = false, glow = false }: { text: string; speaking?: boolean; glow?: boolean }) {
  return (
    <motion.div variants={bubbleIn} initial="hidden" animate="visible" className="flex items-end gap-2">
      <AlexAvatar speaking={speaking} />
      <div className={`relative max-w-[80%] rounded-2xl rounded-bl-md px-4 py-3 bg-muted/50 border border-border/40 text-sm text-foreground ${glow ? "shadow-[0_0_20px_-4px_hsl(var(--primary)/0.2)]" : ""}`}>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          {text}
        </motion.span>
        {speaking && <WaveformIndicator />}
      </div>
    </motion.div>
  );
}

/* ─── Waveform ─── */
function WaveformIndicator() {
  return (
    <div className="flex items-center gap-0.5 mt-1.5">
      {[0, 1, 2, 3, 4].map(i => (
        <motion.div
          key={i}
          className="w-0.5 rounded-full bg-primary/50"
          animate={{ height: [3, 8 + Math.random() * 6, 3] }}
          transition={{ duration: 0.5 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.08 }}
        />
      ))}
      <span className="ml-1.5 text-[10px] text-muted-foreground">🔊</span>
    </div>
  );
}

/* ─── Diagnosis with badges ─── */
export function AlexDiagnosis({ text }: { text: string }) {
  return (
    <motion.div variants={bubbleIn} initial="hidden" animate="visible" className="flex items-end gap-2">
      <AlexAvatar speaking />
      <div className="max-w-[85%] space-y-2">
        <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-muted/50 border border-border/40 text-sm text-foreground shadow-[0_0_20px_-4px_hsl(var(--primary)/0.15)]">
          {text}
          <WaveformIndicator />
        </div>
        <div className="flex flex-wrap gap-1.5 pl-1">
          <Badge icon={<Shield className="w-3 h-3" />} label="Problème détecté" variant="warning" />
          <Badge icon={<Star className="w-3 h-3" />} label={`${SCENARIO.confidence}% confiance`} variant="primary" />
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Badge ─── */
function Badge({ icon, label, variant }: { icon: React.ReactNode; label: string; variant: "primary" | "warning" | "success" }) {
  const colors = {
    primary: "bg-primary/10 text-primary border-primary/20",
    warning: "bg-warning/10 text-warning border-warning/20",
    success: "bg-success/10 text-success border-success/20",
  };
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${colors[variant]}`}
    >
      {icon}{label}
    </motion.span>
  );
}

/* ─── Recommendation ─── */
export function AlexRecommendation({ text }: { text: string }) {
  return (
    <motion.div variants={bubbleIn} initial="hidden" animate="visible" className="flex items-end gap-2">
      <AlexAvatar />
      <div className="max-w-[85%] space-y-2">
        <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-muted/50 border border-primary/20 text-sm text-foreground shadow-[0_0_24px_-4px_hsl(var(--primary)/0.2)]">
          <p>{text}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center text-primary font-bold text-xs">
              {SCENARIO.contractor.score}
            </div>
            <div>
              <p className="text-xs font-semibold">{SCENARIO.contractor.name}</p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" />{SCENARIO.contractor.location}
              </p>
            </div>
          </div>
        </div>
        <Badge icon={<Star className="w-3 h-3" />} label="Recommandé UNPRO" variant="primary" />
      </div>
    </motion.div>
  );
}

/* ─── Why This Choice ─── */
export function WhyThisChoice() {
  const { whyChoice } = SCENARIO;
  return (
    <motion.div variants={bubbleIn} initial="hidden" animate="visible" className="ml-10">
      <div className="rounded-xl border border-border/40 bg-muted/30 p-3 space-y-2">
        <div className="flex items-center gap-1.5">
          <Badge icon={<Check className="w-3 h-3" />} label={whyChoice.title} variant="success" />
        </div>
        <p className="text-xs font-medium text-foreground/80 italic">{whyChoice.shortText}</p>
        <ul className="space-y-1">
          {whyChoice.points.map((pt, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            >
              <Check className="w-3 h-3 text-success flex-shrink-0" />{pt}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

/* ─── Mini Calendar ─── */
export function MiniCalendar() {
  return (
    <motion.div variants={bubbleIn} initial="hidden" animate="visible" className="ml-10">
      <div className="rounded-xl border border-border/40 bg-muted/30 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground/80">Créneaux disponibles</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {BOOKING_SLOTS.map((slot, i) => (
            <motion.div
              key={slot.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className={`relative rounded-lg px-2.5 py-2 text-center text-[11px] border transition-all ${
                slot.isRecommended
                  ? "bg-primary/10 border-primary/40 shadow-[0_0_12px_-2px_hsl(var(--primary)/0.3)] ring-1 ring-primary/20"
                  : "bg-muted/40 border-border/30"
              }`}
            >
              <p className={`font-semibold ${slot.isRecommended ? "text-primary" : "text-foreground/70"}`}>
                {slot.dayLabel} {slot.dateLabel}
              </p>
              <p className={`text-[10px] ${slot.isRecommended ? "text-primary/70" : "text-muted-foreground"}`}>
                {slot.timeLabel}
              </p>
              {slot.isRecommended && (
                <div className="absolute -top-1.5 right-1 px-1.5 py-0.5 rounded-full bg-primary text-[8px] font-bold text-primary-foreground">
                  Suggéré
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Booking Confirmed ─── */
export function BookingConfirmed() {
  const { appointment, contractor } = SCENARIO;
  return (
    <motion.div
      variants={bubbleIn}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-[85%]"
    >
      <motion.div
        className="rounded-2xl border border-success/30 bg-success/5 p-4 text-center space-y-3 shadow-[0_0_30px_-6px_hsl(var(--success)/0.25)]"
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.div
          className="w-10 h-10 mx-auto rounded-full bg-success/15 border border-success/30 flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
        >
          <Check className="w-5 h-5 text-success" />
        </motion.div>
        <div>
          <p className="text-sm font-bold text-foreground">Rendez-vous confirmé</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {appointment.day} {appointment.time}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">{contractor.name}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{appointment.city}</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
