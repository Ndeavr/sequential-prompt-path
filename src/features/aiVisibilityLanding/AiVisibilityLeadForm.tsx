/**
 * UNPRO — Formulaire court "Analyse de visibilité IA"
 * Capture publique -> edge function `visibilite-ia-lead` -> table canonique `leads`.
 */
import { useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";
import { formatPhoneDisplay, phoneDigitsOnly } from "@/utils/formatPhone";
import { CheckCircle2, Loader2, Phone } from "lucide-react";

const PHONE_TEL = "tel:+15142499522";

const Schema = z.object({
  company_name: z.string().trim().min(2, "Indiquez le nom de votre entreprise.").max(150),
  contact_name: z.string().trim().min(2, "Indiquez votre nom.").max(120),
  phone: z.string().refine((v) => phoneDigitsOnly(v).length === 10, "Entrez un numéro de téléphone à 10 chiffres."),
  website: z.string().trim().max(255).optional().or(z.literal("")),
  primary_service: z.string().trim().min(2, "Indiquez votre principal service.").max(120),
});

type Fields = z.infer<typeof Schema>;
type Errors = Partial<Record<keyof Fields, string>>;

function readUtm() {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get("utm_source") || "",
    utm_medium: p.get("utm_medium") || "",
    utm_campaign: p.get("utm_campaign") || "",
    utm_content: p.get("utm_content") || "",
    utm_term: p.get("utm_term") || "",
  };
}

export default function AiVisibilityLeadForm() {
  const [values, setValues] = useState<Fields>({
    company_name: "", contact_name: "", phone: "", website: "", primary_service: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const startedRef = useRef(false);
  const lockRef = useRef(false);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const next = key === "phone" ? formatPhoneDisplay(raw) : raw;
    setValues((v) => ({ ...v, [key]: next }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    if (!startedRef.current) {
      startedRef.current = true;
      logFunnelEvent({ event_type: "ai_visibility_form_start", metadata: { ...readUtm() } });
    }
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lockRef.current || status === "loading") return;

    const parsed = Schema.safeParse(values);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      const next: Errors = {};
      (Object.keys(flat) as (keyof Fields)[]).forEach((k) => { next[k] = flat[k]?.[0]; });
      setErrors(next);
      setFormError("Veuillez corriger les champs indiqués.");
      logFunnelEvent({ event_type: "ai_visibility_form_error", metadata: { fields: Object.keys(next).join(",") } });
      return;
    }

    lockRef.current = true;
    setStatus("loading");
    setFormError(null);

    try {
      const { data, error } = await supabase.functions.invoke("visibilite-ia-lead", {
        body: {
          ...parsed.data,
          company_website_confirm: honeypotRef.current?.value || "",
          landing_page: window.location.pathname,
          referrer: document.referrer || "",
          ...readUtm(),
        },
      });

      if (error || !data?.ok) {
        throw new Error(error?.message || "submit_failed");
      }

      setStatus("success");
      logFunnelEvent({
        event_type: "ai_visibility_form_submitted",
        phone: parsed.data.phone,
        metadata: { duplicate: Boolean(data?.duplicate), ...readUtm() },
      });
    } catch (err) {
      console.error("[AiVisibilityLeadForm]", err);
      setStatus("idle");
      lockRef.current = false;
      setFormError("Une erreur est survenue. Réessayez ou appelez le (514) 249-9522.");
      logFunnelEvent({ event_type: "ai_visibility_form_error", metadata: { reason: "network" } });
    }
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className="rounded-3xl border border-primary/20 bg-card p-8 text-center shadow-sm"
      >
        <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-primary" aria-hidden="true" />
        <h3 className="text-xl font-semibold text-foreground">Demande reçue</h3>
        <p className="mt-3 text-muted-foreground">
          Votre demande a bien été reçue. UNPRO communiquera avec vous prochainement.
          Pour une réponse immédiate, appelez le (514) 249-9522.
        </p>
        <a
          href={PHONE_TEL}
          onClick={() => logFunnelEvent({ event_type: "ai_visibility_call_click", metadata: { position: "success" } })}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Appeler le (514) 249-9522
        </a>
      </div>
    );
  }

  const field = (
    key: keyof Fields,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
    optional = false,
  ) => (
    <div className="space-y-2">
      <Label htmlFor={`ai-${key}`}>
        {label} {optional && <span className="text-muted-foreground font-normal">(facultatif)</span>}
      </Label>
      <Input
        id={`ai-${key}`}
        value={values[key]}
        onChange={set(key)}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `ai-${key}-error` : undefined}
        required={!optional}
        {...props}
      />
      {errors[key] && (
        <p id={`ai-${key}-error`} role="alert" className="text-sm text-destructive">
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      {/* Honeypot anti-spam — masqué aux humains */}
      <input
        ref={honeypotRef}
        type="text"
        name="company_website_confirm"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 opacity-0 pointer-events-none"
      />

      {field("company_name", "Nom de l'entreprise", { autoComplete: "organization", placeholder: "Ex. Pavage Alpha" })}
      {field("contact_name", "Votre nom", { autoComplete: "name", placeholder: "Ex. Marc Tremblay" })}
      {field("phone", "Téléphone", { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "(514) 555-1234" })}
      {field("website", "Site Web", { type: "text", inputMode: "url", placeholder: "exemple.com" }, true)}
      {field("primary_service", "Principal service offert", { placeholder: "Ex. Toiture, pavage, rénovation" })}

      {formError && (
        <p role="alert" className="text-sm text-destructive">{formError}</p>
      )}

      <Button type="submit" size="lg" disabled={status === "loading"} className="w-full rounded-full">
        {status === "loading" ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Envoi en cours…</>
        ) : "Demander mon analyse IA"}
      </Button>

      <p className="text-sm text-muted-foreground">
        Vos renseignements servent uniquement à communiquer avec vous au sujet de votre demande.
      </p>

      <div className="border-t border-border pt-4 text-sm">
        <p className="font-medium text-foreground">Vous préférez parler directement?</p>
        <a
          href={PHONE_TEL}
          onClick={() => logFunnelEvent({ event_type: "ai_visibility_call_click", metadata: { position: "form" } })}
          className="mt-1 inline-flex items-center gap-2 font-semibold text-primary underline underline-offset-4"
        >
          <Phone className="h-4 w-4" aria-hidden="true" />
          Appelez UNPRO au (514) 249-9522
        </a>
      </div>
    </form>
  );
}
