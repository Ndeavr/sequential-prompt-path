import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useProperties } from "@/hooks/useProperties";
import { useCreateAppointment } from "@/hooks/useAppointments";
import { usePublicContractorProfile } from "@/hooks/usePublicContractors";
import { toast } from "sonner";
import { CalendarIcon, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const timeWindows = [
  { value: "morning", label: "Matin (8h–12h)" },
  { value: "afternoon", label: "Après-midi (12h–17h)" },
  { value: "evening", label: "Soirée (17h–20h)" },
  { value: "flexible", label: "Flexible" },
];

const contactOptions = [
  { value: "email", label: "Courriel" },
  { value: "phone", label: "Téléphone" },
  { value: "any", label: "Peu importe" },
];

const urgencyOptions = [
  { value: "normal", label: "Normal" },
  { value: "soon", label: "Bientôt (1-2 semaines)" },
  { value: "urgent", label: "Urgent (cette semaine)" },
];

const budgetOptions = [
  { value: "under_5k", label: "Moins de 5 000 $" },
  { value: "5k_15k", label: "5 000 – 15 000 $" },
  { value: "15k_50k", label: "15 000 – 50 000 $" },
  { value: "50k_plus", label: "Plus de 50 000 $" },
  { value: "unknown", label: "Pas encore défini" },
];

const timelineOptions = [
  { value: "asap", label: "Dès que possible" },
  { value: "1_month", label: "Dans le mois" },
  { value: "3_months", label: "Dans les 3 mois" },
  { value: "6_months", label: "Dans les 6 mois" },
  { value: "flexible", label: "Flexible" },
];

const categoryOptions = [
  { value: "renovation", label: "Rénovation" },
  { value: "plumbing", label: "Plomberie" },
  { value: "electrical", label: "Électricité" },
  { value: "roofing", label: "Toiture" },
  { value: "painting", label: "Peinture" },
  { value: "landscaping", label: "Aménagement paysager" },
  { value: "construction", label: "Construction" },
  { value: "inspection", label: "Inspection" },
  { value: "other", label: "Autre" },
];

const BookingPage = () => {
  const { id: contractorId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: contractor, isLoading: loadingContractor } = usePublicContractorProfile(contractorId);
  const { data: properties } = useProperties();
  const createAppointment = useCreateAppointment();

  const [date, setDate] = useState<Date>();
  const [form, setForm] = useState({
    property_id: "",
    preferred_time_window: "flexible",
    contact_preference: "email",
    notes: "",
    urgency_level: "normal",
    budget_range: "",
    timeline: "",
    project_category: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractorId) return;
    try {
      await createAppointment.mutateAsync({
        contractor_id: contractorId,
        property_id: form.property_id || undefined,
        preferred_date: date ? format(date, "yyyy-MM-dd") : undefined,
        preferred_time_window: form.preferred_time_window,
        contact_preference: form.contact_preference,
        notes: form.notes || undefined,
        urgency_level: form.urgency_level,
        budget_range: form.budget_range || undefined,
        timeline: form.timeline || undefined,
        project_category: form.project_category || undefined,
      });
      toast.success("Demande de rendez-vous envoyée !");
      navigate("/dashboard/appointments");
    } catch {
      toast.error("Erreur lors de la demande.");
    }
  };

  const set = (key: string) => (v: string) => setForm((f) => ({ ...f, [key]: v }));

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link to={`/contractors/${contractorId}`}><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Demander un rendez-vous</h1>
            {loadingContractor ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : contractor ? (
              <p className="text-sm text-muted-foreground">
                avec <span className="font-medium text-foreground">{contractor.business_name}</span>
                {contractor.city ? ` · ${contractor.city}` : ""}
              </p>
            ) : null}
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category */}
              <div className="space-y-2">
                <Label>Type de projet</Label>
                <Select value={form.project_category} onValueChange={set("project_category")}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Propriété (optionnelle)</Label>
                <PropertySelect
                  value={form.property_id}
                  onChange={set("property_id")}
                  properties={properties}
                  optional
                />
              </div>

              {/* Budget */}
              <div className="space-y-2">
                <Label>Budget estimé</Label>
                <Select value={form.budget_range} onValueChange={set("budget_range")}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un budget" /></SelectTrigger>
                  <SelectContent>
                    {budgetOptions.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <Label>Échéancier souhaité</Label>
                <Select value={form.timeline} onValueChange={set("timeline")}>
                  <SelectTrigger><SelectValue placeholder="Quand souhaitez-vous commencer?" /></SelectTrigger>
                  <SelectContent>
                    {timelineOptions.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Urgency */}
              <div className="space-y-2">
                <Label>Niveau d'urgence</Label>
                <Select value={form.urgency_level} onValueChange={set("urgency_level")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {urgencyOptions.map((u) => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>Date souhaitée pour le rendez-vous</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {date ? format(date, "PPP", { locale: fr }) : "Choisir une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={date} onSelect={setDate} disabled={(d) => d < new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time window */}
              <div className="space-y-2">
                <Label>Plage horaire préférée</Label>
                <Select value={form.preferred_time_window} onValueChange={set("preferred_time_window")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {timeWindows.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact preference */}
              <div className="space-y-2">
                <Label>Préférence de contact</Label>
                <Select value={form.contact_preference} onValueChange={set("contact_preference")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {contactOptions.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Description du projet / notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Décrivez brièvement votre projet, vos besoins, et vos attentes…"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Plus vous décrivez votre projet en détail, meilleure sera la réponse de l'entrepreneur.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={createAppointment.isPending}>
                  {createAppointment.isPending ? "Envoi…" : "Envoyer la demande"}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Annuler</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BookingPage;
