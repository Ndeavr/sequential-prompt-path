import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

import { BookingHeroCard } from "@/components/booking/BookingHeroCard";
import { TrustStrip } from "@/components/booking/TrustStrip";
import { AppointmentTypeCard } from "@/components/booking/AppointmentTypeCard";
import { SmartRecommendationBanner } from "@/components/booking/SmartRecommendationBanner";
import { DateSelector } from "@/components/booking/DateSelector";
import { RankedTimeSlotGrid } from "@/components/booking/RankedTimeSlotGrid";
import { BookingSummaryCard } from "@/components/booking/BookingSummaryCard";
import { BookingConfirmationCard } from "@/components/booking/BookingConfirmationCard";
import { SignatureFooter } from "@/components/booking/SignatureFooter";
import { PaidAppointmentBadge } from "@/components/booking/PaidAppointmentBadge";
import { PaidValueProposition } from "@/components/booking/PaidValueProposition";
import { BookingPhotoUpload } from "@/components/booking/BookingPhotoUpload";
import { AlexBookingBubble } from "@/components/booking/AlexBookingBubble";
import { BookingStickySummary } from "@/components/booking/BookingStickySummary";
import {
  computeSmartSlots,
  fetchAppointmentTypes,
  fetchAvailability,
  type AppointmentType,
  type SlotCandidate,
  type AvailabilitySlot,
} from "@/services/bookingSlotEngine";

type BookingStep = "types" | "date" | "slots" | "info" | "photos" | "summary" | "confirmed";

interface ContractorInfo {
  id: string;
  business_name: string;
  specialty: string | null;
  city: string | null;
  logo_url: string | null;
  rating: number | null;
  review_count: number | null;
  aipp_score: number | null;
  admin_verified: boolean | null;
  slug: string | null;
  phone: string | null;
  plan_code?: string | null;
}

const stepAnimation = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

const STEP_LABELS: Record<BookingStep, string> = {
  types: "Choisir le type",
  date: "Choisir la date",
  slots: "Choisir l'heure",
  info: "Vos informations",
  photos: "Photos",
  summary: "Confirmation",
  confirmed: "Confirmé!",
};

const PROGRESS_STEPS: BookingStep[] = ["types", "date", "slots", "info", "photos", "summary"];

