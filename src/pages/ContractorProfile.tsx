import { useParams } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import NotFound from "@/pages/NotFound";
import ContractorPublicExperience from "@/features/contractorProfile/public/ContractorPublicExperience";
import { useContractorFullProfile } from "@/hooks/useContractorPublicPage";

type ContractorProfileProps = {
  slug?: string;
};

export default function ContractorProfile({ slug }: ContractorProfileProps) {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useContractorFullProfile(slug ?? id);

  if (isLoading) {
    return <MainLayout><div className="mx-auto min-h-screen max-w-3xl animate-pulse bg-muted" /></MainLayout>;
  }
  if (!data) return <NotFound />;

  return (
    <MainLayout>
      <div className="mx-auto max-w-3xl overflow-hidden border-x border-border/60 shadow-2xl">
        <ContractorPublicExperience profileData={data} />
      </div>
    </MainLayout>
  );
}