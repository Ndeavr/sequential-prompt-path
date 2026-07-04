/**
 * PageHomeownerBookingFunnel — Public homeowner booking funnel.
 *
 * IMPORTANT: This is NOT the contractor dashboard. This is a public homeowner
 * booking funnel. Do not render any contractor account, OAuth, admin, CRM,
 * setup, or calendar-connection UI on this route.
 *
 * Route: /entrepreneurs/:slug
 * Flow: Adresse → Problème → Alex (auto) → Recommandation → Créneau → Confirmation
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Star, ShieldCheck, Calendar as CalendarIcon, Check, Loader2, ArrowRight } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CANONICAL_CONTRACTORS, normalizeContractorName } from "@/lib/brand/canonicalContractor";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface AddressDraft {
  full_address: string;
  street_number?: string;
  route?: string;
  city: string;
  postal_code?: string;
  google_place_id?: string;
  lat?: number;
  lng?: number;
}

interface Slot {
  id: string;
  starts_at: string;
  ends_at: string;
}

function generateFallbackSlots(): Slot[] {
  // 14-day rolling window, 3 slots per weekday (09:00, 13:00, 16:00), 75-min duration.
  const slots: Slot[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const hours = [9, 13, 16];
  for (let d = 1; d <= 14; d++) {
    const day = new Date(now.getTime() + d * 86_400_000);
    const dow = day.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends
    for (const h of hours) {
      const start = new Date(day);
      start.setHours(h, 0, 0, 0);
      const end = new Date(start.getTime() + 75 * 60_000);
      slots.push({
        id: `fallback-${start.toISOString()}`,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
      });
    }
  }
  return slots;
}

function formatSlotDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-CA", { weekday: "short", day: "numeric", month: "short" });
}
function formatSlotTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
}

export default function PageHomeownerBookingFunnel() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canonical = CANONICAL_CONTRACTORS[slug] ?? {
    name: normalizeContractorName(slug.replace(/-/g, " ")),
    short: "",
    website: "",
  };

  const [step, setStep] = useState<Step>(1);
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressDraft, setAddressDraft] = useState<AddressDraft>({ full_address: "", city: "" });
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [qualification, setQualification] = useState<{ category: string; urgency: string; city: string; property_type: string } | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [calendarConnected, setCalendarConnected] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationId, setConfirmationId] = useState<string | null>(null);
  const [requestPending, setRequestPending] = useState(false);

  // Lookup contractor + calendar status + published slots
  useEffect(() => {
    (async () => {
      const { data: c } = await (supabase as any)
        .from("contractors")
        .select("id, business_name, slug")
        .eq("slug", slug)
        .maybeSingle();
      if (!c) return;
      setContractorId(c.id);

      const { data: conn } = await (supabase as any)
        .from("contractor_calendar_connections")
        .select("access_status")
        .eq("contractor_id", c.id)
        .maybeSingle();
      const isConnected = conn?.access_status === "connected";
      setCalendarConnected(isConnected);

      if (isConnected) {
        const { data: s } = await (supabase as any)
          .from("appointment_slots")
          .select("id, starts_at, ends_at")
          .eq("contractor_id", c.id)
          .eq("status", "available")
          .gte("starts_at", new Date().toISOString())
          .order("starts_at", { ascending: true })
          .limit(60);
        setSlots((s as Slot[]) ?? []);
      } else {
        setSlots(generateFallbackSlots());
      }
    })();
  }, [slug]);

  // Load saved addresses when auth'd
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("homeowner_addresses")
        .select("*")
        .eq("homeowner_id", user.id)
        .order("is_default", { ascending: false });
      setAddresses(data ?? []);
    })();
  }, [user]);

  const canAdvanceAddress = useMemo(() => {
    if (selectedAddressId) return true;
    return !!(addressDraft.full_address.trim() && addressDraft.city.trim());
  }, [selectedAddressId, addressDraft]);

  async function handleQualify() {
    if (!problem.trim()) return;
    setStep(3);
    // Lightweight local qualification (Alex intent extraction runs in background elsewhere)
    await new Promise((r) => setTimeout(r, 900));
    const text = problem.toLowerCase();
    const category = /isolation|grenier|chaleur|froid|barrage|glace|condensation|humidit/.test(text)
      ? "Isolation"
      : "Évaluation résidentielle";
    const urgency = /urgent|fuite|immédiat|glace/.test(text) ? "Élevée" : "Standard";
    setQualification({
      category,
      urgency,
      city: addressDraft.city || (addresses.find((a) => a.id === selectedAddressId)?.city ?? "Laval"),
      property_type: "Maison unifamiliale",
    });
    setStep(4);
  }

  async function ensureAddressPersisted(): Promise<string | null> {
    if (!user) return null;
    if (selectedAddressId) return selectedAddressId;
    const { data, error } = await (supabase as any)
      .from("homeowner_addresses")
      .insert({
        homeowner_id: user.id,
        full_address: addressDraft.full_address,
        street_number: addressDraft.street_number ?? null,
        route: addressDraft.route ?? null,
        city: addressDraft.city,
        postal_code: addressDraft.postal_code ?? null,
        google_place_id: addressDraft.google_place_id ?? null,
        lat: addressDraft.lat ?? null,
        lng: addressDraft.lng ?? null,
        is_default: addresses.length === 0,
      })
      .select("id")
      .single();
    if (error) return null;
    return data.id;
  }

  async function handleConfirmSlot() {
    if (!selectedSlot || !contractorId) return;
    if (!user) {
      // Preserve state and route to login
      try {
        sessionStorage.setItem(
          "unpro_booking_pending",
          JSON.stringify({ slug, problem, address: addressDraft, selectedAddressId, slotId: selectedSlot.id }),
        );
      } catch {}
      navigate(`/login?returnTo=${encodeURIComponent(`/entrepreneurs/${slug}`)}`);
      return;
    }
    setSubmitting(true);
    try {
      const addressId = await ensureAddressPersisted();
      if (!addressId) throw new Error("Adresse non enregistrée");

      const payload: any = {
        homeowner_user_id: user.id,
        contractor_id: contractorId,
        address_id: addressId,
        problem_summary: problem,
        project_category: qualification?.category,
        urgency_level: qualification?.urgency?.toLowerCase() === "élevée" ? "high" : "normal",
        source_page: `/entrepreneurs/${slug}`,
      };

      if (calendarConnected && !selectedSlot.id.startsWith("fallback-")) {
        payload.slot_id = selectedSlot.id;
        payload.scheduled_at = selectedSlot.starts_at;
        payload.ends_at = selectedSlot.ends_at;
        payload.status = "scheduled";
      } else {
        // Fallback: no live calendar → request a confirmed availability
        payload.preferred_date = selectedSlot.starts_at.slice(0, 10);
        payload.preferred_time_window = `${formatSlotTime(selectedSlot.starts_at)}–${formatSlotTime(selectedSlot.ends_at)}`;
        payload.status = "requested";
        setRequestPending(true);
      }

      const { data, error } = await (supabase as any)
        .from("appointments")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      setConfirmationId(data.id);
      setStep(6);
    } catch (e) {
      console.error("Booking failed:", e);
    } finally {
      setSubmitting(false);
    }
  }

  // Restore pending booking after login
  useEffect(() => {
    if (!user) return;
    try {
      const raw = sessionStorage.getItem("unpro_booking_pending");
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved?.slug === slug) {
        setProblem(saved.problem ?? "");
        setAddressDraft(saved.address ?? { full_address: "", city: "" });
        setSelectedAddressId(saved.selectedAddressId ?? null);
        setStep(5);
      }
      sessionStorage.removeItem("unpro_booking_pending");
    } catch {}
  }, [user, slug]);

  // ---- Render ----
  return (
    <MainLayout>
      <Helmet>
        <title>Évaluation gratuite — {canonical.name} | UNPRO</title>
        <meta name="description" content={`Réservez votre évaluation gratuite avec ${canonical.name}. Sans engagement.`} />
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-lg mx-auto px-5 pt-10 pb-24">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <p className="text-[11px] tracking-[0.18em] font-semibold text-amber-400 uppercase mb-2">
              Évaluation gratuite · 60–75 min
            </p>
            <h1 className="text-[26px] leading-tight font-bold text-foreground mb-3">
              Obtenez votre évaluation gratuite avec {canonical.name}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span className="text-foreground font-semibold">4.9</span>
                <span>· 300+ avis</span>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Vérifié
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Dessert Laval, Montréal, Rive-Nord et Lanaudière.
            </p>
          </motion.div>

          {/* Stepper */}
          <div className="flex items-center gap-1.5 mb-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`h-1 flex-1 rounded-full transition-all ${
                  step >= (n as Step) ? "bg-primary" : "bg-muted/50"
                }`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1 — Adresse */}
            {step === 1 && (
              <motion.section
                key="s1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  <h2 className="text-lg font-semibold">Votre adresse</h2>
                </div>

                {addresses.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Adresses enregistrées</p>
                    {addresses.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAddressId(a.id)}
                        className={`w-full text-left rounded-xl border p-3 transition ${
                          selectedAddressId === a.id
                            ? "border-primary bg-primary/5"
                            : "border-border/60 bg-card/40 hover:border-border"
                        }`}
                      >
                        <p className="text-sm text-foreground">{a.full_address}</p>
                        <p className="text-xs text-muted-foreground">{a.city}</p>
                      </button>
                    ))}
                    <div className="text-xs text-muted-foreground py-1">ou ajoutez une nouvelle adresse</div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Adresse civique</label>
                    <input
                      type="text"
                      value={addressDraft.full_address}
                      onChange={(e) => {
                        setSelectedAddressId(null);
                        setAddressDraft({ ...addressDraft, full_address: e.target.value });
                      }}
                      placeholder="123 rue Principale"
                      className="w-full h-11 rounded-xl px-4 bg-muted/40 border border-border/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Ville</label>
                    <input
                      type="text"
                      value={addressDraft.city}
                      onChange={(e) => {
                        setSelectedAddressId(null);
                        setAddressDraft({ ...addressDraft, city: e.target.value });
                      }}
                      placeholder="Laval"
                      className="w-full h-11 rounded-xl px-4 bg-muted/40 border border-border/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Code postal (optionnel)</label>
                    <input
                      type="text"
                      value={addressDraft.postal_code ?? ""}
                      onChange={(e) => setAddressDraft({ ...addressDraft, postal_code: e.target.value })}
                      placeholder="H7A 1A1"
                      className="w-full h-11 rounded-xl px-4 bg-muted/40 border border-border/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                </div>

                <button
                  disabled={!canAdvanceAddress}
                  onClick={() => setStep(2)}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
                >
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </motion.section>
            )}

            {/* Step 2 — Décrivez votre projet */}
            {step === 2 && (
              <motion.section
                key="s2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold">Décrivez votre projet</h2>
                <textarea
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  rows={5}
                  placeholder="Ex : J'ai de la condensation dans mon grenier depuis cet hiver…"
                  className="w-full rounded-xl px-4 py-3 bg-muted/40 border border-border/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <div className="flex flex-wrap gap-2">
                  {[
                    "J'ai de la condensation dans mon grenier",
                    "Mes factures de chauffage sont élevées",
                    "J'ai eu des barrages de glace",
                  ].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setProblem(ex)}
                      className="text-xs px-3 py-1.5 rounded-full bg-muted/50 border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <button
                  disabled={!problem.trim()}
                  onClick={handleQualify}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
                >
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </motion.section>
            )}

            {/* Step 3 — Alex qualification (loading) */}
            {step === 3 && (
              <motion.section
                key="s3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 text-center"
              >
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Analyse en cours…</p>
              </motion.section>
            )}

            {/* Step 4 — Entreprise recommandée */}
            {step === 4 && qualification && (
              <motion.section
                key="s4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="flex flex-wrap gap-2">
                  <Chip label={qualification.category} />
                  <Chip label={`Urgence : ${qualification.urgency}`} />
                  <Chip label={qualification.city} />
                  <Chip label={qualification.property_type} />
                </div>

                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
                  <p className="text-[11px] uppercase tracking-widest text-primary font-semibold mb-2">
                    Entreprise recommandée
                  </p>
                  <h3 className="text-lg font-bold text-foreground">{canonical.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-foreground font-semibold">4.9</span>
                    <span>· 300+ avis</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Dessert Laval, Montréal, Rive-Nord et Lanaudière.
                  </p>
                </div>

                <button
                  onClick={() => setStep(5)}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
                >
                  Voir les disponibilités <ArrowRight className="w-4 h-4" />
                </button>
              </motion.section>
            )}

            {/* Step 5 — Choisir un créneau */}
            {step === 5 && (
              <motion.section
                key="s5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <h2 className="text-lg font-semibold">Choisir une date et une heure</h2>
                </div>

                {!calendarConnected && (
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                    Aucune plage horaire publique. UNPRO confirme votre disponibilité avec l’entrepreneur sous 2 h ouvrables.
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2 max-h-[420px] overflow-y-auto pr-1">
                  {slots.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">Aucune disponibilité pour l’instant.</p>
                  )}
                  {slots.slice(0, 24).map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSlot(s)}
                      className={`w-full flex items-center justify-between rounded-xl border p-3 transition ${
                        selectedSlot?.id === s.id
                          ? "border-primary bg-primary/10"
                          : "border-border/60 bg-card/40 hover:border-border"
                      }`}
                    >
                      <span className="text-sm font-medium text-foreground capitalize">
                        {formatSlotDate(s.starts_at)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {formatSlotTime(s.starts_at)} · 75 min
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  disabled={!selectedSlot || submitting}
                  onClick={handleConfirmSlot}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm bg-primary text-primary-foreground disabled:opacity-40 hover:bg-primary/90 active:scale-[0.98] transition inline-flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {user ? "Confirmer le rendez-vous" : "Se connecter et confirmer"}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.section>
            )}

            {/* Step 6 — Confirmation */}
            {step === 6 && (
              <motion.section
                key="s6"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">
                  {requestPending ? "Demande envoyée" : "Rendez-vous confirmé"}
                </h2>
                <p className="text-sm text-muted-foreground mb-1">
                  Avec <span className="font-semibold text-foreground">{canonical.name}</span>
                </p>
                {selectedSlot && (
                  <p className="text-sm text-muted-foreground capitalize">
                    {formatSlotDate(selectedSlot.starts_at)} · {formatSlotTime(selectedSlot.starts_at)}
                  </p>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  {requestPending
                    ? "UNPRO vous contacte pour confirmer la plage horaire."
                    : "Vous recevrez une confirmation par courriel."}
                </p>
                {confirmationId && (
                  <p className="mt-2 text-[10px] text-muted-foreground/60">Réf. {confirmationId.slice(0, 8)}</p>
                )}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="text-[11px] px-2.5 py-1 rounded-full bg-muted/40 border border-border/60 text-muted-foreground">
      {label}
    </span>
  );
}
