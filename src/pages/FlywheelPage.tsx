import MainLayout from "@/layouts/MainLayout";
import { FlywheelSection } from "@/components/flywheel/FlywheelSection";

const FlywheelPage = () => (
  <MainLayout>
    <div className="dark bg-background min-h-screen">
      <FlywheelSection />
    </div>
  </MainLayout>
);

export default FlywheelPage;
