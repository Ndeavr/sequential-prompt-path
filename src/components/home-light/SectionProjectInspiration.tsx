/**
 * « Des projets qui donnent des idées » — sous Clara (Clara reste prioritaire).
 * Lot initial = exactement les 10 dernières réalisations APPROUVÉES; l'ordre
 * « Pour vous » réordonne seulement ce lot côté client (inspirationRanking,
 * déterministe, aucun classement payant); « Récents » garde l'ordre serveur. ≥ 5 réalisations réelles → cartes à glisser
 * (gauche = passer, droite = « J'aime », session locale seulement); fin de lot →
 * recommencer ou lot DISTINCT suivant. < 5 → version limitée honnête.
 * Réalisation déclarée par l'entreprise ≠ qualifications vérifiées.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, ImageIcon, MessageCircle, RefreshCw, RotateCcw, ShieldCheck, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { completionLabel, fetchInspirationFeed, fetchMyPortfolio, FREE_PORTFOLIO_PATH, PORTFOLIO_STATUS_LABEL, nextFeedCursor, type FeedCursor, type FeedProject } from "@/lib/portfolio/freePortfolio";
import { categoryOf, completedCategoriesFrom, pinOwnFirst, quebecSeason, rankProjects, SEASON_LABEL, type PassportEvent, type RankingContext, type SortMode } from "@/lib/portfolio/inspirationRanking";
import { useAuthSession } from "@/stores/authSessionStore";
import { loadDraft } from "@/lib/portfolio/draftStore";
import { supabase } from "@/integrations/supabase/client";
import { addLike, deckMode, inspirationSessionId, readLikes, swipeDecision } from "@/lib/portfolio/swipeDeck";
import { CLARA_PROJECT_INSPIRATION_EVENT, type ProjectInspiration } from "@/services/clara/claraProjectInspiration";
import { logFunnelEvent } from "@/lib/analytics/logFunnelEvent";

const reducedMotion = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function focusClara() {
  const field = document.querySelector<HTMLTextAreaElement>("#clara-home textarea");
  field?.scrollIntoView({ block: "center", behavior: reducedMotion() ? "auto" : "smooth" });
  field?.focus({ preventScroll: true });
}

export function openClaraWithProject(p: FeedProject, intent: "similar" | "contact_author" = "similar", sortMode?: SortMode) {
  const detail: ProjectInspiration = {
    projectId: p.id, title: p.title, serviceName: p.service_name, city: p.city,
    companyName: p.company_name, authorVerified: p.author_verified, intent,
  };
  void logFunnelEvent({
    event_type: "open_clara_from_project", step: "home_inspiration",
    metadata: { project_id: p.id, intent, service: p.service_name, author_verified: p.author_verified, sort_mode: sortMode ?? null, is_appointment: false, is_sale: false },
    dedupe_key: `open_clara_from_project:${p.id}:${intent}:${inspirationSessionId()}`,
  });
  window.dispatchEvent(new CustomEvent(CLARA_PROJECT_INSPIRATION_EVENT, { detail }));
  focusClara();
}

function logViewed(p: FeedProject) {
  void logFunnelEvent({
    event_type: "project_viewed", step: "home_inspiration",
    metadata: { project_id: p.id, service: p.service_name, author_verified: p.author_verified },
    dedupe_key: `project_viewed:${p.id}:${inspirationSessionId()}`,
  });
}

function Attribution({ p, fr }: { p: FeedProject; fr: boolean }) {
  const done = completionLabel(p.completed_month, fr ? "fr" : "en");
  return (
    <>
      {p.is_own && <p className="text-xs font-semibold text-primary">{fr ? "Votre réalisation — approuvée et visible publiquement" : "Your project — approved and publicly visible"}</p>}
      {done && <p className="text-xs font-medium text-foreground">{done}</p>}
      <p className="text-sm text-muted-foreground">{p.company_name ?? (fr ? "Entreprise non affichée" : "Business not displayed")}</p>
      <p className="text-xs text-muted-foreground">
        {fr ? "Réalisation déclarée par l’entreprise." : "Project declared by the business."}
        {p.author_verified && (
          <span className="ml-1 inline-flex items-center gap-1 font-medium text-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{fr ? "Entreprise vérifiée par UNPRO" : "Business verified by UNPRO"}
          </span>
        )}
      </p>
    </>
  );
}

function ClaraActions({ p, fr, sortMode }: { p: FeedProject; fr: boolean; sortMode?: SortMode }) {
  if (p.is_own) {
    return (
      <Button asChild variant="outline" className="min-h-11 w-full whitespace-normal">
        <Link to={FREE_PORTFOLIO_PATH}>{fr ? "Gérer mes réalisations" : "Manage my projects"}</Link>
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <Button className="min-h-11 w-full whitespace-normal" onClick={() => openClaraWithProject(p, "similar", sortMode)}>
        {fr ? "Je veux un projet semblable" : "I want a similar project"}
      </Button>
      <Button variant="outline" className="min-h-11 w-full whitespace-normal" onClick={() => openClaraWithProject(p, "contact_author", sortMode)}>
        <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
        {fr ? "Demander cette entreprise à Clara" : "Ask Clara about this business"}
      </Button>
    </div>
  );
}

/** Photo principale + bascule avant/après quand les deux existent. */
function ProjectPhoto({ p, fr, className }: { p: FeedProject; fr: boolean; className: string }) {
  const hasBeforeAfter = !!(p.beforeUrl && p.afterUrl);
  const [view, setView] = useState<"after" | "before">("after");
  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => { setView("after"); setPhotoIdx(0); }, [p.id]);
  const src = hasBeforeAfter ? (view === "before" ? p.beforeUrl! : p.afterUrl!) : p.photoUrls[photoIdx] ?? p.photoUrls[0];
  const label = `${p.title}${p.service_name ? ` — ${p.service_name}` : ""}${hasBeforeAfter ? ` (${view === "before" ? (fr ? "avant" : "before") : (fr ? "après" : "after")})` : ""}`;
  return (
    <div className={`relative bg-muted ${className}`}>
      {src ? (
        <img src={src} alt={label} draggable={false} loading="lazy" decoding="async" className="h-full w-full select-none object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-8 w-8" aria-hidden="true" /></div>
      )}
      {hasBeforeAfter ? (
        <div className="absolute left-3 top-3 flex gap-1 rounded-full bg-background/90 p-1" role="group" aria-label={fr ? "Avant ou après" : "Before or after"}>
          {(["before", "after"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
              className={`min-h-9 rounded-full px-3 text-xs font-semibold ${view === v ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
              {v === "before" ? (fr ? "Avant" : "Before") : (fr ? "Après" : "After")}
            </button>
          ))}
        </div>
      ) : p.photoUrls.length > 1 && (
        <button type="button" onClick={() => setPhotoIdx((i) => (i + 1) % p.photoUrls.length)}
          className="absolute bottom-3 right-3 min-h-9 rounded-full bg-background/90 px-3 text-xs font-medium text-foreground">
          {fr ? "Photo" : "Photo"} {photoIdx + 1}/{p.photoUrls.length}
        </button>
      )}
    </div>
  );
}

function ProjectCard({ p, fr, sortMode }: { p: FeedProject; fr: boolean; sortMode?: SortMode }) {
  useEffect(() => { logViewed(p); }, [p]);
  return (
    <article className="flex flex-col overflow-hidden rounded-[28px] border border-border bg-card text-card-foreground shadow-sm">
      <ProjectPhoto p={p} fr={fr} className="aspect-[4/3]" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{[p.service_name, p.city].filter(Boolean).join(" · ")}</p>
        <h3 className="text-base font-semibold leading-snug">{p.title}</h3>
        <Attribution p={p} fr={fr} />
        <div className="mt-auto pt-2"><ClaraActions p={p} fr={fr} sortMode={sortMode} /></div>
      </div>
    </article>
  );
}

/** Une grande carte à la fois; glisser, flèches clavier ou boutons. */
function SwipeDeck({ pages, hasNext, fetchNext, fr, sortMode }: {
  pages: FeedProject[][]; hasNext: boolean; fetchNext: () => Promise<FeedProject[][]>; fr: boolean; sortMode: SortMode;
}) {
  const [batchIdx, setBatchIdx] = useState(0);
  const [idx, setIdx] = useState(0);
  const [dx, setDx] = useState(0);
  const [likes, setLikes] = useState<string[]>(() => readLikes());
  const [loadingNext, setLoadingNext] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [nextError, setNextError] = useState(false);
  const start = useRef<{ x: number; id: number } | null>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const batch = pages[batchIdx] ?? [];
  const p = batch[idx] as FeedProject | undefined;

  useEffect(() => { if (p) logViewed(p); }, [p]);

  const act = useCallback((action: "pass" | "like") => {
    if (!p) return;
    if (action === "like") setLikes(addLike(p.id));
    void logFunnelEvent({
      event_type: action === "like" ? "swipe_liked" : "swipe_passed", step: "home_inspiration",
      metadata: { project_id: p.id, service: p.service_name, batch: batchIdx, sort_mode: sortMode, is_appointment: false, is_sale: false },
      dedupe_key: `${action === "like" ? "swipe_liked" : "swipe_passed"}:${p.id}:${inspirationSessionId()}`,
    });
    setDx(0);
    setIdx((i) => i + 1);
  }, [p, batchIdx, sortMode]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); act("pass"); }
    if (e.key === "ArrowRight") { e.preventDefault(); act("like"); }
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    start.current = { x: e.clientX, id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current?.id === e.pointerId) setDx(e.clientX - start.current.x);
  };
  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current?.id !== e.pointerId) return;
    const decision = swipeDecision(e.clientX - start.current.x);
    start.current = null;
    if (decision) act(decision); else setDx(0);
  };

  const loadNextBatch = async () => {
    setNextError(false);
    if ((pages[batchIdx + 1]?.length ?? 0) > 0) { setBatchIdx((b) => b + 1); setIdx(0); return; }
    if (!hasNext) { setExhausted(true); return; }
    setLoadingNext(true);
    try {
      const all = await fetchNext();
      if ((all[batchIdx + 1]?.length ?? 0) > 0) { setBatchIdx((b) => b + 1); setIdx(0); deckRef.current?.focus(); }
      else setExhausted(true);
    } catch { setNextError(true); } finally { setLoadingNext(false); }
  };

  const motion = reducedMotion();
  const style = motion ? undefined : { transform: `translateX(${dx}px) rotate(${dx / 30}deg)`, transition: start.current ? "none" : "transform 420ms cubic-bezier(.22,1,.36,1)" };
  const hint = swipeDecision(dx);

  return (
    <div className="mx-auto w-full max-w-md">
      <p className="sr-only" aria-live="polite">
        {p ? `${fr ? "Projet" : "Project"} ${idx + 1} / ${batch.length} : ${p.title}` : (fr ? "Fin de ce lot" : "End of this batch")}
      </p>
      {p ? (
        <>
          <div
            ref={deckRef}
            tabIndex={0}
            role="group"
            aria-roledescription={fr ? "carte à glisser" : "swipe card"}
            aria-label={fr ? `${p.title}. Flèche gauche pour passer, flèche droite pour aimer.` : `${p.title}. Left arrow to skip, right arrow to like.`}
            onKeyDown={onKeyDown}
            className="rounded-[28px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <article
              style={style}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              className="relative cursor-grab touch-pan-y overflow-hidden rounded-[28px] border border-border bg-card text-card-foreground shadow-md active:cursor-grabbing"
            >
              <ProjectPhoto p={p} fr={fr} className="aspect-[3/4] sm:aspect-[4/5]" />
              {hint && (
                <span aria-hidden="true" className={`absolute top-4 ${hint === "like" ? "right-4 bg-primary text-primary-foreground" : "left-4 bg-background text-foreground"} rounded-full px-3 py-1 text-sm font-semibold shadow`}>
                  {hint === "like" ? (fr ? "M’inspire" : "Inspiring") : (fr ? "Suivant" : "Next")}
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/95 to-transparent p-4 pt-12">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{[p.service_name, p.city].filter(Boolean).join(" · ")}</p>
                <h3 className="text-lg font-semibold leading-snug text-foreground">{p.title}</h3>
                <Attribution p={p} fr={fr} />
              </div>
            </article>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" className="h-14 w-14 rounded-full" onClick={() => act("pass")} aria-label={fr ? "Passer au projet suivant" : "Skip to next project"}>
              <X className="h-6 w-6" aria-hidden="true" />
            </Button>
            <span className="min-w-16 text-center text-sm text-muted-foreground">{idx + 1}/{batch.length}</span>
            <Button variant="outline" size="icon" className="h-14 w-14 rounded-full" onClick={() => act("like")} aria-label={fr ? "J’aime, ce projet m’inspire" : "I like it, this inspires me"}>
              <Heart className={`h-6 w-6 ${likes.includes(p.id) ? "fill-primary text-primary" : ""}`} aria-hidden="true" />
            </Button>
          </div>

          {p.description && (
            <details className="mt-3 rounded-[18px] border border-border bg-card p-3 text-sm text-foreground">
              <summary className="min-h-9 cursor-pointer font-medium">{fr ? "Détails du projet" : "Project details"}</summary>
              <p className="mt-2 whitespace-pre-line text-muted-foreground">{p.description}</p>
            </details>
          )}
          <div className="mt-3"><ClaraActions p={p} fr={fr} sortMode={sortMode} /></div>
        </>
      ) : (
        <div className="rounded-[28px] border border-border bg-card p-6 text-center">
          <p className="text-base font-medium text-foreground">
            {exhausted
              ? (fr ? "Vous avez vu toutes les réalisations publiées pour l’instant." : "You’ve seen every published project for now.")
              : (fr ? "Vous avez vu ce lot de réalisations." : "You’ve seen this batch of projects.")}
          </p>
          {likes.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {fr ? `${likes.length} projet(s) aimé(s) pendant cette visite.` : `${likes.length} liked project(s) this visit.`}
            </p>
          )}
          {nextError && <p role="alert" className="mt-2 text-sm text-destructive">{fr ? "Le lot suivant n’a pas pu être chargé." : "The next batch could not be loaded."}</p>}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" className="min-h-11" onClick={() => { setIdx(0); setExhausted(false); }}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />{fr ? "Recommencer ce lot" : "Restart this batch"}
            </Button>
            {batchIdx > 0 && (
              <Button variant="outline" className="min-h-11" onClick={() => { setBatchIdx(0); setIdx(0); setExhausted(false); }}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />{fr ? "Revenir au début" : "Back to start"}
              </Button>
            )}
            {!exhausted && (hasNext || (pages[batchIdx + 1]?.length ?? 0) > 0) && (
              <Button className="min-h-11" onClick={loadNextBatch} disabled={loadingNext}>
                {loadingNext ? (fr ? "Chargement…" : "Loading…") : (fr ? "Voir les réalisations suivantes" : "See the next projects")}
              </Button>
            )}
          </div>
          <Button variant="ghost" className="mt-2 min-h-11" onClick={focusClara}>
            <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />{fr ? "Décrire mon projet à Clara" : "Describe my project to Clara"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function SectionProjectInspiration() {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const feed = useInfiniteQuery({
    queryKey: ["portfolio-inspiration-feed"],
    queryFn: ({ pageParam }) => fetchInspirationFeed(pageParam),
    initialPageParam: null as FeedCursor | null,
    getNextPageParam: (last) => nextFeedCursor(last),
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const rawPages = useMemo(() => feed.data?.pages ?? [], [feed.data]);
  const [sortMode, setSortMode] = useState<SortMode>("for_you");
  const { session } = useAuthSession();
  const uid = session?.user?.id ?? null;
  // Contexte déclaré par le visiteur connecté (ses propres données, RLS) : ville du Passeport et travaux terminés.
  const passport = useQuery({
    queryKey: ["inspiration-passport-context", uid],
    enabled: !!uid,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data: props } = await supabase.from("properties").select("id,city").eq("user_id", uid!).order("created_at", { ascending: true }).limit(5);
      const ids = (props ?? []).map((x) => x.id);
      const { data: events } = ids.length
        ? await supabase.from("property_events").select("event_type,title,description,event_date").in("property_id", ids).limit(200)
        : { data: [] as PassportEvent[] };
      return { city: (props ?? []).find((x) => x.city)?.city ?? null, events: (events ?? []) as PassportEvent[] };
    },
  });
  const ctx = useMemo<RankingContext>(() => {
    const now = new Date();
    const liked = new Set(readLikes());
    const likedCategories = [...new Set(rawPages.flat().filter((x) => liked.has(x.id)).map(categoryOf).filter((c): c is string => !!c))];
    return {
      now, likedCategories,
      visitorCity: passport.data?.city ?? null,
      completedCategories: passport.data ? completedCategoriesFrom(passport.data.events, now) : [],
    };
  }, [rawPages, passport.data]);
  // Entrepreneur connecté : SES réalisations (tous statuts, privé) + ses approuvées épinglées en tête du fil.
  const mine = useQuery({ queryKey: ["inspiration-my-portfolio", uid], enabled: !!uid, staleTime: 60_000, queryFn: fetchMyPortfolio });
  const localDraft = useQuery({ queryKey: ["inspiration-local-draft", uid], enabled: !!uid, staleTime: 60_000, queryFn: async () => (await loadDraft())?.photos.length ?? 0 });
  // Seul l'ordre change, lot par lot : la pagination distincte et l'accès « récents » sont conservés.
  const pages = useMemo(
    () => pinOwnFirst(mine.data?.approved ?? [], rawPages.map((b) => rankProjects(b, ctx, sortMode))),
    [rawPages, ctx, sortMode, mine.data],
  );
  const first = pages[0] ?? [];
  const mode = deckMode(first.length);
  const season = SEASON_LABEL[quebecSeason(ctx.now)][fr ? "fr" : "en"];
  const changeSort = (m: SortMode) => {
    if (m === sortMode) return;
    setSortMode(m);
    void logFunnelEvent({ event_type: "inspiration_sort_changed", step: "home_inspiration", metadata: { sort_mode: m, signed_in: !!uid }, dedupe_key: `inspiration_sort_changed:${m}:${inspirationSessionId()}` });
  };
  const ownNote = (mine.data?.approved.length ?? 0) > 0 ? (fr ? "Vos réalisations approuvées d’abord. " : "Your approved projects first. ") : "";
  const why = ownNote + (sortMode === "recent"
    ? (fr ? "Ordre : les plus récentes d’abord." : "Order: most recent first.")
    : sortMode === "other"
      ? (fr ? "Ordre : d’autres types de projets que ceux de la saison et de vos « J’aime » d’abord." : "Order: project types other than the season’s and your likes first.")
      : [
          fr ? `Ordre : saison (${season})` : `Order: season (${season})`,
          ctx.visitorCity ? (fr ? "votre ville déclarée" : "your declared city") : null,
          ctx.completedCategories?.length ? (fr ? "vos travaux terminés du Passeport passent après" : "your completed Passport work comes later") : null,
          ctx.likedCategories?.length ? (fr ? "vos « J’aime » de cette visite" : "your likes this visit") : null,
          fr ? "fraîcheur et variété. Aucun classement payant." : "freshness and variety. No paid ranking.",
        ].filter(Boolean).join(", "));
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
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "swipe"
              ? (fr ? "Glissez à gauche pour passer, à droite si le projet vous inspire." : "Swipe left to skip, right if it inspires you.")
              : (fr ? "Les dernières réalisations approuvées." : "The latest approved projects.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" className="min-h-11" onClick={focusClara}>
            <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />{fr ? "Parler à Clara" : "Talk to Clara"}
          </Button>
          {cta}
        </div>
      </div>

      {uid && ((mine.data?.items.length ?? 0) > 0 || (localDraft.data ?? 0) > 0) && (
        <div className="mb-6 rounded-[28px] border border-border bg-card p-4" aria-labelledby="my-portfolio-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="my-portfolio-title" className="text-base font-semibold text-foreground">{fr ? "Mes réalisations" : "My projects"}</h3>
            <span className="text-xs text-muted-foreground">{fr ? "Visible par vous seulement" : "Visible to you only"}</span>
          </div>
          <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
            {(localDraft.data ?? 0) > 0 && (
              <li className="w-40 shrink-0">
                <Link to={`${FREE_PORTFOLIO_PATH}?etape=photos`} className="block rounded-2xl border border-dashed border-border p-3 text-sm text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  <span className="block font-medium">{fr ? "Brouillon sur cet appareil" : "Draft on this device"}</span>
                  <span className="text-xs text-muted-foreground">{fr ? `${localDraft.data} photo(s) — non envoyé` : `${localDraft.data} photo(s) — not sent`}</span>
                </Link>
              </li>
            )}
            {(mine.data?.items ?? []).map((m) => (
              <li key={m.id} className="w-40 shrink-0">
                <Link to={FREE_PORTFOLIO_PATH} className="block overflow-hidden rounded-2xl border border-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  {m.thumbUrl ? <img src={m.thumbUrl} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center bg-muted"><ImageIcon className="h-6 w-6 text-muted-foreground" aria-hidden="true" /></div>}
                  <span className="block truncate px-2 pt-2 text-sm font-medium text-foreground">{m.title}</span>
                  <span className="block px-2 pb-2 text-xs text-muted-foreground">{PORTFOLIO_STATUS_LABEL[m.status]?.[fr ? "fr" : "en"] ?? m.status}{m.status === "rejected" && m.review_reason ? ` — ${m.review_reason}` : ""}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {feed.isSuccess && mode !== "empty" && (
        <div className="mb-4">
          <div role="radiogroup" aria-label={fr ? "Ordre des réalisations" : "Project order"} className="flex flex-wrap gap-2">
            {([
              ["for_you", fr ? "Pour vous" : "For you"],
              ["recent", fr ? "Récents" : "Recent"],
              ["other", fr ? "Voir d’autres types de projets" : "See other project types"],
            ] as [SortMode, string][]).map(([m, label]) => (
              <button key={m} type="button" role="radio" aria-checked={sortMode === m} onClick={() => changeSort(m)}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium ${sortMode === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}>
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">{why}</p>
        </div>
      )}

      {feed.isLoading && (
        <div className="mx-auto h-[28rem] max-w-md animate-pulse rounded-[28px] bg-muted" aria-busy="true" aria-label={fr ? "Chargement des réalisations" : "Loading projects"} />
      )}

      {feed.isError && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-[28px] border border-border bg-card p-5 text-sm text-foreground">
          <span>{fr ? "Les réalisations n’ont pas pu être chargées." : "Projects could not be loaded."}</span>
          <Button variant="outline" size="sm" onClick={() => feed.refetch()} className="min-h-11"><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />{fr ? "Réessayer" : "Retry"}</Button>
        </div>
      )}

      {feed.isSuccess && mode === "empty" && (
        <div className="rounded-[28px] border border-dashed border-border bg-card p-6 text-center">
          <p className="text-base font-medium text-foreground">{fr ? "Les premières réalisations arrivent bientôt." : "The first projects are coming soon."}</p>
          <p className="mt-1 text-sm text-muted-foreground">{fr ? "Chaque projet est vérifié par notre équipe avant d’être affiché." : "Each project is reviewed by our team before it appears."}</p>
          <div className="mt-3 flex justify-center">{cta}</div>
        </div>
      )}

      {feed.isSuccess && mode === "limited" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {first.map((p) => <ProjectCard key={p.id} p={p} fr={fr} sortMode={sortMode} />)}
        </div>
      )}

      {feed.isSuccess && mode === "swipe" && (
        <SwipeDeck
          key={sortMode}
          sortMode={sortMode}
          pages={pages}
          hasNext={!!feed.hasNextPage}
          fetchNext={async () => (await feed.fetchNextPage()).data?.pages ?? []}
          fr={fr}
        />
      )}
    </section>
  );
}
