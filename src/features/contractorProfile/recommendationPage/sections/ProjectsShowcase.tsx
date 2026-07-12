/**
 * ProjectsShowcase — Before/after and completed projects.
 */
interface Project {
  id: string;
  title: string;
  city: string | null;
  year: number | null;
  description: string | null;
  before_url: string | null;
  after_url: string | null;
  photos: any;
}

interface Props {
  projects: Project[];
  businessName: string;
}

export default function ProjectsShowcase({ projects, businessName }: Props) {
  if (!projects.length) return null;
  return (
    <section aria-labelledby="projects-heading" className="space-y-3">
      <h2 id="projects-heading" className="text-lg font-semibold text-foreground">
        Réalisations
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {projects.map((p) => (
          <article
            key={p.id}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            {(p.before_url || p.after_url) && (
              <div className="grid grid-cols-2">
                {p.before_url && (
                  <figure className="aspect-square bg-muted relative">
                    <img
                      src={p.before_url}
                      alt={`Avant — ${p.title}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-background/80 text-foreground">
                      AVANT
                    </span>
                  </figure>
                )}
                {p.after_url && (
                  <figure className="aspect-square bg-muted relative">
                    <img
                      src={p.after_url}
                      alt={`Après — ${p.title}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute top-2 left-2 text-[10px] px-1.5 py-0.5 rounded bg-primary/90 text-primary-foreground">
                      APRÈS
                    </span>
                  </figure>
                )}
              </div>
            )}
            <div className="p-4 space-y-1">
              <h3 className="font-semibold text-foreground">{p.title}</h3>
              <p className="text-xs text-muted-foreground">
                {[p.city, p.year].filter(Boolean).join(" · ")}
              </p>
              {p.description && (
                <p className="text-sm text-foreground/80 mt-1.5">{p.description}</p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
