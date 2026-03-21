import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Plus, Trash2, GripVertical, Save, Clock, MapPin, DollarSign, Zap, BarChart3, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DEFAULT_APPOINTMENT_TEMPLATES, type AppointmentType } from "@/services/bookingSlotEngine";
import { useAuth } from "@/hooks/useAuth";
import { useContractorPlan } from "@/hooks/useContractorPlan";
import { SignatureLockedOverlay } from "@/components/booking/SignatureLockedOverlay";
import { SignatureDowngradeBanner } from "@/components/booking/SignatureDowngradeBanner";
import { RevenueAnalyticsDashboard } from "@/components/booking/RevenueAnalyticsDashboard";
import { PricingRulesManager } from "@/components/booking/PricingRulesManager";
import { RevenueSplitPreview } from "@/components/booking/RevenueSplitPreview";

const LOCATION_MODES = [
  { value: "client_address", label: "Sur place (chez le client)" },
  { value: "video", label: "Vidéo" },
  { value: "phone", label: "Téléphone" },
  { value: "office", label: "Au bureau" },
];

const PRICE_TYPES = [
  { value: "free", label: "Gratuit" },
  { value: "fixed", label: "Prix fixe" },
  { value: "starting_from", label: "À partir de" },
  { value: "hidden", label: "Sur demande" },
];

const AVAILABILITY_MODES = [
  { value: "standard", label: "Standard" },
  { value: "priority", label: "Prioritaire" },
  { value: "emergency", label: "Urgence" },
  { value: "invite_only", label: "Sur invitation" },
];

