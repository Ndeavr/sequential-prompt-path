import { forwardRef, useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

const schema = z.object({
  name: z.string().trim().min(2, "Minimum 2 caractères").max(100),
  phone: z.string().trim().min(10, "Numéro invalide").max(20),
  email: z.string().trim().email("Courriel invalide").max(255),
  city: z.string().trim().min(2, "Ville requise").max(100),
  experience_level: z.string().default("none"),
  availability: z.string().default("summer"),
  work_mode: z.string().default("in_person"),
  motivation: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof schema>;

function formatPhone(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

const FormApplicationCloser = forwardRef<HTMLDivElement>((_, ref) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { experience_level: "none", availability: "summer", work_mode: "in_person" },
  });

  const phoneValue = watch("phone");

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    try {
      const { error } = await (supabase.from("recruitment_leads" as any) as any).insert([{
        name: data.name,
        phone: data.phone,
        email: data.email,
        city: data.city,
        experience_level: data.experience_level,
        availability: data.availability,
        work_mode: data.work_mode,
        motivation: data.motivation || null,
        source: "carriere_page",
      }]);
      if (error) throw error;
      navigate("/carriere/merci");
    } catch {
      toast.error("Erreur lors de l'envoi. Réessaie.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section ref={ref} className="py-20 px-4 bg-background" id="form-apply">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="text-3xl font-display font-bold text-foreground">Postuler maintenant</h2>
          <p className="text-muted-foreground mt-2">Ça prend 60 secondes. On te contacte sous 48h.</p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-2xl border border-border/60 bg-card p-6 space-y-4"
        >
          <div>
            <Label>Prénom *</Label>
            <Input {...register("name")} placeholder="Ton prénom" />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <Label>Téléphone *</Label>
            <Input
              {...register("phone")}
              placeholder="(514) 555-1234"
              value={phoneValue ? formatPhone(phoneValue) : ""}
              onChange={(e) => setValue("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
            {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
          </div>

          <div>
            <Label>Courriel *</Label>
            <Input {...register("email")} type="email" placeholder="ton@email.com" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Label>Ville *</Label>
            <Input {...register("city")} placeholder="Montréal, Québec..." />
            {errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}
          </div>

          <div>
            <Label>Expérience en vente</Label>
            <Select defaultValue="none" onValueChange={(v) => setValue("experience_level", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune expérience</SelectItem>
                <SelectItem value="beginner">Débutant (0-1 an)</SelectItem>
                <SelectItem value="advanced">Expérimenté (1+ ans)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Disponibilité</Label>
            <Select defaultValue="summer" onValueChange={(v) => setValue("availability", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="summer">Job d'été</SelectItem>
                <SelectItem value="part_time">Temps partiel</SelectItem>
                <SelectItem value="full_time">Temps plein</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mode de travail</Label>
            <Select defaultValue="in_person" onValueChange={(v) => setValue("work_mode", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">En personne</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybride</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Motivation (optionnel)</Label>
            <Textarea {...register("motivation")} placeholder="Pourquoi ce rôle t'intéresse?" rows={3} />
          </div>

          <Button type="submit" size="lg" className="w-full font-semibold" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Recevoir mes premiers rendez-vous
          </Button>
        </motion.form>
      </div>
    </section>
  );
});

FormApplicationCloser.displayName = "FormApplicationCloser";
export default FormApplicationCloser;
