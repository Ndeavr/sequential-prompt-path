import { compressImageFile } from "@/services/clara/claraMedia";

export async function prepareDesignPhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    throw new Error("Choisissez une photo JPG, PNG ou WebP.");
  }
  const prepared = await compressImageFile(file, 1024, 0.78, 1024 * 1024);
  if (prepared.size > 1024 * 1024) {
    throw new Error("Cette photo est trop volumineuse. Choisissez une version plus petite (1 Mo maximum après compression).");
  }
  return prepared;
}

/** Reuse the selected generated image as a bounded input for the next variation. */
export async function designVariationSource(source: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(source, { signal });
  if (!response.ok) throw new Error("Impossible de charger cette version. Réessayez.");
  const blob = await response.blob();
  const file = await prepareDesignPhoto(new File([blob], "variation.png", { type: blob.type }));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Impossible de lire cette version."));
    reader.readAsDataURL(file);
  });
}
