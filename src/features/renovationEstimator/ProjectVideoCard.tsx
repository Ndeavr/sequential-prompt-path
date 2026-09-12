/**
 * ProjectVideoCard — vidéo réelle, jamais automatique.
 *
 *  - la source n'est chargée que lorsque la carte approche de l'écran ;
 *  - `play()` est appelé de façon synchrone dans le même geste (clic/clavier) ;
 *  - le suivi « démarrée » provient de l'événement `play` réel, une seule fois
 *    par activation ; « terminée » provient de `ended` ;
 *  - lecture mise en pause dès que la carte quitte l'écran ;
 *  - contrôles natifs après activation, clavier et mouvement réduit respectés.
 */
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Play } from "lucide-react";
import type { ApprovedProjectVideo } from "./services";

interface Props {
  video: ApprovedProjectVideo;
  onStarted?: (id: string) => void;
  onCompleted?: (id: string) => void;
}

export default function ProjectVideoCard({ video, onStarted, onCompleted }: Props) {
  const [started, setStarted] = useState(false);
  const [near, setNear] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const startLoggedRef = useRef(false);
  const reduceMotion = useReducedMotion();

  // Chargement paresseux de la source + pause automatique hors écran.
  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const loader = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          loader.disconnect();
        }
      },
      { rootMargin: "400px" },
    );
    loader.observe(node);

    const pauser = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) videoRef.current?.pause();
        }
      },
      { threshold: 0.25 },
    );
    pauser.observe(node);

    return () => {
      loader.disconnect();
      pauser.disconnect();
    };
  }, []);

  useEffect(() => () => videoRef.current?.pause(), []);

  // Appelé DANS le geste utilisateur : aucune attente asynchrone avant play().
  const activate = () => {
    const el = videoRef.current;
    if (!el) return;
    // Si la source n'était pas encore chargée, on la pose immédiatement dans le
    // même geste pour que play() reste synchrone.
    if (!el.getAttribute("src")) {
      el.setAttribute("src", video.url);
      setNear(true);
    }
    el.muted = false;
    setStarted(true);
    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => undefined);
  };


  return (
    <motion.div
      ref={wrapRef}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="relative">
        <video
          ref={videoRef}
          src={near ? video.url : undefined}
          poster={video.poster ?? undefined}
          controls={started}
          muted
          playsInline
          preload={near ? "metadata" : "none"}
          aria-label={video.title}
          className="h-full w-full"
          data-testid="project-video"
          onPlay={() => {
            if (startLoggedRef.current) return;
            startLoggedRef.current = true;
            onStarted?.(video.id);
          }}
          onEnded={() => onCompleted?.(video.id)}
        >
          <track kind="captions" />
        </video>

        {!started && (
          <button
            type="button"
            onClick={activate}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                activate();
              }
            }}
            aria-label={`Lire la vidéo : ${video.title}`}
            data-testid="project-video-play"
            className="group absolute inset-0 flex min-h-[11rem] w-full flex-col items-center justify-center gap-3 bg-background/40 p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105">
              <Play className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-sm font-medium text-foreground">{video.title}</span>
          </button>
        )}
      </div>

      {video.description ? (
        <p className="px-4 pb-4 pt-3 text-sm text-muted-foreground">{video.description}</p>
      ) : null}
    </motion.div>
  );
}
