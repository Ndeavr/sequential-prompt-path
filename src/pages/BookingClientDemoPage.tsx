/**
 * UNPRO — Booking Client Demo Page
 * Premium / Signature booking experience preview with mock data.
 */
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays, CheckCircle2, ChevronRight, Clock3, MapPin,
  MessageCircle, Phone, ShieldCheck, Star, Upload, Zap, Mail,
  Building2, Sparkles, AlertCircle, Route,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Mock Data ─── */
const contractorPublicProfile = {
  companyName: "Isolation Solution Royal",
  logoUrl: "https://images.unsplash.com/photo-1616628182509-6f2f0bdb7b6b?q=80&w=300&auto=format&fit=crop",
  ratingAverage: 4.9,
  reviewCount: 233,
  territoryLabel: "Montréal, Laval, Rive-Nord",
  responseSpeedLabel: "Réponse rapide",
  trustBadges: ["Vérifié UNPRO", "20+ ans d'expérience", "Estimation rapide"],
  tagline: "Réservation simple, rapide et professionnelle.",
  phone: "(514) 555-0198",
  email: "contact@entreprise.ca",
};

const appointmentTypes = [
  { id: "quote", title: "Soumission gratuite", durationLabel: "1h30", shortDescription: "Idéal pour une première estimation sur place.", priceLabel: "Gratuit", recommended: false, urgencyBadge: null as string | null, includedItems: ["Évaluation", "Conseils initiaux", "Estimation"] },
  { id: "expertise", title: "Expertise complète", durationLabel: "3h", shortDescription: "Analyse détaillée avec recommandations plus poussées.", priceLabel: "299$", recommended: true, urgencyBadge: null as string | null, includedItems: ["Diagnostic approfondi", "Analyse détaillée", "Plan d'action"] },
  { id: "urgent", title: "Urgence", durationLabel: "60 min", shortDescription: "Pour les situations qui nécessitent une réponse prioritaire.", priceLabel: "Prioritaire", recommended: false, urgencyBadge: "Urgence", includedItems: ["Priorité", "Évaluation rapide", "Orientation immédiate"] },
  { id: "video", title: "Consultation rapide", durationLabel: "30 min", shortDescription: "Appel ou vidéo pour une première orientation.", priceLabel: "49$", recommended: false, urgencyBadge: null as string | null, includedItems: ["Appel rapide", "Orientation", "Étape suivante"] },
];

const availabilityDays = [
  { dateIso: "2026-03-24", dayLabel: "Mar", dateLabel: "24", isAvailable: true, isFull: false },
  { dateIso: "2026-03-25", dayLabel: "Mer", dateLabel: "25", isAvailable: true, isFull: false },
  { dateIso: "2026-03-26", dayLabel: "Jeu", dateLabel: "26", isAvailable: true, isFull: false },
  { dateIso: "2026-03-27", dayLabel: "Ven", dateLabel: "27", isAvailable: false, isFull: true },
  { dateIso: "2026-03-28", dayLabel: "Sam", dateLabel: "28", isAvailable: true, isFull: false },
  { dateIso: "2026-03-29", dayLabel: "Dim", dateLabel: "29", isAvailable: false, isFull: true },
];

const baseSlots = [
  { id: "s1", timeLabel: "09:00", isRecommended: false, isFastest: true, isTravelOptimized: false, isUrgentFit: false, disabled: false },
  { id: "s2", timeLabel: "10:30", isRecommended: true, isFastest: false, isTravelOptimized: true, isUrgentFit: false, disabled: false },
  { id: "s3", timeLabel: "13:00", isRecommended: false, isFastest: false, isTravelOptimized: false, isUrgentFit: false, disabled: false },
  { id: "s4", timeLabel: "14:30", isRecommended: false, isFastest: false, isTravelOptimized: true, isUrgentFit: true, disabled: false },
  { id: "s5", timeLabel: "16:00", isRecommended: false, isFastest: false, isTravelOptimized: false, isUrgentFit: false, disabled: false },
  { id: "s6", timeLabel: "18:00", isRecommended: false, isFastest: false, isTravelOptimized: false, isUrgentFit: false, disabled: true },
];

/* ─── Animation Variants ─── */
const fadeUp = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };
const stagger = { visible: { transition: { staggerChildren: 0.06 } } };

/* ─── Sub-Components ─── */

function TrustBadgesRow({ badges }: { badges: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {badges.map((badge) => (
        <span key={badge} className="inline-flex items-center gap-1 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm">
          <ShieldCheck className="h-3.5 w-3.5" />
          {badge}
        </span>
      ))}
    </div>
  );
}

