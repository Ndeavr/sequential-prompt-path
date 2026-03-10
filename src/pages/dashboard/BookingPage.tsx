import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
      });
      toast.success("Demande de rendez-vous envoyée !");
      navigate("/dashboard/appointments");
    } catch {
      toast.error("Erreur lors de la demande.");
    }
  };

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
              {/* Property */}
              <div className="space-y-2">
                <Label>Propriété (optionnelle)</Label>
                <Select value={form.property_id} onValueChange={(v) => setForm((f) => ({ ...f, property_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner une propriété" /></SelectTrigger>
                  <SelectContent>
                    {properties?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.address}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!properties?.length && (
                  <p className="text-xs text-muted-foreground">
                    Pas de propriété? <Link to="/dashboard/properties/new" className="text-primary underline">Ajoutez-en une</Link> ou continuez sans.
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label>Date souhaitée</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      {date ? format(date, "PPP", { locale: fr }) : "Choisir une date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < new Date()}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time window */}
              <div className="space-y-2">
                <Label>Plage horaire préférée</Label>
                <Select value={form.preferred_time_window} onValueChange={(v) => setForm((f) => ({ ...f, preferred_time_window: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {timeWindows.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Contact preference */}
              <div className="space-y-2">
                <Label>Préférence de contact</Label>
                <Select value={form.contact_preference} onValueChange={(v) => setForm((f) => ({ ...f, contact_preference: v }))}>
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
                  placeholder="Décrivez brièvement votre projet ou vos besoins…"
                  rows={4}
                />
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
