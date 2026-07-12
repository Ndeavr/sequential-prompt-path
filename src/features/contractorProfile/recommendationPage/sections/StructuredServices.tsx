/**
 * StructuredServices — Chips only, no free text.
 */
interface Props {
  services: string[];
}

export default function StructuredServices({ services }: Props) {
  if (!services.length) return null;
  return (
    <section aria-labelledby="services-heading" className="space-y-3">
      <h2 id="services-heading" className="text-lg font-semibold text-foreground">
        Services
      </h2>
      <div className="flex flex-wrap gap-2">
        {services.map((s) => (
          <span
            key={s}
            className="px-3 py-1.5 rounded-full bg-card border border-border text-sm text-foreground"
          >
            {s}
          </span>
        ))}
      </div>
    </section>
  );
}
