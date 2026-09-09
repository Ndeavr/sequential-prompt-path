/**
 * PageFounderLocalServices — /fondateurs
 *
 * Founder offer for RESIDENTIAL LOCAL SERVICES only (cleaning, maintenance,
 * pest control, exterior care…). Renovation contractors stay on the Audit IA
 * → paid appointment model. Real-estate professionals are intentionally NOT
 * offered here: their rows stay in `founder_eligible_categories` for history
 * but are filtered out of this funnel.
 *
 * Offer: first 12 months = 0 $, then 350 $/year. Public copy says only
 * « 10 premiers membres par ville » — internal city × category allocation
 * is enforced server-side and never exposed. Availability numbers shown
 * come from real activated memberships only.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Building2, MailCheck, MapPin, Sparkles } from "lucide-react";

import founderVideo from "@/assets/founder-video.mp4.asset.json";
import MainLayout from "@/layouts/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { formatPhoneDisplay, formatPhoneFinal } from "@/utils/formatPhone";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

const OTHER_SLUG = "autre-service-residentiel";
/** Reprise après clic sur le lien de vérification reçu par courriel. */
const PENDING_KEY = "unpro_founder_pending_signup";

/** Logical display order for the residential service list. */
const RESIDENTIAL_ORDER = [
  "entretien-menager",
  "grand-menage",
  "nettoyage-apres-construction",
  "nettoyage-tapis",
  "nettoyage-mobilier",
  "nettoyage-matelas",
  "nettoyage-planchers",
  "lavage-de-vitres",
  "lavage-pression",
  "nettoyage-gouttieres",
  "nettoyage-conduits",
  "ramonage-cheminee",
  "gestion-parasitaire",
  "entretien-gazon",
  "entretien-paysager",
  "deneigement",
  "entretien-piscine-spa",
  "abris-temporaires",
  "homme-a-tout-faire",
  "demenagement",
  "organisation-rangement",
  "entretien-preventif-domicile",
  OTHER_SLUG,
];

interface FounderCategory {
  slug: string;
  name_fr: string;
  group_type: "local_service" | "professional";
}

type Eligibility =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "eligible"; cityRemaining: number | null }
  | { state: "ineligible"; reason: string };

