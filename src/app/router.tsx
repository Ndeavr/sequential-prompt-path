import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import PlaceholderPage from "@/pages/PlaceholderPage";
import StartPage from "@/pages/StartPage";
import ScrollRestoration from "@/components/ScrollRestoration";

// Public
import Home from "@/pages/Home";
import Search from "@/pages/Search";
import ContractorProfile from "@/pages/ContractorProfile";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import NotFound from "@/pages/NotFound";
import HomeownersPage from "@/pages/HomeownersPage";
import ProfessionalsPage from "@/pages/ProfessionalsPage";
import PartnersPage from "@/pages/PartnersPage";
import DescribeProjectPage from "@/pages/DescribeProjectPage";
import CompareQuotesPage from "@/pages/CompareQuotesPage";
import ContractorOnboardingPage from "@/pages/ContractorOnboardingPage";
import OnboardingFlow from "@/pages/OnboardingFlow";
import PricingPage from "@/pages/PricingPage";
import AIPPScorePage from "@/pages/AIPPScorePage";
import MatchingResultsPage from "@/pages/MatchingResultsPage";
import ContractorComparisonPage from "@/pages/ContractorComparisonPage";
import DecisionAssistantPage from "@/pages/DecisionAssistantPage";

// SEO Pages
import ServiceLocationPage from "@/pages/seo/ServiceLocationPage";
import ProblemLocationPage from "@/pages/seo/ProblemLocationPage";
import GuidePage from "@/pages/seo/GuidePage";
import SeoDirectoryPage from "@/pages/seo/SeoDirectoryPage";
import ProblemPage from "@/pages/seo/ProblemPage";
import ProblemGraphPage from "@/pages/seo/ProblemGraphPage";
import SolutionPage from "@/pages/seo/SolutionPage";
import ProfessionPage from "@/pages/seo/ProfessionPage";
import CityPage from "@/pages/seo/CityPage";
import VillePage from "@/pages/seo/VillePage";
import QuartierPage from "@/pages/seo/QuartierPage";
import RuePage from "@/pages/seo/RuePage";
import ProblemeLocationFrPage from "@/pages/seo/ProblemeLocationFrPage";
import PropertyGraphPage from "@/pages/PropertyGraphPage";
import AlexChat from "@/pages/AlexChat";
import FlywheelPage from "@/pages/FlywheelPage";
import EnergyPage from "@/pages/EnergyPage";
import PreventiveMaintenancePage from "@/pages/PreventiveMaintenancePage";
import CoproprietePage from "@/pages/CoproprietePage";
import BuildingIntelligenceMap from "@/pages/BuildingIntelligenceMap";
import AnswerEnginePage from "@/pages/AnswerEnginePage";
import BusinessImportPage from "@/pages/BusinessImportPage";
import GmbLinkPage from "@/pages/GmbLinkPage";
import ContractorQuestionnairePage from "@/pages/ContractorQuestionnairePage";
import VerifyContractorPage from "@/pages/VerifyContractorPage";
import VerifyLandingPage from "@/pages/VerifyLandingPage";
import PublicPropertyPage from "@/pages/PublicPropertyPage";
import PropertyPassportPage from "@/pages/dashboard/PropertyPassportPage";
import PropertyGrantsPage from "@/pages/dashboard/PropertyGrantsPage";
import MessageCenterPage from "@/pages/dashboard/MessageCenterPage";
import ProjectMatchesPage from "@/pages/dashboard/ProjectMatchesPage";
import QrScanPage from "@/pages/QrScanPage";
import ContributionApprovalPage from "@/pages/dashboard/ContributionApprovalPage";
import ListingImportPage from "@/pages/ListingImportPage";
import PublicScoreCalculatorPage from "@/pages/PublicScoreCalculatorPage";
import PropertyReportPage from "@/pages/dashboard/PropertyReportPage";
import RenovationVisualizerPage from "@/pages/RenovationVisualizerPage";
import RenovationLocationPage from "@/pages/seo/RenovationLocationPage";
import DiscoveryFeedPage from "@/pages/DiscoveryFeedPage";
import VerifierEntrepreneurPage from "@/pages/VerifierEntrepreneurPage";
import AnalyzeDocumentPage from "@/pages/AnalyzeDocumentPage";
import TransformationDetailPage from "@/pages/TransformationDetailPage";
import TrendingPage from "@/pages/TrendingPage";
import PropertyMapPage from "@/pages/PropertyMapPage";
import VerificationSeoPage from "@/pages/seo/VerificationSeoPage";
import AlignmentQuestionnairePage from "@/pages/AlignmentQuestionnairePage";

