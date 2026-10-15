export const MAX_DESIGN_REQUEST_BYTES = 6 * 1024 * 1024;
export const MAX_DESIGN_DATA_URL_LENGTH = 1_400_000;

export async function readDesignBody(request: Request): Promise<Record<string, unknown>> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_body");
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > MAX_DESIGN_REQUEST_BYTES) {
        await reader.cancel();
        throw new Error("image_too_large");
      }
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid_body");
    return body;
  } finally { reader.releaseLock(); }
}

export function isDesignImage(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_DESIGN_DATA_URL_LENGTH &&
    /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value);
}

/** Keep only one provider request/body/response in memory at a time. */
export async function generateDesignVariations<T>(generateOne: (variation: number) => Promise<T | null>, count: 1 | 3 = 3): Promise<T[]> {
  const results: T[] = [];
  for (let variation = 1; variation <= count; variation++) {
    try {
      const result = await generateOne(variation);
      if (result) results.push(result);
    } catch { /* A failed variant must not discard completed images. */ }
  }
  return results;
}