export default function PageFounderLocalServices() {
  const [sp] = useSearchParams();
  const [categorySlug, setCategorySlug] = useState("");
  const [otherService, setOtherService] = useState("");
  const [city, setCity] = useState("");
  const [eligibility, setEligibility] = useState<Eligibility>({ state: "idle" });
  const [showBusinessForm, setShowBusinessForm] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    | { kind: "success"; founderEnd: string | null }
    | { kind: "pending"; membershipId: string; email: string }
    | { kind: "error"; message: string }
    | null
  >(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpNotice, setOtpNotice] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  /** Empêche une double activation sur double-clic ou reprise simultanée. */
  const activatingRef = useRef(false);

  const { data: categories } = useQuery({
    queryKey: ["founder-eligible-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("founder_eligible_categories" as any)
        .select("slug, name_fr, group_type")
        .eq("is_active", true)
        .order("group_type")
        .order("name_fr");
      if (error) throw error;
      return (data ?? []) as unknown as FounderCategory[];
    },
    staleTime: 5 * 60 * 1000,
  });

  /** Residential-only funnel: real-estate professionals are never offered here. */
  const services = useMemo(() => {
    const list = (categories ?? []).filter((c) => c.group_type === "local_service");
    const rank = (slug: string) => {
      const i = RESIDENTIAL_ORDER.indexOf(slug);
      return i === -1 ? RESIDENTIAL_ORDER.length : i;
    };
    return [...list].sort((a, b) => rank(a.slug) - rank(b.slug) || a.name_fr.localeCompare(b.name_fr, "fr"));
  }, [categories]);

  const checkEligibility = async (slug: string, cityValue: string) => {
    if (!slug || cityValue.trim().length < 2) {
      setEligibility({ state: "idle" });
      return;
    }
    setEligibility({ state: "checking" });
    const { data, error } = await supabase.rpc("check_founder_eligibility", {
      p_city: cityValue.trim(),
      p_category_slug: slug,
    } as any);
    if (error) {
      setEligibility({ state: "idle" });
      return;
    }
    const payload = data as any;
    if (payload?.eligible) {
      setEligibility({ state: "eligible", cityRemaining: payload.city_remaining ?? null });
    } else {
      setEligibility({ state: "ineligible", reason: payload?.reason ?? "not_eligible" });
    }
  };

  const onCategory = (slug: string) => {
    setCategorySlug(slug);
    if (slug !== OTHER_SLUG) setOtherService("");
    setResult(null);
    setShowBusinessForm(false);
    void checkEligibility(slug, city);
  };

  const onCity = (value: string) => {
    setCity(value);
    setResult(null);
    setShowBusinessForm(false);
    void checkEligibility(categorySlug, value);
  };

  const reasonMessage = (reason?: string) => {
    switch (reason) {
      case "duplicate_signup":
        return "Cette entreprise est déjà inscrite pour cette ville et cette catégorie.";
      case "city_category_full":
      case "city_full":
      case "not_eligible":
        return "Les 10 places gratuites sont déjà prises pour ce service dans cette ville. Vous pouvez tout de même créer votre fiche, sans l'année offerte.";
      case "category_not_eligible":
        return "Cette catégorie n'est pas admissible à l'offre de lancement.";
      case "missing_city_or_category":
      case "invalid_input":
        return "Une information est manquante ou invalide. Vérifiez les champs.";
      case "not_authenticated":
        return "Votre session a expiré. Demandez un nouveau code pour continuer.";
      case "verified_contact_mismatch":
        return "Le courriel vérifié ne correspond pas à celui de la demande. Utilisez le même courriel.";
      case "signup_claimed_by_other":
      case "prospect_claimed_by_other":
        return "Cette demande a déjà été confirmée avec un autre compte.";
      case "signup_not_claimable":
        return "Cette demande n'est plus au stade de la confirmation. Écrivez-nous et nous la débloquons.";
      case "signup_not_found":
        return "Cette demande n'a pas été retrouvée. Recommencez l'inscription.";
      default:
        return "L'activation n'a pas pu être complétée. Réessayez : rien n'a été perdu.";
    }
  };

  /** Attribution conservée pour survivre à l'OTP, au lien courriel et au refresh. */
  const attributionRef = () => ({
    utm_source: sp.get("utm_source"),
    utm_medium: sp.get("utm_medium"),
    utm_campaign: sp.get("utm_campaign"),
    ref: sp.get("ref"),
    prospect_id: sp.get("p") ?? sp.get("prospect"),
    token: sp.get("t") ?? sp.get("token"),
  });

  /** Envoie le code de vérification au courriel de la demande. */
  const sendVerificationCode = async (targetEmail: string) => {
    setOtpError(null);
    void logFunnelEvent({
      event_type: "otp_requested",
      email: targetEmail,
      step: "founder_free_signup",
      metadata: { channel: "email" },
    });
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/fondateurs`,
      },
    });
    if (error) {
      setOtpError("L'envoi du code a échoué. Réessayez dans un instant.");
      void logFunnelEvent({
        event_type: "activation_error",
        email: targetEmail,
        step: "otp_send_failed",
        metadata: { failure_step: "otp_send", failure_code: error.name || "otp_send_failed" },
      });
      return false;
    }
    setOtpNotice(`Code envoyé à ${targetEmail}.`);
    void logFunnelEvent({ event_type: "otp_sent", email: targetEmail, step: "founder_free_signup" });
    return true;
  };

  /**
   * Activation gratuite canonique — seule voie d'activation, après vérification.
   * L'écran de succès n'apparaît QUE si le serveur confirme `activated`.
   */
  const activate = async (membershipId: string, contactEmail: string) => {
    if (activatingRef.current) return false;
    activatingRef.current = true;
    try {
      const { data, error } = await supabase.rpc("claim_pending_free_service_signup", {
        p_membership_id: membershipId,
      } as any);
      const payload = data as any;
      if (error || !payload?.ok || !payload?.activated) {
        const code = payload?.reason ?? error?.message ?? "claim_failed";
        setOtpError(reasonMessage(payload?.reason));
        void logFunnelEvent({
          event_type: "activation_error",
          email: contactEmail,
          step: "free_service_claim",
          metadata: { failure_step: "claim", failure_code: code, membership_id: membershipId },
        });
        return false;
      }
      try {
        localStorage.removeItem(PENDING_KEY);
      } catch { /* noop */ }

      const common = {
        email: contactEmail,
        contractor_id: payload.contractor_id ?? null,
        prospect_id: payload.prospect_id ?? null,
        metadata: {
          membership_id: membershipId,
          claim_id: payload.claim_id ?? null,
          onboarding_session_id: payload.onboarding_session_id ?? null,
          free_offer: true,
        },
      };
      void logFunnelEvent({ ...common, event_type: "profile_claimed", step: "free_service_claim" });
      void logFunnelEvent({
        ...common,
        event_type: "free_year_entitlement_created",
        step: "free_service_entitlement",
        metadata: { ...common.metadata, founder_end: payload.founder_end ?? null },
      });
      void logFunnelEvent({ ...common, event_type: "profile_activated", step: "free_service_activation" });
      void logFunnelEvent({ ...common, event_type: "onboarding_resumed", step: "free_service_onboarding" });

      setResult({ kind: "success", founderEnd: payload.founder_end ?? null });
      return true;
    } finally {
      activatingRef.current = false;
    }
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setResult(null);
    setOtpError(null);
    setOtpNotice(null);
    const contactEmail = email.trim().toLowerCase();
    const attribution = {
      ...attributionRef(),
      city,
      category_slug: categorySlug,
      service_details: categorySlug === OTHER_SLUG ? otherService.trim() || null : null,
    };
    void logFunnelEvent({
      event_type: "claim_cta_clicked",
      email: contactEmail,
      step: "founder_free_signup",
      prospect_id: attribution.prospect_id,
      token: attribution.token,
      metadata: { city, category: categorySlug },
    });
    void logFunnelEvent({
      event_type: "registration_started",
      email: contactEmail,
      step: "founder_free_signup",
      prospect_id: attribution.prospect_id,
      token: attribution.token,
      metadata: { city, category: categorySlug },
    });
    const { data, error } = await supabase.rpc("founder_public_signup", {
      p_business_name: businessName,
      p_contact_name: contactName,
      p_email: contactEmail,
      p_phone: phone,
      p_city: city,
      p_category_slug: categorySlug,
      p_attribution: attribution,
    } as any);
    const payload = data as any;

    // Activation immédiate possible seulement si le visiteur était déjà vérifié.
    if (!error && payload?.ok && payload?.activated) {
      setSubmitting(false);
      void logFunnelEvent({
        event_type: "free_year_entitlement_created",
        email: contactEmail,
        contractor_id: payload.contractor_id ?? null,
        prospect_id: payload.prospect_id ?? null,
        step: "free_service_entitlement",
        metadata: { founder_end: payload.founder_end ?? null, already_verified: true },
      });
      void logFunnelEvent({
        event_type: "profile_activated",
        email: contactEmail,
        contractor_id: payload.contractor_id ?? null,
        prospect_id: payload.prospect_id ?? null,
        step: "free_service_activation",
      });
      setResult({ kind: "success", founderEnd: payload.founder_end ?? null });
      return;
    }

    // Place réservée, en attente de vérification du courriel.
    if (!error && payload?.membership_id && payload?.requires_verification) {
      try {
        localStorage.setItem(
          PENDING_KEY,
          JSON.stringify({
            membershipId: payload.membership_id,
            email: contactEmail,
            attribution,
          }),
        );
      } catch { /* noop */ }
      void logFunnelEvent({
        event_type: "auth_started",
        email: contactEmail,
        step: "founder_free_signup",
        metadata: { method: "email_otp", membership_id: payload.membership_id },
      });
      await sendVerificationCode(contactEmail);
      setSubmitting(false);
      setResult({ kind: "pending", membershipId: payload.membership_id, email: contactEmail });
      return;
    }

    setSubmitting(false);
    const reason = payload?.reason ?? error?.message ?? "signup_failed";
    if (reason === "city_category_full" || reason === "city_full" || reason === "not_eligible") {
      void logFunnelEvent({
        event_type: "free_year_unavailable",
        email: contactEmail,
        step: "founder_free_signup",
        metadata: { city, category: categorySlug, reason },
      });
    } else {
      void logFunnelEvent({
        event_type: "activation_error",
        email: contactEmail,
        step: "founder_free_signup",
        metadata: { failure_step: "signup", failure_code: reason },
      });
    }
    setResult({ kind: "error", message: reasonMessage(payload?.reason) });
  };

  /** Vérification du code reçu par courriel, puis activation. */
  const verifyAndActivate = async (membershipId: string, contactEmail: string) => {
    if (verifying) return;
    setVerifying(true);
    setOtpError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: contactEmail,
      token: otpCode.trim(),
      type: "email",
    });
    if (error) {
      setVerifying(false);
      setOtpError("Code invalide ou expiré. Demandez un nouveau code.");
      void logFunnelEvent({
        event_type: "activation_error",
        email: contactEmail,
        step: "otp_verify_failed",
        metadata: { failure_step: "otp_verify", failure_code: "otp_invalid_or_expired" },
      });
      return;
    }
    void logFunnelEvent({ event_type: "otp_verified", email: contactEmail, step: "founder_free_signup" });
    void logFunnelEvent({ event_type: "auth_completed", email: contactEmail, step: "founder_free_signup" });
    await activate(membershipId, contactEmail);
    setVerifying(false);
  };

  /** Reprise automatique si l'entreprise a cliqué le lien du courriel. */
  useEffect(() => {
    let cancelled = false;
    void logFunnelEvent({ event_type: "landing_viewed", step: "founder_free_landing" });
    void (async () => {
      let pending: { membershipId?: string; email?: string } | null = null;
      try {
        const raw = localStorage.getItem(PENDING_KEY);
        pending = raw ? JSON.parse(raw) : null;
      } catch { /* noop */ }
      if (!pending?.membershipId || !pending.email) return;
      const { data } = await supabase.auth.getSession();
      if (!data.session || cancelled) return;
      void logFunnelEvent({
        event_type: "auth_completed",
        email: pending.email,
        step: "founder_free_signup",
        metadata: { method: "email_link" },
      });
      setResult({ kind: "pending", membershipId: pending.membershipId, email: pending.email });
      await activate(pending.membershipId, pending.email);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit =
    eligibility.state === "eligible" &&
    (categorySlug !== OTHER_SLUG || otherService.trim().length >= 2) &&
    businessName.trim().length >= 2 &&
    email.includes("@") &&
    !submitting;

  return (
    <MainLayout hideMemorySection>
      <Helmet>
        <title>Membre fondateur UNPRO — Services résidentiels</title>
        <meta
          name="description"
          content="Nettoyage, entretien, gestion parasitaire et autres services à domicile : devenez membre fondateur UNPRO. Les 10 premiers membres de chaque ville profitent de 12 mois gratuitement. Ensuite 350 $/an."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://unpro.ca/fondateurs" />
      </Helmet>

      <div className="home-light">
        {/* Hero */}
        <section className="mx-auto w-full max-w-3xl px-5 pt-16 pb-10 text-center md:pt-24">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <span
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.12em]"
              style={{ background: "hsl(var(--sun) / 0.2)", color: "hsl(var(--sun-foreground))" }}
            >
              <Sparkles className="h-3.5 w-3.5" /> Offre de lancement — Membre fondateur
            </span>
            <h1 className="mt-6 text-[clamp(1.9rem,5vw,3rem)] font-semibold leading-tight tracking-[-0.02em] text-foreground">
              Soyez parmi les 10 premiers membres UNPRO de votre ville et profitez de{" "}
              <span className="text-primary">12 mois gratuitement</span>.
            </h1>
            <video
              src={founderVideo.url}
              autoPlay
              muted
              loop
              playsInline
              controls
              className="mx-auto mt-6 w-full max-w-xl rounded-2xl shadow-lg"
            />
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
              Vous offrez des services de nettoyage, d'entretien, lavage de vitres ou
              un autre service à domicile&nbsp;? UNPRO aide votre
              entreprise à être trouvée et recommandée aux propriétaires, au bon
              moment, dans votre ville.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
              Valeur de 350 $ : votre première année est offerte.
              <br />
              Aucun engagement requis.
            </p>
            <p className="mx-auto mt-2 text-[13px] text-muted-foreground">
              Offre de lancement réservée aux premiers membres admissibles de
              chaque ville. Certaines conditions s'appliquent.
            </p>
          </motion.div>
        </section>

        {/* Signup */}
        <section className="mx-auto w-full max-w-2xl px-5 pb-28 md:pb-20">
          <div className="rounded-[28px] border border-border bg-card p-6 shadow-lg shadow-primary/5 md:p-10">
            {result?.kind === "success" ? (
              <div className="text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <BadgeCheck className="h-7 w-7" />
                </span>
                <h2 className="mt-5 text-2xl font-semibold text-foreground">
                  Bienvenue, membre fondateur.
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  Votre membership est actif gratuitement
                  {result.founderEnd ? (
                    <>
                      {" jusqu'au "}
                      <strong className="text-foreground">
                        {new Date(result.founderEnd).toLocaleDateString("fr-CA", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </strong>
                    </>
                  ) : (
                    " pour les 12 prochains mois"
                  )}
                  . Aucun paiement n'a été demandé. Avant tout renouvellement à
                  350 $/an, vous recevrez un avis clair et votre consentement
                  sera requis.
                </p>
                <a
                  href="/entrepreneur/profil"
                  className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-[15px] font-semibold text-primary-foreground shadow-md shadow-primary/25"
                >
                  Compléter mon profil public
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            ) : result?.kind === "pending" ? (
              <div className="text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <MailCheck className="h-7 w-7" />
                </span>
                <h2 className="mt-5 text-2xl font-semibold text-foreground">
                  Demande reçue — votre place est réservée.
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  Une dernière étape : confirmez votre courriel. Nous avons
                  envoyé un code à{" "}
                  <strong className="text-foreground">{result.email}</strong>.
                  Entrez-le ci-dessous pour activer vos 12 mois gratuits. Aucun
                  paiement n'est demandé.
                </p>

                <input
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Code à 6 chiffres"
                  className="mx-auto mt-6 w-full max-w-xs rounded-2xl border border-border bg-background px-4 py-3 text-center text-[18px] tracking-[0.3em] text-foreground outline-none placeholder:tracking-normal placeholder:text-muted-foreground"
                />

                {otpNotice && !otpError && (
                  <p className="mt-3 text-[13px] text-muted-foreground">{otpNotice}</p>
                )}
                {otpError && (
                  <p className="mt-3 text-[13px] font-medium text-destructive">{otpError}</p>
                )}

                <button
                  onClick={() => void verifyAndActivate(result.membershipId, result.email)}
                  disabled={verifying || otpCode.trim().length < 6}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-[15px] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {verifying ? "Vérification en cours…" : "Confirmer et activer"}
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  onClick={() => void sendVerificationCode(result.email)}
                  className="mt-3 text-[13px] font-medium text-primary underline-offset-2 hover:underline"
                >
                  Renvoyer le code
                </button>

                <p className="mt-4 text-[12.5px] leading-relaxed text-muted-foreground">
                  Vous pouvez aussi cliquer le lien reçu par courriel : votre
                  place s'activera automatiquement à votre retour ici.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-foreground">
                  Réserver ma place gratuitement
                </h2>
                <p className="mt-2 text-[14px] text-muted-foreground">
                  Deux questions d'abord : votre service et votre ville.
                </p>

                {/* Step 1: category */}
                <label
                  htmlFor="founder-service"
                  className="mt-6 block text-[13px] font-semibold text-foreground"
                >
                  Votre service
                </label>
                <select
                  id="founder-service"
                  value={categorySlug}
                  onChange={(e) => onCategory(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground"
                >
                  <option value="">Choisir…</option>
                  <optgroup label="Services résidentiels">
                    {services.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name_fr}
                      </option>
                    ))}
                  </optgroup>
                </select>

                {categorySlug === OTHER_SLUG && (
                  <div className="mt-3">
                    <label
                      htmlFor="founder-other-service"
                      className="block text-[13px] font-semibold text-foreground"
                    >
                      Précisez votre service
                    </label>
                    <input
                      id="founder-other-service"
                      value={otherService}
                      onChange={(e) => setOtherService(e.target.value)}
                      placeholder="Ex. : nettoyage de panneaux solaires"
                      className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                )}

                {/* Step 2: city */}
                <label className="mt-5 block text-[13px] font-semibold text-foreground">
                  Votre ville
                </label>
                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-background px-4">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <input
                    value={city}
                    onChange={(e) => onCity(e.target.value)}
                    placeholder="Ex. : Terrebonne"
                    className="w-full bg-transparent py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>

                {/* Eligibility feedback — real data only */}
                {eligibility.state === "checking" && (
                  <p className="mt-3 text-[13px] text-muted-foreground">Vérification de l'admissibilité…</p>
                )}
                {eligibility.state === "eligible" && (
                  <p className="mt-3 flex items-center gap-2 text-[13px] font-medium text-primary">
                    <BadgeCheck className="h-4 w-4" />
                    {eligibility.cityRemaining !== null && eligibility.cityRemaining <= 3
                      ? `Votre ville est admissible — il reste ${eligibility.cityRemaining} place${eligibility.cityRemaining > 1 ? "s" : ""} de membre fondateur.`
                      : "Votre ville est admissible à l'offre de lancement."}
                  </p>
                )}
                {eligibility.state === "ineligible" && (
                  <p className="mt-3 text-[13px] text-muted-foreground">
                    {eligibility.reason === "category_not_eligible"
                      ? "Cette catégorie n'est pas admissible à l'offre fondateur. Entrepreneurs en rénovation : passez par l'Audit IA."
                      : "Cette ville a déjà atteint sa capacité de membres fondateurs pour le moment. Revenez bientôt."}
                  </p>
                )}

                {/* Step 3: continue only once eligible */}
                {eligibility.state === "eligible" && !showBusinessForm && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                    <button
                      onClick={() => setShowBusinessForm(true)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-[15px] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:-translate-y-0.5"
                    >
                      Continuer
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    {eligibility.cityRemaining !== null && eligibility.cityRemaining <= 3 && (
                      <p className="mt-3 text-center text-[13px] font-medium text-primary">
                        Il ne reste que {eligibility.cityRemaining} place{eligibility.cityRemaining > 1 ? "s" : ""} de membre fondateur.
                      </p>
                    )}
                  </motion.div>
                )}

                {/* Step 4: business info (only once continued) */}
                {eligibility.state === "eligible" && showBusinessForm && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
                    <div>
                      <label className="block text-[13px] font-semibold text-foreground">Nom de l'entreprise</label>
                      <div className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-background px-4">
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Ex. : Nettoyage Nord-Sud inc."
                          className="w-full bg-transparent py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-[13px] font-semibold text-foreground">Votre nom (optionnel)</label>
                        <input
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[13px] font-semibold text-foreground">Téléphone (optionnel)</label>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
                          onBlur={() => setPhone((p) => formatPhoneFinal(p))}
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="(514) 555-0101"
                          className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                        />

                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-semibold text-foreground">Courriel</label>
                      <input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        placeholder="vous@entreprise.ca"
                        className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
                      />
                    </div>

                    <p className="text-[12.5px] leading-relaxed text-muted-foreground">
                      En réservant, vous activez 12 mois gratuits (valeur 350 $).
                      Aucun paiement maintenant. À la fin de la période
                      gratuite, le renouvellement est de 350 $/an et ne se fera
                      qu'avec votre consentement explicite — aucun prélèvement
                      automatique sans accord.
                    </p>

                    {result?.kind === "error" && (
                      <p className="text-[13px] font-medium text-destructive">{result.message}</p>
                    )}

                    <button
                      onClick={submit}
                      disabled={!canSubmit}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 text-[15px] font-semibold text-primary-foreground shadow-md shadow-primary/25 transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Envoi du code de confirmation…" : "Réserver ma place gratuitement"}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </div>

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            Entrepreneur en rénovation ou construction ?{" "}
            <a href="/entrepreneurs/audit-ia" className="font-semibold text-primary underline-offset-2 hover:underline">
              Passez par l'Audit IA
            </a>
            .
          </p>
        </section>
      </div>
    </MainLayout>
  );
}
