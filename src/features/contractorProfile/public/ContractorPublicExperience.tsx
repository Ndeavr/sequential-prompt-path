import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Images,
  MapPin,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ProfessionalVerificationsCard from "@/components/compliance/ProfessionalVerificationsCard";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAuth } from "@/hooks/useAuth";
import {
  useContractorPublicProjects,
  useContractorReviewSources,
  useHomeownerContractorCompatibility,
} from "@/hooks/useContractorPublicPage";
import { usePublicContractorReviews } from "@/hooks/usePublicContractors";
import type { Json } from "@/integrations/supabase/types";

type ContractorRecord = {
  id?: string;
  business_name?: string | null;
  specialty?: string | null;
  city?: string | null;
  admin_verified?: boolean | null;
  public_status?: string | null;
  logo_url?: string | null;
  portfolio_urls?: string[] | null;
  profession_code?: string | null;
  neq?: string | null;
  rbq_number?: string | null;
  description?: string | null;
  legal_name?: string | null;
  website?: string | null;
  phone?: string | null;
  rating?: number | null;
  review_count?: number | null;
};

type ProfileData = ContractorRecord & {
  contractor?: ContractorRecord;
  projects?: Array<{
    id: string;
    title?: string | null;
    city?: string | null;
    year?: number | null;
    description?: string | null;
    before_url?: string | null;
    after_url?: string | null;
    photos?: Json;
  }>;
  services?: Array<{ service_name_fr?: string | null }>;
  service_areas?: Array<{ city_name?: string | null }>;
  media?: Array<{ media_type?: string | null; public_url?: string | null; title?: string | null; description?: string | null; alt_text?: string | null }>;
  public_page?: { custom_sections?: Json | null } | null;
};

type Props = {
  profileData: ProfileData;
  compact?: boolean;
};