// Condos
import CondoHomePage from "@/pages/condos/CondoHomePage";
import CondoLoi16Page from "@/pages/condos/CondoLoi16Page";
import CondoCarnetPage from "@/pages/condos/CondoCarnetPage";
import CondoFondsPage from "@/pages/condos/CondoFondsPage";
import CondoAttestationPage from "@/pages/condos/CondoAttestationPage";
import CondoTarifsPage from "@/pages/condos/CondoTarifsPage";
import CondoOnboardingPage from "@/pages/condos/CondoOnboardingPage";
import CondoDashboardPage from "@/pages/condos/CondoDashboardPage";
import CondoBuildingPage from "@/pages/condos/CondoBuildingPage";
import CondoComponentsPage from "@/pages/condos/CondoComponentsPage";
import CondoMaintenancePage from "@/pages/condos/CondoMaintenancePage";
import CondoDocumentsPage from "@/pages/condos/CondoDocumentsPage";
import CondoReserveFundPage from "@/pages/condos/CondoReserveFundPage";
import CondoQuotesPage from "@/pages/condos/CondoQuotesPage";
import CondoReportsPage from "@/pages/condos/CondoReportsPage";
import CondoBillingPage from "@/pages/condos/CondoBillingPage";

// Homeowner Dashboard
import DashboardHome from "@/pages/dashboard/DashboardHome";
import PropertiesList from "@/pages/dashboard/PropertiesList";
import PropertyNew from "@/pages/dashboard/PropertyNew";
import PropertyDetail from "@/pages/dashboard/PropertyDetail";
import QuotesList from "@/pages/dashboard/QuotesList";
import QuoteUploadPage from "@/pages/dashboard/QuoteUploadPage";
import QuoteDetail from "@/pages/dashboard/QuoteDetail";
import HomeScorePage from "@/pages/dashboard/HomeScorePage";
import PropertyInsightsPage from "@/pages/dashboard/PropertyInsightsPage";
import AccountPage from "@/pages/dashboard/AccountPage";
import HomeownerAppointments from "@/pages/dashboard/HomeownerAppointments";
import BookingPage from "@/pages/dashboard/BookingPage";
import DocumentUploadPage from "@/pages/dashboard/DocumentUploadPage";
import ProjectNewPage from "@/pages/dashboard/ProjectNewPage";
import SyndicateDashboard from "@/pages/dashboard/SyndicateDashboard";
import SyndicateDetailDashboard from "@/pages/dashboard/SyndicateDetailDashboard";
import SyndicateReserveFund from "@/pages/dashboard/SyndicateReserveFund";
import ReserveFundAnalyzer from "@/pages/dashboard/ReserveFundAnalyzer";
import SyndicateMaintenance from "@/pages/dashboard/SyndicateMaintenance";
import SyndicateVotes from "@/pages/dashboard/SyndicateVotes";
import SyndicateVoteCreate from "@/pages/dashboard/SyndicateVoteCreate";
import SyndicateGrowthDashboard from "@/pages/dashboard/SyndicateGrowthDashboard";

// Contractor Pro
import ProDashboard from "@/pages/pro/ProDashboard";
import ProProfile from "@/pages/pro/ProProfile";
import ProAIPPScore from "@/pages/pro/ProAIPPScore";
import ProReviews from "@/pages/pro/ProReviews";
import ProDocuments from "@/pages/pro/ProDocuments";
import ProAccount from "@/pages/pro/ProAccount";
import ProAppointments from "@/pages/pro/ProAppointments";
import ProLeads from "@/pages/pro/ProLeads";
import ProLeadDetail from "@/pages/pro/ProLeadDetail";
import ProBilling from "@/pages/pro/ProBilling";
import ProTerritories from "@/pages/pro/ProTerritories";