function HeroBookingContractorCard({ profile, isSignature }: { profile: typeof contractorPublicProfile; isSignature: boolean }) {
  return (
    <motion.section variants={fadeUp} className={cn(
      "relative overflow-hidden rounded-[28px] border border-border bg-card p-5 shadow-[0_20px_60px_hsl(var(--foreground)/0.06)] md:p-7",
      isSignature && "bg-gradient-to-br from-card via-card to-muted/30"
    )}>
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/5 via-transparent to-secondary/5 opacity-80" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <img src={profile.logoUrl} alt={profile.companyName} className="h-16 w-16 rounded-2xl object-cover shadow-md ring-1 ring-border" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">{profile.companyName}</h1>
              {isSignature && (
                <span className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-background">
                  <Sparkles className="h-3.5 w-3.5" /> Signature
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Star className="h-4 w-4 fill-current text-amber-500" />
                {profile.ratingAverage} ({profile.reviewCount} avis)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {profile.territoryLabel}
              </span>
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Réservez un rendez-vous en quelques minutes</p>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            {isSignature
              ? "Voici les meilleures options pour votre situation. Les plages affichées tiennent compte des disponibilités réelles et de la logique de planification."
              : "Choisissez le type de rendez-vous qui vous convient, sélectionnez une date, puis confirmez votre réservation rapidement."}
          </p>
        </div>
        <TrustBadgesRow badges={profile.trustBadges} />
      </div>
    </motion.section>
  );
}

function SignatureRecommendationBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-[24px] border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-muted/20 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-foreground p-2 text-background"><Sparkles className="h-4 w-4" /></div>
        <div>
          <p className="text-sm font-semibold text-foreground">Option recommandée pour votre situation</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">L'expertise complète est souvent préférable lorsque vous souhaitez une analyse plus claire dès la première visite.</p>
        </div>
      </div>
    </motion.div>
  );
}

type AppointmentItem = (typeof appointmentTypes)[number];

function AppointmentTypeCardUNPRO({ item, selected, onClick, isSignature }: { item: AppointmentItem; selected: boolean; onClick: () => void; isSignature: boolean }) {
  return (
    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.99 }} onClick={onClick}
      className={cn(
        "relative min-w-[260px] rounded-[24px] border p-4 text-left transition-all duration-200 md:min-w-0",
        selected ? "border-foreground bg-foreground text-background shadow-[0_18px_40px_hsl(var(--foreground)/0.15)]"
          : "border-border bg-card text-foreground shadow-sm hover:border-muted-foreground/30"
      )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold">{item.title}</p>
          <p className={cn("mt-1 text-sm", selected ? "text-background/60" : "text-muted-foreground")}>{item.durationLabel}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {item.recommended && isSignature && (
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", selected ? "bg-background/10 text-background" : "bg-primary/10 text-primary")}>Recommandé</span>
          )}
          {item.urgencyBadge && (
            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", selected ? "bg-destructive/20 text-destructive-foreground" : "bg-destructive/10 text-destructive")}>
              {item.urgencyBadge}
            </span>
          )}
        </div>
      </div>
      <p className={cn("mt-3 text-sm leading-6", selected ? "text-background/60" : "text-muted-foreground")}>{item.shortDescription}</p>
      <div className="mt-4 flex items-center justify-between">
        <p className={cn("text-sm font-semibold", selected ? "text-background" : "text-foreground")}>{item.priceLabel}</p>
        <ChevronRight className={cn("h-4 w-4", selected ? "text-background/50" : "text-muted-foreground")} />
      </div>
    </motion.button>
  );
}

