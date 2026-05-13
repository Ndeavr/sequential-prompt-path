/**
 * UNPRO — Strip de contact en bas de profil entrepreneur.
 * Téléphone click-to-call + formulaire minimal (insère via edge function entrepreneur-contact).
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  description: z.string().trim().min(10).max(1000),
  preferred_date: z.string().max(50).optional().or(z.literal("")),
});

interface Props {
  contractorId: string;
  contractorSlug: string;
  contractorName: string;
  phone?: string | null;
}

export default function EntrepreneurContactStrip({ contractorId, contractorSlug, contractorName, phone }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", description: "", preferred_date: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Vérifiez le formulaire", description: "Nom, courriel et description sont requis.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("entrepreneur-contact", {
        body: { ...parsed.data, contractor_id: contractorId, contractor_slug: contractorSlug },
      });
      if (error) throw error;
      setDone(true);
      toast({ title: "Demande envoyée", description: `${contractorName} vous contactera sous peu.` });
    } catch (err) {
      console.error("contact error", err);
      toast({ title: "Erreur", description: "Impossible d'envoyer pour le moment. Réessayez.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6 md:p-8 border-primary/20">
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold mb-2">Démarrez avec {contractorName}</h2>
            <p className="text-sm text-muted-foreground">
              Soumission gratuite. Aucune obligation. Réponse sous 24 h ouvrable.
            </p>
          </div>
          {phone && (
            <a href={`tel:${phone.replace(/\s+/g, "")}`} className="inline-flex items-center gap-2 text-lg font-semibold text-primary hover:underline">
              <Phone className="w-5 h-5" /> {phone}
            </a>
          )}
          <div className="pt-4 border-t">
            <Link to="/entrepreneurs" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              Voir d'autres entrepreneurs <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center text-center p-6 bg-primary/5 rounded-lg">
            <CheckCircle2 className="w-12 h-12 text-primary mb-3" />
            <p className="font-semibold">Demande envoyée</p>
            <p className="text-sm text-muted-foreground mt-1">{contractorName} reçoit votre message.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="ec-name" className="text-xs">Nom complet</Label>
              <Input id="ec-name" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} maxLength={100} />
            </div>
            <div>
              <Label htmlFor="ec-email" className="text-xs">Courriel</Label>
              <Input id="ec-email" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} maxLength={255} />
            </div>
            <div>
              <Label htmlFor="ec-desc" className="text-xs">Description du projet</Label>
              <Textarea id="ec-desc" required rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} maxLength={1000} />
            </div>
            <div>
              <Label htmlFor="ec-date" className="text-xs">Date souhaitée (optionnel)</Label>
              <Input id="ec-date" type="text" placeholder="Ex.: début juin" value={form.preferred_date} onChange={e => setForm(f => ({ ...f, preferred_date: e.target.value }))} maxLength={50} />
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Envoi…" : "Demander une soumission"}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}
