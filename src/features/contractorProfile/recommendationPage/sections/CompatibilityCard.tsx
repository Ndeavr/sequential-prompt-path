/**
 * CompatibilityCard — UNPRO-only "Compatible avec / Moins adapté pour".
 */
interface Props {
  fits: string[];
  not_fits: string[];
}

export default function CompatibilityCard({ fits, not_fits }: Props) {
  if (!fits.length && !not_fits.length) return null;
  return (
    <section aria-labelledby="compat-heading" className="space-y-3">
      <h2 id="compat-heading" className="text-lg font-semibold text-foreground">
        Compatibilité
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        {fits.length > 0 && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="text-xs uppercase tracking-wide text-primary mb-2">Compatible avec</div>
            <ul className="space-y-1.5">
              {fits.map((f) => (
                <li key={f} className="text-sm text-foreground flex gap-2">
                  <span className="text-primary">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
        {not_fits.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
              Moins adapté pour
            </div>
            <ul className="space-y-1.5">
              {not_fits.map((f) => (
                <li key={f} className="text-sm text-muted-foreground flex gap-2">
                  <span>✗</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
