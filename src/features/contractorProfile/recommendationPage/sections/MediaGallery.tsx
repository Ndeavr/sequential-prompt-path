/**
 * MediaGallery — Photos, videos, before/after. Read-only Phase 1.
 */
import { Image as ImageIcon } from "lucide-react";

interface MediaItem {
  url: string;
  type: "photo" | "video" | "before_after";
  alt?: string;
}

interface Props {
  items: MediaItem[];
  businessName: string;
}

export default function MediaGallery({ items, businessName }: Props) {
  const photos = items.slice(0, 100);

  if (photos.length === 0) {
    return (
      <section aria-labelledby="gallery-heading" className="space-y-3">
        <h2 id="gallery-heading" className="text-lg font-semibold text-foreground">
          Photos et réalisations
        </h2>
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
          <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            L'entreprise ajoutera bientôt ses réalisations.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="gallery-heading" className="space-y-3">
      <h2 id="gallery-heading" className="text-lg font-semibold text-foreground">
        Photos et réalisations
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {photos.map((m, i) => (
          <figure
            key={i}
            className="aspect-square rounded-xl overflow-hidden bg-muted border border-border"
          >
            <img
              src={m.url}
              alt={m.alt || `${businessName} — réalisation ${i + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </figure>
        ))}
      </div>
    </section>
  );
}