// Admin
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminContractors from "@/pages/admin/AdminContractors";
import AdminQuotes from "@/pages/admin/AdminQuotes";
import AdminReviews from "@/pages/admin/AdminReviews";
import AdminDocuments from "@/pages/admin/AdminDocuments";
import AdminContractorDetail from "@/pages/admin/AdminContractorDetail";
import AdminAppointments from "@/pages/admin/AdminAppointments";
import AdminLeads from "@/pages/admin/AdminLeads";
import AdminTerritories from "@/pages/admin/AdminTerritories";
import AdminGrowth from "@/pages/admin/AdminGrowth";
import AdminAgents from "@/pages/admin/AdminAgents";
import AdminMedia from "@/pages/admin/AdminMedia";
import AdminValidation from "@/pages/admin/AdminValidation";
import AdminAnswerEngine from "@/pages/admin/AdminAnswerEngine";
import AdminOperationsHub from "@/pages/admin/AdminOperationsHub";
import AdminVerificationRuns from "@/pages/admin/AdminVerificationRuns";
import AdminVerificationRunDetail from "@/pages/admin/AdminVerificationRunDetail";
import AdminAlerts from "@/pages/admin/AdminAlerts";
import AdminVerifiedContractors from "@/pages/admin/AdminVerifiedContractors";
import AdminDuplicates from "@/pages/admin/AdminDuplicates";
import AdminAutomation from "@/pages/admin/AdminAutomation";
import AdminHomeGraph from "@/pages/admin/AdminHomeGraph";
import AdminUOS from "@/pages/admin/AdminUOS";

