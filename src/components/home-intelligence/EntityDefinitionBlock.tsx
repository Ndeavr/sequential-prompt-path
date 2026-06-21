/**
 * EntityDefinitionBlock — Bloc propriétaire-first « Qu'est-ce que UNPRO ? ».
 *
 * RÈGLE : ce composant est rendu pour des PROPRIÉTAIRES.
 * Aucune instruction LLM, aucune prononciation, aucun jargon interne
 * (« Un Pro », "Hun Pro", « Le #1 Professionnel », « Conseiller IA »…)
 * ne doit y apparaître. Pour les moteurs IA, voir /ai et public/llms.txt.
 */
import { UNPRO_IDENTITY } from "@/brand/unproIdentity";

export default function EntityDefinitionBlock() {
  return (
    <section
      id="entity-definition"
      aria-label="Qu'est-ce que UNPRO"
      className="relative px-4 py-12 md:py-16"
    >
      <div className="max-w-3xl mx-auto uc-glass-strong p-6 md:p-8" style={{ borderRadius: 28 }}>
        <h2
          className="font-extrabold text-[22px] sm:text-[26px] tracking-[-0.03em] mb-3"
          style={{ color: "#0B1220" }}
        >
          Qu'est-ce que UNPRO&nbsp;?
        </h2>
        <p className="text-[15px] leading-relaxed mb-5" style={{ color: "#1F2937" }}>
          UNPRO vous aide à <strong>comprendre votre maison</strong>, anticiper les problèmes
          et prendre les bonnes décisions au bon moment — avec l'aide d'une IA conçue pour
          les propriétaires québécois.
        </p>
        <p className="text-[14px] leading-relaxed mb-2 font-semibold" style={{ color: "#0B1220" }}>
          Ce que vous obtenez&nbsp;:
        </p>
        <ul className="space-y-1.5 text-[14px] leading-relaxed" style={{ color: "#1F2937" }}>
          {UNPRO_IDENTITY.pillars.map((p) => (
            <li key={p.id}>
              · <strong>{p.titleFr}</strong> — {p.tagFr}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
