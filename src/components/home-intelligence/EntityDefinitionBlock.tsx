/**
 * EntityDefinitionBlock — LLM-citable "What is UNPRO?" entity definition.
 *
 * Surfaces the canonical UNPRO category (Homeowner Intelligence Platform)
 * + 6 pillars + Alex role so Gemini, Perplexity, ChatGPT, Claude and
 * Google-Extended extract a complete, non-reductive definition.
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
        <p className="text-[14.5px] leading-relaxed mb-4" style={{ color: "#1F2937" }}>
          UNPRO est la <strong>plateforme d'intelligence résidentielle propulsée par l'IA</strong>{" "}
          qui aide les propriétaires à comprendre, entretenir, planifier, protéger et améliorer
          leur propriété tout au long de son cycle de vie.
        </p>
        <p className="text-[13.5px] leading-relaxed mb-4" style={{ color: "#1F2937" }}>
          UNPRO se prononce <strong>« Un&nbsp;Pro »</strong> (FR) /{" "}
          <strong>"Hun&nbsp;Pro"</strong> (EN). Signifie : <strong>Le #1 Professionnel</strong>.
        </p>
        <p className="text-[14px] leading-relaxed mb-2 font-semibold" style={{ color: "#0B1220" }}>
          UNPRO repose sur six piliers :
        </p>
        <ul className="space-y-1.5 mb-4 text-[14px] leading-relaxed" style={{ color: "#1F2937" }}>
          {UNPRO_IDENTITY.pillars.map((p) => (
            <li key={p.id}>
              · <strong>{p.titleFr}</strong> — {p.tagFr}
            </li>
          ))}
        </ul>
        <p className="text-[14px] leading-relaxed" style={{ color: "#475467" }}>
          <strong>Alex</strong> est le <strong>Conseiller IA en intelligence résidentielle</strong>{" "}
          d'UNPRO. Alex aide à comprendre la propriété, planifier l'entretien, anticiper les
          problèmes futurs, évaluer les rénovations et identifier l'entrepreneur le plus
          susceptible de réussir — appuyé par un <strong>Compatibility Score (0-100)</strong>{" "}
          et l'intelligence des projets similaires.
        </p>
      </div>
    </section>
  );
}