function AppointmentTypeSelector({ items, selectedId, onSelect, isSignature }: { items: AppointmentItem[]; selectedId: string; onSelect: (id: string) => void; isSignature: boolean }) {
  return (
    <motion.section variants={fadeUp} className="space-y-3">
      <div>
        <p className="text-lg font-semibold text-foreground">Choisissez le type de rendez-vous</p>
        <p className="mt-1 text-sm text-muted-foreground">Sélectionnez l'option qui correspond le mieux à votre besoin.</p>
      </div>
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-2 xl:grid-cols-4 md:overflow-visible">
        {items.map((item) => (
          <div key={item.id} className="snap-start">
            <AppointmentTypeCardUNPRO item={item} selected={selectedId === item.id} onClick={() => onSelect(item.id)} isSignature={isSignature} />
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function AddressValidationStep({ value, onChange, isValid, isOutOfZone }: { value: string; onChange: (v: string) => void; isValid: boolean; isOutOfZone: boolean }) {
  return (
    <motion.section variants={fadeUp} className="space-y-3 rounded-[24px] border border-border bg-card p-4 shadow-sm">
      <div>
        <p className="text-lg font-semibold text-foreground">Entrez votre adresse</p>
        <p className="mt-1 text-sm text-muted-foreground">Nous validons automatiquement si votre secteur est desservi.</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Adresse</label>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted px-4 py-3 focus-within:border-foreground focus-within:bg-card">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="1234 Rue Exemple, Laval"
            className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
        </div>
      </div>
      <AnimatePresence mode="wait">
        {value ? (
          isOutOfZone ? (
            <motion.div key="out" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-4 w-4" /> Cette adresse semble hors zone pour le moment.
            </motion.div>
          ) : isValid ? (
            <motion.div key="valid" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
              className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-4 w-4" /> Zone desservie.
            </motion.div>
          ) : null
        ) : null}
      </AnimatePresence>
    </motion.section>
  );
}

function DateStripSelector({ days, selectedDate, onSelect }: { days: typeof availabilityDays; selectedDate: string; onSelect: (d: string) => void }) {
  return (
    <motion.section variants={fadeUp} className="space-y-3">
      <div>
        <p className="text-lg font-semibold text-foreground">Choisissez une date</p>
        <p className="mt-1 text-sm text-muted-foreground">Prochaines disponibilités.</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {days.map((day) => {
          const selected = selectedDate === day.dateIso;
          const disabled = !day.isAvailable;
          return (
            <motion.button key={day.dateIso} whileTap={{ scale: disabled ? 1 : 0.98 }}
              onClick={() => !disabled && onSelect(day.dateIso)}
              className={cn(
                "min-w-[84px] rounded-[22px] border px-4 py-3 text-center transition-all",
                selected ? "border-foreground bg-foreground text-background shadow-lg"
                  : disabled ? "border-border bg-muted text-muted-foreground/50"
                  : "border-border bg-card text-foreground shadow-sm hover:border-muted-foreground/30"
              )}>
              <div className="text-xs font-medium uppercase tracking-[0.12em]">{day.dayLabel}</div>
              <div className="mt-1 text-lg font-semibold">{day.dateLabel}</div>
              <div className="mt-1 text-[11px]">{day.isFull ? "Complet" : day.isAvailable ? "Disponible" : "Indispo"}</div>
            </motion.button>
          );
        })}
      </div>
    </motion.section>
  );
}

function SlotSmartBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-card/80 px-2 py-0.5 text-[10px] font-semibold text-foreground ring-1 ring-border">
      {children}
    </span>
  );
}

type SlotItem = (typeof baseSlots)[number];

function TimeSlotPillButton({ slot, selected, onClick, isSignature }: { slot: SlotItem; selected: boolean; onClick: () => void; isSignature: boolean }) {
  const badges: string[] = [];
  if (isSignature && slot.isRecommended) badges.push("Recommandé");
  if (isSignature && slot.isFastest) badges.push("Le plus rapide");
  if (isSignature && slot.isTravelOptimized) badges.push("Optimisé déplacement");
  if (isSignature && slot.isUrgentFit) badges.push("Urgence");

  return (
    <motion.button layout whileTap={{ scale: slot.disabled ? 1 : 0.98 }} onClick={onClick} disabled={slot.disabled}
      className={cn(
        "relative flex min-h-[74px] flex-col items-start justify-between rounded-[22px] border p-4 text-left transition-all",
        selected ? "border-foreground bg-foreground text-background shadow-[0_14px_32px_hsl(var(--foreground)/0.15)]"
          : slot.disabled ? "border-border bg-muted text-muted-foreground/50"
          : "border-border bg-card text-foreground shadow-sm hover:border-muted-foreground/30"
      )}>
      <span className="text-base font-semibold">{slot.timeLabel}</span>
      {badges.length > 0 && !slot.disabled && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {badges.slice(0, 2).map((badge) => (<SlotSmartBadge key={badge}>{badge}</SlotSmartBadge>))}
        </div>
      )}
    </motion.button>
  );
}

function TimeSlotGridSmart({ slots, selectedSlotId, onSelect, isSignature }: { slots: SlotItem[]; selectedSlotId: string; onSelect: (id: string) => void; isSignature: boolean }) {
  return (
    <motion.section variants={fadeUp} className="space-y-3">
      <div>
        <p className="text-lg font-semibold text-foreground">Choisissez une heure</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignature ? "Les plages affichées tiennent compte des disponibilités réelles." : "Choisissez l'heure qui vous convient le mieux."}
        </p>
      </div>
      <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {slots.map((slot) => (
          <motion.div key={slot.id} variants={fadeUp}>
            <TimeSlotPillButton slot={slot} selected={selectedSlotId === slot.id} onClick={() => !slot.disabled && onSelect(slot.id)} isSignature={isSignature} />
          </motion.div>
        ))}
      </motion.div>
    </motion.section>
  );
}

function BookingIntakeForm({ form, onChange }: { form: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const fields = [
    { key: "clientName", label: "Votre nom", type: "text", placeholder: "Nom complet" },
    { key: "clientPhone", label: "Téléphone", type: "tel", placeholder: "(514) 555-0000" },
    { key: "clientEmail", label: "Courriel", type: "email", placeholder: "vous@exemple.com" },
  ];
  return (
    <motion.section variants={fadeUp} className="space-y-4 rounded-[24px] border border-border bg-card p-4 shadow-sm">
      <div>
        <p className="text-lg font-semibold text-foreground">Quelques détails</p>
        <p className="mt-1 text-sm text-muted-foreground">Cela nous aide à mieux préparer votre rendez-vous.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {fields.map((field) => (
          <label key={field.key} className="space-y-2">
            <span className="text-sm font-medium text-foreground">{field.label}</span>
            <input type={field.type} value={form[field.key]} onChange={(e) => onChange(field.key, e.target.value)} placeholder={field.placeholder}
              className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground focus:bg-card placeholder:text-muted-foreground" />
          </label>
        ))}
      </div>
      <label className="space-y-2">
        <span className="text-sm font-medium text-foreground">Décrivez brièvement votre besoin</span>
        <textarea rows={4} value={form.projectSummary} onChange={(e) => onChange("projectSummary", e.target.value)} placeholder="Décrivez votre situation en quelques lignes"
          className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground focus:bg-card placeholder:text-muted-foreground" />
      </label>
    </motion.section>
  );
}

function PhotoUploadCard({ files, onAdd }: { files: string[]; onAdd: (name: string) => void }) {
  return (
    <motion.section variants={fadeUp} className="space-y-3 rounded-[24px] border border-border bg-card p-4 shadow-sm">
      <div>
        <p className="text-lg font-semibold text-foreground">Ajoutez des photos si vous le souhaitez</p>
        <p className="mt-1 text-sm text-muted-foreground">Cela peut aider à mieux préparer la visite.</p>
      </div>
      <label className="flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-border bg-muted px-4 py-8 text-center transition hover:border-muted-foreground/40 hover:bg-card">
        <Upload className="mb-2 h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">Ajouter une photo</span>
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) onAdd(file.name); }} />
      </label>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file) => (
            <span key={file} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-foreground shadow-sm">{file}</span>
          ))}
        </div>
      )}
    </motion.section>
  );
}

function SummaryRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-muted p-2 text-muted-foreground"><Icon className="h-4 w-4" /></div>
      <div>
        <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function BookingSummaryStickyCard({ profile, appointmentType, selectedDay, selectedSlot, address, canSubmit, onSubmit, isSignature }: {
  profile: typeof contractorPublicProfile;
  appointmentType?: AppointmentItem;
  selectedDay?: (typeof availabilityDays)[number];
  selectedSlot?: SlotItem;
  address: string;
  canSubmit: boolean;
  onSubmit: () => void;
  isSignature: boolean;
}) {
  return (
    <motion.aside initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="sticky bottom-4 self-start rounded-[28px] border border-border bg-card p-4 shadow-[0_20px_60px_hsl(var(--foreground)/0.08)] md:top-6 md:bottom-auto md:p-5">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">Résumé</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">Votre réservation</p>
        </div>
        {isSignature && (
          <div className="rounded-2xl border border-primary/15 bg-primary/5 p-3 text-sm text-primary">
            Les meilleures options sont mises en avant pour simplifier votre choix.
          </div>
        )}
        <div className="space-y-3 text-sm">
          <SummaryRow icon={Building2} label="Entreprise" value={profile.companyName} />
          <SummaryRow icon={Clock3} label="Rendez-vous" value={appointmentType?.title || "À sélectionner"} />
          <SummaryRow icon={CalendarDays} label="Date" value={selectedDay ? `${selectedDay.dayLabel} ${selectedDay.dateLabel}` : "À sélectionner"} />
          <SummaryRow icon={Zap} label="Heure" value={selectedSlot?.timeLabel || "À sélectionner"} />
          <SummaryRow icon={MapPin} label="Adresse" value={address || "À compléter"} />
        </div>
        <button onClick={onSubmit} disabled={!canSubmit}
          className={cn(
            "w-full rounded-2xl px-4 py-3.5 text-sm font-semibold transition",
            canSubmit ? "bg-foreground text-background shadow-lg hover:opacity-90" : "cursor-not-allowed bg-muted text-muted-foreground"
          )}>
          Confirmer mon rendez-vous
        </button>
      </div>
    </motion.aside>
  );
}

