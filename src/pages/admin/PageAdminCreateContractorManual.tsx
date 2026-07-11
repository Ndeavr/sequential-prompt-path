/**
 * UNPRO — Admin: Create Manual Contractor (premium one-shot activation)
 * Route: /admin/contractors/create-manual
 *
 * Pre-filled with the Jean Edouard Fanfan use case. Production-ready:
 * uploads to contractor-media bucket, calls admin-create-contractor-manual.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Sparkles, Upload, Loader2, ExternalLink, Phone, Mail, Globe, Award, Shield, Zap, Image as ImageIcon } from "lucide-react";
import AdminLayout from "@/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  "Peinture",
  "Plâtrage",
  "Gypse",
  "Après sinistre",
  "Condo refresh",
  "Commercial",
  "Résidentiel",
];

const PLANS = [
  { code: "recrue", label: "Recrue", price: 0 },
  { code: "pro", label: "Pro", price: 34900 },
  { code: "premium", label: "Premium", price: 59900 },
  { code: "elite", label: "Élite", price: 99900 },
  { code: "signature", label: "Signature", price: 179900 },
];

const PREFILL = {
  business_name: "Jean Edouard Fanfan",
  legal_name: "",
  phone: "(438) 836-4629",
  email: "",
  website: "",
  city: "Montréal",
  service_areas: ["Montréal", "Laval", "Longueuil", "Brossard", "Saint-Lambert"],
  languages: ["Français", "Anglais", "Créole"],
  years_experience: 20,
  tps_number: "",
  tvq_number: "",
  rbq_number: "",
  neq: "",
  categories: ["Peinture", "Plâtrage", "Gypse"],
  short_bio: "Spécialiste peinture, plâtrage et gypse — Grand Montréal.",
  premium_bio:
    "Plus de 20 ans d'expérience en peinture intérieure/extérieure, plâtrage et gypse. Travail soigné, finitions impeccables, échéanciers respectés. Service personnalisé pour particuliers, gestionnaires d'immeubles et copropriétés.",
  why_choose_us:
    "Précision, propreté et ponctualité. Chaque chantier est mené comme s'il était dans ma propre maison.",
  warranty: "Garantie 1 an sur main-d'œuvre.",
  avg_lead_time: "2 à 5 jours",
  free_quote: true,
  plan_code: "pro",
};

type Toggles = {
  visible_public: boolean;
  receives_leads: boolean;
  priority_match: boolean;
  unpro_verified: boolean;
  badge_premium: boolean;
};

const computeAIPP = (input: {
  years: number;
  hasLogo: boolean;
  photoCount: number;
  hasBio: boolean;
  hasWhy: boolean;
  categories: number;
  hasWebsite: boolean;
  hasTaxes: boolean;
}): { score: number; badge: string } => {
  const exp = Math.min(20, Math.round((input.years / 20) * 20)); // /20
  const branding = (input.hasLogo ? 8 : 0) + (input.hasWebsite ? 4 : 0); // /12
  const clarity = (input.hasBio ? 6 : 0) + (input.hasWhy ? 4 : 0); // /10
  const trust = input.hasTaxes ? 14 : 7; // /14
  const photos = Math.min(10, input.photoCount * 1.2); // /10
  const niche = Math.min(12, input.categories * 3); // /12
  const conversion = 10; // baseline /12
  const availability = 12; // /12
  const total = Math.round(exp + branding + clarity + trust + photos + niche + conversion + availability);
  const badge =
    total >= 88 ? "PRO EXPÉRIMENTÉ" : total >= 75 ? "PRO VÉRIFIÉ" : total >= 60 ? "ACTIF" : "EN PROGRESSION";
  return { score: total, badge };
};

const Section = ({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-5 md:p-6 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 className="text-base md:text-lg font-semibold text-white tracking-tight">{title}</h2>
    </div>
    <div className="grid gap-3">{children}</div>
  </div>
);

const PageAdminCreateContractorManual = () => {
  const { toast } = useToast();

  // ---- form state ----
  const [businessName, setBusinessName] = useState(PREFILL.business_name);
  const [legalName, setLegalName] = useState(PREFILL.legal_name);
  const [phone, setPhone] = useState(PREFILL.phone);
  const [email, setEmail] = useState(PREFILL.email);
  const [website, setWebsite] = useState(PREFILL.website);
  const [city, setCity] = useState(PREFILL.city);
  const [serviceAreas, setServiceAreas] = useState<string>(PREFILL.service_areas.join(", "));
  const [languages, setLanguages] = useState<string>(PREFILL.languages.join(", "));
  const [years, setYears] = useState<number>(PREFILL.years_experience);
  const [tps, setTps] = useState(PREFILL.tps_number);
  const [tvq, setTvq] = useState(PREFILL.tvq_number);
  const [rbq, setRbq] = useState(PREFILL.rbq_number);
  const [neq, setNeq] = useState(PREFILL.neq);

  const [categories, setCategories] = useState<string[]>(PREFILL.categories);

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const [shortBio, setShortBio] = useState(PREFILL.short_bio);
  const [premiumBio, setPremiumBio] = useState(PREFILL.premium_bio);
  const [whyChoose, setWhyChoose] = useState(PREFILL.why_choose_us);
  const [warranty, setWarranty] = useState(PREFILL.warranty);
  const [leadTime, setLeadTime] = useState(PREFILL.avg_lead_time);
  const [freeQuote, setFreeQuote] = useState(PREFILL.free_quote);

  const [planCode, setPlanCode] = useState<string>(PREFILL.plan_code);

  // Manual payment terms
  const [durationMonths, setDurationMonths] = useState<number>(12);
  const [amountPaidDollars, setAmountPaidDollars] = useState<string>("349");
  const [paymentNote, setPaymentNote] = useState<string>("Payé 1 an");
  const [priorityMatching, setPriorityMatching] = useState<"normal" | "elevated" | "exclusive">("elevated");
  const [adminConfirmed, setAdminConfirmed] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [toggles, setToggles] = useState<Toggles>({
    visible_public: true,
    receives_leads: true,
    priority_match: true,
    unpro_verified: false,
    badge_premium: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{
    slug: string;
    public_url: string;
    expiry_date: string;
    aipp_score: number;
    contractor_id?: string;
  } | null>(null);

  // Live AIPP score
  const aipp = useMemo(
    () =>
      computeAIPP({
        years,
        hasLogo: !!logoUrl,
        photoCount: photoUrls.length,
        hasBio: !!premiumBio?.trim(),
        hasWhy: !!whyChoose?.trim(),
        categories: categories.length,
        hasWebsite: !!website?.trim(),
        hasTaxes: !!(tps && tvq) || !!rbq,
      }),
    [years, logoUrl, photoUrls.length, premiumBio, whyChoose, categories.length, website, tps, tvq, rbq],
  );

  const selectedPlan = PLANS.find((p) => p.code === planCode) ?? PLANS[1];

  // ---- handlers ----
  const toggleCategory = (c: string) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const handleUpload = async (file: File, kind: "logo" | "cover" | "photo") => {
    try {
      setUploading(kind);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `manual/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("contractor-media").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("contractor-media").getPublicUrl(path);
      const url = pub.publicUrl;
      if (kind === "logo") setLogoUrl(url);
      else if (kind === "cover") setCoverUrl(url);
      else setPhotoUrls((prev) => [...prev, url].slice(0, 10));
      toast({ title: "Téléversé", description: `${kind} ajouté.` });
    } catch (e: any) {
      toast({ title: "Erreur upload", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleAIGenerate = () => {
    // Lightweight client-side persuasive copy generator; no extra API key needed.
    const cats = categories.join(", ").toLowerCase() || "rénovation";
    setShortBio(
      `${businessName} — ${years}+ ans d'expérience en ${cats}. Service rapide, fini impeccable, ${city}.`,
    );
    setPremiumBio(
      `Chez ${businessName}, chaque chantier est traité avec rigueur et soin. ${years}+ années à perfectionner notre art en ${cats} dans la grande région de ${city}. Notre approche : écouter, mesurer, exécuter — sans surprise. Particuliers, gestionnaires et copropriétés nous font confiance pour livrer un travail durable, propre et signé UNPRO.`,
    );
    setWhyChoose(
      `Précision, propreté, ponctualité. ${years} ans à élever le standard, un mur à la fois. Vous parlez à l'expert, pas à un dispatcher.`,
    );
    setWarranty("Garantie 1 an sur main-d'œuvre. Reprise gratuite en cas de défaut.");
    setLeadTime("2 à 5 jours");
    toast({ title: "Texte généré", description: "Copy persuasive remplie." });
  };

  const canSubmit = !!(
    businessName.trim() &&
    phone.trim() &&
    city.trim() &&
    categories.length > 0 &&
    planCode &&
    durationMonths > 0 &&
    Number(amountPaidDollars) >= 0 &&
    adminConfirmed
  );

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast({
        title: "Champs requis",
        description: "Nom, téléphone, ville, catégorie, plan, durée et confirmation admin requis.",
        variant: "destructive",
      });
      return;
    }
    setShowSummary(false);
    setSubmitting(true);
    try {
      const amountCents = Math.round((Number(amountPaidDollars) || 0) * 100);
      const { data, error } = await supabase.functions.invoke("admin-create-contractor-manual", {
        body: {
          business_name: businessName.trim(),
          legal_name: legalName.trim() || null,
          phone: phone.trim(),
          email: email.trim() || null,
          website: website.trim() || null,
          city: city.trim(),
          service_areas: serviceAreas.split(",").map((s) => s.trim()).filter(Boolean),
          languages: languages.split(",").map((s) => s.trim()).filter(Boolean),
          years_experience: years,
          tps_number: tps.trim() || null,
          tvq_number: tvq.trim() || null,
          rbq_number: rbq.trim() || null,
          neq: neq.trim() || null,
          categories,
          logo_url: logoUrl,
          portfolio_urls: photoUrls,
          cover_url: coverUrl,
          short_bio: shortBio,
          premium_bio: premiumBio,
          why_choose_us: whyChoose,
          warranty,
          avg_lead_time: leadTime,
          free_quote: freeQuote,
          aipp_score: aipp.score,
          aipp_badge: aipp.badge,
          plan_code: planCode,
          plan_amount_cents: selectedPlan.price,
          amount_paid_cents: amountCents,
          duration_months: durationMonths,
          activation_note: paymentNote || null,
          priority_matching: priorityMatching,
          can_be_matched: toggles.receives_leads,
          admin_confirmed: true,
          ...toggles,
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "Échec création");
      setSuccess({
        slug: data.slug,
        public_url: data.public_url,
        expiry_date: data.expiry_date,
        aipp_score: data.aipp_score,
        contractor_id: data.contractor_id,
      });
      toast({ title: "✅ Entrepreneur activé", description: `${businessName} est en ligne.` });
    } catch (e: any) {
      toast({ title: "Erreur activation", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-save draft to localStorage
  useEffect(() => {
    const draft = {
      businessName, phone, city, categories, planCode, years,
      photoUrls, logoUrl, coverUrl, premiumBio, shortBio, whyChoose,
    };
    const t = setTimeout(() => localStorage.setItem("unpro:manual-contractor-draft", JSON.stringify(draft)), 600);
    return () => clearTimeout(t);
  }, [businessName, phone, city, categories, planCode, years, photoUrls, logoUrl, coverUrl, premiumBio, shortBio, whyChoose]);

  // ---- success screen ----
  if (success) {
    const fullPublicUrl = `${window.location.origin}${success.public_url}`;
    return (
      <AdminLayout>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto py-12 px-4"
        >
          <div className="mx-auto w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 text-center">Entrepreneur activé avec succès</h1>
          <p className="text-white/60 mb-1 text-center">
            Plan <span className="text-emerald-400 font-semibold">{selectedPlan.label}</span> actif jusqu'au{" "}
            <span className="text-white">{new Date(success.expiry_date).toLocaleDateString("fr-CA")}</span>
          </p>
          <p className="text-white/50 text-sm mb-6 text-center">Score AIPP : {success.aipp_score} · {aipp.badge}</p>

          <ul className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 mb-6 grid gap-2 text-sm">
            {[
              "Profil public publié",
              "Abonnement marqué payé",
              `Plan ${selectedPlan.label} — expire le ${new Date(success.expiry_date).toLocaleDateString("fr-CA")}`,
              "Admissible au matching Alex",
              "Prêt à recevoir des rendez-vous",
              "Alex peut recommander cet entrepreneur",
            ].map((line) => (
              <li key={line} className="flex items-center gap-2 text-white/85">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {line}
              </li>
            ))}
          </ul>

          <div className="grid sm:grid-cols-2 gap-3">
            <a
              href={success.public_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] p-4 text-white transition flex items-center gap-3"
            >
              <ExternalLink className="w-5 h-5 text-emerald-300" />
              <span className="text-sm">Voir la fiche publique</span>
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(fullPublicUrl);
                toast({ title: "Lien copié", description: fullPublicUrl });
              }}
              className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] p-4 text-white transition flex items-center gap-3 text-left"
            >
              <Sparkles className="w-5 h-5 text-emerald-300" />
              <span className="text-sm">Copier le lien public</span>
            </button>
            <Link
              to={success.contractor_id ? `/admin/contractors/${success.contractor_id}` : "/admin/contractors"}
              className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.07] p-4 text-white transition flex items-center gap-3"
            >
              <Shield className="w-5 h-5 text-emerald-300" />
              <span className="text-sm">Ouvrir la fiche CRM</span>
            </Link>
            <Link
              to={`/alex?test_contractor_id=${success.contractor_id ?? ""}&test_city=${encodeURIComponent(city)}&test_category=${encodeURIComponent(categories[0] ?? "")}`}
              className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 hover:bg-emerald-500/15 p-4 text-white transition flex items-center gap-3"
            >
              <Sparkles className="w-5 h-5 text-emerald-300" />
              <span className="text-sm font-semibold">Tester dans Alex</span>
            </Link>
          </div>

          <button
            onClick={() => {
              setSuccess(null);
              setBusinessName("");
              setPhone("");
              setCategories([]);
              setPhotoUrls([]);
              setLogoUrl(null);
              setAdminConfirmed(false);
            }}
            className="mt-6 w-full rounded-xl border border-white/10 bg-transparent hover:bg-white/[0.04] p-3 text-white/70 text-sm transition"
          >
            Créer un autre entrepreneur
          </button>
        </motion.div>
      </AdminLayout>
    );
  }

  // ---- form screen ----
  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto pb-32">
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40">UNPRO Admin · Activation manuelle</p>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Créer une fiche entrepreneur</h1>
            <p className="text-sm text-white/60 mt-1">
              Premium · 1 an actif · Profil public généré · CRM activé
            </p>
          </div>

          {/* Live AIPP */}
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 flex items-center gap-3">
            <Award className="w-5 h-5 text-amber-300" />
            <div>
              <div className="text-xs text-amber-200/70 uppercase tracking-widest">Score AIPP</div>
              <div className="text-2xl font-bold text-white leading-none">{aipp.score}</div>
            </div>
            <Badge className="bg-amber-400/20 text-amber-200 border-amber-300/40">{aipp.badge}</Badge>
          </div>
        </header>

        <div className="grid gap-5">
          {/* SECTION 1 — Infos entreprise */}
          <Section title="1 · Infos entreprise" icon={<Sparkles className="w-4 h-4 text-white/60" />}>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70">Nom affiché *</Label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">Nom légal</Label>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">Téléphone *</Label>
                <PhoneInput value={phone} onChange={setPhone} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">Site web</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className="bg-black/30 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">Ville principale *</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-white/70">Zones desservies (séparées par virgule)</Label>
                <Input value={serviceAreas} onChange={(e) => setServiceAreas(e.target.value)} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">Langues parlées</Label>
                <Input value={languages} onChange={(e) => setLanguages(e.target.value)} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">Années d'expérience</Label>
                <Input type="number" value={years} onChange={(e) => setYears(Number(e.target.value || 0))} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">N° TPS</Label>
                <Input value={tps} onChange={(e) => setTps(e.target.value)} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">N° TVQ</Label>
                <Input value={tvq} onChange={(e) => setTvq(e.target.value)} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">RBQ</Label>
                <Input value={rbq} onChange={(e) => setRbq(e.target.value)} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">NEQ</Label>
                <Input value={neq} onChange={(e) => setNeq(e.target.value)} className="bg-black/30 border-white/10 text-white" />
              </div>
            </div>
          </Section>

          {/* SECTION 2 — Catégories */}
          <Section title="2 · Catégories" icon={<Zap className="w-4 h-4 text-white/60" />}>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    className={cn(
                      "px-3 py-1.5 rounded-full border text-sm transition",
                      active
                        ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/40"
                        : "bg-white/[0.03] text-white/70 border-white/10 hover:bg-white/[0.06]",
                    )}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* SECTION 3 — Branding */}
          <Section title="3 · Branding" icon={<ImageIcon className="w-4 h-4 text-white/60" />}>
            <div className="grid md:grid-cols-3 gap-3">
              <UploadCard label="Logo" url={logoUrl} uploading={uploading === "logo"}
                onPick={(f) => handleUpload(f, "logo")} />
              <UploadCard label="Bannière couverture" url={coverUrl} uploading={uploading === "cover"}
                onPick={(f) => handleUpload(f, "cover")} />
              <div className="rounded-xl border border-dashed border-white/10 p-3">
                <Label className="text-white/70">Portfolio (max 10)</Label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="block w-full text-xs text-white/60 mt-2 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/15"
                  onChange={async (e) => {
                    const files = Array.from(e.target.files ?? []).slice(0, 10 - photoUrls.length);
                    for (const f of files) await handleUpload(f, "photo");
                    e.target.value = "";
                  }}
                />
                {photoUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    {photoUrls.map((u, i) => (
                      <img key={i} src={u} alt="" className="w-full aspect-square object-cover rounded-md border border-white/10" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* SECTION 4 — Marketing IA */}
          <Section title="4 · Profil marketing IA" icon={<Sparkles className="w-4 h-4 text-white/60" />}>
            <div className="grid gap-3">
              <div>
                <Label className="text-white/70">Bio courte</Label>
                <Textarea value={shortBio} onChange={(e) => setShortBio(e.target.value)} rows={2} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-white/70">Bio premium</Label>
                <Textarea value={premiumBio} onChange={(e) => setPremiumBio(e.target.value)} rows={4} className="bg-black/30 border-white/10 text-white" />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-white/70">Pourquoi nous choisir</Label>
                  <Textarea value={whyChoose} onChange={(e) => setWhyChoose(e.target.value)} rows={3} className="bg-black/30 border-white/10 text-white" />
                </div>
                <div>
                  <Label className="text-white/70">Garantie offerte</Label>
                  <Textarea value={warranty} onChange={(e) => setWarranty(e.target.value)} rows={3} className="bg-black/30 border-white/10 text-white" />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-3 items-center">
                <div>
                  <Label className="text-white/70">Délais moyens</Label>
                  <Input value={leadTime} onChange={(e) => setLeadTime(e.target.value)} className="bg-black/30 border-white/10 text-white" />
                </div>
                <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2">
                  <Label className="text-white/70">Soumission gratuite</Label>
                  <Switch checked={freeQuote} onCheckedChange={setFreeQuote} />
                </div>
              </div>
              <Button type="button" variant="outline" onClick={handleAIGenerate} className="w-fit border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]">
                <Sparkles className="w-4 h-4 mr-2" /> Générer avec IA
              </Button>
            </div>
          </Section>

          {/* SECTION 5 — Plan & paiement manuel */}
          <Section title="5 · Plan & paiement manuel" icon={<Award className="w-4 h-4 text-white/60" />}>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70">Plan</Label>
                <Select value={planCode} onValueChange={setPlanCode}>
                  <SelectTrigger className="bg-black/30 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANS.map((p) => (
                      <SelectItem key={p.code} value={p.code}>
                        {p.label} — {p.price === 0 ? "Gratuit" : `${(p.price / 100).toFixed(0)} $/mois`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Durée accordée</Label>
                <Select
                  value={String(durationMonths)}
                  onValueChange={(v) => setDurationMonths(Number(v))}
                >
                  <SelectTrigger className="bg-black/30 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 mois</SelectItem>
                    <SelectItem value="3">3 mois</SelectItem>
                    <SelectItem value="6">6 mois</SelectItem>
                    <SelectItem value="12">1 an</SelectItem>
                    <SelectItem value="24">2 ans</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white/70">Montant payé (CAD)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountPaidDollars}
                  onChange={(e) => setAmountPaidDollars(e.target.value)}
                  className="bg-black/30 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Note paiement</Label>
                <Input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="Payé 1 an — Interac"
                  className="bg-black/30 border-white/10 text-white"
                />
              </div>
              <div className="md:col-span-2 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-3 text-sm text-white/80">
                <div className="font-semibold text-emerald-200">
                  Activation {durationMonths >= 12 ? `${Math.floor(durationMonths / 12)} an${durationMonths >= 24 ? "s" : ""}` : `${durationMonths} mois`}
                </div>
                <div className="text-white/60 text-xs mt-1">
                  Statut : <span className="text-emerald-300">Payé</span> · Méthode : Manuel · Montant : {amountPaidDollars || "0"} $ · Note : {paymentNote || "—"}
                </div>
                <div className="text-white/60 text-xs">
                  Expire : {new Date(Date.now() + durationMonths * 30 * 86400000).toLocaleDateString("fr-CA")}
                </div>
              </div>
            </div>
          </Section>

          {/* SECTION 6 — Activation & droits */}
          <Section title="6 · Activation & droits" icon={<Shield className="w-4 h-4 text-white/60" />}>
            <div className="grid md:grid-cols-2 gap-3">
              {(
                [
                  ["visible_public", "Visible public (profil publié)"],
                  ["receives_leads", "Reçoit des rendez-vous"],
                  ["unpro_verified", "Vérifié UNPRO (documenté)"],
                  ["badge_premium", "Badge premium (dépend du plan)"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2">
                  <Label className="text-white/80">{label}</Label>
                  <Switch
                    checked={toggles[key]}
                    onCheckedChange={(v) => setToggles((prev) => ({ ...prev, [key]: v }))}
                  />
                </div>
              ))}
              <div className="md:col-span-2 flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 px-3 py-2">
                <Label className="text-white/80">Priorité de matching</Label>
                <Select value={priorityMatching} onValueChange={(v: any) => setPriorityMatching(v)}>
                  <SelectTrigger className="w-40 bg-black/30 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="elevated">Élevée</SelectItem>
                    <SelectItem value="exclusive">Exclusive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <label className="md:col-span-2 flex items-start gap-3 rounded-md border border-amber-400/30 bg-amber-500/5 px-3 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adminConfirmed}
                  onChange={(e) => setAdminConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-emerald-500"
                />
                <span className="text-sm text-amber-100/90 leading-snug">
                  Je confirme que le paiement a été reçu et que les informations ont été vérifiées.
                </span>
              </label>
            </div>
          </Section>
        </div>
      </div>

      {/* Summary modal */}
      {showSummary && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0A1220] p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-4">Confirmer l'activation</h3>
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              {[
                ["Entreprise", businessName || "—"],
                ["Téléphone", phone || "—"],
                ["Ville", city || "—"],
                ["Catégories", categories.join(", ") || "—"],
                ["Plan", selectedPlan.label],
                ["Durée", `${durationMonths} mois`],
                ["Montant payé", `${amountPaidDollars || "0"} $ CAD`],
                ["Priorité matching", priorityMatching],
                ["Visible public", toggles.visible_public ? "Oui" : "Non"],
                ["Reçoit RDV", toggles.receives_leads ? "Oui" : "Non"],
                ["Vérifié UNPRO", toggles.unpro_verified ? "Oui" : "Non"],
                ["Badge premium", toggles.badge_premium ? "Oui" : "Non"],
              ].map(([k, v]) => (
                <>
                  <dt className="text-white/50">{k}</dt>
                  <dd className="text-white text-right">{v as string}</dd>
                </>
              ))}
            </dl>
            <div className="mt-5 flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setShowSummary(false)} className="text-white/70">
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Activer et publier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#060B14]/90 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-white/60 hidden sm:block">
            <span className="text-white">{businessName || "Nouvelle fiche"}</span> · {city || "—"} ·{" "}
            <span className="text-amber-300">AIPP {aipp.score}</span> · Plan{" "}
            <span className="text-emerald-300">{selectedPlan.label}</span>
          </div>
          <Button
            onClick={() => setShowSummary(true)}
            disabled={submitting || !canSubmit}
            className="ml-auto bg-emerald-500 hover:bg-emerald-400 text-black font-semibold disabled:opacity-40"
            title={!adminConfirmed ? "Cochez la confirmation admin" : ""}
          >
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
            Activer et publier l'entrepreneur
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

const UploadCard = ({
  label,
  url,
  uploading,
  onPick,
}: {
  label: string;
  url: string | null;
  uploading: boolean;
  onPick: (f: File) => void;
}) => (
  <div className="rounded-xl border border-dashed border-white/10 p-3">
    <Label className="text-white/70">{label}</Label>
    {url ? (
      <img src={url} alt={label} className="mt-2 w-full aspect-video object-cover rounded-md border border-white/10" />
    ) : (
      <div className="mt-2 flex items-center justify-center w-full aspect-video rounded-md border border-white/10 bg-black/30 text-white/30">
        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
      </div>
    )}
    <input
      type="file"
      accept="image/*"
      className="block w-full text-xs text-white/60 mt-2 file:mr-2 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-white/10 file:text-white hover:file:bg-white/15"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onPick(f);
        e.target.value = "";
      }}
    />
  </div>
);

export default PageAdminCreateContractorManual;
