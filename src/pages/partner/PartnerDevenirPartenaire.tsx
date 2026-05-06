import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, Sparkles, Briefcase, Crown } from "lucide-react";
import { z } from "zod";
import {
  PARTNER_ROLE_LABEL,
  PARTNER_TERMS,
  PARTNER_TERMS_VERSION,
  type PartnerRole,
} from "@/lib/partnerTerms";

const ROLES: Array<{ key: PartnerRole; tagline: string; perks: string[]; icon: any }> = [
  {
    key: "affiliate",
    tagline: "Recommandez UNPRO et touchez des revenus récurrents.",
    perks: ["Liens affiliés personnalisés", "Commissions récurrentes 24 mois", "Onboarding simplifié"],
    icon: Sparkles,
  },
  {
    key: "ambassador",
    tagline: "Accès au CRM léger pour suivre vos prospects.",
    perks: ["CRM partenaire (limité)", "Pipeline et rappels", "Génération de leads manuelle"],
    icon: Briefcase,
  },
  {
    key: "certified_partner",
    tagline: "Bâtissez un portefeuille d'entrepreneurs et générez du long terme.",
    perks: ["CRM complet + automatisations", "Commissions premium 24 mois + à vie", "Outils onboarding entrepreneurs"],
    icon: Crown,
  },
];

const FormSchema = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(40),
  city: z.string().trim().min(1).max(120),
  company: z.string().trim().max(160).optional().or(z.literal("")),
  sales_experience: z.string().trim().max(120).optional().or(z.literal("")),
  network_size: z.string().trim().max(120).optional().or(z.literal("")),
  goals: z.string().trim().max(2000).optional().or(z.literal("")),
  motivation: z.string().trim().max(2000).optional().or(z.literal("")),
});

export default function PartnerDevenirPartenaire() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [role, setRole] = useState<PartnerRole | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: user?.email ?? "", phone: "", city: "",
    company: "", sales_experience: "", network_size: "", goals: "", motivation: "",
  });

  const update = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!role) { toast.error("Choisissez un rôle."); return; }
    if (!accepted) { toast.error("Vous devez accepter les termes."); return; }
    const parsed = FormSchema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast.error(first || "Formulaire invalide.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-partner-application", {
        body: {
          role,
          terms_version: PARTNER_TERMS_VERSION,
          accepted: true,
          user_agent: navigator.userAgent,
          form: parsed.data,
        },
      });
      if (error) throw error;
      toast.success("Demande soumise. Vous recevrez une réponse par courriel.");
      if ((data as any)?.requires_login) {
        nav(`/partenaire/login?email=${encodeURIComponent(parsed.data.email)}`);
      } else {
        nav("/partenaire/en-attente");
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la soumission.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <h1 className="text-lg font-semibold">Devenir Partenaire UNPRO</h1>
        <div className="text-xs text-white/40 mt-1">Étape {step}/3</div>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {step === 1 && (
          <>
            <p className="text-white/70">Choisissez le rôle qui correspond à vos objectifs.</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {ROLES.map(({ key, tagline, perks, icon: Icon }) => (
                <button key={key}
                  onClick={() => setRole(key)}
                  className={`text-left rounded-2xl border p-5 transition ${role === key ? "border-amber-400 bg-amber-400/5" : "border-white/10 bg-white/[0.03] hover:bg-white/5"}`}>
                  <Icon className="h-6 w-6 text-amber-400" />
                  <div className="mt-3 font-semibold">{PARTNER_ROLE_LABEL[key]}</div>
                  <div className="text-xs text-white/60 mt-1">{tagline}</div>
                  <ul className="mt-3 space-y-1 text-xs text-white/70">
                    {perks.map(p => <li key={p} className="flex gap-1.5"><Check className="h-3 w-3 text-emerald-400 mt-0.5 shrink-0" />{p}</li>)}
                  </ul>
                </button>
              ))}
            </div>
            <div className="flex justify-end">
              <Button disabled={!role} onClick={() => setStep(2)} className="bg-amber-500 text-black hover:bg-amber-400">Continuer</Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-semibold">Vos informations</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Prénom *" v={form.first_name} on={(v)=>update("first_name",v)} />
              <Field label="Nom *" v={form.last_name} on={(v)=>update("last_name",v)} />
              <Field label="Courriel *" v={form.email} on={(v)=>update("email",v)} type="email" />
              <Field label="Téléphone *" v={form.phone} on={(v)=>update("phone",v)} />
              <Field label="Ville *" v={form.city} on={(v)=>update("city",v)} />
              <Field label="Entreprise" v={form.company} on={(v)=>update("company",v)} />
              <Field label="Expérience de vente" v={form.sales_experience} on={(v)=>update("sales_experience",v)} />
              <Field label="Taille de votre réseau" v={form.network_size} on={(v)=>update("network_size",v)} />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Vos objectifs</Label>
              <Textarea value={form.goals} onChange={e=>update("goals",e.target.value)} className="bg-white/5 border-white/10 text-white" rows={3} />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Pourquoi rejoindre UNPRO ?</Label>
              <Textarea value={form.motivation} onChange={e=>update("motivation",e.target.value)} className="bg-white/5 border-white/10 text-white" rows={3} />
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)} className="border-white/20 text-white hover:bg-white/5">Retour</Button>
              <Button onClick={() => setStep(3)} className="bg-amber-500 text-black hover:bg-amber-400">Continuer</Button>
            </div>
          </>
        )}

        {step === 3 && role && (
          <>
            <h2 className="text-xl font-semibold">Termes du programme — {PARTNER_ROLE_LABEL[role]}</h2>
            <div className="text-xs text-white/40">Version {PARTNER_TERMS_VERSION}</div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-2 max-h-80 overflow-y-auto text-sm text-white/80">
              <ul className="space-y-2 list-disc list-inside">
                {PARTNER_TERMS[role].map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 cursor-pointer">
              <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(!!v)} className="mt-0.5" />
              <span className="text-sm">J'accepte les termes et conditions du programme partenaire UNPRO ({PARTNER_ROLE_LABEL[role]}).</span>
            </label>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)} className="border-white/20 text-white hover:bg-white/5">Retour</Button>
              <Button disabled={!accepted || submitting} onClick={submit} className="bg-amber-500 text-black hover:bg-amber-400">
                {submitting ? "Soumission…" : "Soumettre ma candidature"}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, v, on, type = "text" }: { label: string; v: string; on: (v: string)=>void; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-white/70 text-xs">{label}</Label>
      <Input value={v} onChange={e=>on(e.target.value)} type={type}
        className="bg-white/5 border-white/10 text-white" />
    </div>
  );
}
