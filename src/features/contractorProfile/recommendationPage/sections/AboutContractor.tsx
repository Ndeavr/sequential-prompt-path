/**
 * AboutContractor — Mission / approach / values.
 */
interface Props {
  contractor: any;
}

export default function AboutContractor({ contractor: c }: Props) {
  const hasContent =
    !!c.description || !!c.mission || !!c.approach || !!c.values_text;
  if (!hasContent) return null;

  return (
    <section aria-labelledby="about-heading" className="space-y-3">
      <h2 id="about-heading" className="text-lg font-semibold text-foreground">
        À propos de {c.business_name}
      </h2>
      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        {c.description && (
          <p className="text-sm text-foreground/90 leading-relaxed">{c.description}</p>
        )}
        {c.mission && (
          <Block title="Mission" body={c.mission} />
        )}
        {c.approach && (
          <Block title="Approche" body={c.approach} />
        )}
        {c.values_text && (
          <Block title="Valeurs" body={c.values_text} />
        )}
      </div>
    </section>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{title}</div>
      <p className="text-sm text-foreground/90 leading-relaxed">{body}</p>
    </div>
  );
}
