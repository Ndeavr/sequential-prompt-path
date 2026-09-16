/**
 * UNPRO — Vidéo de présentation (audit IA).
 *
 * Vidéo finale Audit IA, hébergée durablement sur le CDN UNPRO.
 * Format compact : max 600 px sur desktop, 100 % sur mobile, ratio 16/9.
 * À la fin de la lecture, la dernière image reste affichée (overlay) au lieu
 * de revenir à la première image. La relecture reste possible.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import auditVideoAsset from "@/assets/unpro-audit-ia-final-16x9.mp4.asset.json";
import auditPosterAsset from "@/assets/unpro-audit-ia-poster.jpg.asset.json";
import auditLastFrameAsset from "@/assets/unpro-audit-ia-last-frame.jpg.asset.json";

/** Délai avant la tentative de lecture automatique silencieuse (ms). */
const AUTOPLAY_DELAY_MS = 650;

export function AuditVideoBlock() {
  const blockRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const autoplayAttemptedRef = useRef(false);
  const [ended, setEnded] = useState(false);

  // Lecture automatique peu après l'affichage de la page. Toujours silencieuse
  // et `playsInline` : c'est la seule forme acceptée par les navigateurs
  // mobiles. Un refus du navigateur laisse simplement le lecteur prêt.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const video = videoRef.current;
      if (!video || autoplayAttemptedRef.current) return;
      autoplayAttemptedRef.current = true;
      video.muted = true;
      void video.play().catch(() => undefined);
    }, AUTOPLAY_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  const handleEnded = useCallback(() => setEnded(true), []);
  const handlePlay = useCallback(() => setEnded(false), []);

  const handleReplay = useCallback(() => {
    const el = videoRef.current;
    setEnded(false);
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => undefined);
  }, []);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div ref={blockRef} className="mx-auto w-full max-w-[600px]">
        <div className="rounded-[24px] border border-border bg-card p-3 shadow-sm sm:p-4">
          <div className="relative overflow-hidden rounded-2xl bg-muted">
            <video
              ref={videoRef}
              controls
              muted
              playsInline
              preload="metadata"
              poster={auditPosterAsset.url}
              width={1920}
              height={1080}
              onEnded={handleEnded}
              onPlay={handlePlay}
              onSeeking={handlePlay}
              className="block aspect-video h-auto w-full"
            >
              <source src={auditVideoAsset.url} type="video/mp4" />
            </video>
            {ended ? (
              <button
                type="button"
                onClick={handleReplay}
                aria-label="Revoir la vidéo"
                className="absolute inset-0 block h-full w-full"
              >
                <img
                  src={auditLastFrameAsset.url}
                  alt=""
                  aria-hidden
                  className="h-full w-full object-cover"
                />
              </button>
            ) : null}
          </div>
          <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-muted-foreground">
            En 20 secondes : comment UNPRO structure votre entreprise pour qu'elle soit comprise,
            vérifiée et considérée par les assistants IA.
          </p>
        </div>
      </div>
    </section>
  );
}

export default AuditVideoBlock;
