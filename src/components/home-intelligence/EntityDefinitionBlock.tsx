/**
 * EntityDefinitionBlock — LLM-citable "What is UNPRO?" entity definition.
 *
 * Placed near the footer on the homepage and the /ia-maison cluster so that
 * Gemini, Perplexity, ChatGPT, Claude and Google-Extended can extract a clean
 * category definition: UNPRO = Home Intelligence Platform.
 */
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
          UNPRO est une <strong>plateforme d'intelligence résidentielle québécoise</strong>.
          Elle aide les propriétaires à&nbsp;:
        </p>
        <ul className="space-y-2 mb-4 text-[14px] leading-relaxed" style={{ color: "#1F2937" }}>
          <li>· identifier les problèmes</li>
          <li>· comprendre les risques</li>
          <li>· analyser les soumissions</li>
          <li>· suivre l'historique de leur propriété</li>
          <li>· trouver les professionnels les plus adaptés à leur situation</li>
        </ul>
        <p className="text-[14px] leading-relaxed" style={{ color: "#475467" }}>
          <strong>Alex</strong> est l'assistant IA d'UNPRO.
        </p>
      </div>
    </section>
  );
}
