import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";

import ProtectedRoute from "@/components/ProtectedRoute";
import UniversalRouteGuard from "@/guards/UniversalRouteGuard";
import ScrollRestoration from "@/components/ScrollRestoration";
import BannerContinueFlow from "@/components/flow/BannerContinueFlow";

// Only eagerly load the home page and critical shared pages
import HomeWithFeatureFlag from "@/components/home-intent/HomeWithFeatureFlag";
import Home from "@/pages/Home";
import FallbackRoutePage from "@/pages/FallbackRoutePage";

// Extraction Engine
const PageAdminExtractionQueue = lazy(() => import("@/pages/admin/PageAdminExtractionQueue"));
const PageAdminCoverageCityDomain = lazy(() => import("@/pages/admin/PageAdminCoverageCityDomain"));

// QA Simulation
const PageAdminQASimulation = lazy(() => import("@/pages/admin/PageAdminQASimulation"));
const PageAdminQASimulationRun = lazy(() => import("@/pages/admin/PageAdminQASimulationRun"));
const PageAdminQASimulationTemplates = lazy(() => import("@/pages/admin/PageAdminQASimulationTemplates"));

// Outbound Approvals
const PageAdminOutboundApprovals = lazy(() => import("@/pages/admin/outbound/PageAdminOutboundApprovals"));

// Contractor Voice-First Landing
const PageContractorVoiceFirstLanding = lazy(() => import("@/pages/contractor-landing/PageContractorVoiceFirstLanding"));

// Voice Sales Plan Onboarding
const PageContractorPlanOnboarding = lazy(() => import("@/pages/voice-sales/PageContractorPlanOnboarding"));

// Visual Search
const ProVisualSearchPage = lazy(() => import("@/pages/ProVisualSearchPage"));

// Intent homepage (direct route for testing)
const PageHomeIntentUNPRO = lazy(() => import("@/pages/PageHomeIntentUNPRO"));
const PageHomeAlexConversationalLite = lazy(() => import("@/pages/PageHomeAlexConversationalLite"));
const PageAlexConversationAnimated = lazy(() => import("@/pages/PageAlexConversationAnimated"));

// Lightweight loading fallback
const LazyFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
  </div>
);

