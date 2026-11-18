/**
 * UNPRO short-form video collection.
 *
 * User-supplied Facebook share links are not canonical public video permalinks.
 * Facebook's embed player returned "Video Unavailable" for these four URLs on
 * 2026-11-18. Do not embed them until verified canonical public URLs or
 * owner-authorized original MP4 assets are available.
 *
 * For now, use explicit outbound links only; no unusable iframe, tracking
 * script, fake thumbnails, or autoplay is loaded into UNPRO.
 */
import { ArrowUpRight, Play } from "lucide-react";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

export const UNPRO_SOCIAL_VIDEOS = [
  { id: "1FVwWZCAJe", kind: "reel", url: "https://www.facebook.com/share/r/1FVwWZCAJe/" },
  { id: "1F5bARp4AY", kind: "video", url: "https://www.facebook.com/share/v/1F5bARp4AY/" },
  { id: "1JSifhcEki", kind: "reel", url: "https://www.facebook.com/share/r/1JSifhcEki/" },
  { id: "1ENvWKkmk9", kind: "reel", url: "https://www.facebook.com/share/r/1ENvWKkmk9/" },
] as const;

type Placement = "home" | "entrepreneurs";

export default function UnproFacebookVideos({ placement }: { placement: Placement }) {
  const { lang } = useLanguage();
  const fr = lang === "fr";

  return (
    <section
      id={placement === "home" ? "videos-unpro" : "videos-unpro-entrepreneurs"}
      className="relative isolate w-full px-5 py-12 md:py-16"
      aria-label={fr ? "Vidéos UNPRO" : "UNPRO videos"}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 max-w-xl">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">UNPRO · {fr ? "En vidéo" : "Videos"}</p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-foreground md:text-3xl">
            {fr ? "Découvrez UNPRO en vidéo" : "Discover UNPRO in video"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {fr
              ? "Quatre capsules à découvrir sur Facebook. La lecture s’ouvre directement sur Facebook."
              : "Four videos to explore on Facebook. Playback opens directly on Facebook."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:gap-4" data-testid="unpro-facebook-videos">
          {UNPRO_SOCIAL_VIDEOS.map((video, index) => (
            <a
              key={video.id}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block min-w-0 rounded-2xl border border-border/50 bg-card p-2 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={fr
                ? "Visionner la vidéo UNPRO " + (index + 1) + " sur Facebook (nouvel onglet)"
                : "Watch UNPRO video " + (index + 1) + " on Facebook (new tab)"}
              onClick={() => trackCopilotEvent("facebook_reel_opened", { videoId: video.id, placement })}
            >
              <div className="relative flex aspect-[9/13] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#071A43] via-[#174FC6] to-[#071A43] text-white">
                <span aria-hidden="true" className="absolute left-3 top-3 rounded-full border border-white/20 bg-white/10 px-2 py-1 text-[10px] font-semibold tracking-widest">
                  UNPRO
                </span>
                <span aria-hidden="true" className="absolute right-3 top-3 text-[11px] font-semibold text-white/70">
                  0{index + 1}
                </span>
                <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white/15 shadow-lg transition-transform group-hover:scale-110">
                  <Play className="ml-1 h-6 w-6 fill-white" />
                </span>
                <span className="absolute bottom-3 left-3 right-3 text-center text-[10px] font-semibold text-white/80">
                  FACEBOOK
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 px-1 pb-1 pt-3 text-sm font-semibold text-foreground">
                <span className="truncate">{fr ? "Vidéo" : "Video"} {index + 1}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
