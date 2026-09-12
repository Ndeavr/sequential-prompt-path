/**
 * ProjectVideoCard — l'élément vidéo réel existe dès le rendu, silencieux,
 * sans lecture automatique. `play()` est appelé de façon synchrone dans le
 * même geste (clic ou clavier) que l'activation, puis la lecture est mise en
 * pause dès que la carte quitte l'écran.
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  // Pause automatique hors écran (et jamais de lecture automatique).
  useEffect(() => {
    const node = wrapRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) videoRef.current?.pause();
        }
      },
      { threshold: 0.25 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => () => videoRef.current?.pause(), []);

  // Appelé DANS le geste utilisateur : aucune attente asynchrone avant play().
  const activate = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = false;
    const p = el.play();
    if (p && typeof p.catch === "function") p.catch(() => undefined);
    if (!started) {
      setStarted(true);
      onStarted?.(video.id);
    }
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
          src={video.url}
          poster={video.poster ?? undefined}
          controls={started}
          muted
          playsInline
          preload="metadata"
          aria-label={video.title}
          className="h-full w-full"
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
