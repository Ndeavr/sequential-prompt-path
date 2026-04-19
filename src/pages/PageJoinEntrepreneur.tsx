/**
 * UNPRO — /join
 * Entrepreneur quick-start funnel: 7 fields, then chain to AIPP scan.
 */
import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import PublicLayout from "@/layouts/PublicLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Form {
  business: string;
  firstName: string;
  phone: string;
  email: string;
  website: string;
  city: string;
  trade: string;
}

export default function PageJoinEntrepreneur() {
  const navigate = useNavigate();
  const [form, setForm] = useState<Form>({
    business: "",
    firstName: "",
    phone: "",
    email: "",
    website: "",
    city: "",
    trade: "",
  });

  const update = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const canSubmit =
    form.business.trim().length > 1 &&
    form.firstName.trim().length > 1 &&
    /^[\d\s().+-]{8,}$/.test(form.phone) &&
    /\S+@\S+\.\S+/.test(form.email) &&
    form.city.trim().length > 1 &&
    form.trade.trim().length > 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      sessionStorage.setItem("unpro_entrepreneur_quickstart", JSON.stringify(form));
    } catch {}
    // Chain to AIPP scan / business import
    navigate("/business-import");
  };

  return (
    <PublicLayout>
      <Helmet>
        <title>UNPRO — Devenir entrepreneur partenaire</title>
        <meta name="description" content="Importez vos données en 60 secondes et commencez à recevoir des clients qualifiés." />
      </Helmet>

      <section className="mx-auto w-full max-w-xl px-4 sm:px-6 py-8 flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Entrepreneurs partenaires
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Recevez des clients qualifiés.
          </h1>
          <p className="text-sm text-muted-foreground">
            Donnez-nous l'essentiel. Alex importe le reste depuis vos sources publiques.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10"
        >
          <Field label="Nom de l'entreprise" required>
            <Input
              autoFocus
              value={form.business}
              onChange={update("business")}
              placeholder="Ex. Construction Boréal"
              className="h-11 bg-white/5 border-white/10"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Prénom" required>
              <Input
                value={form.firstName}
                onChange={update("firstName")}
                placeholder="Jean"
                className="h-11 bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Téléphone" required>
              <Input
                type="tel"
                value={form.phone}
                onChange={update("phone")}
                placeholder="514 555-0123"
                className="h-11 bg-white/5 border-white/10"
              />
            </Field>
          </div>

          <Field label="Courriel" required>
            <Input
              type="email"
              value={form.email}
              onChange={update("email")}
              placeholder="vous@entreprise.ca"
              className="h-11 bg-white/5 border-white/10"
            />
          </Field>

          <Field label="Site web (optionnel)">
            <Input
              type="url"
              value={form.website}
              onChange={update("website")}
              placeholder="https://…"
              className="h-11 bg-white/5 border-white/10"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ville" required>
              <Input
                value={form.city}
                onChange={update("city")}
                placeholder="Montréal"
                className="h-11 bg-white/5 border-white/10"
              />
            </Field>
            <Field label="Métier principal" required>
              <Input
                value={form.trade}
                onChange={update("trade")}
                placeholder="Ex. Couvreur, Plombier…"
                className="h-11 bg-white/5 border-white/10"
              />
            </Field>
          </div>

          <Button type="submit" disabled={!canSubmit} size="lg" className="h-12 mt-2 gap-2">
            Importer mes données
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Aucun paiement maintenant. Vous choisirez un plan à l'étape suivante.
          </p>
        </form>
      </section>
    </PublicLayout>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm text-foreground/80">
        {label}
        {required && <span className="text-primary ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
