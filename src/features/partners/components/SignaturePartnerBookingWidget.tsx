import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CalendarCheck2, Loader2, Phone, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePartnerAvailability, type SignaturePartner } from "../hooks/useSignaturePartner";

interface Props {
  partner: SignaturePartner;
}

export default function SignaturePartnerBookingWidget({ partner }: Props) {
  const { data: avail = [], isLoading } = usePartnerAvailability(partner.id);
  const [serviceType, setServiceType] = useState(partner.services?.[0]?.name ?? "");
  const [postal, setPostal] = useState("");
  const [propertyType, setPropertyType] = useState("Maison unifamiliale");
  const [date, setDate] = useState<string>("");
  const [slot, setSlot] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const slotsForDate = useMemo(
    () => avail.find((d) => d.date === date)?.slots ?? [],
    [avail, date]
  );

  const canSubmit = name && phone && date && slot;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const scheduled_at = new Date(`${date}T${slot}:00`).toISOString();
      const { data, error } = await supabase.functions.invoke("partner-booking-submit", {
        body: {
          partner_slug: partner.slug,
          service_type: serviceType,
          postal_code: postal,
          property_type: propertyType,
          scheduled_at,
          contact: { name, phone, email },
          notes,
        },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      setDone(true);
      toast.success("Rendez-vous confirmé. Un conseiller vous contactera sous 2h.");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[28px] border border-primary/30 bg-primary/5 p-8 text-center"
      >
        <CalendarCheck2 className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h3 className="text-xl font-semibold mb-2">Demande envoyée à {partner.display_name}</h3>
        <p className="text-muted-foreground">
          Vous recevrez une confirmation par téléphone sous 2 heures ouvrables.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="rounded-[28px] border border-border/60 bg-card/60 backdrop-blur-xl p-6 md:p-8 space-y-6">
      <div>
        <h3 className="text-2xl font-semibold tracking-tight">Réserver une visite</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Recommandation directe — pas de 3 soumissions, pas de jeu de devinettes.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label>Service requis</Label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="mt-1 w-full h-11 rounded-[18px] border border-border bg-background px-3 text-sm"
          >
            {(partner.services ?? []).map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
            <option value="Autre">Autre / Je ne sais pas</option>
          </select>
        </div>
        <div>
          <Label>Type de propriété</Label>
          <select
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
            className="mt-1 w-full h-11 rounded-[18px] border border-border bg-background px-3 text-sm"
          >
            <option>Maison unifamiliale</option>
            <option>Condo</option>
            <option>Plex / Multi-logements</option>
            <option>Commercial</option>
          </select>
        </div>
        <div>
          <Label>Code postal</Label>
          <Input
            value={postal} onChange={(e) => setPostal(e.target.value.toUpperCase())}
            placeholder="J7K 1A1" className="mt-1 rounded-[18px] h-11"
          />
        </div>
        <div>
          <Label>Date souhaitée</Label>
          <select
            value={date}
            onChange={(e) => { setDate(e.target.value); setSlot(""); }}
            className="mt-1 w-full h-11 rounded-[18px] border border-border bg-background px-3 text-sm"
          >
            <option value="">{isLoading ? "Chargement…" : "Choisir une date"}</option>
            {avail.map((d) => (
              <option key={d.date} value={d.date}>
                {new Date(d.date + "T12:00:00").toLocaleDateString("fr-CA", {
                  weekday: "short", day: "numeric", month: "short",
                })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {date && (
        <div>
          <Label className="mb-2 block">Plages disponibles</Label>
          <div className="flex flex-wrap gap-2">
            {slotsForDate.map((s) => (
              <button
                key={s} type="button" onClick={() => setSlot(s)}
                className={`px-4 py-2 rounded-full text-sm border transition-all ${
                  slot === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent border-border"
                }`}
              >
                {s}
              </button>
            ))}
            {!slotsForDate.length && (
              <span className="text-sm text-muted-foreground">Aucune plage cette journée.</span>
            )}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-border/40">
        <div>
          <Label>Nom complet *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-[18px] h-11" />
        </div>
        <div>
          <Label>Téléphone *</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 rounded-[18px] h-11" />
        </div>
        <div>
          <Label>Courriel</Label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 rounded-[18px] h-11" />
        </div>
      </div>

      <div>
        <Label>Précisions (optionnel)</Label>
        <Textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Surface, accès, problème ressenti…"
          className="mt-1 rounded-[18px] min-h-[80px]"
        />
      </div>

      <Button
        size="lg" onClick={submit} disabled={!canSubmit || submitting}
        className="w-full h-12 rounded-[18px] text-base font-medium"
      >
        {submitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CalendarCheck2 className="h-4 w-4 mr-2" />}
        Confirmer mon rendez-vous
      </Button>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground pt-2">
        {partner.phone && (
          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {partner.phone}</span>
        )}
        {partner.address && (
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {partner.address}</span>
        )}
      </div>
    </div>
  );
}
