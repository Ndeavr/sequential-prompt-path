/**
 * Bande visuelle de la landing « Montrez vos réalisations ».
 * Uniquement des projets APPROUVÉS du fil public existant (même RPC et URLs
 * signées que l'accueil). ≥ 4 projets avec photo → défilement doux en boucle
 * (pause survol/focus/toucher, glissement manuel, reduced-motion respecté).
 * 1–3 → cartes fixes. 0 ou erreur → cartes de catégories clairement
 * labellisées « Exemples de travaux à partager » — jamais de fausses photos.
 */
import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bath, Brush, Fence, Hammer, Home, Leaf, PaintRoller, Trees } from "lucide-react";
import { fetchInspirationFeed, type FeedProject } from "@/lib/portfolio/freePortfolio";

export const MARQUEE_MIN = 4;
const SPEED_PX_PER_S = 28;

const EXAMPLES = [
  { icon: Home, fr: "Toiture", en: "Roofing" },
  { icon: Hammer, fr: "Rénovation de cuisine", en: "Kitchen renovation" },
  { icon: Bath, fr: "Salle de bain", en: "Bathroom" },
  { icon: Trees, fr: "Terrasse et patio", en: "Deck and patio" },
  { icon: PaintRoller, fr: "Peinture", en: "Painting" },
  { icon: Leaf, fr: "Aménagement paysager", en: "Landscaping" },
  { icon: Fence, fr: "Clôture", en: "Fence" },
  { icon: Brush, fr: "Entretien saisonnier", en: "Seasonal maintenance" },
];

export function showcaseMode(withPhotos: number): "marquee" | "static" | "examples" {
  if (withPhotos >= MARQUEE_MIN) return "marquee";
  return withPhotos > 0 ? "static" : "examples";
}

function coverOf(p: FeedProject): string | null {
  return p.afterUrl ?? p.photoUrls[0] ?? p.beforeUrl ?? null;
}

function ProjectCard({ p, fr, clone = false }: { p: FeedProject; fr: boolean; clone?: boolean }) {
  const cover = coverOf(p);
  const pair = p.beforeUrl && p.afterUrl;
  return (
    <figure aria-hidden={clone || undefined} className="w-56 shrink-0 snap-start overflow-hidden rounded-[22px] border border-border bg-card">
      <div className="relative aspect-[4/3] bg-muted">
        {pair ? (
          <div className="grid h-full grid-cols-2">
            <img src={p.beforeUrl!} alt="" loading="lazy" className="h-full w-full object-cover" />
            <img src={p.afterUrl!} alt="" loading="lazy" className="h-full w-full object-cover" />
            <span className="absolute left-2 top-2 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-medium text-foreground">{fr ? "Avant / Après" : "Before / After"}</span>
          </div>
        ) : cover ? <img src={cover} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
      </div>
      <figcaption className="p-3">
        <p className="truncate text-sm font-semibold text-foreground">{p.service_name ?? p.title}</p>
        {p.city && <p className="truncate text-xs text-muted-foreground">{p.city}</p>}
      </figcaption>
    </figure>
  );
}

export default function PortfolioShowcase({ fr }: { fr: boolean }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["portfolio-landing-showcase"],
    queryFn: () => fetchInspirationFeed(),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const real = useMemo(() => (data ?? []).filter((p) => coverOf(p)), [data]);
  const mode = isError ? "examples" : showcaseMode(real.length);
  const scroller = useRef<HTMLDivElement>(null);
  const paused = useRef(false);
  const resumeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (mode !== "marquee") return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0; let last = performance.now();
    let pos = scroller.current?.scrollLeft ?? 0;
    const tick = (t: number) => {
      const el = scroller.current;
      const dt = Math.min(64, t - last); last = t;
      if (el) {
        if (paused.current) pos = el.scrollLeft;
        else {
          pos += (dt / 1000) * SPEED_PX_PER_S;
          const half = el.scrollWidth / 2;
          if (half > 0 && pos >= half) pos -= half;
          el.scrollLeft = pos;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(resumeTimer.current); };
  }, [mode]);

  const pause = () => { window.clearTimeout(resumeTimer.current); paused.current = true; };
  const resumeSoon = (ms = 0) => { window.clearTimeout(resumeTimer.current); resumeTimer.current = window.setTimeout(() => { paused.current = false; }, ms); };

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden" aria-busy="true" aria-label={fr ? "Chargement des réalisations" : "Loading projects"}>
        {[0, 1, 2].map((i) => <div key={i} className="aspect-[4/3] w-56 shrink-0 animate-pulse rounded-[22px] bg-muted" />)}
      </div>
    );
  }

  if (mode === "examples") {
    return (
      <section aria-labelledby="examples-title">
        <p id="examples-title" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{fr ? "Exemples de travaux à partager" : "Examples of work to share"}</p>
        <ul className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
          {EXAMPLES.map(({ icon: Icon, fr: f, en }) => (
            <li key={f} className="flex w-40 shrink-0 snap-start flex-col gap-3 rounded-[22px] border border-dashed border-border bg-card/60 p-4">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">{fr ? f : en}</span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-muted-foreground">{fr ? "Catégories illustratives : aucune photo ni entreprise réelle." : "Illustrative categories: no real photos or businesses."}</p>
      </section>
    );
  }

  const loop = mode === "marquee";
  return (
    <section aria-label={fr ? "Réalisations récentes approuvées" : "Recently approved projects"}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{fr ? "Réalisations récentes approuvées" : "Recently approved projects"}</p>
      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label={fr ? "Bande de réalisations — faites glisser pour parcourir" : "Project strip — swipe to browse"}
        className="mt-3 flex gap-3 overflow-x-auto pb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ scrollbarWidth: "none" }}
        onPointerEnter={pause}
        onPointerLeave={() => resumeSoon()}
        onTouchStart={pause}
        onTouchEnd={() => resumeSoon(2500)}
        onFocus={pause}
        onBlur={() => resumeSoon()}
      >
        {real.map((p) => <ProjectCard key={p.id} p={p} fr={fr} />)}
        {loop && real.map((p) => <ProjectCard key={`clone-${p.id}`} p={p} fr={fr} clone />)}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{fr ? "Réalisations déclarées par les entreprises et approuvées avant affichage." : "Projects declared by businesses and reviewed before display."}</p>
    </section>
  );
}
