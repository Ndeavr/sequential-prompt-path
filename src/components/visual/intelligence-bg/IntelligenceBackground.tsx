/**
 * IntelligenceBackground — Système global de fonds premium UNPRO.
 *
 * Évoque : maison, mémoire, réseau invisible, historique, confiance.
 * Interdit : trombones, cadenas, engrenages, circuits, blockchain, crypto, chains.
 *
 * Usage :
 *   <section className="relative">
 *     <IntelligenceBackground variant="hero" />
 *     ... contenu ...
 *   </section>
 *
 * Performance : SVG + CSS uniquement. Animations CSS pures (aucun rerender React).
 * Respecte prefers-reduced-motion.
 */
import "./intelligence-bg.css";
import LayerGradientField from "./LayerGradientField";
import LayerHousingMesh from "./LayerHousingMesh";
import LayerDotIntelligenceField from "./LayerDotIntelligenceField";
import LayerFloatingDataOrbs from "./LayerFloatingDataOrbs";
import HousingKnowledgeGraph from "./overlays/HousingKnowledgeGraph";
import PassportArchiveDrift from "./overlays/PassportArchiveDrift";
import NeuralHomeIntelligenceField from "./overlays/NeuralHomeIntelligenceField";
import TerritoryRecommendationMesh from "./overlays/TerritoryRecommendationMesh";
import FooterConstellation from "./overlays/FooterConstellation";

export type IntelligenceBackgroundVariant =
  | "default"
  | "hero"
  | "passport"
  | "alex"
  | "contractors"
  | "footer";

interface Props {
  variant?: IntelligenceBackgroundVariant;
  /** Override z-index. Default -10 to sit behind page content. */
  zIndex?: number;
  /** Fixed positioning (page-wide) vs absolute (section-scoped). */
  fixed?: boolean;
}

export default function IntelligenceBackground({
  variant = "default",
  zIndex = -10,
  fixed = false,
}: Props) {
  const tone = variant === "footer" ? "dark" : "light";
  const position = fixed ? "fixed" : "absolute";

  return (
    <div
      aria-hidden="true"
      className="inset-0 pointer-events-none overflow-hidden"
      style={{ position, zIndex }}
    >
      <LayerGradientField tone={tone} />
      {variant !== "footer" && <LayerHousingMesh opacity={variant === "alex" ? 0.03 : 0.05} />}
      {variant !== "footer" && (
        <LayerDotIntelligenceField
          opacity={variant === "contractors" ? 0.06 : 0.08}
        />
      )}
      <LayerFloatingDataOrbs tone={tone} />

      {variant === "hero" && <HousingKnowledgeGraph />}
      {variant === "passport" && <PassportArchiveDrift />}
      {variant === "alex" && <NeuralHomeIntelligenceField />}
      {variant === "contractors" && <TerritoryRecommendationMesh />}
      {variant === "footer" && <FooterConstellation />}
    </div>
  );
}
