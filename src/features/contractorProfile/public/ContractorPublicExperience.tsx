import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
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
import UnproLogo from "@/components/brand/UnproLogo";
import ProfessionalVerificationsCard from "@/components/compliance/ProfessionalVerificationsCard";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAuth } from "@/hooks/useAuth";
import {
  useContractorPublicProjects,
  useContractorReviewSources,
  useHomeownerContractorCompatibility,
} from "@/hooks/useContractorPublicPage";
import { usePublicContractorReviews } from "@/hooks/usePublicContractors";

type ContractorRecord = {
  id?: string;
  business_name?: string | null;
  specialty?: string | null;
  city?: string | null;
  admin_verified?: boolean | null;
  logo_url?: string | null;
  portfolio_urls?: string[] | null;
  profession_code?: string | null;
  neq?: string | null;
  rating?: number | null;
  review_count?: number | null;
};

type ProfileData = ContractorRecord & {
  contractor?: ContractorRecord;
  services?: Array<{ service_name_fr?: string | null }>;
  service_areas?: Array<{ city_name?: string | null }>;
  media?: Array<{ public_url?: string | null }>;
};

type Props = {
  profileData: ProfileData;
  compact?: boolean;
};

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
  const services = profileData.services ?? [];
  const areas = profileData.service_areas ?? [];
  const media = useMemo(() => profileData.media ?? [], [profileData.media]);
  const { user } = useAuth();
  const clara = useAlexVoice();
  const { data: compatibility } = useHomeownerContractorCompatibility(contractorId);
  const { data: reviews = [] } = usePublicContractorReviews(contractorId);
  const { data: reviewSources = [] } = useContractorReviewSources(contractorId);
  const { data: projects = [] } = useContractorPublicProjects(contractorId);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("overview");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const cover = media.find((item) => item.public_url)?.public_url ?? contractor.portfolio_urls?.find(Boolean) ?? null;
  const gallery = useMemo(() => {
    const mediaUrls = media.map((item) => item.public_url).filter(Boolean);
    return Array.from(new Set([...mediaUrls, ...(contractor.portfolio_urls ?? [])]));
  }, [contractor.portfolio_urls, media]);
  const initials = (contractor.business_name ?? "UN")
    .split(/\s+/)
    .slice(0, 2)
    .map((word: string) => word[0])
    .join("")
    .toUpperCase();
  const googleSource = reviewSources.find((source) => source.source_name.toLowerCase().includes("google"));
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
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/70 bg-background/90 px-4 backdrop-blur-xl">
        <UnproLogo size={112} tone="dark" className="h-6 w-auto" />
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary-tint">
          Profil public UNPRO
        </Badge>
      </header>

      <section ref={(node) => { sectionRefs.current.overview = node; }} className="scroll-mt-28">
        <div className={`relative overflow-hidden ${compact ? "h-56" : "h-[310px] sm:h-[380px]"}`}>
          {cover ? (
            <img src={cover} alt={`Réalisation de ${contractor.business_name}`} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-muted" aria-hidden="true" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/35 to-background" />
          <div className="absolute inset-x-0 bottom-0 px-4 pb-5 sm:px-6">
            <div className="flex items-end gap-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-primary/50 bg-card shadow-glow sm:h-20 sm:w-20">
                {contractor.logo_url ? (
                  <img src={contractor.logo_url} alt={`Logo ${contractor.business_name}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-primary">{initials}</span>
                )}
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="text-xl font-bold leading-tight text-text-strong sm:text-3xl">{contractor.business_name}</h1>
                {contractor.specialty && <p className="mt-1 text-sm text-text-secondary">{contractor.specialty}</p>}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-text-muted-2">
                  {contractor.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{contractor.city}</span>}
                  {contractor.admin_verified && <span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3" />Entreprise vérifiée</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav aria-label="Sections du profil" className="sticky top-14 z-20 overflow-x-auto border-y border-border/70 bg-background/95 backdrop-blur-xl">
        <div className="flex min-w-max px-2">
          {tabs.map(({ id, label, icon: Icon }) => (
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

      <div className="space-y-4 px-4 py-5 sm:px-6">
        <section aria-labelledby="compatibility-title">
          <Button
            type="button"
            variant="ghost"
            onClick={openCompatibility}
            disabled={!!compatibility}
            className="group h-auto w-full justify-start whitespace-normal rounded-xl border border-primary/30 bg-primary/10 p-4 text-left transition-transform duration-300 enabled:hover:-translate-y-0.5 enabled:hover:bg-primary/10 disabled:cursor-default disabled:opacity-100"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-primary/30 bg-card shadow-glow">
                <span className="text-2xl font-bold text-text-strong">{compatibility ? `${compatibility.score}%` : "— %"}</span>
              </div>
              <div>
                <h2 id="compatibility-title" className="font-semibold text-text-strong">Score de compatibilité</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {compatibility ? "Calculé pour votre projet actif selon les informations disponibles." : "Appuyez pour afficher votre score"}
                </p>
                {!compatibility && <p className="mt-2 text-xs text-primary-tint">Clara complétera seulement les renseignements manquants.</p>}
              </div>
            </div>
          </Button>
        </section>

        <section ref={(node) => { sectionRefs.current.services = node; }} className="scroll-mt-32 rounded-xl border border-border bg-card p-4" aria-labelledby="services-title">
          <h2 id="services-title" className="flex items-center gap-2 font-semibold text-text-strong"><Wrench className="h-4 w-4 text-primary" />Services</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(services.length ? services.map((service) => service.service_name_fr) : [contractor.specialty]).filter((service): service is string => !!service).map((service) => (
              <Badge key={service} variant="outline" className="border-border bg-muted text-text-secondary">{service}</Badge>
            ))}
            {!contractor.specialty && services.length === 0 && <p className="text-sm text-text-muted-2">Aucun service publié.</p>}
          </div>
        </section>

        <section ref={(node) => { sectionRefs.current.territory = node; }} className="scroll-mt-32 rounded-xl border border-border bg-card p-4" aria-labelledby="territory-title">
          <h2 id="territory-title" className="flex items-center gap-2 font-semibold text-text-strong"><MapPin className="h-4 w-4 text-primary" />Territoire</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(areas.length ? areas.map((area) => area.city_name) : [contractor.city]).filter((city): city is string => !!city).map((city) => (
              <Badge key={city} variant="outline" className="border-border bg-muted text-text-secondary">{city}</Badge>
            ))}
            {!contractor.city && areas.length === 0 && <p className="text-sm text-text-muted-2">Aucun territoire publié.</p>}
          </div>
        </section>

        <section ref={(node) => { sectionRefs.current.projects = node; }} className="scroll-mt-32 rounded-xl border border-border bg-card p-4" aria-labelledby="projects-title">
          <h2 id="projects-title" className="flex items-center gap-2 font-semibold text-text-strong"><Images className="h-4 w-4 text-primary" />Réalisations</h2>
          {(projects.length > 0 || gallery.length > 0) ? (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {projects.flatMap((project) => [project.after_url, project.before_url]).filter(Boolean).concat(gallery).slice(0, 9).map((url, index) => (
                <img key={`${url}-${index}`} src={url as string} alt={`Réalisation ${index + 1} de ${contractor.business_name}`} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
              ))}
            </div>
          ) : <p className="mt-3 text-sm text-text-muted-2">Aucune réalisation publiée.</p>}
        </section>

        <section ref={(node) => { sectionRefs.current.verifications = node; }} className="scroll-mt-32" aria-label="Vérifications">
          {contractorId && <ProfessionalVerificationsCard contractorId={contractorId} professionCode={contractor.profession_code} businessName={contractor.business_name} neq={contractor.neq} className="border-border bg-card" />}
        </section>

        <section ref={(node) => { sectionRefs.current.reviews = node; }} className="scroll-mt-32 rounded-xl border border-border bg-card p-4" aria-labelledby="reviews-title">
          <h2 id="reviews-title" className="flex items-center gap-2 font-semibold text-text-strong"><Star className="h-4 w-4 text-warning" />Consulter les avis</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ReviewSource title="Avis UNPRO" rating={unproRating} count={reviews.length} provenance="Avis publiés sur UNPRO" />
            <ReviewSource
              title="Avis Google"
              rating={hasGoogleAggregate ? contractor.rating : null}
              count={hasGoogleAggregate ? contractor.review_count : 0}
              provenance={googleSource ? "Source : fiche Google liée" : "Source Google non liée"}
              href={googleSource?.profile_url}
            />
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
        {href && <a href={href} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${title}`} className="text-primary"><ExternalLink className="h-4 w-4" /></a>}
      </div>
      {rating != null && count > 0 ? <p className="mt-2 text-lg font-bold text-text-strong">{rating.toFixed(1)} <span className="text-xs font-normal text-text-muted-2">· {count} avis</span></p> : <p className="mt-2 text-sm text-text-muted-2">Aucun avis public disponible.</p>}
      <p className="mt-1 text-[11px] text-text-muted-2">{provenance}</p>
    </div>
  );
}