/**
 * SafeImage — defensive <img> wrapper.
 * - Normalizes src via normalizeImageUrl.
 * - Reserves layout space via aspect-ratio or explicit width/height.
 * - Falls back to placeholder on error; never retries in a loop.
 * - Logs broken/empty srcs to the visual stability buffer.
 */
import { useMemo, useState, type CSSProperties, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { normalizeImageUrl, FALLBACK_IMAGE } from "@/lib/normalizeImageUrl";
import { logVisualEvent, markBrokenSrc } from "@/lib/visualStabilityLogger";

type Priority = "eager" | "lazy" | "auto";

export interface SafeImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "loading" | "onError"> {
  src: string | null | undefined;
  alt: string;
  /** width x height OR aspectRatio to reserve layout space */
  width?: number | string;
  height?: number | string;
  /** e.g. "16/9", "1/1", "4/3" */
  aspectRatio?: string;
  /** Above-the-fold hero images should use "eager". */
  priority?: Priority;
  fallback?: string;
  containerClassName?: string;
  /** Component name for diagnostics. */
  source?: string;
}

export default function SafeImage({
  src,
  alt,
  width,
  height,
  aspectRatio,
  priority = "lazy",
  fallback = FALLBACK_IMAGE,
  className,
  containerClassName,
  style,
  source,
  ...rest
}: SafeImageProps) {
  const normalized = useMemo(() => normalizeImageUrl(src), [src]);
  const [failed, setFailed] = useState(false);

  const finalSrc = failed || !normalized ? fallback : normalized;

  if (!normalized && src) {
    // Log once per unique bad src.
    if (markBrokenSrc(typeof src === "string" ? src : "non-string")) {
      logVisualEvent("empty_image_src", { component: source, src });
    }
  }

  const containerStyle: CSSProperties = {
    aspectRatio,
    width,
    height,
    ...style,
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-white/5",
        containerClassName,
      )}
      style={containerStyle}
    >
      <img
        {...rest}
        src={finalSrc}
        alt={alt}
        loading={priority === "eager" ? "eager" : "lazy"}
        decoding="async"
        {...(priority === "eager" ? { fetchpriority: "high" as unknown as undefined } : {})}
        className={cn("w-full h-full object-cover", className)}
        onError={() => {
          if (failed) return;
          setFailed(true);
          if (normalized && markBrokenSrc(normalized)) {
            logVisualEvent("image_load_failed", { src: normalized, component: source });
          }
        }}
      />
    </div>
  );
}
