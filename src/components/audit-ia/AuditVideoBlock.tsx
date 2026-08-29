/**
 * UNPRO — Vidéo de présentation (audit IA).
 *
 * Réutilise l'asset vidéo déjà présent en production (/images/hero-bg.*)
 * avec son poster existant. Format volontairement compact : max 600 px sur
 * desktop, 100 % de la largeur sur mobile, ratio 16/9 conservé.
 */
const POSTER = "/images/hero-bg.webp";
const SRC_WEBM = "/images/hero-bg.webm";
const SRC_MP4 = "/images/hero-bg.mp4";

export function AuditVideoBlock() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-[600px]">
        <div className="rounded-[24px] border border-border bg-card p-3 shadow-sm sm:p-4">
          <div className="overflow-hidden rounded-2xl bg-muted">
            <video
              controls
              playsInline
              preload="metadata"
              poster={POSTER}
              width={1280}
              height={720}
              className="block aspect-video h-auto w-full"
            >
              <source src={SRC_WEBM} type="video/webm" />
              <source src={SRC_MP4} type="video/mp4" />
            </video>
          </div>
          <p className="mt-3 px-1 text-[12.5px] leading-relaxed text-muted-foreground">
            En 30 secondes : comment UNPRO structure votre entreprise pour qu'elle soit comprise,
            vérifiée et considérée par les assistants IA.
          </p>
        </div>
      </div>
    </section>
  );
}

export default AuditVideoBlock;
