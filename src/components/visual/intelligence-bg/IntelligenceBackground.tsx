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
 */
import "./intelligence-bg.css";
import LayerGradientField from "./LayerGradientField";
import LayerHousingMesh from "./LayerHousingMesh";
import LayerDotIntelligenceField from "./LayerDotIntelligenceField";
import LayerFloatingDataOrbs from "./LayerFloatingDataOrbs";
import LayerHouseBlueprintGhost from "./LayerHouseBlueprintGhost";
import LayerNeuralGlow from "./LayerNeuralGlow";
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
  zIndex?: number;
  fixed?: boolean;
}

export default function IntelligenceBackground({
  variant = "default",
  zIndex = 0,
  fixed = false,
}: Props) {
  const tone = variant === "footer" ? "dark" : "light";
  const position = fixed ? "fixed" : "absolute";
  const showBlueprint = variant === "hero" || variant === "passport" || variant === "default";
  const showNeural = variant === "hero" || variant === "alex";

  return (
    <div
      aria-hidden="true"
      className="inset-0 pointer-events-none overflow-hidden"
      style={{ position, zIndex }}
    >
      <LayerGradientField tone={tone} />
      {variant !== "footer" && (
        <LayerHousingMesh opacity={variant === "alex" ? 0.10 : 0.14} />
      )}
      {variant !== "footer" && (
        <LayerDotIntelligenceField
          opacity={variant === "contractors" ? 0.16 : 0.20}
        />
      )}
      {showBlueprint && <LayerHouseBlueprintGhost />}
      <LayerFloatingDataOrbs tone={tone} />
      {showNeural && <LayerNeuralGlow />}

      {variant === "hero" && <HousingKnowledgeGraph />}
      {variant === "passport" && <PassportArchiveDrift />}
      {variant === "alex" && <NeuralHomeIntelligenceField />}
      {variant === "contractors" && <TerritoryRecommendationMesh />}
      {variant === "footer" && <FooterConstellation />}
    </div>
  );
}
