/**
 * « Des projets qui donnent des idées » — exactement les 10 dernières
 * réalisations APPROUVÉES (tri par date, aucun classement payant).
 * Réalisation déclarée par l'entreprise ≠ qualifications vérifiées.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ImageIcon, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { fetchInspirationFeed, FREE_PORTFOLIO_PATH, type FeedProject } from "@/lib/portfolio/freePortfolio";
import { CLARA_PROJECT_INSPIRATION_EVENT, type ProjectInspiration } from "@/services/clara/claraProjectInspiration";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

function sessionKey(): string {
  try {
    const k = "unpro_inspiration_sid";
    let v = sessionStorage.getItem(k);
    if (!v) { v = crypto.randomUUID(); sessionStorage.setItem(k, v); }
    return v;
  } catch { return "nosession"; }
}

export function openClaraWithProject(p: FeedProject) {
  const detail: ProjectInspiration = {
    projectId: p.id, title: p.title, serviceName: p.service_name, city: p.city,
    companyName: p.company_name, authorVerified: p.author_verified,
  };
  void logFunnelEvent({
    event_type: "project_viewed", step: "home_inspiration",
    metadata: { project_id: p.id, service: p.service_name, author_verified: p.author_verified },
    dedupe_key: `project_viewed:${p.id}:${sessionKey()}`,
  });
  window.dispatchEvent(new CustomEvent(CLARA_PROJECT_INSPIRATION_EVENT, { detail }));
  const field = document.querySelector<HTMLTextAreaElement>("#clara-home textarea");
  field?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function ProjectCard({ p, fr }: { p: FeedProject; fr: boolean }) {
  const cover = p.photoUrls[0];
  return (
    <article className="flex flex-col overflow-hidden rounded-[28px] border border-border bg-card text-card-foreground shadow-sm">
      <div className="relative aspect-[4/3] bg-muted">
        {cover ? (
          <img src={cover} alt={`${p.title}${p.service_name ? ` — ${p.service_name}` : ""}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-8 w-8" aria-hidden="true" /></div>
        )}
        {p.photoUrls.length > 1 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground">
            {p.photoUrls.length} {fr ? "photos" : "photos"}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{[p.service_name, p.city].filter(Boolean).join(" · ")}</p>
        <h3 className="text-base font-semibold leading-snug">{p.title}</h3>
        <p className="text-sm text-muted-foreground">
          {p.company_name ?? (fr ? "Entreprise non affichée" : "Business not displayed")}
        </p>
        <p className="text-xs text-muted-foreground">
          {fr ? "Réalisation déclarée par l’entreprise." : "Project declared by the business."}
          {p.author_verified && (
            <span className="ml-1 inline-flex items-center gap-1 font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{fr ? "Entreprise vérifiée par UNPRO" : "Business verified by UNPRO"}
            </span>
          )}
        </p>
        <Button className="mt-auto min-h-11 w-full whitespace-normal" onClick={() => openClaraWithProject(p)}>
          {fr ? "Je veux un projet semblable" : "I want a similar project"}
        </Button>
      </div>
    </article>
  );
}

export default function SectionProjectInspiration() {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const feed = useQuery({ queryKey: ["portfolio-inspiration-feed"], queryFn: fetchInspirationFeed, staleTime: 5 * 60_000, retry: 1 });
  const cta = (
    <Link to={FREE_PORTFOLIO_PATH} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      {fr ? "Entrepreneur? Publiez vos réalisations gratuitement" : "Contractor? Publish your projects for free"}
    </Link>
  );

  return (
    <section aria-labelledby="inspiration-title" className="mx-auto w-full max-w-6xl px-5 py-10">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="inspiration-title" className="text-2xl font-semibold text-foreground">{fr ? "Des projets qui donnent des idées" : "Projects that spark ideas"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{fr ? "Les dernières réalisations approuvées, par date de publication." : "The latest approved projects, by publication date."}</p>
        </div>
        {cta}
      </div>

      {feed.isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label={fr ? "Chargement des réalisations" : "Loading projects"}>
          {[0, 1, 2].map((i) => <div key={i} className="h-80 animate-pulse rounded-[28px] bg-muted" />)}
        </div>
      )}

      {feed.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[28px] border border-border bg-card p-5 text-sm text-foreground">
          <span>{fr ? "Les réalisations n’ont pas pu être chargées." : "Projects could not be loaded."}</span>
          <Button variant="outline" size="sm" onClick={() => feed.refetch()} className="min-h-11"><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />{fr ? "Réessayer" : "Retry"}</Button>
        </div>
      )}

      {feed.isSuccess && feed.data.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-border bg-card p-6 text-center">
          <p className="text-base font-medium text-foreground">{fr ? "Les premières réalisations arrivent bientôt." : "The first projects are coming soon."}</p>
          <p className="mt-1 text-sm text-muted-foreground">{fr ? "Chaque projet est vérifié par notre équipe avant d’être affiché." : "Each project is reviewed by our team before it appears."}</p>
          <div className="mt-3 flex justify-center">{cta}</div>
        </div>
      )}

      {feed.isSuccess && feed.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {feed.data.map((p) => <ProjectCard key={p.id} p={p} fr={fr} />)}
        </div>
      )}
    </section>
  );
}