function publicWebsite(value?: string | null) {
  if (!value) return null;
  try { const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`); return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}

const RAW_PUBLIC = /^https:\/\/raw\.githubusercontent\.com\/Ndeavr\/sequential-prompt-path\/[^/]+\/public(\/.+)$/;
// Native raster files extracted from the brand's official site (same artwork, crisp).
const NATIVE_ASSETS: Record<string, string> = {
  "/brands/isr/isr-logo-square.svg": "/brands/isr/isr-logo-official.png",
  "/brands/isr/cca-montreal-rive-nord-2027.svg": "/brands/isr/cca-montreal-rive-nord-2027.png",
};
export function resolvePublicAsset(url?: string | null) {
  if (!url) return null;
  const path = url.match(RAW_PUBLIC)?.[1] ?? (url.startsWith("/") ? url : null);
  if (!path) return url;
  return NATIVE_ASSETS[path] ?? path;
}

const SERVICE_HINTS: Array<[RegExp, string]> = [
  [/fibre de verre|isolation d.entretoit/i, "Ajout d’isolant soufflé dans l’entretoit pour réduire les pertes de chaleur."],
  [/ventilation|déflecteur/i, "Circulation d’air sous le toit pour limiter condensation et barrages de glace."],
  [/étanchéité|calfeutrage/i, "Colmatage des fuites d’air entre la maison et l’entretoit."],
  [/moisissure/i, "Traitement des surfaces touchées dans l’entretoit."],
  [/vermiculite/i, "Retrait encadré de l’ancien isolant vermiculite."],
  [/soffite/i, "Dégagement des soffites pour rétablir l’entrée d’air."],
];
const serviceHint = (name: string) => SERVICE_HINTS.find(([re]) => re.test(name))?.[1] ?? null;

const tabs = [
  { id: "overview", label: "Aperçu", icon: Sparkles },
  { id: "services", label: "Services", icon: Wrench },
  { id: "territory", label: "Territoire", icon: MapPin },
  { id: "projects", label: "Réalisations", icon: Images },
  { id: "verifications", label: "Vérifications", icon: ShieldCheck },
  { id: "reviews", label: "Avis", icon: MessageCircleMore },
] as const;

export default function ContractorPublicExperience({ profileData, compact = false }: Props) {
  const contractor = profileData.contractor ?? profileData;
  const contractorId = contractor.id as string | undefined;
  // Membership is explicitly granted and dated in the public-page metadata;
  // contractor.created_at is a record creation date, not proof of admission.
  const customSections = profileData.public_page?.custom_sections;
  const membership = Array.isArray(customSections)
    ? customSections.find((section) => section && typeof section === "object" && !Array.isArray(section) && section.type === "membership")
    : null;
  const memberSinceRaw = typeof membership?.member_since === "string" ? membership.member_since : null;
  const memberSince = memberSinceRaw && /^\d{4}-\d{2}-\d{2}$/.test(memberSinceRaw)
    ? new Date(`${memberSinceRaw}T12:00:00Z`).toLocaleDateString("fr-CA", {
        day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
      })
    : null;
  const membershipLabel = typeof membership?.membership_label === "string" ? membership.membership_label : "Membre UNPRO";
  const website = publicWebsite(contractor.website);
  const phone = contractor.phone?.replace(/[^+\d]/g, "");
  const services = profileData.services ?? [];
  const areas = profileData.service_areas ?? [];
  const media = useMemo(() => profileData.media ?? [], [profileData.media]);
  const { user } = useAuth();
  const clara = useAlexVoice();
  const { data: compatibility } = useHomeownerContractorCompatibility(contractorId);
  const { data: reviews = [] } = usePublicContractorReviews(contractorId);
  const { data: reviewSources = [] } = useContractorReviewSources(contractorId);
  const { data: queriedProjects = [] } = useContractorPublicProjects(contractorId);
  const projects = profileData.projects ?? queriedProjects;
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("overview");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const [brokenAwards, setBrokenAwards] = useState<Record<number, boolean>>({});
  const [logoBroken, setLogoBroken] = useState(false);
  const logoUrl = resolvePublicAsset(contractor.logo_url);
  const awards = media.filter((item) => item.media_type === "award" && item.public_url).map((item) => ({ ...item, public_url: resolvePublicAsset(item.public_url) }));
  const projectMedia = media.filter((item) => item.media_type !== "award");
  const cover = projectMedia.find((item) => item.public_url)?.public_url ?? contractor.portfolio_urls?.find(Boolean) ?? null;
  const gallery = useMemo(() => {
    const mediaUrls = projectMedia.map((item) => item.public_url).filter(Boolean);
    return Array.from(new Set([...mediaUrls, ...(contractor.portfolio_urls ?? [])]));
  }, [contractor.portfolio_urls, projectMedia]);
  const initials = (contractor.business_name ?? "UN")
    .split(/\s+/)
    .slice(0, 2)
    .map((word: string) => word[0])
    .join("")
    .toUpperCase();
  const googleSource = reviewSources.find((source) => source.source_name.toLowerCase().includes("google"));
  const projectImages = Array.from(new Set(projects.flatMap((project) => [project.after_url, project.before_url, ...(Array.isArray(project.photos) ? project.photos.filter((p): p is string => typeof p === "string") : [])]).filter((u): u is string => !!u).concat(gallery as string[]))).slice(0, 9);
  const visibleTabs = tabs.filter((tab) => tab.id !== "projects" || projectImages.length > 0);
  const serviceNames = (services.length ? services.map((service) => service.service_name_fr) : [contractor.specialty]).filter((service): service is string => !!service);
  const cityNames = Array.from(new Set((areas.length ? areas.map((area) => area.city_name) : [contractor.city]).filter((city): city is string => !!city)));
  const placeId = googleSource?.profile_url?.match(/query_place_id=([\w-]+)/)?.[1] ?? null;
  const googleReviewsUrl = placeId ? `https://search.google.com/local/reviews?placeid=${placeId}` : googleSource?.profile_url ?? null;
  const unproRating = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : null;
  const hasGoogleAggregate = !!googleSource && contractor.rating != null && (contractor.review_count ?? 0) > 0;

  const selectTab = (id: (typeof tabs)[number]["id"]) => {
    setActiveTab(id);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCompatibility = () => {
    if (compatibility || !contractorId) return;
    clara.openAlex(
      "contractor_compatibility",
      `Calculer la compatibilité avec ${contractor.business_name}. Recueillir seulement les renseignements manquants pour le projet actif. Entrepreneur: ${contractorId}`,
    );
  };

  const bookingPath = user ? `/dashboard/book/${contractorId}` : `/login?redirect=${encodeURIComponent(`/dashboard/book/${contractorId}`)}`;

  return (
    <article className={`alex-immersive min-h-full bg-background text-foreground ${compact ? "text-[13px]" : ""}`}>
      <section ref={(node) => { sectionRefs.current.overview = node; }} className="scroll-mt-28">
        <div className={`relative overflow-hidden ${compact ? "h-52" : cover ? "h-[280px] sm:h-[380px]" : "h-auto min-h-44 sm:min-h-52"}`}>
          {cover ? (
            <img src={cover} alt={`Réalisation de ${contractor.business_name}`} className="h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#152443] via-[#0c1629] to-background" aria-hidden="true" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/35 to-background" aria-hidden="true" />
          <div className={`${cover || compact ? "absolute inset-x-0 bottom-0" : "relative pt-8"} px-4 pb-5 sm:px-6`}>
            <div className="flex items-end gap-3">
              <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary/40 bg-card shadow-glow sm:h-20 sm:w-20">
                {logoUrl && !logoBroken ? (
                  <img src={logoUrl} alt={`Logo ${contractor.business_name}`} onError={() => setLogoBroken(true)} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-primary">{initials}</span>
                )}
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="text-xl font-bold leading-tight text-text-strong sm:text-3xl">{contractor.business_name}</h1>
                {contractor.specialty && <p className="mt-1 text-sm text-text-secondary">{contractor.specialty}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-text-muted-2">
                  {contractor.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{contractor.city}</span>}
                  {memberSince && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{membershipLabel} depuis le {memberSince}</span>}
                  {contractor.public_status === "verified_active" ? (
                    <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" />Vérifié par UNPRO</span>
                  ) : contractor.public_status === "published_pending_verification" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-text-secondary">Profil publié — vérification en cours</span>
                  ) : null}
                </div>
              </div>
            </div>
            {!compact && contractorId && <Button asChild className="mt-4 h-11 w-full rounded-button sm:w-auto"><Link to={bookingPath}><CalendarDays className="h-4 w-4" />Prendre rendez-vous</Link></Button>}
          </div>
        </div>
      </section>

      <nav aria-label="Sections du profil" className="sticky top-14 z-20 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-y border-border/70 bg-background/95 backdrop-blur-xl">
        <div className="flex min-w-max px-2">
          {visibleTabs.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              type="button"
              variant="ghost"
              onClick={() => selectTab(id)}
              aria-current={activeTab === id ? "page" : undefined}
              className={`relative h-16 min-w-[76px] flex-col gap-1 rounded-none px-2 text-[10px] ${activeTab === id ? "text-primary" : "text-text-muted-2"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
              {activeTab === id && <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary shadow-glow" />}
            </Button>
          ))}
        </div>
      </nav>

      <div className="space-y-4 px-4 pt-5 pb-[calc(8rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-8">
        {(contractor.description || contractor.legal_name || website || phone) && <section className="rounded-xl border border-border bg-card p-4" aria-label="À propos"><h2 className="font-semibold">À propos de {contractor.business_name}</h2>{contractor.description && <p className="mt-2 whitespace-pre-line break-words text-sm text-text-secondary">{contractor.description}</p>}{contractor.legal_name && <p className="mt-2 text-xs text-muted-foreground">Nom légal : {contractor.legal_name}</p>}<div className="mt-3 flex flex-wrap gap-3 text-sm">{website && <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">Site web de l’entreprise<ExternalLink className="h-3 w-3" /></a>}{phone && <a href={`tel:${phone}`} className="text-primary underline">{contractor.phone}</a>}</div></section>}
        {awards.length > 0 && <section className="rounded-xl border border-border bg-card p-4" aria-label="Distinctions reçues">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-text-strong"><Award className="h-4 w-4 text-amber-500" />Distinctions</h2>
          {awards.map((award, index) => <div key={`${award.public_url}-${index}`} className="flex items-center gap-4">
            {brokenAwards[index] ? <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted"><Award className="h-7 w-7 text-amber-500" aria-hidden="true" /></span> : <img src={award.public_url!} alt={award.alt_text || award.title || "Distinction externe"} onError={() => setBrokenAwards((prev) => ({ ...prev, [index]: true }))} className="h-24 w-20 shrink-0 object-contain" loading="lazy" />}
            <div className="min-w-0"><p className="font-medium text-sm text-text-strong">{award.title || "Distinction reçue"}</p><p className="mt-1 text-xs text-text-secondary">{award.description || "Reconnaissance d’un organisme externe"}</p></div>
          </div>)}
        </section>}
        <section aria-labelledby="compatibility-title">
          {compatibility ? (
            <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 p-4">
              <span className="text-2xl font-bold text-text-strong">{`${compatibility.score}%`}</span>
              <div><h2 id="compatibility-title" className="font-semibold text-text-strong">Compatibilité avec votre projet</h2><p className="text-xs text-text-secondary">Calculé pour votre projet actif selon les informations disponibles.</p></div>
            </div>
          ) : (
            <Button type="button" variant="outline" onClick={openCompatibility} className="h-12 w-full justify-start gap-2 whitespace-normal rounded-button border-primary/40 bg-primary/10 text-left text-text-strong">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" /><span id="compatibility-title">Est-ce le bon pro pour mon projet ?</span>
            </Button>
          )}
        </section>

        <section ref={(node) => { sectionRefs.current.services = node; }} className="scroll-mt-32 rounded-xl border border-border bg-card p-4" aria-labelledby="services-title">
          <h2 id="services-title" className="flex items-center gap-2 font-semibold text-text-strong"><Wrench className="h-4 w-4 text-primary" />Services</h2>
          {serviceNames.length ? <ul className="mt-3 divide-y divide-border/70">
            {serviceNames.map((service) => (
              <li key={service} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div><p className="text-sm font-medium text-text-strong">{service}</p>{serviceHint(service) && <p className="mt-0.5 text-xs text-text-secondary">{serviceHint(service)}</p>}</div>
              </li>
            ))}
          </ul> : <p className="mt-3 text-sm text-text-muted-2">Aucun service publié.</p>}
        </section>

        <section ref={(node) => { sectionRefs.current.territory = node; }} className="scroll-mt-32 rounded-xl border border-border bg-card p-4" aria-labelledby="territory-title">
          <h2 id="territory-title" className="flex items-center gap-2 font-semibold text-text-strong"><MapPin className="h-4 w-4 text-primary" />Territoire</h2>
          {placeId && <iframe title={`Emplacement de ${contractor.business_name} sur Google Maps`} src={`https://www.google.com/maps?q=place_id:${placeId}&z=9&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="mt-3 h-52 w-full rounded-lg border border-border" />}
          {placeId && <p className="mt-1 text-[11px] text-text-muted-2">Carte : emplacement de l’entreprise (Google). Les villes desservies sont déclarées par l’entreprise.</p>}
          {cityNames.length ? <details className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
            <summary className="cursor-pointer text-sm font-medium text-text-strong">{cityNames.length} ville{cityNames.length > 1 ? "s" : ""} desservie{cityNames.length > 1 ? "s" : ""}</summary>
            <p className="mt-2 text-sm text-text-secondary">{cityNames.join(" · ")}</p>
          </details> : <p className="mt-3 text-sm text-text-muted-2">Aucun territoire publié.</p>}
        </section>

        {projectImages.length > 0 && <section ref={(node) => { sectionRefs.current.projects = node; }} className="scroll-mt-32 rounded-xl border border-border bg-card p-4" aria-labelledby="projects-title">
          <h2 id="projects-title" className="flex items-center gap-2 font-semibold text-text-strong"><Images className="h-4 w-4 text-primary" />Réalisations</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {projectImages.map((url, index) => (
              <img key={`${url}-${index}`} src={url} alt={`Réalisation ${index + 1} de ${contractor.business_name}`} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
            ))}
          </div>
        </section>}

        <section ref={(node) => { sectionRefs.current.verifications = node; }} className="scroll-mt-32" aria-label="Vérifications">
          {contractorId && <ProfessionalVerificationsCard contractorId={contractorId} professionCode={contractor.profession_code} businessName={contractor.business_name} neq={contractor.neq} rbqNumber={contractor.rbq_number} className="border-border bg-card" />}
        </section>

        <section ref={(node) => { sectionRefs.current.reviews = node; }} className="scroll-mt-32 rounded-xl border border-border bg-card p-4" aria-labelledby="reviews-title">
          <h2 id="reviews-title" className="flex items-center gap-2 font-semibold text-text-strong"><Star className="h-4 w-4 text-warning" />Consulter les avis</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {reviews.length > 0 && <ReviewSource title="Avis UNPRO" rating={unproRating} count={reviews.length} provenance="Avis publiés sur UNPRO" />}
            {googleReviewsUrl ? (
              <ReviewSource
                title="Avis Google"
                rating={hasGoogleAggregate ? contractor.rating : null}
                count={hasGoogleAggregate ? contractor.review_count : 0}
                provenance={googleSource?.sync_status === "manual_snapshot" ? "Source : Google · relevé manuel" : "Source : fiche Google"}
                href={googleReviewsUrl}
              />
            ) : reviews.length === 0 && <p className="text-sm text-text-muted-2">Les avis seront affichés dès qu’une source publique sera reliée.</p>}
          </div>
          {reviews.length > 0 && (
            <div className="mt-4 space-y-3">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex items-center justify-between gap-3"><strong className="text-sm text-text-strong">{review.title || "Avis UNPRO"}</strong><span className="text-xs text-text-muted-2">{review.rating}/5</span></div>
                  {review.content && <p className="mt-2 text-sm text-text-secondary">{review.content}</p>}
                  <p className="mt-2 text-[11px] text-text-muted-2">Provenance : UNPRO{review.verification_status === "verified" ? " · Vérifié" : ""}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <Button asChild size="lg" className="h-12 w-full rounded-button">
          <Link to={bookingPath}><CalendarDays className="h-4 w-4" />Planifier un rendez-vous</Link>
        </Button>
      </div>
    </article>
  );
}

function ReviewSource({ title, rating, count, provenance, href }: { title: string; rating: number | null; count: number; provenance: string; href?: string | null }) {
  return (
    <div className="rounded-lg border border-border bg-muted/35 p-3">
      <div className="flex items-center justify-between gap-2">
        <strong className="text-sm text-text-strong">{title}</strong>
      </div>
      {rating != null && count > 0 && <p className="mt-2 text-lg font-bold text-text-strong">{rating.toFixed(1)} <span className="text-xs font-normal text-text-muted-2">· {count} avis</span></p>}
      {href && <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary underline">Lire les avis sur Google<ExternalLink className="h-3.5 w-3.5" /></a>}
      <p className="mt-1 text-[11px] text-text-muted-2">{provenance}</p>
    </div>
  );
}