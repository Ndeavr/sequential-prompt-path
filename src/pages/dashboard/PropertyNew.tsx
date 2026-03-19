import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader } from "@/components/shared";
import PropertyForm from "@/components/property/PropertyForm";

const PropertyNew = () => {
  return (
    <DashboardLayout>
      <PageHeader
        title="Nouvelle propriété"
        description="Créez un Passeport Maison pour centraliser vos informations"
      />
      <div className="max-w-2xl rounded-2xl border border-border/40 bg-card p-5 sm:p-6">
        <PropertyForm />
      </div>
    </DashboardLayout>
  );
};

export default PropertyNew;