export const AppRouter = () => (
  <BrowserRouter>
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route path="/search" element={<Search />} />
      <Route path="/contractors/:id" element={<ContractorProfile />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/start" element={<StartPage />} />
      <Route path="/homeowners" element={<HomeownersPage />} />
      <Route path="/proprietaires" element={<HomeownersPage />} />
      <Route path="/professionals" element={<ProfessionalsPage />} />
      <Route path="/entrepreneurs" element={<ProfessionalsPage />} />
      <Route path="/partners" element={<PartnersPage />} />
      <Route path="/describe-project" element={<DescribeProjectPage />} />
      <Route path="/compare-quotes" element={<CompareQuotesPage />} />
      <Route path="/contractor-onboarding" element={<ContractorOnboardingPage />} />
      <Route path="/onboarding" element={<OnboardingFlow />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/aipp-score" element={<AIPPScorePage />} />
      <Route path="/matching" element={<ProtectedRoute requiredRole="homeowner"><MatchingResultsPage /></ProtectedRoute>} />
      <Route path="/comparer" element={<ContractorComparisonPage />} />
      <Route path="/decision" element={<ProtectedRoute requiredRole="homeowner"><DecisionAssistantPage /></ProtectedRoute>} />
      <Route path="/alignment" element={<ProtectedRoute requiredRole="homeowner"><AlignmentQuestionnairePage /></ProtectedRoute>} />

      {/* Property Graph */}
      <Route path="/property-graph" element={<PropertyGraphPage />} />
      <Route path="/alex" element={<AlexChat />} />
      <Route path="/alex/renovation" element={<RenovationVisualizerPage />} />
      <Route path="/inspirations" element={<DiscoveryFeedPage />} />
      <Route path="/transformations/:id" element={<TransformationDetailPage />} />
      <Route path="/tendances" element={<TrendingPage />} />
      <Route path="/carte" element={<PropertyMapPage />} />
      <Route path="/flywheel" element={<FlywheelPage />} />
      <Route path="/energy" element={<EnergyPage />} />
      <Route path="/preventive-maintenance" element={<PreventiveMaintenancePage />} />
      <Route path="/copropriete" element={<CoproprietePage />} />
      <Route path="/building-map" element={<BuildingIntelligenceMap />} />
      <Route path="/answers" element={<AnswerEnginePage />} />
      <Route path="/import-business" element={<BusinessImportPage />} />
      <Route path="/verify" element={<VerifyContractorPage />} />
      <Route path="/verifier-entrepreneur" element={<VerifyLandingPage />} />
      <Route path="/verifier-un-entrepreneur" element={<VerifierEntrepreneurPage />} />
      <Route path="/analyser-document" element={<AnalyzeDocumentPage />} />
      <Route path="/verifier-:tradeSlug/:citySlug" element={<VerificationSeoPage />} />
      <Route path="/qr/:token" element={<QrScanPage />} />

      {/* Public Property Page */}
      <Route path="/maison/:slug" element={<PublicPropertyPage />} />
      <Route path="/score-maison" element={<PublicScoreCalculatorPage />} />

      {/* SEO Pages — French-first routes */}
      <Route path="/services" element={<SeoDirectoryPage />} />
      <Route path="/services/:category/:city" element={<ServiceLocationPage />} />
      <Route path="/problemes" element={<ProblemGraphPage />} />
      <Route path="/probleme/:slug" element={<ProblemPage />} />
      <Route path="/probleme/:problem/:city" element={<ProblemeLocationFrPage />} />
      <Route path="/solution/:slug" element={<SolutionPage />} />
      <Route path="/profession/:slug" element={<ProfessionPage />} />
      <Route path="/ville/:slug" element={<VillePage />} />
      <Route path="/quartier/:ville/:quartier" element={<QuartierPage />} />
      <Route path="/rue/:ville/:rue" element={<RuePage />} />
      <Route path="/guides/:topic" element={<GuidePage />} />
      <Route path="/renovation/:projectSlug/:citySlug" element={<RenovationLocationPage />} />

      {/* Legacy English routes */}
      <Route path="/problems/:slug" element={<ProblemPage />} />
      <Route path="/problems/:problem/:city" element={<ProblemLocationPage />} />
      <Route path="/solutions/:slug" element={<SolutionPage />} />
      <Route path="/city/:slug" element={<CityPage />} />

      {/* ─── Placeholder public pages (navigation links) ─── */}
      <Route path="/proprietaires/passeport-maison" element={<PlaceholderPage />} />
      <Route path="/proprietaires/score-maison" element={<PlaceholderPage />} />
      <Route path="/outils-ia" element={<PlaceholderPage />} />
      <Route path="/services/isolation-grenier" element={<PlaceholderPage />} />
      <Route path="/services/toiture" element={<PlaceholderPage />} />
      <Route path="/services/fondation" element={<PlaceholderPage />} />
      <Route path="/services/fenetres" element={<PlaceholderPage />} />
      <Route path="/services/chauffage" element={<PlaceholderPage />} />
      <Route path="/entrepreneurs/creer-mon-profil" element={<PlaceholderPage />} />
      <Route path="/entrepreneurs/pages-ia" element={<PlaceholderPage />} />
      <Route path="/entrepreneurs/score-aipp" element={<PlaceholderPage />} />
      <Route path="/entrepreneurs/profil-public" element={<PlaceholderPage />} />
      <Route path="/entrepreneurs/matching" element={<PlaceholderPage />} />
      <Route path="/entrepreneurs/badges" element={<PlaceholderPage />} />
      <Route path="/entrepreneurs/demo" element={<PlaceholderPage />} />
      <Route path="/entrepreneurs/ambassadeur" element={<PlaceholderPage />} />
      <Route path="/ambassadeurs" element={<PlaceholderPage />} />
      <Route path="/aide" element={<PlaceholderPage />} />
      <Route path="/professionnels" element={<PlaceholderPage />} />
      <Route path="/villes" element={<PlaceholderPage />} />
      <Route path="/guides" element={<PlaceholderPage />} />
      <Route path="/blog" element={<PlaceholderPage />} />
      <Route path="/conseils-renovation" element={<PlaceholderPage />} />
      <Route path="/faq" element={<PlaceholderPage />} />
      <Route path="/comment-ca-marche" element={<PlaceholderPage />} />
      <Route path="/verification" element={<PlaceholderPage />} />
      <Route path="/nos-standards" element={<PlaceholderPage />} />
      <Route path="/pourquoi-pas-3-soumissions" element={<PlaceholderPage />} />
      <Route path="/a-propos" element={<PlaceholderPage />} />
      <Route path="/partenaires" element={<PlaceholderPage />} />
      <Route path="/contact" element={<PlaceholderPage />} />
      <Route path="/conditions" element={<PlaceholderPage />} />
      <Route path="/confidentialite" element={<PlaceholderPage />} />
      <Route path="/cookies" element={<PlaceholderPage />} />
      <Route path="/sitemap" element={<PlaceholderPage />} />
      <Route path="/accessibilite" element={<PlaceholderPage />} />

      {/* ─── Placeholder condo pages ─── */}
      <Route path="/condo/passeport" element={<PlaceholderPage />} />
      <Route path="/condo/documents" element={<PlaceholderPage />} />
      <Route path="/condo/dashboard" element={<PlaceholderPage />} />
      <Route path="/condo/dossier" element={<PlaceholderPage />} />
      <Route path="/condo/travaux" element={<PlaceholderPage />} />
      <Route path="/condo/historique" element={<PlaceholderPage />} />
      <Route path="/condo/inviter" element={<PlaceholderPage />} />
      <Route path="/condo/loi-16" element={<CondoLoi16Page />} />
      <Route path="/condo/inspection" element={<PlaceholderPage />} />
      <Route path="/condo/guides" element={<PlaceholderPage />} />

      {/* ─── Placeholder pro pages ─── */}
      <Route path="/pro/stats" element={<PlaceholderPage />} />
      <Route path="/pro/visibility" element={<PlaceholderPage />} />
      <Route path="/pro/recommendations" element={<PlaceholderPage />} />
      <Route path="/dashboard/maintenance" element={<PlaceholderPage />} />

      {/* Homeowner Dashboard */}
      <Route path="/dashboard" element={<ProtectedRoute requiredRole="homeowner"><DashboardHome /></ProtectedRoute>} />
      <Route path="/dashboard/properties" element={<ProtectedRoute requiredRole="homeowner"><PropertiesList /></ProtectedRoute>} />
      <Route path="/dashboard/properties/new" element={<ProtectedRoute requiredRole="homeowner"><PropertyNew /></ProtectedRoute>} />
      <Route path="/dashboard/properties/:id" element={<ProtectedRoute requiredRole="homeowner"><PropertyDetail /></ProtectedRoute>} />
      <Route path="/dashboard/properties/:id/passport" element={<ProtectedRoute requiredRole="homeowner"><PropertyPassportPage /></ProtectedRoute>} />
      <Route path="/dashboard/properties/:id/grants" element={<ProtectedRoute requiredRole="homeowner"><PropertyGrantsPage /></ProtectedRoute>} />
      <Route path="/dashboard/properties/:id/contributions" element={<ProtectedRoute requiredRole="homeowner"><ContributionApprovalPage /></ProtectedRoute>} />
      <Route path="/dashboard/properties/:id/report" element={<ProtectedRoute requiredRole="homeowner"><PropertyReportPage /></ProtectedRoute>} />
      <Route path="/dashboard/import-listing" element={<ProtectedRoute requiredRole="homeowner"><ListingImportPage /></ProtectedRoute>} />
      <Route path="/dashboard/messages" element={<ProtectedRoute requiredRole="homeowner"><MessageCenterPage /></ProtectedRoute>} />
      <Route path="/dashboard/quotes" element={<ProtectedRoute requiredRole="homeowner"><QuotesList /></ProtectedRoute>} />
      <Route path="/dashboard/quotes/upload" element={<ProtectedRoute requiredRole="homeowner"><QuoteUploadPage /></ProtectedRoute>} />
      <Route path="/dashboard/quotes/:id" element={<ProtectedRoute requiredRole="homeowner"><QuoteDetail /></ProtectedRoute>} />
      <Route path="/dashboard/home-score" element={<ProtectedRoute requiredRole="homeowner"><HomeScorePage /></ProtectedRoute>} />
      <Route path="/dashboard/properties/:id/insights" element={<ProtectedRoute requiredRole="homeowner"><PropertyInsightsPage /></ProtectedRoute>} />
      <Route path="/dashboard/account" element={<ProtectedRoute requiredRole="homeowner"><AccountPage /></ProtectedRoute>} />
      <Route path="/dashboard/appointments" element={<ProtectedRoute requiredRole="homeowner"><HomeownerAppointments /></ProtectedRoute>} />
      <Route path="/dashboard/book/:id" element={<ProtectedRoute requiredRole="homeowner"><BookingPage /></ProtectedRoute>} />
      <Route path="/dashboard/documents/upload" element={<ProtectedRoute requiredRole="homeowner"><DocumentUploadPage /></ProtectedRoute>} />
      <Route path="/dashboard/projects/new" element={<ProtectedRoute requiredRole="homeowner"><ProjectNewPage /></ProtectedRoute>} />
      <Route path="/dashboard/projects/:projectId/matches" element={<ProtectedRoute requiredRole="homeowner"><ProjectMatchesPage /></ProtectedRoute>} />
      <Route path="/dashboard/syndicates" element={<ProtectedRoute requiredRole="homeowner"><SyndicateDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/syndicates/:id" element={<ProtectedRoute requiredRole="homeowner"><SyndicateDetailDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/syndicates/:id/reserve" element={<ProtectedRoute requiredRole="homeowner"><SyndicateReserveFund /></ProtectedRoute>} />
      <Route path="/dashboard/syndicates/:id/reserve/analyze" element={<ProtectedRoute requiredRole="homeowner"><ReserveFundAnalyzer /></ProtectedRoute>} />
      <Route path="/dashboard/syndicates/:id/maintenance" element={<ProtectedRoute requiredRole="homeowner"><SyndicateMaintenance /></ProtectedRoute>} />
      <Route path="/dashboard/syndicates/:id/votes" element={<ProtectedRoute requiredRole="homeowner"><SyndicateVotes /></ProtectedRoute>} />
      <Route path="/dashboard/syndicates/:id/votes/new" element={<ProtectedRoute requiredRole="homeowner"><SyndicateVoteCreate /></ProtectedRoute>} />
      <Route path="/dashboard/syndicates/:id/growth" element={<ProtectedRoute requiredRole="homeowner"><SyndicateGrowthDashboard /></ProtectedRoute>} />

      {/* Contractor Pro */}
      <Route path="/pro" element={<ProtectedRoute requiredRole="contractor"><ProDashboard /></ProtectedRoute>} />
      <Route path="/pro/profile" element={<ProtectedRoute requiredRole="contractor"><ProProfile /></ProtectedRoute>} />
      <Route path="/pro/aipp-score" element={<ProtectedRoute requiredRole="contractor"><ProAIPPScore /></ProtectedRoute>} />
      <Route path="/pro/reviews" element={<ProtectedRoute requiredRole="contractor"><ProReviews /></ProtectedRoute>} />
      <Route path="/pro/documents" element={<ProtectedRoute requiredRole="contractor"><ProDocuments /></ProtectedRoute>} />
      <Route path="/pro/account" element={<ProtectedRoute requiredRole="contractor"><ProAccount /></ProtectedRoute>} />
      <Route path="/pro/appointments" element={<ProtectedRoute requiredRole="contractor"><ProAppointments /></ProtectedRoute>} />
      <Route path="/pro/leads" element={<ProtectedRoute requiredRole="contractor"><ProLeads /></ProtectedRoute>} />
      <Route path="/pro/leads/:id" element={<ProtectedRoute requiredRole="contractor"><ProLeadDetail /></ProtectedRoute>} />
      <Route path="/pro/billing" element={<ProtectedRoute requiredRole="contractor"><ProBilling /></ProtectedRoute>} />
      <Route path="/pro/territories" element={<ProtectedRoute requiredRole="contractor"><ProTerritories /></ProtectedRoute>} />
      <Route path="/pro/gmb-link" element={<ProtectedRoute requiredRole="contractor"><GmbLinkPage /></ProtectedRoute>} />
      <Route path="/pro/alignment" element={<ProtectedRoute requiredRole="contractor"><AlignmentQuestionnairePage /></ProtectedRoute>} />
      <Route path="/pro/questionnaire" element={<ProtectedRoute requiredRole="contractor"><ContractorQuestionnairePage /></ProtectedRoute>} />

      {/* Admin */}
      <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute requiredRole="admin"><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/contractors" element={<ProtectedRoute requiredRole="admin"><AdminContractors /></ProtectedRoute>} />
      <Route path="/admin/contractors/:id" element={<ProtectedRoute requiredRole="admin"><AdminContractorDetail /></ProtectedRoute>} />
      <Route path="/admin/quotes" element={<ProtectedRoute requiredRole="admin"><AdminQuotes /></ProtectedRoute>} />
      <Route path="/admin/reviews" element={<ProtectedRoute requiredRole="admin"><AdminReviews /></ProtectedRoute>} />
      <Route path="/admin/documents" element={<ProtectedRoute requiredRole="admin"><AdminDocuments /></ProtectedRoute>} />
      <Route path="/admin/appointments" element={<ProtectedRoute requiredRole="admin"><AdminAppointments /></ProtectedRoute>} />
      <Route path="/admin/leads" element={<ProtectedRoute requiredRole="admin"><AdminLeads /></ProtectedRoute>} />
      <Route path="/admin/territories" element={<ProtectedRoute requiredRole="admin"><AdminTerritories /></ProtectedRoute>} />
      <Route path="/admin/growth" element={<ProtectedRoute requiredRole="admin"><AdminGrowth /></ProtectedRoute>} />
      <Route path="/admin/agents" element={<ProtectedRoute requiredRole="admin"><AdminAgents /></ProtectedRoute>} />
      <Route path="/admin/media" element={<ProtectedRoute requiredRole="admin"><AdminMedia /></ProtectedRoute>} />
      <Route path="/admin/validation" element={<ProtectedRoute requiredRole="admin"><AdminValidation /></ProtectedRoute>} />
      <Route path="/admin/answer-engine" element={<ProtectedRoute requiredRole="admin"><AdminAnswerEngine /></ProtectedRoute>} />
      <Route path="/admin/operations" element={<ProtectedRoute requiredRole="admin"><AdminOperationsHub /></ProtectedRoute>} />
      <Route path="/admin/verification" element={<ProtectedRoute requiredRole="admin"><AdminVerificationRuns /></ProtectedRoute>} />
      <Route path="/admin/verification/:id" element={<ProtectedRoute requiredRole="admin"><AdminVerificationRunDetail /></ProtectedRoute>} />
      <Route path="/admin/alerts" element={<ProtectedRoute requiredRole="admin"><AdminAlerts /></ProtectedRoute>} />
      <Route path="/admin/verified-contractors" element={<ProtectedRoute requiredRole="admin"><AdminVerifiedContractors /></ProtectedRoute>} />
      <Route path="/admin/duplicates" element={<ProtectedRoute requiredRole="admin"><AdminDuplicates /></ProtectedRoute>} />
      <Route path="/admin/automation" element={<ProtectedRoute requiredRole="admin"><AdminAutomation /></ProtectedRoute>} />
      <Route path="/admin/home-graph" element={<ProtectedRoute requiredRole="admin"><AdminHomeGraph /></ProtectedRoute>} />
      <Route path="/admin/uos" element={<ProtectedRoute requiredRole="admin"><AdminUOS /></ProtectedRoute>} />

      {/* Condos — Public SEO */}
      <Route path="/condo" element={<CondoHomePage />} />
      <Route path="/condo/fonds-de-prevoyance" element={<CondoFondsPage />} />
      <Route path="/condo/carnet-entretien" element={<CondoCarnetPage />} />
      <Route path="/condos" element={<CondoHomePage />} />
      <Route path="/condos/loi-16" element={<CondoLoi16Page />} />
      <Route path="/condos/carnet-entretien" element={<CondoCarnetPage />} />
      <Route path="/condos/fonds-prevoyance" element={<CondoFondsPage />} />
      <Route path="/condos/attestation" element={<CondoAttestationPage />} />
      <Route path="/condos/tarifs" element={<CondoTarifsPage />} />
      <Route path="/condos/onboarding" element={<ProtectedRoute requiredRole="homeowner"><CondoOnboardingPage /></ProtectedRoute>} />

      {/* Condos — Authenticated Dashboard */}
      <Route path="/condos/dashboard" element={<ProtectedRoute requiredRole="homeowner"><CondoDashboardPage /></ProtectedRoute>} />
      <Route path="/condos/building" element={<ProtectedRoute requiredRole="homeowner"><CondoBuildingPage /></ProtectedRoute>} />
      <Route path="/condos/components" element={<ProtectedRoute requiredRole="homeowner"><CondoComponentsPage /></ProtectedRoute>} />
      <Route path="/condos/maintenance" element={<ProtectedRoute requiredRole="homeowner"><CondoMaintenancePage /></ProtectedRoute>} />
      <Route path="/condos/documents" element={<ProtectedRoute requiredRole="homeowner"><CondoDocumentsPage /></ProtectedRoute>} />
      <Route path="/condos/reserve-fund" element={<ProtectedRoute requiredRole="homeowner"><CondoReserveFundPage /></ProtectedRoute>} />
      <Route path="/condos/quotes" element={<ProtectedRoute requiredRole="homeowner"><CondoQuotesPage /></ProtectedRoute>} />
      <Route path="/condos/reports" element={<ProtectedRoute requiredRole="homeowner"><CondoReportsPage /></ProtectedRoute>} />
      <Route path="/condos/billing" element={<ProtectedRoute requiredRole="homeowner"><CondoBillingPage /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);
