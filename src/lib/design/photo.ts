import { compressImageFile } from "@/services/clara/claraMedia";

export async function prepareDesignPhoto(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
    throw new Error("Choisissez une photo JPG, PNG ou WebP.");
  }
  const prepared = await compressImageFile(file, 1024, 0.78);
  if (prepared.size > 1024 * 1024) {
    throw new Error("Cette photo est trop volumineuse. Choisissez une version plus petite (1 Mo maximum après compression).");
  }
  return prepared;
}
