/**
 * FactGrid — every known company fact with explicit provenance.
 * Degrades elegantly: no facts => the section is simply not rendered.
 */
import type { ProfileFact } from "../types";
import ProvenanceChip from "./ProvenanceChip";

export default function FactGrid({ facts }: { facts: ProfileFact[] }) {
  if (!facts.length) return null;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <h2 className="text-sm font-semibold text-white">Ce que UNPRO sait déjà de votre entreprise</h2>
      <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {facts.map((f) => (
          <div key={f.key} className="min-w-0">
            <dt className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-white/45">
              {f.label}
              <ProvenanceChip provenance={f.provenance} source={f.source} />
            </dt>
            <dd className="mt-0.5 truncate text-[14px] font-medium text-white/90" title={f.value}>
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
