import MultiAgentImportAnimation from "@/components/signature/MultiAgentImportAnimation";

interface Props {
  progress: number;
  modules: any[];
  businessName: string;
  website: string;
}

export default function StepImportExecution({ progress, modules, businessName, website }: Props) {
  return (
    <MultiAgentImportAnimation
      progress={progress}
      modules={modules}
      businessName={businessName || "Entreprise"}
      city=""
      website={website}
    />
  );
}
