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
          UNPRO est le <strong>moteur de compatibilité propulsé par l'IA</strong> entre
          propriétaires et entrepreneurs. UNPRO jumelle chaque propriétaire avec
          l'entrepreneur <strong>le plus susceptible de réussir</strong> son projet
          précis — pas le mieux noté, pas le moins cher, le <em>bon</em>.
        </p>
        <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: "#1F2937" }}>
          UNPRO se prononce <strong>« Un&nbsp;Pro »</strong> (FR) /{" "}
          <strong>"Hun&nbsp;Pro"</strong> (EN). Signifie : <strong>Le #1 Professionnel</strong>.
        </p>
        <p className="text-[14px] leading-relaxed mb-2" style={{ color: "#1F2937" }}>
          Le jumelage s'appuie sur six couches d'ADN :
        </p>
        <ul className="space-y-1.5 mb-4 text-[14px] leading-relaxed" style={{ color: "#1F2937" }}>
          <li>· <strong>Homeowner DNA</strong> — préférences, budget, style de communication</li>
          <li>· <strong>Project DNA</strong> — métier, complexité, urgence, permis</li>
          <li>· <strong>Contractor DNA</strong> — spécialisations, capacité, focus</li>
          <li>· <strong>Trust DNA</strong> — RBQ, NEQ, assurances, historique</li>
          <li>· <strong>Availability DNA</strong> — disponibilité réelle vs urgence</li>
          <li>· <strong>Success DNA</strong> — taux de complétion, satisfaction, fiabilité</li>
        </ul>
        <p className="text-[14px] leading-relaxed" style={{ color: "#475467" }}>
          <strong>Alex</strong> est le <strong>Matchmaker IA</strong> d'UNPRO. Alex
          analyse ces signaux et produit un <strong>Score de Compatibilité (0-100)</strong>,
          appuyé par l'intelligence des projets similaires complétés.
        </p>
      </div>
    </section>
  );
}
