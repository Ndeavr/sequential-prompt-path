import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { BookingHeroCard } from "@/components/booking/BookingHeroCard";
import { TrustStrip } from "@/components/booking/TrustStrip";
import { AppointmentTypeCard } from "@/components/booking/AppointmentTypeCard";
import { SmartRecommendationBanner } from "@/components/booking/SmartRecommendationBanner";
import { DateSelector } from "@/components/booking/DateSelector";
import { RankedTimeSlotGrid } from "@/components/booking/RankedTimeSlotGrid";
import { BookingSummaryCard } from "@/components/booking/BookingSummaryCard";
import { BookingConfirmationCard } from "@/components/booking/BookingConfirmationCard";

import {
  computeSmartSlots,
  fetchAppointmentTypes,
  fetchAvailability,
  type AppointmentType,
  type SlotCandidate,
  type AvailabilitySlot,
} from "@/services/bookingSlotEngine";

type BookingStep = "types" | "date" | "slots" | "info" | "summary" | "confirmed";

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
}

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

  // Form fields
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

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

      // Auto-select if typeSlug provided
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
    setStep("summary");
  };

  const handleConfirm = async () => {
    if (!contractor || !selectedType || !selectedSlot) return;
    setIsSubmitting(true);

    try {
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
          status: "pending",
          urgency_level: "normal",
        })
        .select("id")
        .single();

      if (error) throw error;
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
    else if (step === "summary") setStep("info");
  };

  const availableDays = availability.filter((a) => a.is_active).map((a) => a.day_of_week);

  if (!contractor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Réserver — {contractor.business_name} | UNPRO</title>
        <meta name="description" content={`Prenez rendez-vous avec ${contractor.business_name}. Réservation intelligente et rapide.`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            {step !== "types" && step !== "confirmed" && (
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={goBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <span className="text-meta font-medium text-muted-foreground">
              {step === "types" && "Choisir le type"}
              {step === "date" && "Choisir la date"}
              {step === "slots" && "Choisir l'heure"}
              {step === "info" && "Vos informations"}
              {step === "summary" && "Confirmation"}
              {step === "confirmed" && "Confirmé!"}
            </span>

            {/* Progress dots */}
            <div className="ml-auto flex gap-1.5">
              {["types", "date", "slots", "info", "summary"].map((s, i) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step === s ? "bg-primary w-4" : "bg-border"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
          {/* Hero — always visible except on confirmation */}
          {step !== "confirmed" && (
            <>
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
            </>
          )}

          {/* Step: Types */}
          {step === "types" && (
            <div className="space-y-3">
              <SmartRecommendationBanner
                message="Nous vous proposons d'abord les options les plus pertinentes"
                subMessage="Les plages affichées tiennent déjà compte du déplacement"
              />

              {types.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-body text-muted-foreground">
                    Aucun type de rendez-vous disponible pour le moment.
                  </p>
                </div>
              ) : (
                types.map((type, i) => (
                  <AppointmentTypeCard
                    key={type.id}
                    type={type}
                    isSelected={selectedType?.id === type.id}
                    onSelect={handleSelectType}
                    recommended={i === 0}
                  />
                ))
              )}
            </div>
          )}

          {/* Step: Date */}
          {step === "date" && selectedType && (
            <div className="space-y-4">
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
                <div className="text-center py-6">
                  <div className="animate-pulse text-meta text-muted-foreground">
                    Calcul des disponibilités...
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step: Slots */}
          {step === "slots" && (
            <div className="space-y-4">
              {slots.length > 0 && (
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
            </div>
          )}

          {/* Step: Info */}
          {step === "info" && (
            <form onSubmit={handleInfoSubmit} className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
                <h3 className="text-body font-semibold text-foreground">Vos informations</h3>

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
                  <Label htmlFor="notes">Notes ou détails du projet</Label>
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
                Voir le récapitulatif
              </Button>
            </form>
          )}

          {/* Step: Summary */}
          {step === "summary" && selectedType && selectedSlot && (
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
          )}

          {/* Step: Confirmed */}
          {step === "confirmed" && selectedType && selectedSlot && bookingId && (
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
          )}

          {/* Alex CTA */}
          {step !== "confirmed" && (
            <div className="text-center pt-2">
              <button className="inline-flex items-center gap-2 text-meta text-muted-foreground hover:text-primary transition-colors">
                <MessageCircle className="w-4 h-4" />
                Besoin d'aide? Parlez à Alex
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
