/**
 * HeroVerifierIntake — Real intake form for /verifier-entrepreneur.
 *
 * Owns the full anonymous-to-authenticated parcours:
 *   1. Collects nom / RBQ / téléphone / site / ville (min 1 identifier).
 *   2. Persists an anonymous visitor_id in localStorage.
 *   3. POSTs to the verify-contractor edge function -> real DB row created.
 *   4. Renders a locked preview with an OTP unlock CTA for anonymous users.
 *   5. Signed-in users are redirected straight to the private report.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Building2,
  Fingerprint,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getVisitorId, rememberRun } from "./visitorId";
import ModalOtpUnlock from "./ModalOtpUnlock";

const formSchema = z
  .object({
    business_name: z.string().trim().max(120).optional(),
    rbq_number: z.string().trim().max(24).optional(),
    phone: z.string().trim().max(24).optional(),
    website: z.string().trim().max(200).optional(),
    city: z.string().trim().max(80).optional(),
  })
  .refine(
    (v) =>
      Boolean(
        (v.business_name && v.business_name.length >= 2) ||
          (v.rbq_number && v.rbq_number.length >= 4) ||
          (v.phone && v.phone.length >= 7) ||
          (v.website && v.website.length >= 4),
      ),
    { message: "Entrez au moins un identifiant : nom, RBQ, téléphone ou site." },
  );

type FormState = z.infer<typeof formSchema>;

interface PreviewState {
  runId: string;
  headline: string;
  short: string;
  identity: number | null;
  trust: number | null;
  visual: number | null;
}

export default function HeroVerifierIntake() {
  const navigate = useNavigate();
  const { session, isLoading: authLoading } = useAuth();

  const [form, setForm] = useState<FormState>({});
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [otpOpen, setOtpOpen] = useState(false);

  const visitorId = useMemo(() => getVisitorId(), []);
  const isAuthed = !!session?.user;

  // Auto-redirect authenticated users to the report after a successful run.
  useEffect(() => {
    if (preview && isAuthed && !authLoading) {
      navigate(`/proprietaire/verifications/${preview.runId}`);
    }
  }, [preview, isAuthed, authLoading, navigate]);

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = useCallback(async () => {
    const parsed = formSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire invalide");
      return;
    }
    setSubmitting(true);
    try {
      const primary =
        form.rbq_number?.trim() ||
        form.phone?.trim() ||
        form.website?.trim() ||
        form.business_name?.trim() ||
        "";

      const body: Record<string, unknown> = {
        input: primary,
        input_city: form.city?.trim() || undefined,
        input_phone: form.phone?.trim() || undefined,
        input_business_name: form.business_name?.trim() || undefined,
        input_rbq: form.rbq_number?.trim() || undefined,
        input_website: form.website?.trim() || undefined,
        visitor_id: visitorId,
        source_page: "/verifier-entrepreneur",
      };

      const { data, error } = await supabase.functions.invoke("verify-contractor", {
        body,
      });

      if (error) throw new Error(error.message || "Erreur d'analyse");
      if (!data?.success || !data?.verification_run_id) {
        throw new Error(data?.error || "Analyse impossible pour le moment.");
      }

      const runId = data.verification_run_id as string;
      const out = data.output ?? {};
      rememberRun(runId);

      setPreview({
        runId,
        headline: out.final_recommendation || "Analyse complétée",
        short: out.identity_resolution?.summary || "",
        identity: out.scores?.identity_confidence_score ?? null,
        trust: out.scores?.public_trust_score ?? null,
        visual: out.scores?.visual_trust_score ?? null,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  }, [form, visitorId]);

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {!preview && (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-xl shadow-[var(--shadow-lg)] p-5 md:p-6 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FieldRow icon={Building2} label="Nom de l'entreprise" htmlFor="v_name">
                <Input
                  id="v_name"
                  value={form.business_name ?? ""}
                  onChange={set("business_name")}
                  placeholder="Ex. Toitures Larivière"
                  autoComplete="organization"
                />
              </FieldRow>
              <FieldRow icon={Fingerprint} label="Numéro RBQ" htmlFor="v_rbq">
                <Input
                  id="v_rbq"
                  value={form.rbq_number ?? ""}
                  onChange={set("rbq_number")}
                  placeholder="Ex. 5678-1234-01"
                  inputMode="numeric"
                />
              </FieldRow>
              <FieldRow icon={Phone} label="Téléphone" htmlFor="v_phone">
                <Input
                  id="v_phone"
                  value={form.phone ?? ""}
                  onChange={set("phone")}
                  placeholder="514-555-0101"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </FieldRow>
              <FieldRow icon={Globe} label="Site web" htmlFor="v_site">
                <Input
                  id="v_site"
                  value={form.website ?? ""}
                  onChange={set("website")}
                  placeholder="https://…"
                  inputMode="url"
                  autoComplete="url"
                />
              </FieldRow>
              <FieldRow icon={MapPin} label="Ville" htmlFor="v_city">
                <Input
                  id="v_city"
                  value={form.city ?? ""}
                  onChange={set("city")}
                  placeholder="Montréal, Laval, Québec…"
                  autoComplete="address-level2"
                />
              </FieldRow>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <Button
                type="submit"
                size="lg"
                className="flex-1 h-12 gap-2 font-semibold"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyse en cours…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Lancer la vérification
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground sm:max-w-[42%] leading-snug">
                Aucun paiement. Rapport instantané basé sur les registres publics
                officiels du Québec.
              </p>
            </div>
          </motion.form>
        )}

        {preview && !isAuthed && (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-primary/30 bg-card/90 backdrop-blur-xl shadow-[var(--shadow-lg)] overflow-hidden"
          >
            <div className="p-5 md:p-6 border-b border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Analyse complétée
                </p>
              </div>
              <p className="text-base font-semibold text-foreground leading-snug">
                {preview.headline || "Votre rapport est prêt."}
              </p>
              {preview.short && (
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                  {preview.short}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 p-5 md:p-6 border-b border-border/50">
              <LockedScore label="Identité" value={preview.identity} />
              <LockedScore label="Confiance" value={preview.trust} />
              <LockedScore label="Visuel" value={preview.visual} />
            </div>

            <div className="p-5 md:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1">
                <Lock className="w-4 h-4" />
                <span>
                  Connexion en 30 secondes pour ouvrir le rapport complet.
                </span>
              </div>
              <Button
                size="lg"
                onClick={() => setOtpOpen(true)}
                className="gap-2 font-semibold"
              >
                Voir le rapport complet
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModalOtpUnlock
        open={otpOpen}
        onOpenChange={setOtpOpen}
        runId={preview?.runId}
        visitorId={visitorId}
      />
    </div>
  );
}

function FieldRow({
  icon: Icon,
  label,
  htmlFor,
  children,
}: {
  icon: typeof Building2;
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
      </Label>
      {children}
    </div>
  );
}

function LockedScore({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/40 p-3 text-center relative overflow-hidden">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
        {label}
      </p>
      <div className="text-2xl font-bold text-foreground/40 tabular-nums select-none blur-[6px]">
        {typeof value === "number" ? value : "??"}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Lock className="w-4 h-4 text-primary/70" />
      </div>
    </div>
  );
}
