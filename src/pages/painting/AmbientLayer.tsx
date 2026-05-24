import type { ProjectCategory, ApplicationMethod } from "@/features/paintingCalculator/projectCatalog";

/**
 * Pure CSS ambient effects per category. Respects prefers-reduced-motion via
 * the global stylesheet. Sits behind the main content.
 */
export default function AmbientLayer({
  category,
  method,
}: {
  category?: ProjectCategory;
  method?: ApplicationMethod;
}) {
  if (!category) return null;

  const layers: JSX.Element[] = [];

  switch (category) {
    case "deck_wood":
      layers.push(
        <div
          key="wood"
          className="absolute inset-0 opacity-[0.07]"
          style={{
            background:
              "repeating-linear-gradient(90deg, #6b3a1a 0px, #6b3a1a 18px, #4a2710 18px, #4a2710 22px, #5a3217 22px, #5a3217 60px)",
          }}
        />,
      );
      break;
    case "metal_specialty":
      layers.push(
        <div
          key="metal"
          className="absolute inset-0 opacity-[0.08]"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(180,200,220,0.6), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(220,220,230,0.4), transparent 60%)",
          }}
        />,
      );
      break;
    case "pool":
      layers.push(
        <div
          key="pool"
          className="absolute inset-0 opacity-[0.10] animate-pulse"
          style={{
            background:
              "radial-gradient(circle at 20% 30%, rgba(34,211,238,0.5), transparent 40%), radial-gradient(circle at 80% 70%, rgba(56,189,248,0.4), transparent 50%)",
          }}
        />,
      );
      break;
    case "asphalt":
      layers.push(
        <div
          key="asph"
          className="absolute inset-0 opacity-[0.10]"
          style={{
            background:
              "linear-gradient(180deg, #050816 0%, #0a0a14 100%), repeating-linear-gradient(90deg, transparent 0 80px, rgba(250,204,21,0.4) 80px 100px, transparent 100px 200px)",
          }}
        />,
      );
      break;
    case "paver_sealing":
      layers.push(
        <div
          key="pave"
          className="absolute inset-0 opacity-[0.06]"
          style={{
            background:
              "repeating-linear-gradient(45deg, #92400e 0 28px, #78350f 28px 32px), repeating-linear-gradient(-45deg, transparent 0 28px, rgba(0,0,0,0.3) 28px 32px)",
          }}
        />,
      );
      break;
    case "roof_nano":
      layers.push(
        <div
          key="nano"
          className="absolute inset-0 opacity-[0.10]"
          style={{
            background:
              "linear-gradient(135deg, transparent 0%, rgba(59,130,246,0.4) 40%, rgba(34,211,238,0.4) 60%, transparent 100%)",
          }}
        />,
      );
      break;
    case "exterior":
      layers.push(
        <div
          key="ext"
          className="absolute inset-0 opacity-[0.06]"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(34,211,238,0.3), transparent 70%)",
          }}
        />,
      );
      break;
    default:
      break;
  }

  if (method === "spray" || method === "airless") {
    layers.push(
      <div
        key="spray"
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 20%, white 1px, transparent 1px), radial-gradient(circle at 60% 70%, white 1px, transparent 1px), radial-gradient(circle at 40% 90%, white 1px, transparent 1px)",
          backgroundSize: "120px 120px",
        }}
      />,
    );
  }

  return <div className="pointer-events-none absolute inset-0 overflow-hidden">{layers}</div>;
}
