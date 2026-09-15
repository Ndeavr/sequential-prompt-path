/**
 * UNPRO — Vidéo de présentation (audit IA).
 *
 * Vidéo finale Audit IA, hébergée durablement sur le CDN UNPRO.
 * Format compact : max 600 px sur desktop, 100 % sur mobile, ratio 16/9.
 */
import auditVideoAsset from "@/assets/unpro-audit-ia-final-16x9.mp4.asset.json";

const POSTER = "/images/hero-bg.webp";

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
              <source src={auditVideoAsset.url} type="video/mp4" />
            </video>
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
