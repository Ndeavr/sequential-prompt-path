/**
 * claraMedia — Traitement média côté navigateur pour Clara.
 *
 * - Compression d'image avant envoi (reste sous la limite du stockage).
 * - Extraction d'images clés d'une vidéo (le moteur d'analyse lit des images,
 *   jamais un flux vidéo ni le son — Clara le dit exactement ainsi).
 */

export const VIDEO_ANALYSIS_DISCLOSURE =
  "Je n’analyse pas le son ni le mouvement : j’examine des images tirées de votre vidéo.";

export const MAX_VIDEO_KEYFRAMES = 5;

/** Réduit une image trop grande sans déformer la géométrie. */
export async function compressImageFile(
  file: File,
  maxDimension = 1920,
  quality = 0.82,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const largest = Math.max(bitmap.width, bitmap.height);
    if (largest <= maxDimension && file.size <= 3 * 1024 * 1024) {
      bitmap.close?.();
      return file;
    }
    const scale = Math.min(1, maxDimension / largest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Extrait des images clés réparties dans la vidéo.
 * Retourne une liste vide si le navigateur ne peut pas lire le fichier —
 * aucune image inventée.
 */
export async function extractVideoKeyframes(
  file: File,
  count = 3,
): Promise<File[]> {
  if (typeof document === "undefined") return [];
  const wanted = Math.max(1, Math.min(count, MAX_VIDEO_KEYFRAMES));
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  const cleanup = () => {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
  };

  try {
    const duration = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("video_metadata_timeout")), 15000);
      video.onloadedmetadata = () => {
        clearTimeout(timer);
        resolve(Number.isFinite(video.duration) ? video.duration : 0);
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error("video_unreadable"));
      };
    });

    const canvas = document.createElement("canvas");
    const frames: File[] = [];

    for (let index = 0; index < wanted; index++) {
      const target = duration > 0 ? (duration * (index + 1)) / (wanted + 1) : 0;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("video_seek_timeout")), 15000);
        video.onseeked = () => {
          clearTimeout(timer);
          resolve();
        };
        video.onerror = () => {
          clearTimeout(timer);
          reject(new Error("video_unreadable"));
        };
        video.currentTime = target;
      });

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", 0.85),
      );
      if (blob) {
        frames.push(new File([blob], `image-${index + 1}.jpg`, { type: "image/jpeg" }));
      }
    }

    return frames;
  } catch {
    return [];
  } finally {
    cleanup();
  }
}
