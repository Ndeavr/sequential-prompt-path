/**
 * PageAffiliateOnboarding — Activation affiliée en 4 étapes courtes.
 * Route: /affilies/onboarding (publique, OTP inline si non connectée)
 * 1. Vous → 2. Comment travailler → 3. Canaux → 4. Activation
 * Reprise après interruption via brouillon local. Jamais de doublon de compte.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { sendPhoneOtp as sendOtpSms, verifyPhoneOtp as verifyOtpSms } from "@/lib/auth/phoneOtp";
import { PhoneInput } from "@/components/ui/phone-input";
import { useAuth } from "@/hooks/useAuth";
import { captureAttribution, getStoredAttribution } from "@/hooks/useReferralAttribution";
import { trackAffiliateFunnel } from "@/features/affiliate/onboarding/trackAffiliateFunnel";
import UnproLogo from "@/components/brand/UnproLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Rocket,
  Search,
  PhoneCall,
  Sparkles,
  ListChecks,
  Handshake,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";

const DRAFT_KEY = "unpro_aff_onboarding_draft";

const WORK_OPTIONS = [
  { id: "unpro_leads", label: "UNPRO me propose des prospects", desc: "Vous recevez des entrepreneurs à contacter, un à la fois." },
  { id: "own_leads", label: "J'ajoute mes propres contacts", desc: "Vous connaissez déjà des entrepreneurs." },
  { id: "known_owners", label: "Je parle à des gens que je connais", desc: "Votre réseau d'abord." },
  { id: "mixed", label: "Un peu des deux", desc: "Prospects UNPRO + vos contacts." },
];

const CHANNEL_OPTIONS = [
  { id: "phone", label: "Téléphone", desc: "Un appel court et direct." },
  { id: "sms", label: "Texto", desc: "Rapide, avec le lien d'évaluation." },
  { id: "email", label: "Courriel", desc: "Pour les entrepreneurs plus formels." },
  { id: "in_person", label: "En personne", desc: "Sur le terrain, entre deux chantiers." },
];

const RECAP = [
  { icon: Search, label: "Trouvez" },
  { icon: PhoneCall, label: "Contactez" },
  { icon: Sparkles, label: "Envoyez l'évaluation" },
  { icon: ListChecks, label: "Suivez" },
  { icon: Handshake, label: "UNPRO prend la relève" },
];

interface Draft {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  city: string;
  work_preferences: string[];
  preferred_channels: string[];
  step: number;
}

const EMPTY: Draft = {
  first_name: "",
  last_name: "",
  phone: "",
  email: "",
  city: "",
  work_preferences: [],
  preferred_channels: [],
  step: 1,
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export default function PageAffiliateOnboarding() {
  const nav = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  const [draft, setDraft] = useState<Draft>(loadDraft);
  const [busy, setBusy] = useState(false);
  const [terms, setTerms] = useState(false);
  // OTP inline
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [emailLinkSent, setEmailLinkSent] = useState(false);

  useEffect(() => {
    captureAttribution(new URLSearchParams(location.search));
    trackAffiliateFunnel("onboarding_started");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  }, [draft]);

  // Pré-remplir depuis le compte connecté
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("first_name, last_name, phone, email, city")
        .eq("id", user.id)
        .maybeSingle();
      const prof = p as any;
      setDraft((d) => ({
        ...d,
        first_name: d.first_name || prof?.first_name || "",
        last_name: d.last_name || prof?.last_name || "",
        phone: d.phone || prof?.phone || user.phone || "",
        email: d.email || prof?.email || user.email || "",
        city: d.city || prof?.city || "",
      }));
      // Déjà affiliée ? Direction le Mode Action.
      const { data: aff } = await supabase
        .from("affiliates" as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (aff) nav("/affiliate", { replace: true });
    })();
  }, [user, nav]);

  const step = draft.step;
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const step1Valid = useMemo(
    () =>
      draft.first_name.trim().length > 0 &&
      draft.last_name.trim().length > 0 &&
      draft.phone.replace(/\D/g, "").length >= 10 &&
      /.+@.+\..+/.test(draft.email),
    [draft]
  );

  function toggle(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  function goTo(next: number) {
    trackAffiliateFunnel("onboarding_step_completed", { metadata: { step } });
    set({ step: next });
    window.scrollTo({ top: 0 });
  }

  async function sendPhoneOtp() {
    setBusy(true);
    try {
      const res = await sendOtpSms(draft.phone);
      if (!res.ok) {
        toast.error(res.message ?? "Impossible d'envoyer le code par SMS pour le moment.");
        return;
      }
      setOtpSent(true);
      toast.success("Code envoyé par SMS.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    if (busy) return; // anti double-soumission
    setBusy(true);
    try {
      const res = await verifyOtpSms(draft.phone, otpCode);
      if (!res.ok) {
        toast.error(res.message ?? "Code invalide. Réessayez.");
        return;
      }
      toast.success("Numéro vérifié.");
      goTo(2);
    } finally {
      setBusy(false);
    }
  }



  async function sendEmailLink() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: draft.email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/affilies/onboarding` },
      });
      if (error) throw error;
      setEmailLinkSent(true);
      toast.success("Lien envoyé par courriel. Revenez ici après avoir cliqué.");
    } catch (e: any) {
      toast.error(e.message || "Impossible d'envoyer le courriel.");
    } finally {
      setBusy(false);
    }
  }

  async function activate() {
    if (!user) return;
    setBusy(true);
    try {
      const stored = getStoredAttribution();
      const params = new URLSearchParams(location.search);
      const { data, error } = await supabase.functions.invoke("affiliate-onboarding-activate", {
        body: {
          first_name: draft.first_name.trim(),
          last_name: draft.last_name.trim(),
          phone: draft.phone.trim(),
          email: draft.email.trim(),
          city: draft.city.trim(),
          work_preferences: draft.work_preferences,
          preferred_channels: draft.preferred_channels,
          terms_accepted: terms,
          // Page d'entrée personnalisée (/lorraine) : permet de RÉCLAMER la
          // fiche affiliée déjà créée par l'admin au lieu d'en créer une 2e.
          entry_slug: params.get("slug"),
          acquisition: {
            ref: params.get("ref") ?? stored?.refCode ?? null,
            intent: params.get("intent") ?? stored?.intent ?? null,
            utm_source: params.get("utm_source") ?? stored?.utmSource ?? null,
            utm_medium: params.get("utm_medium"),
            utm_campaign: params.get("utm_campaign"),
          },
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).message ?? (data as any).error);
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Bienvenue dans le programme!");
      nav("/affiliate", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Activation impossible pour le moment. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  const progress = (step / 4) * 100;

  return (
    <div className="landing-warm min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Activation affiliée — UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <header className="mx-auto flex max-w-xl items-center justify-between px-5 py-5">
        <Link to="/affilies" aria-label="Retour">
          <UnproLogo variant="primary" className="h-7 w-auto" />
        </Link>
        <span className="text-sm font-medium text-muted-foreground">{step} sur 4</span>
      </header>

      <div className="mx-auto max-w-xl px-5">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <main className="mx-auto max-w-xl px-5 pb-16 pt-8">
        {/* ÉTAPE 1 — Vous */}
        {step === 1 && (
          <section>
            <h1 className="text-3xl font-extrabold tracking-tight">D'abord, vous.</h1>
            <p className="mt-2 text-muted-foreground">Quelques informations pour créer votre espace affilié.</p>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fn">Prénom</Label>
                  <Input id="fn" className="mt-1 h-12" value={draft.first_name} onChange={(e) => set({ first_name: e.target.value })} autoComplete="given-name" />
                </div>
                <div>
                  <Label htmlFor="ln">Nom</Label>
                  <Input id="ln" className="mt-1 h-12" value={draft.last_name} onChange={(e) => set({ last_name: e.target.value })} autoComplete="family-name" />
                </div>
              </div>
              <div>
                <Label htmlFor="ph">Téléphone</Label>
                <PhoneInput id="ph" className="mt-1 h-12" placeholder="(514) 555-1234" value={draft.phone} onChange={(v) => set({ phone: v })} />
              </div>
              <div>
                <Label htmlFor="em">Courriel</Label>
                <Input id="em" className="mt-1 h-12" type="email" placeholder="vous@exemple.com" value={draft.email} onChange={(e) => set({ email: e.target.value })} autoComplete="email" />
              </div>
              <div>
                <Label htmlFor="ci">Ville <span className="text-muted-foreground">(optionnel)</span></Label>
                <Input id="ci" className="mt-1 h-12" placeholder="Montréal" value={draft.city} onChange={(e) => set({ city: e.target.value })} autoComplete="address-level2" />
              </div>
            </div>

            {authLoading ? (
              <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : user ? (
              <Button className="mt-8 h-14 w-full rounded-full text-lg font-bold" disabled={!step1Valid} onClick={() => goTo(2)}>
                Continuer <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : !otpSent && !emailLinkSent ? (
              <div className="mt-8 space-y-3">
                <Button className="h-14 w-full rounded-full text-lg font-bold" disabled={!step1Valid || busy} onClick={sendPhoneOtp}>
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Recevoir mon code par SMS <ArrowRight className="ml-2 h-5 w-5" /></>}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
                  disabled={!step1Valid || busy}
                  onClick={sendEmailLink}
                >
                  Plutôt un lien par courriel ?
                </button>
              </div>
            ) : emailLinkSent ? (
              <div className="mt-8 rounded-2xl bg-muted p-5 text-center">
                <p className="text-sm leading-relaxed">
                  Un lien de connexion a été envoyé à <strong>{draft.email}</strong>. Cliquez-le, puis revenez ici —
                  votre formulaire est conservé.
                </p>
                <button type="button" className="mt-3 text-sm font-medium text-primary underline-offset-4 hover:underline" onClick={() => { setEmailLinkSent(false); }}>
                  Utiliser le SMS à la place
                </button>
              </div>
            ) : (
              <div className="mt-8 space-y-4">
                <div>
                  <Label htmlFor="otp">Code reçu par SMS</Label>
                  <Input
                    id="otp"
                    className="mt-1 h-14 text-center text-2xl tracking-[0.4em]"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />

                </div>
                <Button className="h-14 w-full rounded-full text-lg font-bold" disabled={otpCode.length < 6 || busy} onClick={verifyOtp}>
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Vérifier et continuer"}
                </Button>
                <button type="button" className="w-full text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:underline" disabled={busy} onClick={sendPhoneOtp}>
                  Renvoyer le code
                </button>
              </div>
            )}
          </section>
        )}

        {/* ÉTAPE 2 — Comment travailler */}
        {step === 2 && (
          <section>
            <h1 className="text-3xl font-extrabold tracking-tight">Comment voulez-vous travailler ?</h1>
            <p className="mt-2 text-muted-foreground">Plusieurs choix possibles. Ça nous aide à vous proposer les bons prospects.</p>
            <div className="mt-6 space-y-3">
              {WORK_OPTIONS.map((o) => {
                const active = draft.work_preferences.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => set({ work_preferences: toggle(draft.work_preferences, o.id) })}
                    className={`w-full rounded-2xl border p-5 text-left transition-colors ${
                      active ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <p className="font-semibold">{o.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
                  </button>
                );
              })}
            </div>
            <StepNav
              onBack={() => goTo(1)}
              onNext={() => goTo(3)}
              nextDisabled={draft.work_preferences.length === 0}
            />
          </section>
        )}

        {/* ÉTAPE 3 — Canaux */}
        {step === 3 && (
          <section>
            <h1 className="text-3xl font-extrabold tracking-tight">Vos canaux préférés</h1>
            <p className="mt-2 text-muted-foreground">
              Comment aimez-vous contacter les entrepreneurs ? Aucune mauvaise réponse — UNPRO s'adapte à vous.
            </p>
            <div className="mt-6 space-y-3">
              {CHANNEL_OPTIONS.map((o) => {
                const active = draft.preferred_channels.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => set({ preferred_channels: toggle(draft.preferred_channels, o.id) })}
                    className={`w-full rounded-2xl border p-5 text-left transition-colors ${
                      active ? "border-primary bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <p className="font-semibold">{o.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
                  </button>
                );
              })}
            </div>
            <StepNav
              onBack={() => goTo(2)}
              onNext={() => goTo(4)}
              nextDisabled={draft.preferred_channels.length === 0}
            />
          </section>
        )}

        {/* ÉTAPE 4 — Activation */}
        {step === 4 && (
          <section>
            <h1 className="text-3xl font-extrabold tracking-tight">Dernière étape.</h1>
            <p className="mt-2 text-muted-foreground">
              {draft.first_name}, voici votre parcours une fois activée :
            </p>

            <div className="mt-6 rounded-3xl border border-border bg-card p-5">
              <ol className="space-y-3">
                {RECAP.map((r, i) => (
                  <li key={r.label} className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <r.icon className="h-4 w-4 text-primary" />
                    <span className="font-medium">{r.label}</span>
                  </li>
                ))}
              </ol>
            </div>

            <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4">
              <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} className="mt-0.5" />
              <span className="text-sm leading-relaxed">
                J'accepte les{" "}
                <Link to="/conditions" target="_blank" className="font-semibold text-primary underline-offset-4 hover:underline">
                  conditions du programme de partenariat UNPRO
                </Link>
                . Mon attribution et mes commissions sont suivies dans mon espace.
              </span>
            </label>

            <Button
              className="mt-6 h-14 w-full rounded-full text-lg font-bold"
              disabled={!terms || busy || !user}
              onClick={activate}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Rocket className="mr-2 h-5 w-5" /> VOIR MON PREMIER PROSPECT</>}
            </Button>
            {!user && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" /> Vérifiez votre numéro à l'étape 1 pour activer.
              </p>
            )}
            <button
              type="button"
              onClick={() => goTo(3)}
              className="mt-4 flex w-full items-center justify-center gap-1 text-sm font-medium text-muted-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Retour
            </button>
          </section>
        )}
      </main>
    </div>
  );
}

function StepNav({
  onBack,
  onNext,
  nextDisabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-8 space-y-3">
      <Button className="h-14 w-full rounded-full text-lg font-bold" disabled={nextDisabled} onClick={onNext}>
        Continuer <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center justify-center gap-1 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
    </div>
  );
}
