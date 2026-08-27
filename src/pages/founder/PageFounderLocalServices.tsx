/**
 * PageFounderLocalServices — /fondateurs
 *
 * Founder offer for LOCAL SERVICES and PROFESSIONALS (not renovation
 * contractors, who stay on the Audit IA → paid appointment model).
 *
 * Offer: first 12 months = 0 $, then 350 $/year. Public copy says only
 * « 10 premiers membres par ville » — internal city × category allocation
 * is enforced server-side and never exposed. Availability numbers shown
 * come from real activated memberships only.
 */
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck, Building2, MapPin, Sparkles } from "lucide-react";

import MainLayout from "@/layouts/MainLayout";
import { supabase } from "@/integrations/supabase/client";

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
  const [city, setCity] = useState("");
  const [eligibility, setEligibility] = useState<Eligibility>({ state: "idle" });

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<
    { kind: "success"; founderEnd: string } | { kind: "error"; message: string } | null
  >(null);

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

  const grouped = useMemo(() => {
    const services = (categories ?? []).filter((c) => c.group_type === "local_service");
    const pros = (categories ?? []).filter((c) => c.group_type === "professional");
    return { services, pros };
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
    setResult(null);
    void checkEligibility(slug, city);
  };

  const onCity = (value: string) => {
    setCity(value);
    setResult(null);
    void checkEligibility(categorySlug, value);
  };

  const submit = async () => {
    setSubmitting(true);
    setResult(null);
    const attribution = {
      utm_source: sp.get("utm_source"),
      utm_medium: sp.get("utm_medium"),
      utm_campaign: sp.get("utm_campaign"),
      ref: sp.get("ref"),
      prospect_id: sp.get("p"),
    };
    const { data, error } = await supabase.rpc("founder_public_signup", {
      p_business_name: businessName,
      p_contact_name: contactName,
      p_email: email,
      p_phone: phone,
      p_city: city,
      p_category_slug: categorySlug,
      p_attribution: attribution,
    } as any);
    setSubmitting(false);
    const payload = data as any;
    if (error || !payload?.ok) {
      const reason = payload?.reason;
      setResult({
        kind: "error",
        message:
          reason === "duplicate_signup"
            ? "Cette entreprise est déjà inscrite pour cette ville et cette catégorie."
            : reason === "city_full" || reason === "not_eligible"
              ? "Cette ville a déjà atteint sa capacité de membres fondateurs pour le moment."
              : reason === "category_not_eligible"
                ? "Cette catégorie n'est pas admissible à l'offre de lancement."
                : "Une information est manquante ou invalide. Vérifiez les champs.",
      });
      return;
    }
    setResult({ kind: "success", founderEnd: payload.founder_end });
  };

  const canSubmit =
    eligibility.state === "eligible" &&
    businessName.trim().length >= 2 &&
    email.includes("@") &&
    !submitting;

  return (
    <MainLayout>
      <Helmet>
        <title>Membre fondateur UNPRO — Services locaux et professionnels</title>
        <meta
          name="description"
          content="Professionnels et services locaux : devenez membre fondateur UNPRO. Les 10 premiers membres de chaque ville profitent de 12 mois gratuitement. Ensuite 350 $/an."
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
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-muted-foreground">
              Courtiers, notaires, inspecteurs, évaluateurs, arpenteurs, entretien
              ménager, lavage de vitres, gazon, conduits et autres services
              locaux : UNPRO vous recommande aux propriétaires au bon moment.
            </p>
            <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
              Valeur de 350 $/an, offerte pour le lancement. Ensuite 350 $/an,
              avec votre consentement avant tout renouvellement payant. Aucun
              frais par mise en relation pendant votre membership.
            </p>
            <p className="mx-auto mt-2 text-[13px] text-muted-foreground">
              Offre de lancement réservée aux premiers membres admissibles de
              chaque ville. Certaines conditions s'appliquent.
            </p>
          </motion.div>
        </section>

        {/* Signup */}
        <section className="mx-auto w-full max-w-2xl px-5 pb-20">
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
                  Votre membership est actif gratuitement jusqu'au{" "}
                  <strong className="text-foreground">
                    {new Date(result.founderEnd).toLocaleDateString("fr-CA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </strong>
                  . Aucun paiement n'a été demandé. Avant tout renouvellement à
                  350 $/an, vous recevrez un avis clair et votre consentement
                  sera requis.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-foreground">
                  Réserver ma place gratuitement
                </h2>
                <p className="mt-2 text-[14px] text-muted-foreground">
                  Deux questions d'abord : votre domaine et votre ville.
                </p>

                {/* Step 1: category */}
                <label className="mt-6 block text-[13px] font-semibold text-foreground">
                  Votre domaine
                </label>
                <select
                  value={categorySlug}
                  onChange={(e) => onCategory(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-[15px] text-foreground"
                >
                  <option value="">Choisir…</option>
                  <optgroup label="Services locaux">
                    {grouped.services.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name_fr}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Professionnels">
                    {grouped.pros.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name_fr}
                      </option>
                    ))}
                  </optgroup>
                </select>

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

                {/* Step 3: business info (only once eligible) */}
                {eligibility.state === "eligible" && (
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
                      {submitting ? "Activation en cours…" : "Réserver ma place gratuitement"}
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