export default function BookingSettingsPage() {
  const { session } = useAuth();
  const { canAccessBooking, planCode, planLabel, isLoading: planLoading } = useContractorPlan();
  const [contractorId, setContractorId] = useState<string | null>(null);
  const [types, setTypes] = useState<Partial<AppointmentType>[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Availability
  const [availability, setAvailability] = useState<
    { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[]
  >([]);

  useEffect(() => {
    if (!session?.user?.id) return;
    (async () => {
      const { data: c } = await supabase
        .from("contractors")
        .select("id")
        .eq("user_id", session.user.id)
        .single();

      if (!c) return;
      setContractorId(c.id);

      // Load types
      const { data: existingTypes } = await supabase
        .from("booking_appointment_types")
        .select("*")
        .eq("contractor_id", c.id)
        .order("sort_order");

      if (existingTypes && existingTypes.length > 0) {
        setTypes(existingTypes as unknown as Partial<AppointmentType>[]);
      }

      // Load availability
      const { data: avail } = await supabase
        .from("booking_availability")
        .select("*")
        .eq("contractor_id", c.id);

      if (avail && avail.length > 0) {
        setAvailability(
          avail.map((a: any) => ({
            day_of_week: a.day_of_week,
            start_time: a.start_time,
            end_time: a.end_time,
            is_active: a.is_active,
          }))
        );
      } else {
        // Default availability: Mon-Fri 8-17
        setAvailability(
          [1, 2, 3, 4, 5].map((d) => ({
            day_of_week: d,
            start_time: "08:00",
            end_time: "17:00",
            is_active: true,
          }))
        );
      }
    })();
  }, [session?.user?.id]);

  const addTemplate = (template: Partial<AppointmentType>) => {
    setTypes((prev) => [...prev, { ...template, sort_order: prev.length }]);
    setEditingIndex(types.length);
  };

  const removeType = (index: number) => {
    setTypes((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const updateType = (index: number, updates: Partial<AppointmentType>) => {
    setTypes((prev) => prev.map((t, i) => (i === index ? { ...t, ...updates } : t)));
  };

  const updateAvail = (dayOfWeek: number, updates: Partial<typeof availability[0]>) => {
    setAvailability((prev) =>
      prev.map((a) => (a.day_of_week === dayOfWeek ? { ...a, ...updates } : a))
    );
  };

  const handleSave = async () => {
    if (!contractorId) return;
    setSaving(true);

    try {
      // Enable booking
      await supabase
        .from("contractors")
        .update({ booking_enabled: true, booking_page_published: true } as any)
        .eq("id", contractorId);

      // Delete existing types and recreate
      await supabase.from("booking_appointment_types").delete().eq("contractor_id", contractorId);

      if (types.length > 0) {
        const inserts = types.map((t, i) => ({
          contractor_id: contractorId,
          title: t.title ?? "Sans titre",
          slug: t.slug ?? `type-${i}`,
          category: t.category ?? "general",
          short_description: t.short_description ?? null,
          long_description: t.long_description ?? null,
          duration_minutes: t.duration_minutes ?? 60,
          buffer_before_minutes: t.buffer_before_minutes ?? 0,
          buffer_after_minutes: t.buffer_after_minutes ?? 15,
          travel_padding_minutes: t.travel_padding_minutes ?? 15,
          color: t.color ?? "#3B82F6",
          icon: t.icon ?? "calendar",
          price_type: t.price_type ?? "free",
          price_amount: t.price_amount ?? 0,
          is_free: t.is_free ?? true,
          location_mode: t.location_mode ?? "client_address",
          availability_mode: t.availability_mode ?? "standard",
          requires_photos: t.requires_photos ?? false,
          requires_documents: t.requires_documents ?? false,
          requires_prequalification: t.requires_prequalification ?? false,
          allows_same_day: t.allows_same_day ?? false,
          min_notice_hours: t.min_notice_hours ?? 4,
          max_daily_count: t.max_daily_count ?? 5,
          is_active: t.is_active ?? true,
          sort_order: i,
        }));

        const { error } = await supabase.from("booking_appointment_types").insert(inserts);
        if (error) throw error;
      }

      // Upsert availability
      for (const a of availability) {
        await supabase.from("booking_availability").upsert(
          {
            contractor_id: contractorId,
            day_of_week: a.day_of_week,
            start_time: a.start_time,
            end_time: a.end_time,
            is_active: a.is_active,
          } as any,
          { onConflict: "contractor_id,day_of_week" }
        );
      }

      toast.success("Configuration sauvegardée!");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const DAY_LABELS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

  if (planLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!canAccessBooking) {
    return (
      <>
        <Helmet>
          <title>Réservation Signature | UNPRO</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <SignatureLockedOverlay currentPlan={planCode} planLabel={planLabel} />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Réservation Signature | UNPRO</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-title text-foreground">Réservation Signature</h1>
              <p className="text-body text-muted-foreground mt-1">
                Votre système de rendez-vous intelligent
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>

          {/* Appointment Types */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-section text-foreground">Types de rendez-vous</h2>
              <span className="text-caption text-muted-foreground">{types.length} configuré{types.length > 1 ? "s" : ""}</span>
            </div>

            {types.map((type, i) => (
              <div key={i} className="rounded-xl border border-border/60 bg-card overflow-hidden">
                {/* Collapsed view */}
                <button
                  onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                >
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: type.color ?? "#3B82F6" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-foreground truncate">{type.title || "Sans titre"}</p>
                    <p className="text-meta text-muted-foreground">{type.duration_minutes ?? 60} min · {type.is_free ? "Gratuit" : `${((type.price_amount ?? 0) / 100).toFixed(0)}$`}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={(e) => { e.stopPropagation(); removeType(i); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </button>

                {/* Expanded edit */}
                {editingIndex === i && (
                  <div className="border-t border-border/40 p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Titre</Label>
                        <Input value={type.title ?? ""} onChange={(e) => updateType(i, { title: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Slug</Label>
                        <Input value={type.slug ?? ""} onChange={(e) => updateType(i, { slug: e.target.value })} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Description courte</Label>
                      <Input value={type.short_description ?? ""} onChange={(e) => updateType(i, { short_description: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Durée (min)</Label>
                        <Input type="number" value={type.duration_minutes ?? 60} onChange={(e) => updateType(i, { duration_minutes: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Buffer avant (min)</Label>
                        <Input type="number" value={type.buffer_before_minutes ?? 0} onChange={(e) => updateType(i, { buffer_before_minutes: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Buffer après (min)</Label>
                        <Input type="number" value={type.buffer_after_minutes ?? 15} onChange={(e) => updateType(i, { buffer_after_minutes: Number(e.target.value) })} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Mode de lieu</Label>
                        <Select value={type.location_mode ?? "client_address"} onValueChange={(v) => updateType(i, { location_mode: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {LOCATION_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> Type de prix</Label>
                        <Select value={type.price_type ?? "free"} onValueChange={(v) => updateType(i, { price_type: v, is_free: v === "free" })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PRICE_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {type.price_type !== "free" && type.price_type !== "hidden" && (
                      <div className="space-y-2">
                        <Label>Montant (en cents)</Label>
                        <Input type="number" value={type.price_amount ?? 0} onChange={(e) => updateType(i, { price_amount: Number(e.target.value) })} />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Préavis minimum (heures)</Label>
                        <Input type="number" value={type.min_notice_hours ?? 4} onChange={(e) => updateType(i, { min_notice_hours: Number(e.target.value) })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Max par jour</Label>
                        <Input type="number" value={type.max_daily_count ?? 5} onChange={(e) => updateType(i, { max_daily_count: Number(e.target.value) })} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 text-meta">
                        <Switch checked={type.allows_same_day ?? false} onCheckedChange={(v) => updateType(i, { allows_same_day: v })} />
                        Même jour
                      </label>
                      <label className="flex items-center gap-2 text-meta">
                        <Switch checked={type.requires_photos ?? false} onCheckedChange={(v) => updateType(i, { requires_photos: v })} />
                        Photos requises
                      </label>
                      <label className="flex items-center gap-2 text-meta">
                        <Switch checked={type.supports_alex_booking ?? true} onCheckedChange={(v) => updateType(i, { supports_alex_booking: v })} />
                        Via Alex
                      </label>
                    </div>

                    <div className="space-y-2">
                      <Label>Couleur</Label>
                      <Input type="color" value={type.color ?? "#3B82F6"} onChange={(e) => updateType(i, { color: e.target.value })} className="w-16 h-8 p-0.5" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Add from templates */}
            <div className="space-y-2">
              <p className="text-meta font-medium text-muted-foreground">Ajouter un modèle</p>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_APPOINTMENT_TEMPLATES.map((t) => (
                  <Button
                    key={t.slug}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => addTemplate(t)}
                  >
                    <Plus className="w-3 h-3" />
                    {t.title}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          {/* Availability */}
          <section className="space-y-4">
            <h2 className="text-section text-foreground">Disponibilités hebdomadaires</h2>

            <div className="rounded-xl border border-border/60 bg-card divide-y divide-border/40">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const slot = availability.find((a) => a.day_of_week === day);
                return (
                  <div key={day} className="flex items-center gap-4 p-4">
                    <Switch
                      checked={slot?.is_active ?? false}
                      onCheckedChange={(v) => {
                        if (slot) {
                          updateAvail(day, { is_active: v });
                        } else {
                          setAvailability((prev) => [...prev, { day_of_week: day, start_time: "08:00", end_time: "17:00", is_active: v }]);
                        }
                      }}
                    />
                    <span className="text-body font-medium text-foreground w-12">{DAY_LABELS[day]}</span>
                    {(slot?.is_active) ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={slot?.start_time ?? "08:00"}
                          onChange={(e) => updateAvail(day, { start_time: e.target.value })}
                          className="w-28"
                        />
                        <span className="text-meta text-muted-foreground">à</span>
                        <Input
                          type="time"
                          value={slot?.end_time ?? "17:00"}
                          onChange={(e) => updateAvail(day, { end_time: e.target.value })}
                          className="w-28"
                        />
                      </div>
                    ) : (
                      <span className="text-meta text-muted-foreground">Fermé</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Revenue Analytics */}
          <section className="space-y-4">
            <RevenueAnalyticsDashboard />
          </section>

          {/* Pricing Rules */}
          <section className="space-y-4">
            <PricingRulesManager />
          </section>

          {/* Save */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="gap-2" size="lg">
              <Save className="w-4 h-4" />
              {saving ? "Sauvegarde..." : "Sauvegarder tout"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