export default function PublicBookingPage() {
  const { slug, typeSlug } = useParams<{ slug: string; typeSlug?: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<BookingStep>("types");
  const [contractor, setContractor] = useState<ContractorInfo | null>(null);
  const [types, setTypes] = useState<AppointmentType[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [selectedType, setSelectedType] = useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<SlotCandidate[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<SlotCandidate | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);

  // Form fields
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  // Signature tier detection
  const isSignature = contractor?.plan_code === "signature";

  // Load contractor + types
  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: c } = await supabase
        .from("contractors")
        .select("id, business_name, specialty, city, logo_url, rating, review_count, aipp_score, admin_verified, slug, phone")
        .eq("slug", slug)
        .single();

      if (!c) {
        toast.error("Entrepreneur introuvable");
        return;
      }
      setContractor(c as unknown as ContractorInfo);

      const t = await fetchAppointmentTypes(c.id);
      setTypes(t);

      const a = await fetchAvailability(c.id);
      setAvailability(a);

      if (typeSlug) {
        const match = t.find((tp) => tp.slug === typeSlug);
        if (match) {
          setSelectedType(match);
          setStep("date");
        }
      }
    })();
  }, [slug, typeSlug]);

  // Compute slots when date changes
  useEffect(() => {
    if (!selectedDate || !selectedType || !contractor) return;

    setIsLoadingSlots(true);
    const from = new Date(selectedDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(selectedDate);
    to.setHours(23, 59, 59, 999);

    computeSmartSlots({
      contractorId: contractor.id,
      appointmentTypeId: selectedType.id,
      dateFrom: from,
      dateTo: to,
    })
      .then((result) => {
        setSlots(result.slots);
        setStep("slots");
      })
      .catch(() => toast.error("Erreur de chargement des plages"))
      .finally(() => setIsLoadingSlots(false));
  }, [selectedDate, selectedType, contractor]);

  const handleSelectType = (type: AppointmentType) => {
    setSelectedType(type);
    setStep("date");
  };

  const handleSelectSlot = (slot: SlotCandidate) => {
    setSelectedSlot(slot);
    setStep("info");
  };

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      toast.error("Veuillez entrer votre nom");
      return;
    }
    if (!clientPhone.trim() && !clientEmail.trim()) {
      toast.error("Veuillez entrer un téléphone ou courriel");
      return;
    }
    // Go to photo step if type requires photos or always show for Signature
    if (selectedType?.requires_photos || isSignature) {
      setStep("photos");
    } else {
      setStep("summary");
    }
  };

  const handlePhotosNext = () => {
    setStep("summary");
  };

  const handleConfirm = async () => {
    if (!contractor || !selectedType || !selectedSlot) return;
    setIsSubmitting(true);

    try {
      const isPaid = !selectedType.is_free && selectedType.price_amount > 0;

      const { data, error } = await supabase
        .from("smart_bookings")
        .insert({
          contractor_id: contractor.id,
          appointment_type_id: selectedType.id,
          source: "public_page",
          client_name: clientName.trim(),
          client_email: clientEmail.trim() || null,
          client_phone: clientPhone.trim() || null,
          address_line1: address.trim() || null,
          city: city.trim() || null,
          requested_notes: notes.trim() || null,
          scheduled_start: selectedSlot.start.toISOString(),
          scheduled_end: selectedSlot.end.toISOString(),
          buffer_before_minutes: selectedType.buffer_before_minutes,
          buffer_after_minutes: selectedType.buffer_after_minutes,
          travel_minutes_before: selectedType.travel_padding_minutes,
          status: isPaid ? "pending_payment" : "pending",
          urgency_level: "normal",
        })
        .select("id")
        .single();

      if (error) throw error;

      if (isPaid) {
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke(
          "create-booking-checkout",
          {
            body: {
              booking_id: data.id,
              contractor_id: contractor.id,
              appointment_type_title: selectedType.title,
              price_cents: selectedType.price_amount,
              client_email: clientEmail.trim() || null,
              client_name: contractor.business_name,
            },
          }
        );

        if (checkoutError || !checkoutData?.url) {
          throw new Error(checkoutError?.message || "Erreur Stripe");
        }

        window.location.href = checkoutData.url;
        return;
      }

      setBookingId(data.id);
      setStep("confirmed");
      toast.success("Rendez-vous confirmé!");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la réservation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (step === "date") setStep("types");
    else if (step === "slots") setStep("date");
    else if (step === "info") setStep("slots");
    else if (step === "photos") setStep("info");
    else if (step === "summary") {
      if (selectedType?.requires_photos || isSignature) setStep("photos");
      else setStep("info");
    }
  };

  const availableDays = availability.filter((a) => a.is_active).map((a) => a.day_of_week);

  // Sticky summary visibility
  const showSticky = step === "slots" && !!selectedType;

  // Alex context hint per step
  const alexHints: Partial<Record<BookingStep, string>> = {
    types: "Vous hésitez entre les types? Je peux vous aider à choisir le bon rendez-vous.",
    date: "Les dates les plus proches offrent souvent la meilleure disponibilité.",
    slots: "Les plages recommandées optimisent le déplacement de l'entrepreneur.",
    info: "Vos informations restent confidentielles et servent uniquement à préparer la visite.",
  };

  if (!contractor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-muted-foreground"
        >
          Chargement...
        </motion.div>
      </div>
    );
  }

  const currentStepIndex = PROGRESS_STEPS.indexOf(step);

  return (
    <>
      <Helmet>
        <title>Réserver — {contractor.business_name} | UNPRO</title>
        <meta name="description" content={`Prenez rendez-vous avec ${contractor.business_name}. Réservation intelligente et rapide.`} />
      </Helmet>

      <div className="min-h-screen bg-background pb-20 md:pb-0">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            {step !== "types" && step !== "confirmed" && (
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={goBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <span className="text-meta font-medium text-muted-foreground">
              {STEP_LABELS[step]}
            </span>

            {/* Progress bar */}
            <div className="ml-auto flex gap-1.5">
              {PROGRESS_STEPS.map((s, i) => (
                <motion.div
                  key={s}
                  className="h-1.5 rounded-full transition-all"
                  animate={{
                    width: i === currentStepIndex ? 16 : 8,
                    backgroundColor: i <= currentStepIndex
                      ? "hsl(var(--primary))"
                      : "hsl(var(--border))",
                  }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          {/* Hero */}
          {step !== "confirmed" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
            >
              <BookingHeroCard
                companyName={contractor.business_name}
                specialty={contractor.specialty ?? undefined}
                city={contractor.city ?? undefined}
                logoUrl={contractor.logo_url ?? undefined}
                rating={contractor.rating ?? undefined}
                reviewCount={contractor.review_count ?? undefined}
                aippScore={contractor.aipp_score ? Number(contractor.aipp_score) : undefined}
                isVerified={contractor.admin_verified ?? false}
              />
              <TrustStrip />
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* Step: Types */}
            {step === "types" && (
              <motion.div key="types" {...stepAnimation} className="space-y-3">
                {isSignature && (
                  <SmartRecommendationBanner
                    message="Voici les meilleures options pour votre situation"
                    subMessage="Les plages affichées tiennent compte des disponibilités réelles"
                  />
                )}

                {types.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-body text-muted-foreground">
                      Aucun type de rendez-vous disponible pour le moment.
                    </p>
                  </div>
                ) : (
                  types.map((type, i) => (
                    <motion.div
                      key={type.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.3 }}
                    >
                      <AppointmentTypeCard
                        type={type}
                        isSelected={selectedType?.id === type.id}
                        onSelect={handleSelectType}
                        recommended={i === 0}
                      />
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {/* Step: Date */}
            {step === "date" && selectedType && (
              <motion.div key="date" {...stepAnimation} className="space-y-4">
                {!selectedType.is_free && selectedType.price_amount > 0 && (
                  <PaidValueProposition
                    appointmentTitle={selectedType.title}
                    priceCents={selectedType.price_amount}
                    category={selectedType.category}
                  />
                )}

                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <DateSelector
                    selectedDate={selectedDate}
                    onSelect={(d) => setSelectedDate(d)}
                    availableDays={availableDays.length > 0 ? availableDays : [1, 2, 3, 4, 5]}
                    horizonDays={30}
                    minNoticeHours={selectedType.min_notice_hours}
                  />
                </div>

                {isLoadingSlots && (
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-center py-6 text-meta text-muted-foreground"
                  >
                    Calcul des disponibilités...
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Step: Slots */}
            {step === "slots" && (
              <motion.div key="slots" {...stepAnimation} className="space-y-4">
                {slots.length > 0 && isSignature && (
                  <SmartRecommendationBanner
                    message="Plages classées par pertinence"
                    subMessage="Déplacement, disponibilité et efficacité sont pris en compte"
                  />
                )}

                <div className="rounded-xl border border-border/60 bg-card p-4">
                  <RankedTimeSlotGrid
                    slots={slots}
                    selectedSlot={selectedSlot}
                    onSelect={handleSelectSlot}
                  />
                </div>
              </motion.div>
            )}

            {/* Step: Info */}
            {step === "info" && (
              <motion.div key="info" {...stepAnimation}>
                <form onSubmit={handleInfoSubmit} className="space-y-4">
                  <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
                    <h3 className="text-body font-semibold text-foreground">
                      Quelques détails pour préparer votre rendez-vous
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="name">Nom complet *</Label>
                      <Input
                        id="name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="Ex: Marie Tremblay"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        placeholder="514-555-1234"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Courriel</Label>
                      <Input
                        id="email"
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="marie@exemple.com"
                      />
                    </div>

                    {selectedType?.location_mode === "client_address" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="address">Adresse</Label>
                          <Input
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="123 rue Principale"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="city">Ville</Label>
                          <Input
                            id="city"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            placeholder="Montréal"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="notes">Décrivez brièvement votre besoin</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Décrivez brièvement votre situation..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    Continuer
                  </Button>
                </form>
              </motion.div>
            )}

            {/* Step: Photos */}
            {step === "photos" && (
              <motion.div key="photos" {...stepAnimation} className="space-y-4">
                <BookingPhotoUpload
                  photos={photos}
                  onPhotosChange={setPhotos}
                />
                <Button onClick={handlePhotosNext} className="w-full">
                  {photos.length > 0 ? "Continuer avec les photos" : "Passer cette étape"}
                </Button>
              </motion.div>
            )}

            {/* Step: Summary */}
            {step === "summary" && selectedType && selectedSlot && (
              <motion.div key="summary" {...stepAnimation}>
                <BookingSummaryCard
                  appointmentType={selectedType}
                  selectedSlot={selectedSlot}
                  clientName={clientName}
                  clientPhone={clientPhone || undefined}
                  clientEmail={clientEmail || undefined}
                  address={address || undefined}
                  notes={notes || undefined}
                  onConfirm={handleConfirm}
                  onBack={() => setStep("info")}
                  isSubmitting={isSubmitting}
                />
              </motion.div>
            )}

            {/* Step: Confirmed */}
            {step === "confirmed" && selectedType && selectedSlot && bookingId && (
              <motion.div key="confirmed" {...stepAnimation}>
                <BookingConfirmationCard
                  companyName={contractor.business_name}
                  appointmentTitle={selectedType.title}
                  date={selectedSlot.start.toLocaleDateString("fr-CA", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                  time={`${selectedSlot.start.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })} – ${selectedSlot.end.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}`}
                  address={address || undefined}
                  phone={contractor.phone ?? undefined}
                  bookingId={bookingId}
                  onDone={() => navigate("/")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Signature Footer */}
        <SignatureFooter
          companyName={contractor.business_name}
          phone={contractor.phone ?? undefined}
          city={contractor.city ?? undefined}
          bookingUrl={window.location.href}
          variant={step === "confirmed" ? "confirmation" : "page"}
        />

        {/* Sticky summary (mobile) */}
        <BookingStickySummary
          visible={showSticky}
          appointmentTitle={selectedType?.title}
          dateLabel={selectedDate?.toLocaleDateString("fr-CA", { day: "numeric", month: "short" })}
        />

        {/* Alex bubble (Signature only) */}
        {isSignature && step !== "confirmed" && (
          <AlexBookingBubble contextHint={alexHints[step]} />
        )}
      </div>
    </>
  );
}
