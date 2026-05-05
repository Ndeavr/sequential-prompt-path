/**
 * AlexActionRenderer — Renders inline UI cards Alex pushed into the conversation.
 */
import { useAlexVisualStore } from "./visualStore";
import UploadZone from "./UploadZone";
import VisualStyleComparison from "./VisualStyleComparison";
import BeforeAfterViewer from "./BeforeAfterViewer";
import ContractorIntakePanel from "../contractor/ContractorIntakePanel";
import ContractorGrowthDashboard from "../contractor/ContractorGrowthDashboard";
import PlanRecommendationTable from "../contractor/PlanRecommendationTable";
import GrowthPathTable from "../contractor/GrowthPathTable";
import CheckoutPanel from "../contractor/CheckoutPanel";

export default function AlexActionRenderer() {
  const actions = useAlexVisualStore((s) => s.actions);
  if (!actions.length) return null;

  return (
    <div className="space-y-3">
      {actions.map((a) => {
        if (a.type === "upload_zone") {
          return <UploadZone key={a.id} actionId={a.id} {...a.payload} />;
        }
        if (a.type === "visual_style_comparison") {
          return <VisualStyleComparison key={a.id} actionId={a.id} data={a.payload} />;
        }
        if (a.type === "before_after") {
          return (
            <div key={a.id} className="space-y-1.5">
              <p className="text-xs font-medium text-foreground">{a.payload.label} — Avant / Après</p>
              <BeforeAfterViewer before={a.payload.before} after={a.payload.after} />
            </div>
          );
        }
        if (a.type === "contractor_intake") {
          return <ContractorIntakePanel key={a.id} actionId={a.id} />;
        }
        if (a.type === "contractor_growth_dashboard") {
          return <ContractorGrowthDashboard key={a.id} actionId={a.id} />;
        }
        if (a.type === "contractor_plan_table") {
          return <PlanRecommendationTable key={a.id} actionId={a.id} />;
        }
        if (a.type === "contractor_growth_path") {
          return <GrowthPathTable key={a.id} />;
        }
        if (a.type === "contractor_checkout") {
          return <CheckoutPanel key={a.id} actionId={a.id} plan_code={a.payload?.plan_code || "premium"} />;
        }
        return null;
      })}
    </div>
  );
}
