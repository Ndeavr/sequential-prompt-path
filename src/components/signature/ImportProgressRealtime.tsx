/**
 * ImportProgressRealtime — Multi-agent overlapping import animation.
 */
import type { ImportModule } from "@/pages/signature/PageAlexGuidedOnboarding";
import MultiAgentImportAnimation from "./MultiAgentImportAnimation";

interface Props {
  progress: number;
  modules?: ImportModule[];
  businessName?: string;
  city?: string;
  website?: string;
}

export default function ImportProgressRealtime({ progress, modules, businessName, city, website }: Props) {
  return (
    <MultiAgentImportAnimation
      progress={progress}
      modules={modules}
      businessName={businessName}
      city={city}
      website={website}
    />
  );
}
