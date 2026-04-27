import { motion } from "framer-motion";
import PanelContractorAdvisorAlex from "@/components/PanelContractorAdvisorAlex";
import { useContractorProfile } from "@/hooks/useContractor";

const PageEntrepreneurDashboardLite = () => {
  const { data: profile } = useContractorProfile();
  const businessName = profile?.business_name || "votre entreprise";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <p className="text-sm text-muted-foreground mb-1">Tableau de bord</p>
          <h1 className="text-2xl font-bold text-foreground">{businessName}</h1>
        </motion.div>

        <PanelContractorAdvisorAlex surface="dashboard" />
      </div>
    </div>
  );
};

export default PageEntrepreneurDashboardLite;