function AlexHelpBubble({ isSignature }: { isSignature: boolean }) {
  if (!isSignature) return null;
  return (
    <motion.button animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 3.6, ease: "easeInOut" }}
      className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-semibold text-background shadow-[0_18px_40px_hsl(var(--foreground)/0.2)] md:bottom-6">
      <MessageCircle className="h-4 w-4" /> Besoin d'aide? Alex vous guide
    </motion.button>
  );
}

function BookingConfirmationCardDemo({ data, onRestart }: { data: Record<string, string>; onRestart: () => void }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      className="mx-auto max-w-2xl rounded-[32px] border border-border bg-card p-6 text-center shadow-[0_24px_80px_hsl(var(--foreground)/0.08)] md:p-8">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }}
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
        <CheckCircle2 className="h-7 w-7" />
      </motion.div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Votre rendez-vous est confirmé</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
        Merci. Nous avons bien reçu votre réservation. Vous pouvez maintenant ajouter ce rendez-vous à votre calendrier.
      </p>
      <div className="mt-6 rounded-[24px] border border-border bg-muted p-4 text-left">
        <div className="grid gap-4 md:grid-cols-2">
          <SummaryRow icon={Clock3} label="Type" value={data.appointmentTypeLabel} />
          <SummaryRow icon={CalendarDays} label="Quand" value={`${data.dateLabel} · ${data.timeLabel}`} />
          <SummaryRow icon={MapPin} label="Adresse" value={data.addressLabel} />
          <SummaryRow icon={ShieldCheck} label="Référence" value={data.bookingReference} />
        </div>
      </div>
      <div className="mt-6 flex flex-col gap-3 md:flex-row md:justify-center">
        <button className="rounded-2xl bg-foreground px-5 py-3 text-sm font-semibold text-background">Ajouter à mon calendrier</button>
        <button onClick={onRestart} className="rounded-2xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground">Faire une autre réservation</button>
      </div>
    </motion.section>
  );
}

function BookingSignatureFooterDemo({ profile, isSignature }: { profile: typeof contractorPublicProfile; isSignature: boolean }) {
  return (
    <motion.footer variants={fadeUp} className={cn(
      "rounded-[28px] border border-border bg-card p-5 shadow-sm",
      isSignature && "bg-gradient-to-br from-card to-muted/30"
    )}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <img src={profile.logoUrl} alt={profile.companyName} className="h-14 w-14 rounded-2xl object-cover ring-1 ring-border" />
          <div>
            <p className="text-lg font-semibold text-foreground">{profile.companyName}</p>
            <p className="text-sm text-muted-foreground">{profile.tagline}</p>
          </div>
        </div>
        <div className="grid gap-3 text-sm text-foreground md:grid-cols-3 md:text-right">
          <div className="inline-flex items-center gap-2 md:justify-end"><Phone className="h-4 w-4 text-muted-foreground" />{profile.phone}</div>
          <div className="inline-flex items-center gap-2 md:justify-end"><Mail className="h-4 w-4 text-muted-foreground" />{profile.email}</div>
          <div className="inline-flex items-center gap-2 md:justify-end"><Route className="h-4 w-4 text-muted-foreground" />{profile.territoryLabel}</div>
        </div>
      </div>
    </motion.footer>
  );
}