// ─── Lazy loaded pages ───
const PlaceholderPage = lazy(() => import("@/pages/PlaceholderPage"));
const Unsubscribe = lazy(() => import("@/pages/Unsubscribe"));
const CommentCaMarchePage = lazy(() => import("@/pages/CommentCaMarchePage"));
const StartPage = lazy(() => import("@/pages/StartPage"));
const AuthCallbackPage = lazy(() => import("@/pages/AuthCallbackPage"));
const OnboardingPageUnpro = lazy(() => import("@/pages/OnboardingPageUnpro"));
const LoginPageUnpro = lazy(() => import("@/pages/LoginPageUnpro"));
const PreLoginRolePage = lazy(() => import("@/pages/PreLoginRolePage"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const PageManifesto = lazy(() => import("@/pages/PageManifesto"));
const PageUnproFAQ25 = lazy(() => import("@/pages/PageUnproFAQ25"));
const PageAlexPromptRulesAdmin = lazy(() => import("@/pages/PageAlexPromptRulesAdmin"));
const PageAlexConversationDebugAdmin = lazy(() => import("@/pages/PageAlexConversationDebugAdmin"));

// Public
const PageAdLandingAipp = lazy(() => import("@/pages/ad-landing/PageAdLandingAipp"));
const PageBusinessImport = lazy(() => import("@/pages/business-import/PageBusinessImport"));
const PageBusinessCardImport = lazy(() => import("@/pages/business-card/PageBusinessCardImport"));
const PageBusinessCardScannerHub = lazy(() => import("@/pages/business-card/PageBusinessCardScannerHub"));
const PageContractorLeads = lazy(() => import("@/pages/business-card/PageContractorLeads"));
const PageAlexGoalsStrategy = lazy(() => import("@/pages/goals/PageAlexGoalsStrategy"));
const PageCheckoutStripe = lazy(() => import("@/pages/checkout/PageCheckoutStripe"));
const PageCheckoutSuccess = lazy(() => import("@/pages/checkout/PageCheckoutSuccess"));
const PageActivationStart = lazy(() => import("@/pages/checkout/PageActivationStart"));
const PageCheckoutNativeScrollable = lazy(() => import("@/pages/checkout/PageCheckoutNativeScrollable"));
const LandingContractorAIActivation = lazy(() => import("@/pages/acquisition/LandingContractorAIActivation"));
const PageAdminPipelineProspects = lazy(() => import("@/pages/admin/acquisition/PageAdminPipelineProspects"));
const Search = lazy(() => import("@/pages/Search"));
const ContractorProfile = lazy(() => import("@/pages/ContractorProfile"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const HomeownersPage = lazy(() => import("@/pages/HomeownersPage"));
const OwnerMenuPreviewPage = lazy(() => import("@/pages/OwnerMenuPreviewPage"));
const PageMemoryCenter = lazy(() => import("@/pages/PageMemoryCenter"));
const MenuIntelligenceAdminPage = lazy(() => import("@/pages/admin/MenuIntelligenceAdminPage"));
const PageAdminEmailLogs = lazy(() => import("@/pages/admin/PageAdminEmailLogs"));
const AdminProspectionEngine = lazy(() => import("@/pages/admin/AdminProspectionEngine"));
const PageProspectionDashboard = lazy(() => import("@/pages/admin/PageProspectionDashboard"));
const AdminProspectionProspects = lazy(() => import("@/pages/admin/AdminProspectionProspects"));
const AdminProspectionAnalytics = lazy(() => import("@/pages/admin/AdminProspectionAnalytics"));
const PageAdminCityActivityMatrix = lazy(() => import("@/pages/admin/PageAdminCityActivityMatrix"));
const PageAdminActivitiesSecondaryManager = lazy(() => import("@/pages/admin/PageAdminActivitiesSecondaryManager"));
const PageAlexPersonalizedLanding = lazy(() => import("@/pages/public/PageAlexPersonalizedLanding"));
const PageAdminEmailTemplates = lazy(() => import("@/pages/admin/PageAdminEmailTemplates"));
const PageAdminHandoffAnalytics = lazy(() => import("@/pages/admin/PageAdminHandoffAnalytics"));
const ProfessionalsPage = lazy(() => import("@/pages/ProfessionalsPage"));
const PartnersPage = lazy(() => import("@/pages/PartnersPage"));
const DescribeProjectPage = lazy(() => import("@/pages/DescribeProjectPage"));
const CompareQuotesPage = lazy(() => import("@/pages/CompareQuotesPage"));
const ContractorOnboardingPage = lazy(() => import("@/pages/ContractorOnboardingPage"));
const OnboardingFlow = lazy(() => import("@/pages/OnboardingFlow"));
const PricingPage = lazy(() => import("@/pages/PricingPage"));
const PageHomeownerWelcome = lazy(() => import("@/pages/proprietaire/PageHomeownerWelcome"));
const AIPPScorePage = lazy(() => import("@/pages/AIPPScorePage"));
const MatchingResultsPage = lazy(() => import("@/pages/MatchingResultsPage"));
const ContractorComparisonPage = lazy(() => import("@/pages/ContractorComparisonPage"));
const DecisionAssistantPage = lazy(() => import("@/pages/DecisionAssistantPage"));
const SmartRecommendationPage = lazy(() => import("@/pages/SmartRecommendationPage"));
const DNAProfilePage = lazy(() => import("@/pages/DNAProfilePage"));

// SEO Pages
const ServiceLocationPage = lazy(() => import("@/pages/seo/ServiceLocationPage"));
const ProblemLocationPage = lazy(() => import("@/pages/seo/ProblemLocationPage"));
const GuidePage = lazy(() => import("@/pages/seo/GuidePage"));
const CityHubPage = lazy(() => import("@/pages/seo/CityHubPage"));
const LocalSeoPage = lazy(() => import("@/pages/seo/LocalSeoPage"));
const AdminLocalSeo = lazy(() => import("@/pages/admin/AdminLocalSeo"));
const AdminSeoArticles = lazy(() => import("@/pages/admin/AdminSeoArticles"));
const SeoDirectoryPage = lazy(() => import("@/pages/seo/SeoDirectoryPage"));
const SeoArticlePage = lazy(() => import("@/pages/seo/SeoArticlePage"));
const ProblemPage = lazy(() => import("@/pages/seo/ProblemPage"));
const ProblemGraphPage = lazy(() => import("@/pages/seo/ProblemGraphPage"));
const SolutionPage = lazy(() => import("@/pages/seo/SolutionPage"));
const ProfessionPage = lazy(() => import("@/pages/seo/ProfessionPage"));
const CityPage = lazy(() => import("@/pages/seo/CityPage"));
const VillePage = lazy(() => import("@/pages/seo/VillePage"));
const QuartierPage = lazy(() => import("@/pages/seo/QuartierPage"));
const RuePage = lazy(() => import("@/pages/seo/RuePage"));
const ProblemeLocationFrPage = lazy(() => import("@/pages/seo/ProblemeLocationFrPage"));
const PropertyTypeHubPage = lazy(() => import("@/pages/seo/PropertyTypeHubPage"));
const PropertyTypeCityPage = lazy(() => import("@/pages/seo/PropertyTypeCityPage"));
const PropertyTypeProblemPage = lazy(() => import("@/pages/seo/PropertyTypeProblemPage"));
const SeoPageRenderer = lazy(() => import("@/pages/seo/SeoPageRenderer"));
const SeoSitemapPage = lazy(() => import("@/pages/seo/SeoSitemapPage"));
const AdminSeoGenerator = lazy(() => import("@/pages/admin/AdminSeoGenerator"));
const PropertyGraphPage = lazy(() => import("@/pages/PropertyGraphPage"));
const AlexChat = lazy(() => import("@/pages/AlexChat"));
const AuthorityDashboardPage = lazy(() => import("@/pages/AuthorityDashboardPage"));
const PressRelease = lazy(() => import("@/pages/PressRelease"));
const AlexVoicePage = lazy(() => import("@/pages/AlexVoicePage"));
const AlexVoiceRealtimePage = lazy(() => import("@/pages/AlexVoiceRealtimePage"));
const AlexCommandCenterPage = lazy(() => import("@/pages/AlexCommandCenterPage"));
const DesignPage = lazy(() => import("@/pages/DesignPage"));
const DesignSharePage = lazy(() => import("@/pages/DesignSharePage"));
const FlywheelPage = lazy(() => import("@/pages/FlywheelPage"));
const EnergyPage = lazy(() => import("@/pages/EnergyPage"));
const PreventiveMaintenancePage = lazy(() => import("@/pages/PreventiveMaintenancePage"));
const CoproprietePage = lazy(() => import("@/pages/CoproprietePage"));
const CondosPricingPage = lazy(() => import("@/pages/condos/CondosPricingPage"));
const BuildingIntelligenceMap = lazy(() => import("@/pages/BuildingIntelligenceMap"));
const AnswerEnginePage = lazy(() => import("@/pages/AnswerEnginePage"));
const BusinessImportPage = lazy(() => import("@/pages/BusinessImportPage"));
const GmbLinkPage = lazy(() => import("@/pages/GmbLinkPage"));
const ContractorQuestionnairePage = lazy(() => import("@/pages/ContractorQuestionnairePage"));
const VerifyContractorPage = lazy(() => import("@/pages/VerifyContractorPage"));
const VerifyLandingPage = lazy(() => import("@/pages/VerifyLandingPage"));
const PublicPropertyPage = lazy(() => import("@/pages/PublicPropertyPage"));
const PropertyPassportPage = lazy(() => import("@/pages/dashboard/PropertyPassportPage"));
const PropertyGrantsPage = lazy(() => import("@/pages/dashboard/PropertyGrantsPage"));
const MessageCenterPage = lazy(() => import("@/pages/dashboard/MessageCenterPage"));
const NotificationsPage = lazy(() => import("@/pages/dashboard/NotificationsPage"));
const ProjectMatchesPage = lazy(() => import("@/pages/dashboard/ProjectMatchesPage"));
const QrScanPage = lazy(() => import("@/pages/QrScanPage"));
const DeepLinkPage = lazy(() => import("@/pages/DeepLinkPage"));
const ReferralLandingPage = lazy(() => import("@/pages/ReferralLandingPage"));
const UnlockPage = lazy(() => import("@/pages/UnlockPage"));
const MyQRPerformancePage = lazy(() => import("@/pages/MyQRPerformancePage"));
const ContributionApprovalPage = lazy(() => import("@/pages/dashboard/ContributionApprovalPage"));
const ListingImportPage = lazy(() => import("@/pages/ListingImportPage"));
const PublicScoreCalculatorPage = lazy(() => import("@/pages/PublicScoreCalculatorPage"));
const PropertyReportPage = lazy(() => import("@/pages/dashboard/PropertyReportPage"));
const RenovationVisualizerPage = lazy(() => import("@/pages/RenovationVisualizerPage"));
const RenovationLocationPage = lazy(() => import("@/pages/seo/RenovationLocationPage"));
const DiscoveryFeedPage = lazy(() => import("@/pages/DiscoveryFeedPage"));
const VerifierEntrepreneurPage = lazy(() => import("@/pages/VerifierEntrepreneurPage"));
const AnalyzeDocumentPage = lazy(() => import("@/pages/AnalyzeDocumentPage"));
const TransformationDetailPage = lazy(() => import("@/pages/TransformationDetailPage"));
const TrendingPage = lazy(() => import("@/pages/TrendingPage"));
const PropertyMapPage = lazy(() => import("@/pages/PropertyMapPage"));
const VerificationSeoPage = lazy(() => import("@/pages/seo/VerificationSeoPage"));
const AlignmentQuestionnairePage = lazy(() => import("@/pages/AlignmentQuestionnairePage"));
const FounderPage = lazy(() => import("@/pages/FounderPage"));
const AdminFounderInvites = lazy(() => import("@/pages/admin/AdminFounderInvites"));
const AdminProspects = lazy(() => import("@/pages/admin/AdminProspects"));
const AdminProspectImport = lazy(() => import("@/pages/admin/AdminProspectImport"));
const AuditLandingPage = lazy(() => import("@/pages/AuditLandingPage"));
const PageAlexGuidedOnboarding = lazy(() => import("@/pages/signature/PageAlexGuidedOnboarding"));

// Contractor Onboarding AIPP Funnel
const PageContractorLandingAcquisition = lazy(() => import("@/pages/contractor-funnel/PageContractorLandingAcquisition"));
const PageContractorOnboardingStart = lazy(() => import("@/pages/contractor-funnel/PageContractorOnboardingStart"));
const PageContractorImportWorkspace = lazy(() => import("@/pages/contractor-funnel/PageContractorImportWorkspace"));
const PageContractorAIPPBuilder = lazy(() => import("@/pages/contractor-funnel/PageContractorAIPPBuilder"));
const PageContractorAssetsStudio = lazy(() => import("@/pages/contractor-funnel/PageContractorAssetsStudio"));
const PageContractorFAQBuilder = lazy(() => import("@/pages/contractor-funnel/PageContractorFAQBuilder"));
const PageContractorPlanRecommendation = lazy(() => import("@/pages/contractor-funnel/PageContractorPlanRecommendation"));
const PageContractorCheckout = lazy(() => import("@/pages/contractor-funnel/PageContractorCheckout"));
const PageContractorActivationSuccess = lazy(() => import("@/pages/contractor-funnel/PageContractorActivationSuccess"));
const PageContractorDashboardPostActivation = lazy(() => import("@/pages/contractor-funnel/PageContractorDashboardPostActivation"));
const ContractorAvailabilityPage = lazy(() => import("@/pages/ContractorAvailabilityPage"));
const PublicBookingPage = lazy(() => import("@/pages/PublicBookingPage"));
const BookingClientDemoPage = lazy(() => import("@/pages/BookingClientDemoPage"));
const BookingSettingsPage = lazy(() => import("@/pages/BookingSettingsPage"));
const BookingPaymentSuccess = lazy(() => import("@/pages/BookingPaymentSuccess"));
const BookingPaymentCancel = lazy(() => import("@/pages/BookingPaymentCancel"));

// Trust Authority Layer
const PageHowUnproWorksAI = lazy(() => import("@/pages/trust/PageHowUnproWorksAI"));
const PageRoadmapFeatures = lazy(() => import("@/pages/trust/PageRoadmapFeatures"));
const PageCityServiceCoverage = lazy(() => import("@/pages/trust/PageCityServiceCoverage"));
const PageGuidesHomeProblems = lazy(() => import("@/pages/trust/PageGuidesHomeProblems"));
const PageReviewsVerified = lazy(() => import("@/pages/trust/PageReviewsVerified"));

// Broker / Courtier
const CourtiersLandingPage = lazy(() => import("@/pages/courtiers/CourtiersLandingPage"));
const BrokerOnboardingPage = lazy(() => import("@/pages/courtiers/BrokerOnboardingPage"));
const BrokerDashboardPage = lazy(() => import("@/pages/courtiers/BrokerDashboardPage"));
const BrokerLeadsPage = lazy(() => import("@/pages/courtiers/BrokerLeadsPage"));
const BrokerProfilePage = lazy(() => import("@/pages/courtiers/BrokerProfilePage"));
const BrokerAppointmentsPage = lazy(() => import("@/pages/courtiers/BrokerAppointmentsPage"));

// Screenshot Intelligence Admin
const AdminScreenshotAnalyticsPage = lazy(() => import("@/pages/admin/AdminScreenshotAnalyticsPage"));
const AdminScreenshotFrictionPage = lazy(() => import("@/pages/admin/AdminScreenshotFrictionPage"));
const AdminScreenshotAlertsPage = lazy(() => import("@/pages/admin/AdminScreenshotAlertsPage"));
const AdminScreenshotInsightsPage = lazy(() => import("@/pages/admin/AdminScreenshotInsightsPage"));

// AI Self-Optimizing System
const AdminOptimizationDashboard = lazy(() => import("@/pages/admin/AdminOptimizationDashboard"));
const AdminExperimentsPage = lazy(() => import("@/pages/admin/AdminExperimentsPage"));
const AdminExperimentDetailPage = lazy(() => import("@/pages/admin/AdminExperimentDetailPage"));
const AdminOptimizationRecommendations = lazy(() => import("@/pages/admin/AdminOptimizationRecommendations"));
const AdminWinningVariantsPage = lazy(() => import("@/pages/admin/AdminWinningVariantsPage"));

// Alex
const PageAdminAlexConversationRules = lazy(() => import("@/pages/admin/PageAdminAlexConversationRules"));

// Recruitment Automation Engine
const PageAdminRecruitmentOverview = lazy(() => import("@/pages/admin/recruitment/PageAdminRecruitmentOverview"));
const PageAdminRecruitmentClusters = lazy(() => import("@/pages/admin/recruitment/PageAdminRecruitmentClusters"));
const PageAdminRecruitmentCampaigns = lazy(() => import("@/pages/admin/recruitment/PageAdminRecruitmentCampaigns"));
const PageAdminRecruitmentProspects = lazy(() => import("@/pages/admin/recruitment/PageAdminRecruitmentProspects"));
const PageAdminRecruitmentSequences = lazy(() => import("@/pages/admin/recruitment/PageAdminRecruitmentSequences"));
const PageAdminRecruitmentOnboarding = lazy(() => import("@/pages/admin/recruitment/PageAdminRecruitmentOnboarding"));
const PageAdminRecruitmentPayments = lazy(() => import("@/pages/admin/recruitment/PageAdminRecruitmentPayments"));
const PageAdminRecruitmentLogs = lazy(() => import("@/pages/admin/recruitment/PageAdminRecruitmentLogs"));
const PageContractorJoinOffer = lazy(() => import("@/pages/join/PageContractorJoinOffer"));
const PageContractorJoinCheckout = lazy(() => import("@/pages/join/PageContractorJoinCheckout"));
const PageContractorJoinSuccess = lazy(() => import("@/pages/join/PageContractorJoinSuccess"));
const PageContractorJoinResume = lazy(() => import("@/pages/join/PageContractorJoinResume"));
const PageContractorPublicMagicAccess = lazy(() => import("@/pages/join/PageContractorPublicMagicAccess"));
const PageAdminAlexDebugHome = lazy(() => import("@/pages/admin/PageAdminAlexDebugHome"));
const PageAdminAlexSpeechTuning = lazy(() => import("@/pages/admin/AlexSpeechTuning"));
const AlexVoiceAdmin = lazy(() => import("@/pages/admin/AlexVoiceAdmin"));
const PageAdminAlexVoice = lazy(() => import("@/pages/admin/alex/PageAdminAlexVoice"));
const PageAdminAlexContext = lazy(() => import("@/pages/admin/alex/PageAdminAlexContext"));
const PageAdminAlexAnalytics = lazy(() => import("@/pages/admin/alex/PageAdminAlexAnalytics"));

// Intent Funnel + Match Engine
const PageEntryUnifiedIntent = lazy(() => import("@/pages/intent/PageEntryUnifiedIntent"));
const PageMatchResultsDynamic = lazy(() => import("@/pages/intent/PageMatchResultsDynamic"));
const PageBookingInstant = lazy(() => import("@/pages/intent/PageBookingInstant"));
const PageAlexConversationIntent = lazy(() => import("@/pages/intent/PageAlexConversationIntent"));
const AdminPredictiveLeads = lazy(() => import("@/pages/admin/AdminPredictiveLeads"));
const AdminDynamicMarketPricing = lazy(() => import("@/pages/admin/AdminDynamicMarketPricing"));
const AdminPredictiveMarketBoard = lazy(() => import("@/pages/admin/AdminPredictiveMarketBoard"));
const PageAlexPredictiveSeller = lazy(() => import("@/pages/alex/PageAlexPredictiveSeller"));
const AdminZoneValueMap = lazy(() => import("@/pages/admin/AdminZoneValueMap"));
const AdminVoiceControlPage = lazy(() => import("@/pages/admin/AdminVoiceControlPage"));
const AdminVoiceOptimizerPage = lazy(() => import("@/pages/admin/AdminVoiceOptimizerPage"));
const PageAdminVoicePronunciation = lazy(() => import("@/pages/admin/PageAdminVoicePronunciation"));
const PageNoMatchFallback = lazy(() => import("@/pages/PageNoMatchFallback"));
const PageAdminNoMatchMonitoring = lazy(() => import("@/pages/admin/PageAdminNoMatchMonitoring"));
const EntrepreneurVoiceSalesPage = lazy(() => import("@/pages/entrepreneur/EntrepreneurVoiceSalesPage"));
const AdminSalesAnalyticsPage = lazy(() => import("@/pages/admin/AdminSalesAnalyticsPage"));
const HomeownerVoiceEntryPage = lazy(() => import("@/pages/homeowner/HomeownerVoiceEntryPage"));
const AdminHomeownerAnalyticsPage = lazy(() => import("@/pages/admin/AdminHomeownerAnalyticsPage"));

// Go-Live
const PageAdminGoLive = lazy(() => import("@/pages/admin/PageAdminGoLive"));
const PageAdminGoLiveVerification = lazy(() => import("@/pages/admin/PageAdminGoLiveVerification"));
const PageAdminGoLiveIncidents = lazy(() => import("@/pages/admin/PageAdminGoLiveIncidents"));
const PageAdminGoLiveE2ETests = lazy(() => import("@/pages/admin/PageAdminGoLiveE2ETests"));
const PageAdminGoLiveFunctionHealth = lazy(() => import("@/pages/admin/PageAdminGoLiveFunctionHealth"));
const PageAdminGoLivePaymentHealth = lazy(() => import("@/pages/admin/PageAdminGoLivePaymentHealth"));
const PageAdminNavigation = lazy(() => import("@/pages/admin/PageAdminNavigation"));

// AIPP v2
const PageAuditAIPPv2 = lazy(() => import("@/pages/PageAuditAIPPv2"));
const PageAuditResultsAIPPv2 = lazy(() => import("@/pages/PageAuditResultsAIPPv2"));
const PageAdminAIPPv2Dashboard = lazy(() => import("@/pages/admin/PageAdminAIPPv2Dashboard"));

// Entrepreneur Onboarding Flow
const PageOnboardingImport = lazy(() => import("@/pages/entrepreneur/PageOnboardingImport"));
const PageOnboardingAnalyse = lazy(() => import("@/pages/entrepreneur/PageOnboardingAnalyse"));
const PageOnboardingPlan = lazy(() => import("@/pages/entrepreneur/PageOnboardingPlan"));
const PageOnboardingPayment = lazy(() => import("@/pages/entrepreneur/PageOnboardingPayment"));
const PageOnboardingSuccess = lazy(() => import("@/pages/entrepreneur/PageOnboardingSuccess"));

// Blog
const BlogIndexPage = lazy(() => import("@/pages/blog/BlogIndexPage"));
const BlogArticlePage = lazy(() => import("@/pages/blog/BlogArticlePage"));

// Condos
const CondoHomePage = lazy(() => import("@/pages/condos/CondoHomePage"));
const PageLandingCondoTeaser = lazy(() => import("@/pages/condos/PageLandingCondoTeaser"));
const PageDiagnosticCondoIA = lazy(() => import("@/pages/condos/PageDiagnosticCondoIA"));
const CondoLoi16Page = lazy(() => import("@/pages/condos/CondoLoi16Page"));
const CondoCarnetPage = lazy(() => import("@/pages/condos/CondoCarnetPage"));
const CondoFondsPage = lazy(() => import("@/pages/condos/CondoFondsPage"));
const CondoAttestationPage = lazy(() => import("@/pages/condos/CondoAttestationPage"));
const CondoTarifsPage = lazy(() => import("@/pages/condos/CondoTarifsPage"));
const CondoOnboardingPage = lazy(() => import("@/pages/condos/CondoOnboardingPage"));
const CondoDashboardPage = lazy(() => import("@/pages/condos/CondoDashboardPage"));
const CondoBuildingPage = lazy(() => import("@/pages/condos/CondoBuildingPage"));
const CondoComponentsPage = lazy(() => import("@/pages/condos/CondoComponentsPage"));
const CondoMaintenancePage = lazy(() => import("@/pages/condos/CondoMaintenancePage"));
const CondoDocumentsPage = lazy(() => import("@/pages/condos/CondoDocumentsPage"));
const CondoReserveFundPage = lazy(() => import("@/pages/condos/CondoReserveFundPage"));
const CondoQuotesPage = lazy(() => import("@/pages/condos/CondoQuotesPage"));
const CondoReportsPage = lazy(() => import("@/pages/condos/CondoReportsPage"));
const CondoBillingPage = lazy(() => import("@/pages/condos/CondoBillingPage"));
const CondoRequestsPage = lazy(() => import("@/pages/condos/CondoRequestsPage"));
const CondoVotingPage = lazy(() => import("@/pages/condos/CondoVotingPage"));
const CondoFinancialsPage = lazy(() => import("@/pages/condos/CondoFinancialsPage"));
const CondoUnitsPage = lazy(() => import("@/pages/condos/CondoUnitsPage"));
const CondoIncidentsPage = lazy(() => import("@/pages/condos/CondoIncidentsPage"));
const CondoContractorsPage = lazy(() => import("@/pages/condos/CondoContractorsPage"));
const CondoCalendarPage = lazy(() => import("@/pages/condos/CondoCalendarPage"));

// Homeowner Dashboard
const DashboardHome = lazy(() => import("@/pages/dashboard/DashboardHome"));
const PropertiesList = lazy(() => import("@/pages/dashboard/PropertiesList"));
const PropertyNew = lazy(() => import("@/pages/dashboard/PropertyNew"));
const PropertyDetail = lazy(() => import("@/pages/dashboard/PropertyDetail"));
const QuotesList = lazy(() => import("@/pages/dashboard/QuotesList"));
const QuoteUploadPage = lazy(() => import("@/pages/dashboard/QuoteUploadPage"));
const QuoteDetail = lazy(() => import("@/pages/dashboard/QuoteDetail"));
const HomeScorePage = lazy(() => import("@/pages/dashboard/HomeScorePage"));
const PropertyInsightsPage = lazy(() => import("@/pages/dashboard/PropertyInsightsPage"));
const AccountPage = lazy(() => import("@/pages/dashboard/AccountPage"));
const HomeownerAppointments = lazy(() => import("@/pages/dashboard/HomeownerAppointments"));
const BookingPage = lazy(() => import("@/pages/dashboard/BookingPage"));
const DocumentUploadPage = lazy(() => import("@/pages/dashboard/DocumentUploadPage"));
const ProjectNewPage = lazy(() => import("@/pages/dashboard/ProjectNewPage"));
const SyndicateDashboard = lazy(() => import("@/pages/dashboard/SyndicateDashboard"));
const SyndicateDetailDashboard = lazy(() => import("@/pages/dashboard/SyndicateDetailDashboard"));
const SyndicateReserveFund = lazy(() => import("@/pages/dashboard/SyndicateReserveFund"));
const ReserveFundAnalyzer = lazy(() => import("@/pages/dashboard/ReserveFundAnalyzer"));
const SyndicateMaintenance = lazy(() => import("@/pages/dashboard/SyndicateMaintenance"));
const SyndicateVotes = lazy(() => import("@/pages/dashboard/SyndicateVotes"));
const SyndicateVoteCreate = lazy(() => import("@/pages/dashboard/SyndicateVoteCreate"));
const SyndicateGrowthDashboard = lazy(() => import("@/pages/dashboard/SyndicateGrowthDashboard"));
const LeadResults = lazy(() => import("@/pages/dashboard/LeadResults"));
const MyPlacementsPage = lazy(() => import("@/pages/dashboard/MyPlacementsPage"));

// Entrepreneur Funnel
const PageEntrepreneurLandingAIPP = lazy(() => import("@/pages/entrepreneur/PageEntrepreneurLandingAIPP"));
const PageEntrepreneursLanding = lazy(() => import("@/pages/entrepreneur/PageEntrepreneursLanding"));
const PageEntrepreneurScoreResult = lazy(() => import("@/pages/entrepreneur/PageEntrepreneurScoreResult"));
const PageEntrepreneurPricing = lazy(() => import("@/pages/entrepreneur/PageEntrepreneurPricing"));
const PageEntrepreneurDashboardLite = lazy(() => import("@/pages/entrepreneur/PageEntrepreneurDashboardLite"));
const PageAIPPAnalysisLoading = lazy(() => import("@/pages/entrepreneur/PageAIPPAnalysisLoading"));
const PageEntrepreneurImportProcessing = lazy(() => import("@/pages/entrepreneur/PageEntrepreneurImportProcessing"));
const PagePricingCalculator = lazy(() => import("@/pages/entrepreneur/PagePricingCalculator"));
const PagePlanResult = lazy(() => import("@/pages/entrepreneur/PagePlanResult"));
const PageEntrepreneurGoalToPlanLanding = lazy(() => import("@/pages/entrepreneur/PageEntrepreneurGoalToPlanLanding"));
const PagePaymentSuccess = lazy(() => import("@/pages/entrepreneur/PagePaymentSuccess"));
const PagePaymentCancelled = lazy(() => import("@/pages/entrepreneur/PagePaymentCancelled"));
const PageAIPPScoreReveal = lazy(() => import("@/pages/entrepreneur/PageAIPPScoreReveal"));

// Contractor Pro
const ProDashboard = lazy(() => import("@/pages/pro/ProDashboard"));
const ProProfile = lazy(() => import("@/pages/pro/ProProfile"));
const ProAIPPScore = lazy(() => import("@/pages/pro/ProAIPPScore"));
const ProReviews = lazy(() => import("@/pages/pro/ProReviews"));
const ProDocuments = lazy(() => import("@/pages/pro/ProDocuments"));
const ProAccount = lazy(() => import("@/pages/pro/ProAccount"));
const ProAppointments = lazy(() => import("@/pages/pro/ProAppointments"));
const ProLeads = lazy(() => import("@/pages/pro/ProLeads"));
const ProLeadDetail = lazy(() => import("@/pages/pro/ProLeadDetail"));
const ProBilling = lazy(() => import("@/pages/pro/ProBilling"));
const ProTerritories = lazy(() => import("@/pages/pro/ProTerritories"));
const ProAuthorityScore = lazy(() => import("@/pages/pro/ProAuthorityScore"));
const ProIncomingProjects = lazy(() => import("@/pages/pro/ProIncomingProjects"));
const PageContractorInbox = lazy(() => import("@/pages/pro/PageContractorInbox"));
const PageJobDetailsLive = lazy(() => import("@/pages/pro/PageJobDetailsLive"));
const ProPartnerNetwork = lazy(() => import("@/pages/pro/ProPartnerNetwork"));
const ProExpertise = lazy(() => import("@/pages/pro/ProExpertise"));
const ProTeams = lazy(() => import("@/pages/pro/ProTeams"));
const ProEmergencySettings = lazy(() => import("@/pages/pro/ProEmergencySettings"));
const ProDomainIntelligence = lazy(() => import("@/pages/pro/ProDomainIntelligence"));
const ProMatchedLeads = lazy(() => import("@/pages/pro/ProMatchedLeads"));
const ProSetupWizard = lazy(() => import("@/pages/pro/ProSetupWizard"));
const EmergencyTrackingPage = lazy(() => import("@/pages/EmergencyTrackingPage"));
const PageEntrepreneurPlanUsage = lazy(() => import("@/pages/entrepreneur/PageEntrepreneurPlanUsage"));

// Admin
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const PageAdminEntrepreneurActivation = lazy(() => import("@/pages/admin/PageAdminEntrepreneurActivation"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminContractors = lazy(() => import("@/pages/admin/AdminContractors"));
const AdminQuotes = lazy(() => import("@/pages/admin/AdminQuotes"));
const AdminReviews = lazy(() => import("@/pages/admin/AdminReviews"));
const AdminDocuments = lazy(() => import("@/pages/admin/AdminDocuments"));
const AdminContractorDetail = lazy(() => import("@/pages/admin/AdminContractorDetail"));
const AdminAppointments = lazy(() => import("@/pages/admin/AdminAppointments"));
const AdminLeads = lazy(() => import("@/pages/admin/AdminLeads"));
const AdminTerritories = lazy(() => import("@/pages/admin/AdminTerritories"));
const AdminGrowth = lazy(() => import("@/pages/admin/AdminGrowth"));
const AdminAgents = lazy(() => import("@/pages/admin/AdminAgents"));
const AdminMedia = lazy(() => import("@/pages/admin/AdminMedia"));
const AdminValidation = lazy(() => import("@/pages/admin/AdminValidation"));
const AdminAnswerEngine = lazy(() => import("@/pages/admin/AdminAnswerEngine"));
const AdminOperationsHub = lazy(() => import("@/pages/admin/AdminOperationsHub"));
const AdminVerificationRuns = lazy(() => import("@/pages/admin/AdminVerificationRuns"));
const AdminVerificationRunDetail = lazy(() => import("@/pages/admin/AdminVerificationRunDetail"));
const AdminAlerts = lazy(() => import("@/pages/admin/AdminAlerts"));
const AdminVerifiedContractors = lazy(() => import("@/pages/admin/AdminVerifiedContractors"));
const AdminDuplicates = lazy(() => import("@/pages/admin/AdminDuplicates"));
const AdminAutomation = lazy(() => import("@/pages/admin/AdminAutomation"));
const PageAdminAutomationCommandCenter = lazy(() => import("@/pages/admin/PageAdminAutomationCommandCenter"));
const AdminHomeGraph = lazy(() => import("@/pages/admin/AdminHomeGraph"));
const AdminUOS = lazy(() => import("@/pages/admin/AdminUOS"));
const AdminGrowthEngine = lazy(() => import("@/pages/admin/AdminGrowthEngine"));
const AdminPricingPage = lazy(() => import("@/pages/admin/AdminPricingPage"));
const AdminCoupons = lazy(() => import("@/pages/admin/AdminCoupons"));
const PageAdminPlanDistribution = lazy(() => import("@/pages/admin/PageAdminPlanDistribution"));
const PageAdminPlanAppointmentsControl = lazy(() => import("@/pages/admin/PageAdminPlanAppointmentsControl"));
const PageAdminClusterPlanProjectSizeMatrix = lazy(() => import("@/pages/admin/PageAdminClusterPlanProjectSizeMatrix"));
const PageAdminProjectSizeExtensions = lazy(() => import("@/pages/admin/PageAdminProjectSizeExtensions"));
const AdminRefusalSeoPage = lazy(() => import("@/pages/admin/AdminRefusalSeoPage"));
const AdminAdsEngine = lazy(() => import("@/pages/admin/AdminAdsEngine"));
const AdminDemandGrid = lazy(() => import("@/pages/admin/AdminDemandGrid"));
const AdminSalesPsychology = lazy(() => import("@/pages/admin/AdminSalesPsychology"));
const AdminRewardRules = lazy(() => import("@/pages/admin/AdminRewardRules"));
const AdminDeepLinkAnalytics = lazy(() => import("@/pages/admin/AdminDeepLinkAnalytics"));
const AdminAIGrowthInsights = lazy(() => import("@/pages/admin/AdminAIGrowthInsights"));
const AdminAIGrowthDashboard = lazy(() => import("@/pages/admin/AdminAIGrowthDashboard"));
const AdminCampaignLab = lazy(() => import("@/pages/admin/AdminCampaignLab"));
const AdminAutopilotDashboard = lazy(() => import("@/pages/admin/AdminAutopilotDashboard"));
const AdminSeoDominationDashboard = lazy(() => import("@/pages/admin/AdminSeoDominationDashboard"));
const AdminMarketEngine = lazy(() => import("@/pages/admin/AdminMarketEngine"));
const AdminNexusDashboard = lazy(() => import("@/pages/admin/AdminNexusDashboard"));
const AdminDispatchCenter = lazy(() => import("@/pages/admin/AdminDispatchCenter"));
const AdminDomainIntelligence = lazy(() => import("@/pages/admin/AdminDomainIntelligence"));
const PageDomainHealthDashboard = lazy(() => import("@/pages/admin/PageDomainHealthDashboard"));
const AdminBulkArticlesPage = lazy(() => import("@/pages/admin/AdminBulkArticlesPage"));
const AdminProspectCampaigns = lazy(() => import("@/pages/admin/AdminProspectCampaigns"));
const AdminRoadmapExecution = lazy(() => import("@/pages/admin/AdminRoadmapExecution"));
const AdminOutreachDashboard = lazy(() => import("@/pages/admin/AdminOutreachDashboard"));
const AdminOutreachCampaignNew = lazy(() => import("@/pages/admin/AdminOutreachCampaignNew"));
const AdminOutreachCampaignDetail = lazy(() => import("@/pages/admin/AdminOutreachCampaignDetail"));
const AdminOutreachTemplates = lazy(() => import("@/pages/admin/AdminOutreachTemplates"));
const AdminOutreachAnalytics = lazy(() => import("@/pages/admin/AdminOutreachAnalytics"));
const PageOutboundDashboard = lazy(() => import("@/pages/admin/outbound/PageOutboundDashboard"));
const PageOutboundCampaigns = lazy(() => import("@/pages/admin/outbound/PageOutboundCampaigns"));
const PageOutboundLeadsQueue = lazy(() => import("@/pages/admin/outbound/PageOutboundLeadsQueue"));
const PageOutboundLeadProfile = lazy(() => import("@/pages/admin/outbound/PageOutboundLeadProfile"));
const PageOutboundSequences = lazy(() => import("@/pages/admin/outbound/PageOutboundSequences"));
const PageOutboundMailboxes = lazy(() => import("@/pages/admin/outbound/PageOutboundMailboxes"));
const PageOutboundAnalytics = lazy(() => import("@/pages/admin/outbound/PageOutboundAnalytics"));
const PageOutboundSuppressionCenter = lazy(() => import("@/pages/admin/outbound/PageOutboundSuppressionCenter"));
const PageOutboundLandingPages = lazy(() => import("@/pages/admin/outbound/PageOutboundLandingPages"));
const PageOutboundOpsCenter = lazy(() => import("@/pages/admin/outbound/PageOutboundOpsCenter"));
const PageOutboundVerification = lazy(() => import("@/pages/admin/outbound/PageOutboundVerification"));
const PageOutboundTests = lazy(() => import("@/pages/admin/outbound/PageOutboundTests"));
const PageOutboundAutomations = lazy(() => import("@/pages/admin/outbound/PageOutboundAutomations"));
const PageOutboundLogs = lazy(() => import("@/pages/admin/outbound/PageOutboundLogs"));
const PageOutboundSettingsLite = lazy(() => import("@/pages/admin/outbound/PageOutboundSettingsLite"));
const PageOutboundEmailHealth = lazy(() => import("@/pages/admin/outbound/PageOutboundEmailHealth"));
const PageOutboundSequencesElite = lazy(() => import("@/pages/admin/outbound/PageOutboundSequencesElite"));
const PageOutboundSendingArchitecture = lazy(() => import("@/pages/admin/outbound/PageOutboundSendingArchitecture"));
const PageOutboundDeliverability = lazy(() => import("@/pages/admin/outbound/PageOutboundDeliverability"));
const PageOutboundAIRewrite = lazy(() => import("@/pages/admin/outbound/PageOutboundAIRewrite"));
const PageOutboundRevenue = lazy(() => import("@/pages/admin/outbound/PageOutboundRevenue"));
const PageOutboundSMSFallback = lazy(() => import("@/pages/admin/outbound/PageOutboundSMSFallback"));
const PageCampaignBuilderAutonomous = lazy(() => import("@/pages/admin/outbound/PageCampaignBuilderAutonomous"));
const PageRunMonitorAutonomous = lazy(() => import("@/pages/admin/outbound/PageRunMonitorAutonomous"));
const PageOutboundSettingsAutonomous = lazy(() => import("@/pages/admin/outbound/PageOutboundSettingsAutonomous"));
const PageOutboundTargetListInbox = lazy(() => import("@/pages/admin/outbound/PageOutboundTargetListInbox"));
const PageOutboundTargetReviewQueue = lazy(() => import("@/pages/admin/outbound/PageOutboundTargetReviewQueue"));
const PageOutboundAutopilotRuns = lazy(() => import("@/pages/admin/outbound/PageOutboundAutopilotRuns"));
const PageCityFirstTargetHub = lazy(() => import("@/pages/admin/outbound/PageCityFirstTargetHub"));
const PageCityExecutionMonitor = lazy(() => import("@/pages/admin/outbound/PageCityExecutionMonitor"));
const PageRunDiagnostics = lazy(() => import("@/pages/admin/outbound/PageRunDiagnostics"));
const PageAdminExecutionControl = lazy(() => import("@/pages/admin/PageAdminExecutionControl"));
const PageAdminDominanceControl = lazy(() => import("@/pages/admin/PageAdminDominanceControl"));
const PageAlexVoiceDebugAdmin = lazy(() => import("@/pages/admin/PageAlexVoiceDebugAdmin"));
const PageAdminSMSImageTemplates = lazy(() => import("@/pages/admin/sms-images/PageAdminSMSImageTemplates"));
const PageAdminBrandSettings = lazy(() => import("@/pages/admin/PageAdminBrandSettings"));
const PageShareImageDashboard = lazy(() => import("@/pages/admin/share-images/PageShareImageDashboard"));
const PageShareImageGenerate = lazy(() => import("@/pages/admin/share-images/PageShareImageGenerate"));
const PageShareImageTemplates = lazy(() => import("@/pages/admin/share-images/PageShareImageTemplates"));
const PageShareImageHistory = lazy(() => import("@/pages/admin/share-images/PageShareImageHistory"));
const PageShareImagePreview = lazy(() => import("@/pages/admin/share-images/PageShareImagePreview"));
const PageServiceEntityLanding = lazy(() => import("@/pages/seo/PageServiceEntityLanding"));
const MesProprietesPage = lazy(() => import("@/pages/MesProprietesPage"));
const AnalyserSoumissionsPage = lazy(() => import("@/pages/AnalyserSoumissionsPage"));
const PageRecruitmentCloser = lazy(() => import("@/pages/recruitment/PageRecruitmentCloser"));
const PageRecruitmentThankYou = lazy(() => import("@/pages/recruitment/PageRecruitmentThankYou"));
const PageRepresentativeOnboarding = lazy(() => import("@/pages/recruitment/PageRepresentativeOnboarding"));
const PageCareers = lazy(() => import("@/pages/recruitment/PageCareers"));
const PageRecruitmentProgrammer = lazy(() => import("@/pages/recruitment/PageRecruitmentProgrammer"));
const DecrireMonProjetPage = lazy(() => import("@/pages/DecrireMonProjetPage"));
const ParlerAAlexPage = lazy(() => import("@/pages/ParlerAAlexPage"));
const ProblemesMaisonPage = lazy(() => import("@/pages/ProblemesMaisonPage"));
const VillesDesserviesPage = lazy(() => import("@/pages/VillesDesserviesPage"));
const CityServicePage = lazy(() => import("@/pages/CityServicePage"));
const ProfessionnelsPage2 = lazy(() => import("@/pages/ProfessionnelsPage2"));
const EntretienPreventifPage = lazy(() => import("@/pages/EntretienPreventifPage"));
const BlogPage2 = lazy(() => import("@/pages/BlogPage2"));
const EmergencyPage = lazy(() => import("@/pages/EmergencyPage"));
const RefusalSeoPage = lazy(() => import("@/pages/seo/RefusalSeoPage"));

// Quote Separation: Comparison vs Client Record
const PageAnalyseTroisSoumissions = lazy(() => import("@/pages/PageAnalyseTroisSoumissions"));
const PageImporterSoumissionComparative = lazy(() => import("@/pages/PageImporterSoumissionComparative"));
const PageResultatAnalyseSoumissions = lazy(() => import("@/pages/PageResultatAnalyseSoumissions"));
const PageSoumissionsDossierClient = lazy(() => import("@/pages/PageSoumissionsDossierClient"));
const PageAjouterSoumissionAuDossier = lazy(() => import("@/pages/PageAjouterSoumissionAuDossier"));

// Prospect Execution Engine
const PageAdminProspectExecutionDashboard = lazy(() => import("@/pages/admin/prospect-execution/PageAdminProspectExecutionDashboard"));
const PageAdminProspectExecutionRunDetail = lazy(() => import("@/pages/admin/prospect-execution/PageAdminProspectExecutionRunDetail"));

// Affiliate Tracking
const PageAffiliateDashboard = lazy(() => import("@/pages/admin/affiliate/PageAffiliateDashboard"));

// Email Audit Center
const PageEmailAuditCenter = lazy(() => import("@/pages/admin/email-health/PageEmailAuditCenter"));
const PageEmailAuditHistory = lazy(() => import("@/pages/admin/email-health/PageEmailAuditHistory"));
const PageAdminEmailControlCenter = lazy(() => import("@/pages/admin/email-health/PageAdminEmailControlCenter"));
const PageAdminEmailWarmup = lazy(() => import("@/pages/admin/email-health/PageAdminEmailWarmup"));
const PageAdminEmailDeliveryLogs = lazy(() => import("@/pages/admin/email-health/PageAdminEmailLogs"));

// Email-to-Booking Conversion
const PageLandingPersonalizedAIPP = lazy(() => import("@/pages/conversion/PageLandingPersonalizedAIPP"));
const PageBookingContractor = lazy(() => import("@/pages/conversion/PageBookingContractor"));

const PageEntrepreneurJoin = lazy(() => import("@/pages/entrepreneur/PageEntrepreneurJoin"));
const PageEntrepreneurHowItWorks = lazy(() => import("@/pages/entrepreneur/PageEntrepreneurHowItWorks"));
const PageEntrepreneurPlans = lazy(() => import("@/pages/entrepreneur/PageEntrepreneurPlans"));

// Owner Match
const PageOwnerMatch = lazy(() => import("@/pages/match/PageOwnerMatch"));

// New V3 pages
const MesProprietes = lazy(() => import("@/pages/MesProprietesPage"));
const AnalyserSoumissions = lazy(() => import("@/pages/AnalyserSoumissionsPage"));
const LandingPageFounderPlans = lazy(() => import("@/pages/LandingPageFounderPlansUNPRO"));

// Adaptive Homepage System
const HomeIntentRouterDynamic = lazy(() => import("@/pages/HomeIntentRouterDynamic"));
const HomeHomeownerAdaptive = lazy(() => import("@/pages/homeowner/HomeHomeownerAdaptive"));
const HomeContractorAdaptive = lazy(() => import("@/pages/contractor-landing/HomeContractorAdaptive"));
const HomeCondoAdaptive = lazy(() => import("@/pages/condos/HomeCondoAdaptive"));
const HomeProfessionalAdaptive = lazy(() => import("@/pages/HomeProfessionalAdaptive"));

export const AppRouter = () => (
  <BrowserRouter>
    <ScrollRestoration />
    <BannerContinueFlow />
    <Suspense fallback={<LazyFallback />}>
      <Routes>
        {/* Redirects for common mismatched entry points */}
        <Route path="/index" element={<HomeWithFeatureFlag />} />
        <Route path="/entrepreneur/aipp-analysis" element={<PageAIPPAnalysisLoading />} />

        {/* Email-to-Booking Conversion (public, unauthenticated) */}
        <Route path="/pro/demo/:token" element={<Suspense fallback={<LazyFallback />}><PageLandingPersonalizedAIPP /></Suspense>} />
        <Route path="/pro/book/:token" element={<Suspense fallback={<LazyFallback />}><PageBookingContractor /></Suspense>} />

        {/* Public */}
        <Route path="/home-intent" element={<Suspense fallback={<LazyFallback />}><PageHomeIntentUNPRO /></Suspense>} />
        <Route path="/alex" element={<Suspense fallback={<LazyFallback />}><PageHomeAlexConversationalLite /></Suspense>} />
        <Route path="/alex/voice" element={<Suspense fallback={<LazyFallback />}><PageHomeAlexConversationalLite /></Suspense>} />
        <Route path="/alex/demo" element={<Suspense fallback={<LazyFallback />}><PageAlexConversationAnimated /></Suspense>} />
        <Route path="/alex/analysis" element={<Suspense fallback={<LazyFallback />}><PageHomeAlexConversationalLite /></Suspense>} />
        <Route path="/conversation" element={<Suspense fallback={<LazyFallback />}><PageHomeAlexConversationalLite /></Suspense>} />
        <Route path="/" element={<HomeWithFeatureFlag />} />
        <Route path="/intent" element={<Suspense fallback={<LazyFallback />}><HomeIntentRouterDynamic /></Suspense>} />
        <Route path="/homeowner" element={<Suspense fallback={<LazyFallback />}><HomeHomeownerAdaptive /></Suspense>} />
        <Route path="/contractor" element={<Suspense fallback={<LazyFallback />}><HomeContractorAdaptive /></Suspense>} />
        <Route path="/condo-home" element={<Suspense fallback={<LazyFallback />}><HomeCondoAdaptive /></Suspense>} />
        <Route path="/professional" element={<Suspense fallback={<LazyFallback />}><HomeProfessionalAdaptive /></Suspense>} />
        <Route path="/manifeste" element={<Suspense fallback={<LazyFallback />}><PageManifesto /></Suspense>} />
        <Route path="/cest-quoi-unpro" element={<Suspense fallback={<LazyFallback />}><PageUnproFAQ25 /></Suspense>} />
        <Route path="/go" element={<PageAdLandingAipp />} />
        <Route path="/aipp-check" element={<PageAdLandingAipp />} />
        <Route path="/business-import" element={<PageBusinessImport />} />
        <Route path="/business-card-import" element={<PageBusinessCardImport />} />
        <Route path="/scanner" element={<PageBusinessCardScannerHub />} />
        <Route path="/leads" element={<PageContractorLeads />} />
        <Route path="/profile-completion" element={<PageBusinessImport />} />
        <Route path="/search" element={<Search />} />
        <Route path="/diagnostic-photo" element={<Suspense fallback={<LazyFallback />}><ProVisualSearchPage /></Suspense>} />
        <Route path="/contractors/:id" element={<ContractorProfile />} />
        <Route path="/login" element={<LoginPageUnpro />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/signup" element={<LoginPageUnpro />} />
        <Route path="/role" element={<PreLoginRolePage />} />
        <Route path="/onboarding" element={<UniversalRouteGuard anyAuth><OnboardingPageUnpro /></UniversalRouteGuard>} />
        <Route path="/start" element={<StartPage />} />

        {/* Contractor AI Activation */}
        <Route path="/activation-ia" element={<LandingContractorAIActivation />} />

        {/* Contractor Onboarding AIPP Funnel */}
        <Route path="/entrepreneur/join" element={<PageContractorLandingAcquisition />} />
        <Route path="/entrepreneur/onboarding-voice" element={<Suspense fallback={<LazyFallback />}><PageContractorVoiceFirstLanding /></Suspense>} />
        <Route path="/entrepreneur/plan" element={<Suspense fallback={<LazyFallback />}><PageContractorPlanOnboarding /></Suspense>} />
        <Route path="/entrepreneur/onboarding" element={<PageContractorOnboardingStart />} />
        <Route path="/entrepreneur/import" element={<PageContractorImportWorkspace />} />
        <Route path="/entrepreneur/import/processing" element={<PageEntrepreneurImportProcessing />} />
        <Route path="/entrepreneur/aipp-builder" element={<PageContractorAIPPBuilder />} />
        <Route path="/entrepreneur/assets" element={<PageContractorAssetsStudio />} />
        <Route path="/entrepreneur/faq" element={<PageContractorFAQBuilder />} />
        <Route path="/entrepreneur/plan" element={<PageContractorPlanRecommendation />} />
        <Route path="/entrepreneur/checkout" element={<PageContractorCheckout />} />
        <Route path="/entrepreneur/activation" element={<PageContractorActivationSuccess />} />
        <Route path="/entrepreneur/dashboard-post" element={<PageContractorDashboardPostActivation />} />

        {/* Entrepreneur Funnel */}
        <Route path="/entrepreneur" element={<PageEntrepreneurLandingAIPP />} />
        <Route path="/entrepreneurs" element={<PageEntrepreneursLanding />} />
        <Route path="/entrepreneur/analysis/loading" element={<PageAIPPAnalysisLoading />} />
        <Route path="/entrepreneur/score" element={<PageEntrepreneurScoreResult />} />
        <Route path="/aipp/:token/results" element={<PageAIPPScoreReveal />} />
        <Route path="/aipp/local/results" element={<PageAIPPScoreReveal />} />
        <Route path="/entrepreneur/pricing" element={<PageEntrepreneurPricing />} />
        <Route path="/entrepreneur/pricing-calculator" element={<PagePricingCalculator />} />
        <Route path="/entrepreneur/plan-result" element={<PagePlanResult />} />
        <Route path="/entrepreneurs/calculateur" element={<PageEntrepreneurGoalToPlanLanding />} />
        <Route path="/entrepreneur/payment-success" element={<PagePaymentSuccess />} />
        <Route path="/entrepreneur/payment-cancelled" element={<PagePaymentCancelled />} />
        <Route path="/entrepreneur/dashboard" element={<PageEntrepreneurDashboardLite />} />

        {/* Contractor Join Landing */}
        <Route path="/entrepreneurs/rejoindre" element={<PageEntrepreneurJoin />} />
        <Route path="/entrepreneurs/comment-ca-marche" element={<PageEntrepreneurHowItWorks />} />
        <Route path="/entrepreneurs/plans" element={<PageEntrepreneurPlans />} />

        {/* Owner Match */}
        <Route path="/match" element={<PageOwnerMatch />} />

        <Route path="/homeowners" element={<HomeownersPage />} />
        <Route path="/proprietaires" element={<HomeownersPage />} />
        <Route path="/proprietaire/bienvenue" element={<PageHomeownerWelcome />} />
        <Route path="/owner-universe" element={<OwnerMenuPreviewPage />} />
        <Route path="/professionals" element={<ProfessionalsPage />} />
        <Route path="/entrepreneurs" element={<PageEntrepreneurJoin />} />
        <Route path="/entrepreneurs/disponibilite-categorie-specialite-ville" element={<ContractorAvailabilityPage />} />
        <Route path="/book/:slug" element={<PublicBookingPage />} />
        <Route path="/book/:slug/:typeSlug" element={<PublicBookingPage />} />
        <Route path="/book/success" element={<BookingPaymentSuccess />} />
        <Route path="/book/demo" element={<BookingClientDemoPage />} />
        <Route path="/book/cancel" element={<BookingPaymentCancel />} />
        <Route path="/partners" element={<PartnersPage />} />
        <Route path="/describe-project" element={<DescribeProjectPage />} />
        <Route path="/compare-quotes" element={<CompareQuotesPage />} />
        <Route path="/contractor-onboarding" element={<ContractorOnboardingPage />} />
        <Route path="/goals" element={<PageAlexGoalsStrategy />} />
        <Route path="/checkout" element={<PageCheckoutStripe />} />
        <Route path="/checkout/success" element={<PageCheckoutSuccess />} />
        <Route path="/checkout/native/:planCode" element={<PageCheckoutNativeScrollable />} />
        <Route path="/activation" element={<PageActivationStart />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/aipp-score" element={<AIPPScorePage />} />
        <Route path="/audit-aipp" element={<PageAuditAIPPv2 />} />
        <Route path="/audit-aipp/results/:auditId" element={<PageAuditResultsAIPPv2 />} />
        <Route path="/matching" element={<ProtectedRoute requiredRole="homeowner"><MatchingResultsPage /></ProtectedRoute>} />
        <Route path="/comparer" element={<ContractorComparisonPage />} />
        <Route path="/decision" element={<ProtectedRoute requiredRole="homeowner"><DecisionAssistantPage /></ProtectedRoute>} />
        <Route path="/alignment" element={<ProtectedRoute requiredRole="homeowner"><AlignmentQuestionnairePage /></ProtectedRoute>} />
        <Route path="/recommendation" element={<ProtectedRoute requiredRole="homeowner"><SmartRecommendationPage /></ProtectedRoute>} />
        <Route path="/dna-profile" element={<ProtectedRoute requiredRole="homeowner"><DNAProfilePage /></ProtectedRoute>} />

        {/* Property Graph */}
        <Route path="/property-graph" element={<PropertyGraphPage />} />
        {/* /alex already defined above — this was a duplicate */}
        <Route path="/alex/voice" element={<AlexVoicePage />} />
        <Route path="/alex/voice/realtime" element={<AlexVoiceRealtimePage />} />
        <Route path="/alex/command" element={<AlexCommandCenterPage />} />
        <Route path="/alex/no-match" element={<PageNoMatchFallback />} />
        <Route path="/alex/renovation" element={<RenovationVisualizerPage />} />
        <Route path="/design" element={<DesignPage />} />
        <Route path="/design/share/:token" element={<DesignSharePage />} />
        <Route path="/inspirations" element={<DiscoveryFeedPage />} />
        <Route path="/transformations/:id" element={<TransformationDetailPage />} />
        <Route path="/tendances" element={<TrendingPage />} />
        <Route path="/carte" element={<PropertyMapPage />} />
        <Route path="/flywheel" element={<FlywheelPage />} />
        <Route path="/communique" element={<PressRelease />} />
        <Route path="/authority" element={<AuthorityDashboardPage />} />
        <Route path="/energy" element={<EnergyPage />} />
        <Route path="/preventive-maintenance" element={<PreventiveMaintenancePage />} />
        <Route path="/copropriete" element={<CoproprietePage />} />
        <Route path="/condos/tarifs" element={<CondosPricingPage />} />
        <Route path="/building-map" element={<BuildingIntelligenceMap />} />
        <Route path="/answers" element={<AnswerEnginePage />} />
        <Route path="/import-business" element={<BusinessImportPage />} />
        <Route path="/verify" element={<VerifyContractorPage />} />
        <Route path="/verifier-entrepreneur" element={<VerifyLandingPage />} />
        <Route path="/verifier-un-entrepreneur" element={<VerifierEntrepreneurPage />} />
        <Route path="/analyser-document" element={<AnalyzeDocumentPage />} />
        <Route path="/verifier-:tradeSlug/:citySlug" element={<VerificationSeoPage />} />
        <Route path="/qr/:token" element={<QrScanPage />} />
        <Route path="/r/:refCode" element={<ReferralLandingPage />} />
        <Route path="/i/:code" element={<DeepLinkPage />} />
        <Route path="/unsubscribe" element={<Unsubscribe />} />
        <Route path="/unlock" element={<UnlockPage />} />
        <Route path="/fondateur" element={<FounderPage />} />
        <Route path="/fondateur/plans" element={<LandingPageFounderPlans />} />

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

        {/* Property Type SEO Pages */}
        <Route path="/types-de-propriete/:type" element={<PropertyTypeHubPage />} />
        <Route path="/:city/:type/:problem" element={<PropertyTypeProblemPage />} />
        <Route path="/:city/:type" element={<PropertyTypeCityPage />} />

        {/* Programmatic SEO Pages */}
        <Route path="/s/:slug" element={<SeoPageRenderer />} />
        <Route path="/plan-du-site" element={<SeoSitemapPage />} />

        {/* Legacy English routes */}
        <Route path="/problems/:slug" element={<ProblemPage />} />
        <Route path="/problems/:problem/:city" element={<ProblemLocationPage />} />
        <Route path="/solutions/:slug" element={<SolutionPage />} />
        <Route path="/city/:slug" element={<CityPage />} />

        {/* ─── Fallback-enabled public pages (navigation links) ─── */}
        <Route path="/proprietaires/passeport-maison" element={<FallbackRoutePage />} />
        <Route path="/proprietaires/score-maison" element={<FallbackRoutePage />} />
        <Route path="/outils-ia" element={<FallbackRoutePage />} />
        <Route path="/services/isolation-grenier" element={<FallbackRoutePage />} />
        <Route path="/services/toiture" element={<FallbackRoutePage />} />
        <Route path="/services/fondation" element={<FallbackRoutePage />} />
        <Route path="/services/fenetres" element={<FallbackRoutePage />} />
        <Route path="/services/chauffage" element={<FallbackRoutePage />} />
        <Route path="/entrepreneurs/creer-mon-profil" element={<FallbackRoutePage />} />
        <Route path="/entrepreneurs/pages-ia" element={<FallbackRoutePage />} />
        <Route path="/entrepreneurs/score-aipp" element={<FallbackRoutePage />} />
        <Route path="/entrepreneurs/profil-public" element={<FallbackRoutePage />} />
        <Route path="/entrepreneurs/matching" element={<FallbackRoutePage />} />
        <Route path="/entrepreneurs/badges" element={<FallbackRoutePage />} />
        <Route path="/entrepreneurs/demo" element={<FallbackRoutePage />} />
        <Route path="/entrepreneurs/ambassadeur" element={<FallbackRoutePage />} />
        <Route path="/ambassadeurs" element={<FallbackRoutePage />} />
        <Route path="/aide" element={<FallbackRoutePage />} />
        <Route path="/professionnels" element={<FallbackRoutePage />} />
        <Route path="/villes" element={<FallbackRoutePage />} />
        <Route path="/guides" element={<FallbackRoutePage />} />
        {/* New V3 Navigation routes */}
        <Route path="/trouver" element={<Search />} />
        <Route path="/verifier" element={<VerifyLandingPage />} />
        <Route path="/planifier" element={<DescribeProjectPage />} />
        <Route path="/score-aipp" element={<FallbackRoutePage />} />
        <Route path="/plans-prix" element={<FallbackRoutePage />} />
        <Route path="/favoris" element={<FallbackRoutePage />} />
        <Route path="/historique" element={<FallbackRoutePage />} />
        <Route path="/estimations-ai" element={<FallbackRoutePage />} />
        <Route path="/classement" element={<FallbackRoutePage />} />
        <Route path="/facturation" element={<FallbackRoutePage />} />
        <Route path="/analytics" element={<FallbackRoutePage />} />
        <Route path="/settings-systeme" element={<FallbackRoutePage />} />
        <Route path="/notifications" element={<FallbackRoutePage />} />
        <Route path="/opportunites" element={<FallbackRoutePage />} />
        <Route path="/messages" element={<FallbackRoutePage />} />
        <Route path="/compte" element={<FallbackRoutePage />} />
        <Route path="/connexion-interstice" element={<FallbackRoutePage />} />
        <Route path="/mes-projets" element={<FallbackRoutePage />} />
        <Route path="/mes-rendez-vous" element={<FallbackRoutePage />} />
        <Route path="/immeubles" element={<FallbackRoutePage />} />
        <Route path="/interventions" element={<FallbackRoutePage />} />
        <Route path="/documents" element={<FallbackRoutePage />} />
        <Route path="/loi-16" element={<FallbackRoutePage />} />
        <Route path="/fonds-prevoyance" element={<FallbackRoutePage />} />
        <Route path="/rapports" element={<FallbackRoutePage />} />
        <Route path="/registre" element={<FallbackRoutePage />} />
        <Route path="/photos-projets" element={<FallbackRoutePage />} />
        <Route path="/avis-clients" element={<FallbackRoutePage />} />
        <Route path="/certifications" element={<FallbackRoutePage />} />
        <Route path="/profil-ai" element={<FallbackRoutePage />} />
        <Route path="/alertes" element={<FallbackRoutePage />} />
        <Route path="/blog" element={<BlogIndexPage />} />
        <Route path="/blog/:slug" element={<BlogArticlePage />} />
        <Route path="/blog/category/:category" element={<BlogIndexPage />} />
        <Route path="/blog/city/:city" element={<BlogIndexPage />} />
        <Route path="/conseils-renovation" element={<FallbackRoutePage />} />
        <Route path="/faq" element={<FallbackRoutePage />} />
        <Route path="/comment-ca-marche" element={<CommentCaMarchePage />} />
        <Route path="/comment-fonctionne-ia" element={<PageHowUnproWorksAI />} />
        <Route path="/roadmap" element={<PageRoadmapFeatures />} />
        <Route path="/couverture" element={<PageCityServiceCoverage />} />
        <Route path="/guides" element={<PageGuidesHomeProblems />} />
        <Route path="/avis-verifies" element={<PageReviewsVerified />} />
        <Route path="/verification" element={<FallbackRoutePage />} />
        <Route path="/nos-standards" element={<FallbackRoutePage />} />
        <Route path="/pourquoi-pas-3-soumissions" element={<FallbackRoutePage />} />
        <Route path="/a-propos" element={<FallbackRoutePage />} />
        <Route path="/partenaires" element={<FallbackRoutePage />} />
        <Route path="/contact" element={<FallbackRoutePage />} />
        <Route path="/conditions" element={<FallbackRoutePage />} />
        <Route path="/confidentialite" element={<FallbackRoutePage />} />
        <Route path="/cookies" element={<FallbackRoutePage />} />
        <Route path="/sitemap" element={<FallbackRoutePage />} />
        <Route path="/accessibilite" element={<FallbackRoutePage />} />

        {/* Entrepreneur Onboarding Flow */}
        <Route path="/entrepreneur/onboarding/import" element={<PageOnboardingImport />} />
        <Route path="/entrepreneur/onboarding/analyse" element={<PageOnboardingAnalyse />} />
        <Route path="/entrepreneur/onboarding/plan" element={<PageOnboardingPlan />} />
        <Route path="/entrepreneur/onboarding/payment" element={<PageOnboardingPayment />} />
        <Route path="/entrepreneur/onboarding/success" element={<PageOnboardingSuccess />} />

        {/* New V3 public pages */}
        <Route path="/mes-proprietes" element={<MesProprietesPage />} />
        <Route path="/analyser-soumissions" element={<AnalyserSoumissionsPage />} />

        {/* Quote Separation: Comparison flow */}
        <Route path="/analyse-soumissions" element={<PageAnalyseTroisSoumissions />} />
        <Route path="/analyse-soumissions/importer" element={<PageImporterSoumissionComparative />} />
        <Route path="/analyse-soumissions/resultats" element={<PageResultatAnalyseSoumissions />} />

        {/* Quote Separation: Client record flow */}
        <Route path="/dossier-soumissions" element={<PageSoumissionsDossierClient />} />
        <Route path="/dossier-soumissions/ajouter" element={<PageAjouterSoumissionAuDossier />} />
        <Route path="/decrire-mon-projet" element={<DecrireMonProjetPage />} />
        <Route path="/parler-a-alex" element={<ParlerAAlexPage />} />
        <Route path="/problemes-maison" element={<ProblemesMaisonPage />} />
        <Route path="/villes-desservies" element={<VillesDesserviesPage />} />
        <Route path="/ville-service/:city/:service" element={<CityServicePage />} />
        <Route path="/professionnels2" element={<ProfessionnelsPage2 />} />
        <Route path="/entretien-preventif" element={<EntretienPreventifPage />} />
        <Route path="/blog2" element={<BlogPage2 />} />

        {/* ─── Fallback condo pages ─── */}
        <Route path="/condo/passeport" element={<FallbackRoutePage />} />
        <Route path="/condo/documents" element={<FallbackRoutePage />} />
        <Route path="/condo/dashboard" element={<FallbackRoutePage />} />
        <Route path="/condo/dossier" element={<FallbackRoutePage />} />
        <Route path="/condo/travaux" element={<FallbackRoutePage />} />
        <Route path="/condo/historique" element={<FallbackRoutePage />} />
        <Route path="/condo/inviter" element={<FallbackRoutePage />} />
        <Route path="/condo/loi-16" element={<CondoLoi16Page />} />
        <Route path="/condo/inspection" element={<FallbackRoutePage />} />
        <Route path="/condo/guides" element={<FallbackRoutePage />} />

        {/* ─── Fallback pro pages ─── */}
        <Route path="/pro/stats" element={<FallbackRoutePage />} />
        <Route path="/pro/visibility" element={<FallbackRoutePage />} />
        <Route path="/pro/recommendations" element={<FallbackRoutePage />} />
        <Route path="/dashboard/maintenance" element={<FallbackRoutePage />} />

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
        <Route path="/dashboard/leads/:id/results" element={<ProtectedRoute requiredRole="homeowner"><LeadResults /></ProtectedRoute>} />
        <Route path="/dashboard/syndicates" element={<ProtectedRoute requiredRole="homeowner"><SyndicateDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/syndicates/:id" element={<ProtectedRoute requiredRole="homeowner"><SyndicateDetailDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/syndicates/:id/reserve" element={<ProtectedRoute requiredRole="homeowner"><SyndicateReserveFund /></ProtectedRoute>} />
        <Route path="/dashboard/syndicates/:id/reserve/analyze" element={<ProtectedRoute requiredRole="homeowner"><ReserveFundAnalyzer /></ProtectedRoute>} />
        <Route path="/dashboard/syndicates/:id/maintenance" element={<ProtectedRoute requiredRole="homeowner"><SyndicateMaintenance /></ProtectedRoute>} />
        <Route path="/dashboard/syndicates/:id/votes" element={<ProtectedRoute requiredRole="homeowner"><SyndicateVotes /></ProtectedRoute>} />
        <Route path="/dashboard/syndicates/:id/votes/new" element={<ProtectedRoute requiredRole="homeowner"><SyndicateVoteCreate /></ProtectedRoute>} />
        <Route path="/dashboard/syndicates/:id/growth" element={<ProtectedRoute requiredRole="homeowner"><SyndicateGrowthDashboard /></ProtectedRoute>} />
        <Route path="/dashboard/placements" element={<ProtectedRoute requiredRole="homeowner"><MyPlacementsPage /></ProtectedRoute>} />
        <Route path="/dashboard/notifications" element={<ProtectedRoute requiredRole="homeowner"><NotificationsPage /></ProtectedRoute>} />
        <Route path="/dashboard/qr-performance" element={<ProtectedRoute requiredRole="homeowner"><MyQRPerformancePage /></ProtectedRoute>} />

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
        <Route path="/pro/authority-score" element={<ProtectedRoute requiredRole="contractor"><ProAuthorityScore /></ProtectedRoute>} />
        <Route path="/pro/incoming" element={<ProtectedRoute requiredRole="contractor"><ProIncomingProjects /></ProtectedRoute>} />
        <Route path="/pro/inbox" element={<ProtectedRoute requiredRole="contractor"><PageContractorInbox /></ProtectedRoute>} />
        <Route path="/pro/inbox/:id" element={<ProtectedRoute requiredRole="contractor"><PageJobDetailsLive /></ProtectedRoute>} />
        <Route path="/pro/partners" element={<ProtectedRoute requiredRole="contractor"><ProPartnerNetwork /></ProtectedRoute>} />
        <Route path="/pro/expertise" element={<ProtectedRoute requiredRole="contractor"><ProExpertise /></ProtectedRoute>} />
        <Route path="/pro/teams" element={<ProtectedRoute requiredRole="contractor"><ProTeams /></ProtectedRoute>} />
        <Route path="/pro/emergency-settings" element={<ProtectedRoute requiredRole="contractor"><ProEmergencySettings /></ProtectedRoute>} />
        <Route path="/pro/domain-intelligence" element={<ProtectedRoute requiredRole="contractor"><ProDomainIntelligence /></ProtectedRoute>} />
        <Route path="/pro/qr-performance" element={<ProtectedRoute requiredRole="contractor"><MyQRPerformancePage /></ProtectedRoute>} />
        <Route path="/pro/matched-leads" element={<ProtectedRoute requiredRole="contractor"><ProMatchedLeads /></ProtectedRoute>} />
        <Route path="/pro/notifications" element={<ProtectedRoute requiredRole="contractor"><NotificationsPage /></ProtectedRoute>} />
        <Route path="/pro/setup" element={<ProtectedRoute requiredRole="contractor"><ProSetupWizard /></ProtectedRoute>} />
        <Route path="/pro/booking-settings" element={<ProtectedRoute requiredRole="contractor"><BookingSettingsPage /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin/menu-intelligence" element={<ProtectedRoute requiredRole="admin"><MenuIntelligenceAdminPage /></ProtectedRoute>} />
        <Route path="/admin/handoff-analytics" element={<ProtectedRoute requiredRole="admin"><PageAdminHandoffAnalytics /></ProtectedRoute>} />
        <Route path="/admin/emails" element={<ProtectedRoute requiredRole="admin"><PageAdminEmailLogs /></ProtectedRoute>} />
        <Route path="/admin/email-templates" element={<ProtectedRoute requiredRole="admin"><PageAdminEmailTemplates /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/activation" element={<ProtectedRoute requiredRole="admin"><PageAdminEntrepreneurActivation /></ProtectedRoute>} />
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
        <Route path="/admin/automation-command-center" element={<ProtectedRoute requiredRole="admin"><PageAdminAutomationCommandCenter /></ProtectedRoute>} />
        <Route path="/admin/go-live" element={<ProtectedRoute requiredRole="admin"><PageAdminGoLive /></ProtectedRoute>} />
        <Route path="/admin/go-live/verification" element={<ProtectedRoute requiredRole="admin"><PageAdminGoLiveVerification /></ProtectedRoute>} />
        <Route path="/admin/go-live/incidents" element={<ProtectedRoute requiredRole="admin"><PageAdminGoLiveIncidents /></ProtectedRoute>} />
        <Route path="/admin/go-live/e2e-tests" element={<ProtectedRoute requiredRole="admin"><PageAdminGoLiveE2ETests /></ProtectedRoute>} />
        <Route path="/admin/go-live/function-health" element={<ProtectedRoute requiredRole="admin"><PageAdminGoLiveFunctionHealth /></ProtectedRoute>} />
        <Route path="/admin/go-live/payment-health" element={<ProtectedRoute requiredRole="admin"><PageAdminGoLivePaymentHealth /></ProtectedRoute>} />
        <Route path="/admin/navigation" element={<ProtectedRoute requiredRole="admin"><PageAdminNavigation /></ProtectedRoute>} />
        <Route path="/admin/aipp-v2" element={<ProtectedRoute requiredRole="admin"><PageAdminAIPPv2Dashboard /></ProtectedRoute>} />
        <Route path="/admin/home-graph" element={<ProtectedRoute requiredRole="admin"><AdminHomeGraph /></ProtectedRoute>} />
        <Route path="/admin/uos" element={<ProtectedRoute requiredRole="admin"><AdminUOS /></ProtectedRoute>} />
        <Route path="/admin/qa-simulation" element={<ProtectedRoute requiredRole="admin"><PageAdminQASimulation /></ProtectedRoute>} />
        <Route path="/admin/qa-simulation/run/:runId" element={<ProtectedRoute requiredRole="admin"><PageAdminQASimulationRun /></ProtectedRoute>} />
        <Route path="/admin/qa-simulation/templates" element={<ProtectedRoute requiredRole="admin"><PageAdminQASimulationTemplates /></ProtectedRoute>} />
        <Route path="/admin/growth-engine" element={<ProtectedRoute requiredRole="admin"><AdminGrowthEngine /></ProtectedRoute>} />
        <Route path="/admin/pricing" element={<ProtectedRoute requiredRole="admin"><AdminPricingPage /></ProtectedRoute>} />
        <Route path="/admin/coupons" element={<ProtectedRoute requiredRole="admin"><AdminCoupons /></ProtectedRoute>} />
        <Route path="/admin/plan-distribution" element={<ProtectedRoute requiredRole="admin"><PageAdminPlanDistribution /></ProtectedRoute>} />
        <Route path="/admin/plan-appointments" element={<ProtectedRoute requiredRole="admin"><PageAdminPlanAppointmentsControl /></ProtectedRoute>} />
        <Route path="/admin/cluster-project-size-matrix" element={<ProtectedRoute requiredRole="admin"><PageAdminClusterPlanProjectSizeMatrix /></ProtectedRoute>} />
        <Route path="/admin/project-size-extensions" element={<ProtectedRoute requiredRole="admin"><PageAdminProjectSizeExtensions /></ProtectedRoute>} />
        <Route path="/pro/plan-usage" element={<ProtectedRoute><PageEntrepreneurPlanUsage /></ProtectedRoute>} />
        <Route path="/admin/refusal-seo" element={<ProtectedRoute requiredRole="admin"><AdminRefusalSeoPage /></ProtectedRoute>} />
        <Route path="/admin/ads-engine" element={<ProtectedRoute requiredRole="admin"><AdminAdsEngine /></ProtectedRoute>} />
        <Route path="/admin/demand-grid" element={<ProtectedRoute requiredRole="admin"><AdminDemandGrid /></ProtectedRoute>} />
        <Route path="/admin/sales-psychology" element={<ProtectedRoute requiredRole="admin"><AdminSalesPsychology /></ProtectedRoute>} />
        <Route path="/admin/reward-rules" element={<ProtectedRoute requiredRole="admin"><AdminRewardRules /></ProtectedRoute>} />
        <Route path="/admin/deep-link-analytics" element={<ProtectedRoute requiredRole="admin"><AdminDeepLinkAnalytics /></ProtectedRoute>} />
        <Route path="/admin/ai-growth" element={<ProtectedRoute requiredRole="admin"><AdminAIGrowthInsights /></ProtectedRoute>} />
        <Route path="/admin/seo-generator" element={<ProtectedRoute requiredRole="admin"><AdminSeoGenerator /></ProtectedRoute>} />
        <Route path="/admin/ai-dashboard" element={<ProtectedRoute requiredRole="admin"><AdminAIGrowthDashboard /></ProtectedRoute>} />
        <Route path="/admin/campaign-lab" element={<ProtectedRoute requiredRole="admin"><AdminCampaignLab /></ProtectedRoute>} />
        <Route path="/admin/autopilot" element={<ProtectedRoute requiredRole="admin"><AdminAutopilotDashboard /></ProtectedRoute>} />
        <Route path="/admin/seo-domination" element={<ProtectedRoute requiredRole="admin"><AdminSeoDominationDashboard /></ProtectedRoute>} />
        <Route path="/admin/market-engine" element={<ProtectedRoute requiredRole="admin"><AdminMarketEngine /></ProtectedRoute>} />
        <Route path="/admin/nexus" element={<ProtectedRoute requiredRole="admin"><AdminNexusDashboard /></ProtectedRoute>} />
        <Route path="/admin/dispatch-center" element={<ProtectedRoute requiredRole="admin"><AdminDispatchCenter /></ProtectedRoute>} />
        <Route path="/admin/domain-intelligence" element={<ProtectedRoute requiredRole="admin"><AdminDomainIntelligence /></ProtectedRoute>} />
        <Route path="/admin/domain-health" element={<ProtectedRoute requiredRole="admin"><PageDomainHealthDashboard /></ProtectedRoute>} />
        <Route path="/admin/alex-guardrails" element={<ProtectedRoute requiredRole="admin"><PageAdminAlexConversationRules /></ProtectedRoute>} />
        <Route path="/admin/alex-debug" element={<ProtectedRoute requiredRole="admin"><PageAdminAlexDebugHome /></ProtectedRoute>} />
        <Route path="/admin/alex-speech-tuning" element={<ProtectedRoute requiredRole="admin"><PageAdminAlexSpeechTuning /></ProtectedRoute>} />
        <Route path="/admin/alex-voice-admin" element={<ProtectedRoute requiredRole="admin"><AlexVoiceAdmin /></ProtectedRoute>} />
        <Route path="/admin/seo-articles" element={<ProtectedRoute requiredRole="admin"><AdminSeoArticles /></ProtectedRoute>} />
        <Route path="/admin/bulk-articles" element={<ProtectedRoute requiredRole="admin"><AdminBulkArticlesPage /></ProtectedRoute>} />
        <Route path="/admin/founder-invites" element={<ProtectedRoute requiredRole="admin"><AdminFounderInvites /></ProtectedRoute>} />
        <Route path="/admin/prospects" element={<ProtectedRoute requiredRole="admin"><AdminProspects /></ProtectedRoute>} />
        <Route path="/admin/prospects/import" element={<ProtectedRoute requiredRole="admin"><AdminProspectImport /></ProtectedRoute>} />
        <Route path="/admin/prospects/campaigns" element={<ProtectedRoute requiredRole="admin"><AdminProspectCampaigns /></ProtectedRoute>} />
        <Route path="/admin/roadmap-execution" element={<ProtectedRoute requiredRole="admin"><AdminRoadmapExecution /></ProtectedRoute>} />
        <Route path="/admin/screenshot-analytics" element={<ProtectedRoute requiredRole="admin"><AdminScreenshotAnalyticsPage /></ProtectedRoute>} />
        <Route path="/admin/screenshot-friction" element={<ProtectedRoute requiredRole="admin"><AdminScreenshotFrictionPage /></ProtectedRoute>} />
        <Route path="/admin/screenshot-alerts" element={<ProtectedRoute requiredRole="admin"><AdminScreenshotAlertsPage /></ProtectedRoute>} />
        <Route path="/admin/screenshot-insights" element={<ProtectedRoute requiredRole="admin"><AdminScreenshotInsightsPage /></ProtectedRoute>} />
        <Route path="/admin/optimization" element={<ProtectedRoute requiredRole="admin"><AdminOptimizationDashboard /></ProtectedRoute>} />
        <Route path="/admin/experiments" element={<ProtectedRoute requiredRole="admin"><AdminExperimentsPage /></ProtectedRoute>} />
        <Route path="/admin/experiments/:id" element={<ProtectedRoute requiredRole="admin"><AdminExperimentDetailPage /></ProtectedRoute>} />
        <Route path="/admin/optimization/recommendations" element={<ProtectedRoute requiredRole="admin"><AdminOptimizationRecommendations /></ProtectedRoute>} />
        <Route path="/admin/optimization/winners" element={<ProtectedRoute requiredRole="admin"><AdminWinningVariantsPage /></ProtectedRoute>} />
        <Route path="/admin/predictive-leads" element={<ProtectedRoute requiredRole="admin"><AdminPredictiveLeads /></ProtectedRoute>} />
        <Route path="/admin/dynamic-pricing-market" element={<ProtectedRoute requiredRole="admin"><AdminDynamicMarketPricing /></ProtectedRoute>} />
        <Route path="/admin/predictive-market-board" element={<ProtectedRoute requiredRole="admin"><AdminPredictiveMarketBoard /></ProtectedRoute>} />
        <Route path="/admin/zone-value" element={<ProtectedRoute requiredRole="admin"><AdminZoneValueMap /></ProtectedRoute>} />
        <Route path="/admin/voice-control" element={<ProtectedRoute requiredRole="admin"><AdminVoiceControlPage /></ProtectedRoute>} />
        <Route path="/admin/voice-optimizer" element={<ProtectedRoute requiredRole="admin"><AdminVoiceOptimizerPage /></ProtectedRoute>} />
        <Route path="/admin/voice-optimizer/:id" element={<ProtectedRoute requiredRole="admin"><AdminVoiceOptimizerPage /></ProtectedRoute>} />
        <Route path="/admin/voice-pronunciation" element={<ProtectedRoute requiredRole="admin"><PageAdminVoicePronunciation /></ProtectedRoute>} />
        <Route path="/admin/alex/voice" element={<ProtectedRoute requiredRole="admin"><PageAdminAlexVoice /></ProtectedRoute>} />
        <Route path="/admin/alex/voice/tests" element={<ProtectedRoute requiredRole="admin"><PageAdminAlexVoice /></ProtectedRoute>} />
        <Route path="/admin/alex/context" element={<ProtectedRoute requiredRole="admin"><PageAdminAlexContext /></ProtectedRoute>} />
        <Route path="/admin/alex/analytics" element={<ProtectedRoute requiredRole="admin"><PageAdminAlexAnalytics /></ProtectedRoute>} />
        <Route path="/admin/alex/fallbacks" element={<ProtectedRoute requiredRole="admin"><PageAdminAlexVoice /></ProtectedRoute>} />
        <Route path="/admin/no-match-monitoring" element={<ProtectedRoute requiredRole="admin"><PageAdminNoMatchMonitoring /></ProtectedRoute>} />
        <Route path="/admin/sales-analytics" element={<ProtectedRoute requiredRole="admin"><AdminSalesAnalyticsPage /></ProtectedRoute>} />
        <Route path="/entrepreneur/sales" element={<EntrepreneurVoiceSalesPage />} />
        <Route path="/homeowner/voice" element={<HomeownerVoiceEntryPage />} />
        <Route path="/admin/homeowner-analytics" element={<ProtectedRoute requiredRole="admin"><AdminHomeownerAnalyticsPage /></ProtectedRoute>} />
        <Route path="/alex/predictive-seller" element={<PageAlexPredictiveSeller />} />
        <Route path="/signature" element={<PageAlexGuidedOnboarding />} />
        <Route path="/admin/prospection" element={<ProtectedRoute requiredRole="admin"><AdminProspectionEngine /></ProtectedRoute>} />
        <Route path="/admin/prospection-engine" element={<ProtectedRoute requiredRole="admin"><PageProspectionDashboard /></ProtectedRoute>} />
        <Route path="/admin/prospection/prospects" element={<ProtectedRoute requiredRole="admin"><AdminProspectionProspects /></ProtectedRoute>} />
        <Route path="/admin/prospection/analytics" element={<ProtectedRoute requiredRole="admin"><AdminProspectionAnalytics /></ProtectedRoute>} />
        <Route path="/admin/city-activity-matrix" element={<ProtectedRoute requiredRole="admin"><PageAdminCityActivityMatrix /></ProtectedRoute>} />
        <Route path="/admin/services-secondaires" element={<ProtectedRoute requiredRole="admin"><PageAdminActivitiesSecondaryManager /></ProtectedRoute>} />
        <Route path="/alex-landing" element={<PageAlexPersonalizedLanding />} />
        <Route path="/admin/outreach" element={<ProtectedRoute requiredRole="admin"><AdminOutreachDashboard /></ProtectedRoute>} />
        <Route path="/admin/outreach/new" element={<ProtectedRoute requiredRole="admin"><AdminOutreachCampaignNew /></ProtectedRoute>} />
        <Route path="/admin/outreach/:id" element={<ProtectedRoute requiredRole="admin"><AdminOutreachCampaignDetail /></ProtectedRoute>} />
        <Route path="/admin/outreach/templates" element={<ProtectedRoute requiredRole="admin"><AdminOutreachTemplates /></ProtectedRoute>} />
        <Route path="/admin/outreach/analytics" element={<ProtectedRoute requiredRole="admin"><AdminOutreachAnalytics /></ProtectedRoute>} />
        <Route path="/admin/outbound" element={<ProtectedRoute requiredRole="admin"><PageOutboundDashboard /></ProtectedRoute>} />
        <Route path="/admin/outbound/campaigns" element={<ProtectedRoute requiredRole="admin"><PageOutboundCampaigns /></ProtectedRoute>} />
        <Route path="/admin/outbound/leads" element={<ProtectedRoute requiredRole="admin"><PageOutboundLeadsQueue /></ProtectedRoute>} />
        <Route path="/admin/outbound/leads/:id" element={<ProtectedRoute requiredRole="admin"><PageOutboundLeadProfile /></ProtectedRoute>} />
        <Route path="/admin/outbound/sequences" element={<ProtectedRoute requiredRole="admin"><PageOutboundSequences /></ProtectedRoute>} />
        <Route path="/admin/outbound/mailboxes" element={<ProtectedRoute requiredRole="admin"><PageOutboundMailboxes /></ProtectedRoute>} />
        <Route path="/admin/outbound/analytics" element={<ProtectedRoute requiredRole="admin"><PageOutboundAnalytics /></ProtectedRoute>} />
        <Route path="/admin/outbound/suppressions" element={<ProtectedRoute requiredRole="admin"><PageOutboundSuppressionCenter /></ProtectedRoute>} />
        <Route path="/admin/outbound/landing-pages" element={<ProtectedRoute requiredRole="admin"><PageOutboundLandingPages /></ProtectedRoute>} />
        <Route path="/admin/outbound/ops" element={<ProtectedRoute requiredRole="admin"><PageOutboundOpsCenter /></ProtectedRoute>} />
        <Route path="/admin/outbound/verification" element={<ProtectedRoute requiredRole="admin"><PageOutboundVerification /></ProtectedRoute>} />
        <Route path="/admin/outbound/tests" element={<ProtectedRoute requiredRole="admin"><PageOutboundTests /></ProtectedRoute>} />
        <Route path="/admin/outbound/automations" element={<ProtectedRoute requiredRole="admin"><PageOutboundAutomations /></ProtectedRoute>} />
        <Route path="/admin/outbound/logs" element={<ProtectedRoute requiredRole="admin"><PageOutboundLogs /></ProtectedRoute>} />
        <Route path="/admin/outbound/settings-lite" element={<ProtectedRoute requiredRole="admin"><PageOutboundSettingsLite /></ProtectedRoute>} />
        <Route path="/admin/outbound/email-health" element={<ProtectedRoute requiredRole="admin"><PageOutboundEmailHealth /></ProtectedRoute>} />
        <Route path="/admin/outbound/sequences-elite" element={<ProtectedRoute requiredRole="admin"><PageOutboundSequencesElite /></ProtectedRoute>} />
        <Route path="/admin/outbound/sending-architecture" element={<ProtectedRoute requiredRole="admin"><PageOutboundSendingArchitecture /></ProtectedRoute>} />
        <Route path="/admin/outbound/deliverability" element={<ProtectedRoute requiredRole="admin"><PageOutboundDeliverability /></ProtectedRoute>} />
        <Route path="/admin/outbound/ai-rewrite" element={<ProtectedRoute requiredRole="admin"><PageOutboundAIRewrite /></ProtectedRoute>} />
        <Route path="/admin/outbound/revenue" element={<ProtectedRoute requiredRole="admin"><PageOutboundRevenue /></ProtectedRoute>} />
        <Route path="/admin/outbound/sms-fallback" element={<ProtectedRoute requiredRole="admin"><PageOutboundSMSFallback /></ProtectedRoute>} />
        <Route path="/admin/outbound/campaigns/new" element={<ProtectedRoute requiredRole="admin"><PageCampaignBuilderAutonomous /></ProtectedRoute>} />
        <Route path="/admin/outbound/runs" element={<ProtectedRoute requiredRole="admin"><PageRunMonitorAutonomous /></ProtectedRoute>} />
        <Route path="/admin/outbound/settings" element={<ProtectedRoute requiredRole="admin"><PageOutboundSettingsAutonomous /></ProtectedRoute>} />
        <Route path="/admin/outbound/targets" element={<ProtectedRoute requiredRole="admin"><PageOutboundTargetListInbox /></ProtectedRoute>} />
        <Route path="/admin/outbound/targets/review" element={<ProtectedRoute requiredRole="admin"><PageOutboundTargetReviewQueue /></ProtectedRoute>} />
        <Route path="/admin/outbound/autopilot/runs" element={<ProtectedRoute requiredRole="admin"><PageOutboundAutopilotRuns /></ProtectedRoute>} />
        <Route path="/admin/outbound/cities" element={<ProtectedRoute requiredRole="admin"><PageCityFirstTargetHub /></ProtectedRoute>} />
        <Route path="/admin/outbound/cities/:slug" element={<ProtectedRoute requiredRole="admin"><PageCityExecutionMonitor /></ProtectedRoute>} />
        <Route path="/admin/outbound/diagnostics" element={<ProtectedRoute requiredRole="admin"><PageRunDiagnostics /></ProtectedRoute>} />
        <Route path="/admin/execution-control" element={<ProtectedRoute requiredRole="admin"><PageAdminExecutionControl /></ProtectedRoute>} />
        <Route path="/admin/dominance" element={<ProtectedRoute requiredRole="admin"><PageAdminDominanceControl /></ProtectedRoute>} />
        <Route path="/admin/voice-debug" element={<ProtectedRoute requiredRole="admin"><PageAlexVoiceDebugAdmin /></ProtectedRoute>} />
        <Route path="/admin/alex-prompt-rules" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAlexPromptRulesAdmin /></Suspense></ProtectedRoute>} />
        <Route path="/admin/alex-conversation-debug" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAlexConversationDebugAdmin /></Suspense></ProtectedRoute>} />
        <Route path="/admin/sms-images" element={<ProtectedRoute requiredRole="admin"><PageAdminSMSImageTemplates /></ProtectedRoute>} />
        <Route path="/admin/brand" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAdminBrandSettings /></Suspense></ProtectedRoute>} />
        <Route path="/admin/share-images" element={<ProtectedRoute requiredRole="admin"><PageShareImageDashboard /></ProtectedRoute>} />
        <Route path="/admin/share-images/generate" element={<ProtectedRoute requiredRole="admin"><PageShareImageGenerate /></ProtectedRoute>} />
        <Route path="/admin/share-images/templates" element={<ProtectedRoute requiredRole="admin"><PageShareImageTemplates /></ProtectedRoute>} />
        <Route path="/admin/share-images/history" element={<ProtectedRoute requiredRole="admin"><PageShareImageHistory /></ProtectedRoute>} />
        <Route path="/admin/share-images/preview" element={<ProtectedRoute requiredRole="admin"><PageShareImagePreview /></ProtectedRoute>} />
        <Route path="/admin/extraction" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAdminExtractionQueue /></Suspense></ProtectedRoute>} />
        <Route path="/admin/extraction/coverage" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAdminCoverageCityDomain /></Suspense></ProtectedRoute>} />
        <Route path="/admin/outbound/approvals" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAdminOutboundApprovals /></Suspense></ProtectedRoute>} />
        <Route path="/admin/prospect-execution" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAdminProspectExecutionDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/admin/prospect-execution/:runId" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAdminProspectExecutionRunDetail /></Suspense></ProtectedRoute>} />
        <Route path="/admin/affiliates" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAffiliateDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/admin/email-health" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageEmailAuditCenter /></Suspense></ProtectedRoute>} />
        <Route path="/admin/email-audit-history" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageEmailAuditHistory /></Suspense></ProtectedRoute>} />
        <Route path="/admin/email-control-center" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAdminEmailControlCenter /></Suspense></ProtectedRoute>} />
        <Route path="/admin/email-warmup" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAdminEmailWarmup /></Suspense></ProtectedRoute>} />
        <Route path="/admin/email-delivery-logs" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAdminEmailDeliveryLogs /></Suspense></ProtectedRoute>} />
        <Route path="/admin/acquisition-pipeline" element={<ProtectedRoute requiredRole="admin"><Suspense fallback={<LazyFallback />}><PageAdminPipelineProspects /></Suspense></ProtectedRoute>} />
        <Route path="/services/:entitySlug/:citySlug" element={<PageServiceEntityLanding />} />
        <Route path="/audit/:slug" element={<AuditLandingPage />} />
        <Route path="/articles/:slug" element={<SeoArticlePage />} />
        <Route path="/emergency" element={<EmergencyPage />} />
        <Route path="/emergency/track/:id" element={<EmergencyTrackingPage />} />

        {/* Broker / Courtier */}
        <Route path="/courtiers" element={<CourtiersLandingPage />} />
        <Route path="/courtiers/onboarding" element={<ProtectedRoute requiredRole="homeowner"><BrokerOnboardingPage /></ProtectedRoute>} />
        <Route path="/broker" element={<ProtectedRoute requiredRole="homeowner"><BrokerDashboardPage /></ProtectedRoute>} />
        <Route path="/broker/leads" element={<ProtectedRoute requiredRole="homeowner"><BrokerLeadsPage /></ProtectedRoute>} />
        <Route path="/broker/profile" element={<ProtectedRoute requiredRole="homeowner"><BrokerProfilePage /></ProtectedRoute>} />
        <Route path="/broker/appointments" element={<ProtectedRoute requiredRole="homeowner"><BrokerAppointmentsPage /></ProtectedRoute>} />

        {/* Refusal SEO public pages */}
        <Route path="/refusal/:slug" element={<RefusalSeoPage />} />

        {/* Condos — Public SEO */}
        <Route path="/condo" element={<PageLandingCondoTeaser />} />
        <Route path="/gestion-copropriete-quebec" element={<PageLandingCondoTeaser />} />
        <Route path="/logiciel-copropriete-quebec" element={<PageLandingCondoTeaser />} />
        <Route path="/loi-16-copropriete" element={<PageLandingCondoTeaser />} />
        <Route path="/syndicat-copropriete-autogestion" element={<PageLandingCondoTeaser />} />
        <Route path="/attestation-copropriete" element={<PageLandingCondoTeaser />} />
        <Route path="/condo/fonds-de-prevoyance" element={<CondoFondsPage />} />
        <Route path="/condo/carnet-entretien" element={<CondoCarnetPage />} />
        <Route path="/condos" element={<CondoHomePage />} />
        <Route path="/condos/loi-16" element={<CondoLoi16Page />} />
        <Route path="/condos/carnet-entretien" element={<CondoCarnetPage />} />
        <Route path="/condos/fonds-prevoyance" element={<CondoFondsPage />} />
        <Route path="/condos/attestation" element={<CondoAttestationPage />} />
        <Route path="/condos/tarifs" element={<CondoTarifsPage />} />
        <Route path="/condos/onboarding" element={<ProtectedRoute requiredRole="homeowner"><CondoOnboardingPage /></ProtectedRoute>} />

        {/* Condos — Diagnostic (public, no auth) */}
        <Route path="/condos/diagnostic" element={<PageDiagnosticCondoIA />} />

        {/* Condos — Authenticated Dashboard (multi-role) */}
        <Route path="/condos/dashboard" element={<ProtectedRoute requiredRole="homeowner"><CondoDashboardPage /></ProtectedRoute>} />
        <Route path="/condos/building" element={<ProtectedRoute requiredRole="homeowner"><CondoBuildingPage /></ProtectedRoute>} />
        <Route path="/condos/units" element={<ProtectedRoute requiredRole="homeowner"><CondoUnitsPage /></ProtectedRoute>} />
        <Route path="/condos/components" element={<ProtectedRoute requiredRole="homeowner"><CondoComponentsPage /></ProtectedRoute>} />
        <Route path="/condos/maintenance" element={<ProtectedRoute requiredRole="homeowner"><CondoMaintenancePage /></ProtectedRoute>} />
        <Route path="/condos/requests" element={<ProtectedRoute requiredRole="homeowner"><CondoRequestsPage /></ProtectedRoute>} />
        <Route path="/condos/incidents" element={<ProtectedRoute requiredRole="homeowner"><CondoIncidentsPage /></ProtectedRoute>} />
        <Route path="/condos/contractors" element={<ProtectedRoute requiredRole="homeowner"><CondoContractorsPage /></ProtectedRoute>} />
        <Route path="/condos/documents" element={<ProtectedRoute requiredRole="homeowner"><CondoDocumentsPage /></ProtectedRoute>} />
        <Route path="/condos/financials" element={<ProtectedRoute requiredRole="homeowner"><CondoFinancialsPage /></ProtectedRoute>} />
        <Route path="/condos/reserve-fund" element={<ProtectedRoute requiredRole="homeowner"><CondoReserveFundPage /></ProtectedRoute>} />
        <Route path="/condos/voting" element={<ProtectedRoute requiredRole="homeowner"><CondoVotingPage /></ProtectedRoute>} />
        <Route path="/condos/calendar" element={<ProtectedRoute requiredRole="homeowner"><CondoCalendarPage /></ProtectedRoute>} />
        <Route path="/condos/quotes" element={<ProtectedRoute requiredRole="homeowner"><CondoQuotesPage /></ProtectedRoute>} />
        <Route path="/condos/reports" element={<ProtectedRoute requiredRole="homeowner"><CondoReportsPage /></ProtectedRoute>} />
        <Route path="/condos/billing" element={<ProtectedRoute requiredRole="homeowner"><CondoBillingPage /></ProtectedRoute>} />

        {/* Recruitment / Carrières */}
        <Route path="/carrieres" element={<PageCareers />} />
        <Route path="/carrieres/representant" element={<PageRecruitmentCloser />} />
        <Route path="/carrieres/programmeur" element={<PageRecruitmentProgrammer />} />
        <Route path="/carrieres/merci" element={<PageRecruitmentThankYou />} />
        <Route path="/carrieres/onboarding" element={<PageRepresentativeOnboarding />} />
        {/* Legacy redirects */}
        <Route path="/carriere" element={<PageCareers />} />
        <Route path="/carriere/merci" element={<PageRecruitmentThankYou />} />
        <Route path="/carriere/onboarding" element={<PageRepresentativeOnboarding />} />
        <Route path="/import-entrepreneur" element={<PageRepresentativeOnboarding />} />

         {/* Memory Center */}
         <Route path="/ma-memoire" element={<PageMemoryCenter />} />

         {/* Recruitment Automation Engine — Admin */}
         <Route path="/admin/recruitment" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminRecruitmentOverview /></UniversalRouteGuard>} />
         <Route path="/admin/recruitment/clusters" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminRecruitmentClusters /></UniversalRouteGuard>} />
         <Route path="/admin/recruitment/campaigns" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminRecruitmentCampaigns /></UniversalRouteGuard>} />
         <Route path="/admin/recruitment/prospects" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminRecruitmentProspects /></UniversalRouteGuard>} />
         <Route path="/admin/recruitment/sequences" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminRecruitmentSequences /></UniversalRouteGuard>} />
         <Route path="/admin/recruitment/onboarding" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminRecruitmentOnboarding /></UniversalRouteGuard>} />
         <Route path="/admin/recruitment/payments" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminRecruitmentPayments /></UniversalRouteGuard>} />
         <Route path="/admin/recruitment/logs" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminRecruitmentLogs /></UniversalRouteGuard>} />

         {/* Recruitment — Prospect-facing (public) */}
         <Route path="/join/:token" element={<PageContractorJoinOffer />} />
         <Route path="/join/:token/checkout" element={<PageContractorJoinCheckout />} />
         <Route path="/join/:token/success" element={<PageContractorJoinSuccess />} />
         <Route path="/join/:token/resume" element={<PageContractorJoinResume />} />
         <Route path="/join/access/:magicToken" element={<PageContractorPublicMagicAccess />} />

         {/* Intent Funnel + Match Engine */}
         <Route path="/intent-funnel" element={<Suspense fallback={<LazyFallback />}><PageEntryUnifiedIntent /></Suspense>} />
         <Route path="/match/:sessionId" element={<Suspense fallback={<LazyFallback />}><PageMatchResultsDynamic /></Suspense>} />
         <Route path="/book/:contractorId" element={<Suspense fallback={<LazyFallback />}><PageBookingInstant /></Suspense>} />
         <Route path="/alex-conversation" element={<Suspense fallback={<LazyFallback />}><PageAlexConversationIntent /></Suspense>} />

         {/* Catch-all: try fallback, then 404 */}
         <Route path="*" element={<FallbackRoutePage />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);
