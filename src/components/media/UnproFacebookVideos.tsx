/**
 * Owner-supplied UNPRO originals. Video files and posters are packaged in
 * UNPRO_videos_site.zip and must be copied into public/videos/unpro before
 * merging/publishing this component.
 *
 * No external Facebook player, remote tracking script or autoplay.
 */
import { useState } from "react";
import { ExternalLink, Play, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

export const UNPRO_SOCIAL_VIDEOS = [
  { id: "1FVwWZCAJe", kind: "reel", url: "https://www.facebook.com/share/r/1FVwWZCAJe/" },
  { id: "1F5bARp4AY", kind: "video", url: "https://www.facebook.com/share/v/1F5bARp4AY/" },
  { id: "1JSifhcEki", kind: "reel", url: "https://www.facebook.com/share/r/1JSifhcEki/" },
  { id: "1ENvWKkmk9", kind: "reel", url: "https://www.facebook.com/share/r/1ENvWKkmk9/" },
] as const;
// These shortened Facebook links could not be mapped reliably to the originals.
// Do not assign them to specific MP4 videos without verification.

export const UNPRO_NATIVE_VIDEOS = [
  {
    id: "presentation",
    section: "home",
    src: "/videos/unpro/unpro-presentation.mp4",
    poster: "/videos/unpro/unpro-presentation.jpg",
    titleFr: "UNPRO : une autre façon de faire",
    titleEn: "UNPRO: a better way to connect",
    descFr: "Des besoins mieux compris et des professionnels qui correspondent au projet.",
    descEn: "Better-understood needs and professionals who fit each project.",
    aspect: "landscape",
    duration: 32,
  },
  {
    id: "bons-projets",
    section: "entrepreneurs",
    src: "/videos/unpro/unpro-bons-projets.mp4",
    poster: "/videos/unpro/unpro-bons-projets.jpg",
    titleFr: "Les bons projets. Les bons PRO.",
    titleEn: "The right projects. The right pros.",
    descFr: "Moins de temps perdu à soumissionner. Plus de bons mandats.",
    descEn: "Less wasted quoting time. More work that fits.",
    aspect: "portrait",
    duration: 44,
  },
  {
    id: "accote",
    section: "entrepreneurs",
    src: "/videos/unpro/unpro-accote-accote.mp4",
    poster: "/videos/unpro/unpro-accote-accote.jpg",
    titleFr: "Accoté, accoté!",
    titleEn: "Booked solid?",
    descFr: "Une capsule humoristique sur les horaires et les bons contrats.",
    descEn: "A humorous take on busy schedules and finding the right jobs.",
    aspect: "portrait",
    duration: 45,
  },
  {
    id: "competence",
    section: "entrepreneurs",
    src: "/videos/unpro/unpro-competence.mp4",
    poster: "/videos/unpro/unpro-competence.jpg",
    titleFr: "La compétence avant la popularité",
    titleEn: "Skills over popularity",
    descFr: "Le bon professionnel, ce n'est pas toujours le plus visible.",
    descEn: "The right professional isn't necessarily the most visible.",
    aspect: "portrait",
    duration: 33,
  },
] as const;

type Placement = "home" | "entrepreneurs";

function NativeVideoCard({ video, placement, fr }: {
  video: (typeof UNPRO_NATIVE_VIDEOS)[number];
  placement: Placement;
  fr: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const isLandscape = video.aspect === "landscape";
  const title = fr ? video.titleFr : video.titleEn;

  return (
    <article className="min-w-0 overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
      <div className={`relative overflow-hidden bg-gradient-to-br from-[#081B42] via-[#164FC7] to-[#08204C] ${isLandscape ? "aspect-video" : "aspect-[9/16]"}`}>
        {hasError ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <Play aria-hidden="true" className="h-10 w-10" />
            <p className="text-sm font-semibold">{fr ? "Vidéo temporairement indisponible" : "Video temporarily unavailable"}</p>
            <a
              href="https://www.facebook.com/Trouvezunpro"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white/15 px-4 py-2 text-xs font-medium underline underline-offset-4"
            >
              {fr ? "Consulter notre page Facebook" : "Visit our Facebook page"}
            </a>
          </div>
        ) : (
          <video
            data-testid={`unpro-native-video-${video.id}`}
            className="absolute inset-0 h-full w-full object-contain"
            poster={video.poster}
            preload="none"
            controls
            playsInline
            onError={() => setHasError(true)}
            onPlay={() => trackCopilotEvent("unpro_video_played", { videoId: video.id, placement })}
            aria-label={title}
          >
            <source src={video.src} type="video/mp4" />
            {fr ? "Votre navigateur ne prend pas en charge la lecture vidéo." : "Your browser does not support video playback."}
          </video>
        )}
      </div>
      <div className="px-4 pb-5 pt-4 sm:px-5">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-primary">UNPRO · {Math.round(video.duration / 60)}:{String(video.duration % 60).padStart(2, "0")}</p>
        <h3 className="text-lg font-bold leading-snug text-foreground">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{fr ? video.descFr : video.descEn}</p>
      </div>
    </article>
  );
}

export default function UnproFacebookVideos({ placement }: { placement: Placement }) {
  const { lang } = useLanguage();
  const fr = lang === "fr";
  const videos = UNPRO_NATIVE_VIDEOS.filter((v) => v.section === placement);
  return (
    <section
      id={placement === "home" ? "videos-unpro" : "videos-unpro-entrepreneurs"}
      className="relative isolate w-full px-5 py-12 md:py-16"
      aria-label={fr ? "Vidéos UNPRO" : "UNPRO videos"}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto mb-7 max-w-2xl text-center">
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> UNPRO · {fr ? "En vidéo" : "Videos"}</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            {placement === "home"
              ? (fr ? "Le bon PRO pour le bon projet" : "The right pro for the right project")
              : (fr ? "Moins de soumissions inutiles. Plus de bons mandats." : "Fewer wasted quotes. More work that fits.")}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {placement === "home"
              ? (fr ? "Découvrez pourquoi nous avons créé UNPRO." : "See why we created UNPRO.")
              : (fr ? "Des histoires et des idées pour travailler autrement." : "Stories and ideas for a better way to work.")}
          </p>
        </div>
        <div className={placement === "home" ? "mx-auto max-w-3xl" : "grid grid-cols-1 gap-5 sm:grid-cols-3"}>
          {videos.map((video) => (
            <NativeVideoCard key={video.id} video={video} placement={placement} fr={fr} />
          ))}
        </div>
        {placement === "entrepreneurs" && (
          <div className="mt-8 text-center">
            <Link
              to="/entrepreneurs/activation-350"
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              {fr ? "Inscrire mon entreprise" : "Register my business"}
            </Link>
          </div>
        )}
        <div className="mt-5 text-center">
          <a href="https://www.facebook.com/Trouvezunpro" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline underline-offset-2 hover:text-primary">
            {fr ? "Suivre UNPRO sur Facebook" : "Follow UNPRO on Facebook"}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
