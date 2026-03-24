import { useAuth } from "@/hooks/useAuth";
import AuthorityHero from "@/components/authority/AuthorityHero";
import AuthorityTaskEngine from "@/components/authority/AuthorityTaskEngine";
import AuthorityContentEngine from "@/components/authority/AuthorityContentEngine";
import AuthorityDistributionMap from "@/components/authority/AuthorityDistributionMap";
import AuthoritySignalsFeed from "@/components/authority/AuthoritySignalsFeed";
import AuthorityAlexPanel from "@/components/authority/AuthorityAlexPanel";
import AuthorityPerformance from "@/components/authority/AuthorityPerformance";
import AuthorityAuraBackground from "@/components/authority/AuthorityAuraBackground";

export default function AuthorityDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <AuthorityAuraBackground />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Hero — Authority Score */}
        <AuthorityHero userId={user?.id} />

        {/* Alex AI Control */}
        <AuthorityAlexPanel userId={user?.id} />

        {/* Task Engine */}
        <AuthorityTaskEngine userId={user?.id} />

        {/* Content + Signals side by side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AuthorityContentEngine userId={user?.id} />
          <AuthoritySignalsFeed userId={user?.id} />
        </div>

        {/* Distribution Map */}
        <AuthorityDistributionMap userId={user?.id} />

        {/* Performance Charts */}
        <AuthorityPerformance userId={user?.id} />
      </div>
    </div>
  );
}
