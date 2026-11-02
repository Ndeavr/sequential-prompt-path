import { useState } from "react";

/** Stable topic fallback (durable CDN asset, no text in pixels). Applied once, never loops. */
export const BLOG_FALLBACK_IMAGE =
  "https://unpro.ca/__l5e/assets-v1/40e21515-913c-4130-92e2-4cdac475a94e/blog-passport.webp";

export function absoluteImageUrl(src?: string | null): string | undefined {
  if (!src) return undefined;
  return src.startsWith("/") ? `https://unpro.ca${src}` : src;
}

export function blogImageAlt(
  a: { category?: string | null; city?: string | null },
  lang: "fr" | "en",
): string {
  const topic = a.category || (lang === "en" ? "home" : "habitation");
  const place = a.city || "Québec";
  return lang === "en"
    ? `Illustration for an article about ${topic} in ${place}`
    : `Illustration d'un article sur ${topic} à ${place}`;
}

type Props = { src?: string | null; alt: string; priority?: boolean; className?: string };

export default function BlogImage({ src, alt, priority = false, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const url = !src || failed ? BLOG_FALLBACK_IMAGE : src;
  return (
    <div className={`aspect-video w-full overflow-hidden bg-muted ${className}`}>
      <img
        src={url}
        alt={alt}
        width={1600}
        height={900}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="h-full w-full object-cover"
        data-fallback={failed || !src ? "1" : undefined}
        onError={() => {
          if (!failed && url !== BLOG_FALLBACK_IMAGE) setFailed(true);
        }}
      />
    </div>
  );
}
