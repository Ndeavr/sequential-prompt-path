/**
 * ProjectVideoCard — lecture UNIQUEMENT après un clic explicite.
 * Aucune lecture automatique, aucun son avant le geste de l'utilisateur.
 */
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import type { ApprovedProjectVideo } from "./services";

interface Props {
  video: ApprovedProjectVideo;
  onStarted?: (id: string) => void;
  onCompleted?: (id: string) => void;
}

export default function ProjectVideoCard({ video, onStarted, onCompleted }: Props) {
  const [playing, setPlaying] = useState(false);
  const ref = useRef<HTMLVideoElement | null>(null);

  const start = () => {
    setPlaying(true);
    onStarted?.(video.id);
    // Démarrage dans le même geste utilisateur.
    requestAnimationFrame(() => {
      void ref.current?.play().catch(() => undefined);
    });
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="relative overflow-hidden rounded-2xl border border-border bg-card"
    >
      {!playing ? (
        <button
          type="button"
          onClick={start}
          aria-label={`Lire la vidéo : ${video.title}`}
          className="group relative flex min-h-[11rem] w-full flex-col items-center justify-center gap-3 p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {video.poster ? (
            <img
              src={video.poster}
              alt={video.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-70"
            />
          ) : null}
          <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover:scale-105">
            <Play className="h-6 w-6" aria-hidden />
          </span>
          <span className="relative z-10 text-sm font-medium text-foreground">{video.title}</span>
        </button>
      ) : (
        <video
          ref={ref}
          src={video.url}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full"
          onEnded={() => onCompleted?.(video.id)}
        >
          <track kind="captions" />
        </video>
      )}
      {video.description ? (
        <p className="px-4 pb-4 pt-3 text-sm text-muted-foreground">{video.description}</p>
      ) : null}
    </motion.div>
  );
}
