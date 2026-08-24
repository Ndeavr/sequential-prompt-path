// Active homepage = PageHomeLight (homeowner-first light premium surface).
// Legacy homepages (PageHomeSimple, PageHomeCopilot) preserved on disk for
// future flag-based A/B testing.
import PageHomeLight from "@/pages/PageHomeLight";

export default function HomeWithFeatureFlag() {
  return <PageHomeLight />;
}
