/**
 * UNPRO — Admin Pricing Dashboard Page
 */
import AdminPricingControls from "@/components/pricing/AdminPricingControls";

export default function AdminPricingPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <main className="p-4 lg:p-6 max-w-6xl mx-auto">
        <AdminPricingControls />
      </main>
    </div>
  );
}
