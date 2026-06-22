/**
 * UNPRO — Pre-Built Profile Claim Wizard
 * Route: /entrepreneur/:slug/reclamer
 *
 * 4-screen, no-auth, ≤60s flow:
 *   S1 Confirm business → S2 Jobs/month → S3 Ticket size → S4 Projection + $1 checkout
 *
 * Account creation happens AFTER payment via magic link.
 * This page is intentionally mock-data-tolerant: it reads slug → business name
 * and computes projections client-side. Real intel can be wired later via
 * contractor_public_pages without changing this UX.
 */
import { useState, useMemo, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, ShieldCheck, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type JobsBand = 5 | 10 | 25 | 50;
type TicketBand = 2 | 5 | 10 | 25; // k$ midpoint

const JOBS_OPTIONS: { value: JobsBand; label: string }[] = [
  { value: 5, label: "5" },
  { value: 10, label: "10" },
  { value: 25, label: "25" },
  { value: 50, label: "50+" },
];

const TICKET_OPTIONS: { value: TicketBand; label: string }[] = [
  { value: 2, label: "Moins de 2 000 $" },
  { value: 5, label: "2 000 – 5 000 $" },
  { value: 10, label: "5 000 – 10 000 $" },
  { value: 25, label: "10 000 $ et plus" },
];

function slugToName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function projectionRange(jobs: JobsBand, ticket: TicketBand) {
  // Conservative low / aspirational high; assumes UNPRO captures 40-130% of stated baseline
  const appointmentsLow = Math.round(jobs * 12 * 0.4);
  const appointmentsHigh = Math.round(jobs * 12 * 1.3);
  const revLow = appointmentsLow * ticket * 1000 * 0.4; // 40% close rate floor
  const revHigh = appointmentsHigh * ticket * 1000 * 0.7; // 70% close rate ceiling
  return { appointmentsLow, appointmentsHigh, revLow, revHigh };
}

function formatCAD(n: number): string {
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}

export default function PageClaimWizard() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [jobs, setJobs] = useState<JobsBand | null>(null);
  const [ticket, setTicket] = useState<TicketBand | null>(null);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Best-effort lookup; mock fallback if not found
  const { data: profile } = useQuery({
    queryKey: ["claim-profile", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data } = await supabase
        .from("contractor_public_pages")
        .select("slug, contractors(business_name, city, rbq_number, specialty)")
        .eq("slug", slug)
        .maybeSingle();
      const c: any = (data as any)?.contractors;
      return {
        businessName: c?.business_name ?? slugToName(slug),
        city: c?.city ?? null,
        rbq: c?.rbq_number ?? null,
        specialty: c?.specialty ?? null,
      };
    },
  });

  const businessName = profile?.businessName ?? slugToName(slug);
  const proj = useMemo(() => (jobs && ticket ? projectionRange(jobs, ticket) : null), [jobs, ticket]);

  const goNext = useCallback(() => setStep((s) => (s < 4 ? ((s + 1) as 1 | 2 | 3 | 4) : s)), []);
  const goBack = useCallback(() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4) : s)), []);

  const handleActivate = useCallback(async () => {
    if (!email || !email.includes("@")) {
      toast.error("Entrez un courriel valide");
      return;
    }
    if (!jobs || !ticket) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("claim-create-checkout", {
        body: {
          slug,
          business_name: businessName,
          email,
          jobs_per_month: jobs,
          avg_ticket_k: ticket,
        },
      });
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error("Aucune URL de paiement reçue");
      window.location.href = url;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Erreur de paiement");
      setSubmitting(false);
    }
  }, [email, jobs, ticket, slug, businessName]);

  return (
    <div className="alex-immersive min-h-[100svh] bg-[#050816] text-white">
      <Helmet>
        <title>Réclamer {businessName} · UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-[#050816]/80 backdrop-blur border-b border-white/5">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to={`/entrepreneur/${slug}`} className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Profil
          </Link>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className={`h-1.5 w-8 rounded-full transition-all ${n <= step ? "bg-amber-400" : "bg-white/10"}`}
              />
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-8 pb-24">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section
              key="s1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-xs uppercase tracking-widest text-amber-400/80">Étape 1 / 4</div>
              <h1 className="text-3xl font-bold leading-tight">
                Confirmez votre entreprise
              </h1>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur p-5 space-y-2">
                <div className="text-lg font-semibold">{businessName}</div>
                {profile?.city && <div className="text-sm text-white/70">{profile.city}</div>}
                {profile?.rbq && <div className="text-xs text-white/50">RBQ {profile.rbq}</div>}
                {profile?.specialty && <div className="text-xs text-white/50">{profile.specialty}</div>}
              </div>
              <div className="grid gap-3">
                <Button size="lg" className="h-14 text-base bg-amber-400 text-black hover:bg-amber-300" onClick={goNext}>
                  <Check className="w-5 h-5 mr-2" /> C'est mon entreprise
                </Button>
                <Link to={`/entrepreneur/${slug}`}>
                  <Button size="lg" variant="ghost" className="h-12 w-full text-white/70 hover:text-white">
                    Ce n'est pas moi
                  </Button>
                </Link>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="s2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-xs uppercase tracking-widest text-amber-400/80">Étape 2 / 4</div>
              <h1 className="text-3xl font-bold leading-tight">
                Combien de mandats par mois souhaitez-vous ?
              </h1>
              <div className="grid grid-cols-2 gap-3">
                {JOBS_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => { setJobs(o.value); setTimeout(goNext, 150); }}
                    className={`h-20 rounded-2xl border text-2xl font-bold transition-all ${
                      jobs === o.value
                        ? "border-amber-400 bg-amber-400/10 text-amber-300"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={goBack} className="text-white/60">
                <ArrowLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="s3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-xs uppercase tracking-widest text-amber-400/80">Étape 3 / 4</div>
              <h1 className="text-3xl font-bold leading-tight">
                Valeur moyenne d'un projet ?
              </h1>
              <div className="grid gap-3">
                {TICKET_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => { setTicket(o.value); setTimeout(goNext, 150); }}
                    className={`h-16 rounded-2xl border text-lg font-semibold text-left px-5 transition-all ${
                      ticket === o.value
                        ? "border-amber-400 bg-amber-400/10 text-amber-300"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={goBack} className="text-white/60">
                <ArrowLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
            </motion.section>
          )}

          {step === 4 && proj && (
            <motion.section
              key="s4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="text-xs uppercase tracking-widest text-amber-400/80">Étape 4 / 4</div>
              <h1 className="text-3xl font-bold leading-tight">Votre potentiel avec UNPRO</h1>

              <div className="rounded-3xl border border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-transparent p-6 space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/60">Rendez-vous estimés / an</div>
                  <div className="text-4xl font-bold text-amber-300 mt-1">
                    {proj.appointmentsLow}–{proj.appointmentsHigh}
                  </div>
                </div>
                <div className="h-px bg-white/10" />
                <div>
                  <div className="text-xs uppercase tracking-widest text-white/60">Revenus potentiels / an</div>
                  <div className="text-3xl font-bold mt-1">
                    {formatCAD(proj.revLow)} – {formatCAD(proj.revHigh)}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 space-y-4">
                <div className="flex items-center gap-2 text-amber-300">
                  <Sparkles className="w-5 h-5" />
                  <span className="font-semibold">Founding Member — 1 $ d'activation</span>
                </div>
                <ul className="space-y-2 text-sm text-white/85">
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" /> Profil vérifié</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" /> Visibilité IA (AIPP)</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" /> Matching propriétaires</li>
                  <li className="flex items-start gap-2"><Check className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" /> Rendez-vous exclusifs</li>
                </ul>

                <div className="space-y-2 pt-2">
                  <label className="text-xs text-white/60">Votre courriel professionnel</label>
                  <Input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@entreprise.ca"
                    className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>

                <Button
                  size="lg"
                  disabled={submitting || !email}
                  onClick={handleActivate}
                  className="h-14 w-full text-base font-semibold bg-amber-400 text-black hover:bg-amber-300"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Redirection…</>
                  ) : (
                    <>Activer mon profil — 1 $ <ArrowRight className="w-5 h-5 ml-2" /></>
                  )}
                </Button>

                <div className="flex items-center gap-2 text-xs text-white/50 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Paiement sécurisé Stripe · Aucune carte gardée
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={goBack} className="text-white/60">
                <ArrowLeft className="w-4 h-4 mr-1" /> Ajuster mes chiffres
              </Button>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