/* ─── Main Page ─── */
export default function BookingClientDemoPage() {
  const [planMode, setPlanMode] = useState<"premium" | "signature">("signature");
  const [selectedAppointmentTypeId, setSelectedAppointmentTypeId] = useState("expertise");
  const [addressLine1, setAddressLine1] = useState("");
  const [selectedDate, setSelectedDate] = useState("2026-03-25");
  const [selectedSlotId, setSelectedSlotId] = useState("s2");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ clientName: "", clientPhone: "", clientEmail: "", projectSummary: "" });
  const [photos, setPhotos] = useState<string[]>([]);

  const isSignature = planMode === "signature";
  const isOutOfZone = addressLine1.toLowerCase().includes("québec");
  const isValidAddress = addressLine1.trim().length > 6 && !isOutOfZone;

  const selectedAppointmentType = useMemo(() => appointmentTypes.find((i) => i.id === selectedAppointmentTypeId), [selectedAppointmentTypeId]);
  const selectedDay = useMemo(() => availabilityDays.find((d) => d.dateIso === selectedDate), [selectedDate]);
  const timeSlots = useMemo(() => {
    if (selectedAppointmentTypeId === "urgent") return baseSlots.map((s, i) => ({ ...s, isUrgentFit: i < 2 || s.timeLabel === "14:30" }));
    return baseSlots;
  }, [selectedAppointmentTypeId]);
  const selectedSlot = useMemo(() => timeSlots.find((s) => s.id === selectedSlotId), [timeSlots, selectedSlotId]);
  const canSubmit = !!selectedAppointmentType && !!selectedDay && !!selectedSlot && isValidAddress && form.clientName.trim() && form.clientPhone.trim() && form.clientEmail.trim();

  const confirmationData = {
    bookingReference: "UNP-48291",
    dateLabel: selectedDay ? `${selectedDay.dayLabel} ${selectedDay.dateLabel}` : "",
    timeLabel: selectedSlot?.timeLabel || "",
    addressLabel: addressLine1,
    appointmentTypeLabel: selectedAppointmentType?.title || "",
    contractorName: contractorPublicProfile.companyName,
  };

  const restartBooking = () => {
    setSubmitted(false); setAddressLine1(""); setSelectedDate("2026-03-25"); setSelectedSlotId("s2"); setPhotos([]);
    setForm({ clientName: "", clientPhone: "", clientEmail: "", projectSummary: "" });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background px-4 py-8 md:px-6 md:py-12">
        <Helmet><title>Réservation confirmée | UNPRO</title></Helmet>
        <BookingConfirmationCardDemo data={confirmationData} onRestart={restartBooking} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background text-foreground">
      <Helmet><title>Réserver — {contractorPublicProfile.companyName} | UNPRO</title></Helmet>
      <AlexHelpBubble isSignature={isSignature} />

      <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
        {/* Plan Mode Switcher */}
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Mode aperçu</p>
            <p className="text-sm font-semibold text-foreground">Comparez Premium et Signature</p>
          </div>
          <div className="inline-flex rounded-2xl border border-border bg-muted p-1">
            {([{ id: "premium" as const, label: "Premium" }, { id: "signature" as const, label: "Signature" }]).map((mode) => (
              <button key={mode.id} onClick={() => setPlanMode(mode.id)}
                className={cn("rounded-xl px-4 py-2 text-sm font-semibold transition", planMode === mode.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground")}>
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <motion.div initial="hidden" animate="visible" variants={stagger} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <div className="space-y-6">
            <HeroBookingContractorCard profile={contractorPublicProfile} isSignature={isSignature} />
            <SignatureRecommendationBanner show={isSignature} />
            <AppointmentTypeSelector items={appointmentTypes} selectedId={selectedAppointmentTypeId} onSelect={setSelectedAppointmentTypeId} isSignature={isSignature} />
            <AddressValidationStep value={addressLine1} onChange={setAddressLine1} isValid={isValidAddress} isOutOfZone={isOutOfZone} />
            <DateStripSelector days={availabilityDays} selectedDate={selectedDate} onSelect={setSelectedDate} />
            <TimeSlotGridSmart slots={timeSlots} selectedSlotId={selectedSlotId} onSelect={setSelectedSlotId} isSignature={isSignature} />
            <BookingIntakeForm form={form} onChange={(key, value) => setForm((prev) => ({ ...prev, [key]: value }))} />
            <PhotoUploadCard files={photos} onAdd={(name) => setPhotos((prev) => [...prev, name])} />
            <BookingSignatureFooterDemo profile={contractorPublicProfile} isSignature={isSignature} />
          </div>
          <BookingSummaryStickyCard profile={contractorPublicProfile} appointmentType={selectedAppointmentType} selectedDay={selectedDay} selectedSlot={selectedSlot} address={addressLine1} canSubmit={!!canSubmit} onSubmit={() => setSubmitted(true)} isSignature={isSignature} />
        </motion.div>
      </div>
    </div>
  );
}
