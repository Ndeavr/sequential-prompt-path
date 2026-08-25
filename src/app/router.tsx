import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import FloatingAlexGuide from "@/components/alex/FloatingAlexGuide";
import { lazy, Suspense } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

import ProtectedRoute from "@/components/ProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import UniversalRouteGuard from "@/guards/UniversalRouteGuard";
import ScrollRestoration from "@/components/ScrollRestoration";
import BannerContinueFlow from "@/components/flow/BannerContinueFlow";
import AuthReturnRouter from "@/components/auth/AuthReturnRouter";
import AuthOverlayPremium from "@/components/auth/AuthOverlayPremium";


// Only eagerly load the home page and critical shared pages
import HomeWithFeatureFlag from "@/components/home-intent/HomeWithFeatureFlag";
import PageHomeUnicorn from "@/pages/PageHomeUnicorn";
// HomeAbSwitch kept on disk for legacy A/B variants (/v2, /v3).
import MainLayout from "@/layouts/MainLayout";
const PageHomeVariantB = lazyWithRetry(() => import("@/pages/home/PageHomeVariantB"));
const PageHomeVariantC = lazyWithRetry(() => import("@/pages/home/PageHomeVariantC"));
import Home from "@/pages/Home";
import FallbackRoutePage from "@/pages/FallbackRoutePage";
const PageVisibiliteIA = lazyWithRetry(() => import("@/pages/marketing/PageVisibiliteIA"));
const AdminVisibiliteIALeads = lazyWithRetry(() => import("@/pages/admin/AdminVisibiliteIALeads"));
import { LEGACY_REDIRECTS } from "@/config/routeRegistry";
import PageEmergencyReset from "@/pages/PageEmergencyReset";
const PageProjectCreatedSuccess = lazyWithRetry(() => import("@/pages/PageProjectCreatedSuccess"));
const PageRecommendations = lazyWithRetry(() => import("@/pages/PageRecommendations"));
const PageRegistrationSuccess = lazyWithRetry(() => import("@/pages/PageRegistrationSuccess"));
import StaticContentPage from "@/pages/static/StaticContentPage";
const PageAdminLiveRuns = lazyWithRetry(() => import("@/pages/admin/PageAdminLiveRuns"));
const AdminFunnelAudit = lazyWithRetry(() => import("@/pages/admin/AdminFunnelAudit"));
const AdminFunnelDebug = lazyWithRetry(() => import("@/pages/admin/AdminFunnelDebug"));
const AdminConversionTruth = lazyWithRetry(() => import("@/pages/admin/AdminConversionTruth"));
const PageContractorGeneratorHealth = lazyWithRetry(() => import("@/pages/admin/PageContractorGeneratorHealth"));
const PageMemoryHealth = lazyWithRetry(() => import("@/pages/admin/PageMemoryHealth"));
const PageRevenueReality = lazyWithRetry(() => import("@/pages/admin/PageRevenueReality"));
const PageContactedContractors = lazyWithRetry(() => import("@/pages/admin/PageContactedContractors"));
const PageContractorForensics = lazyWithRetry(() => import("@/pages/admin/PageContractorForensics"));
const PageRevenueDebug = lazyWithRetry(() => import("@/pages/admin/PageRevenueDebug"));
const PageOutreachCommandCenter = lazyWithRetry(() => import("@/pages/admin/PageOutreachCommandCenter"));
const PageAdminKijijiSource = lazyWithRetry(() => import("@/pages/admin/PageAdminKijijiSource"));
const PageSystemHealth = lazyWithRetry(() => import("@/pages/admin/PageSystemHealth"));
const PageEdgeFunctionHealth = lazyWithRetry(() => import("@/pages/admin/PageEdgeFunctionHealth"));
const PageReplayPipeline = lazyWithRetry(() => import("@/pages/admin/PageReplayPipeline"));
const PageTestSMS = lazyWithRetry(() => import("@/pages/admin/PageTestSMS"));
const PageWhyUnproRecommends = lazyWithRetry(() => import("@/pages/journal/PageWhyUnproRecommends"));
const PageAdminProspectSMS = lazyWithRetry(() => import("@/pages/admin/PageAdminProspectSMS"));
const PageFounderVerification = lazyWithRetry(() => import("@/pages/admin/PageFounderVerification"));
const PageSmsHealth = lazyWithRetry(() => import("@/pages/admin/PageSmsHealth"));
const PageAdminSystemTime = lazyWithRetry(() => import("@/pages/admin/PageAdminSystemTime"));
const PageAdminSystemIntegrity = lazyWithRetry(() => import("@/pages/admin/PageAdminSystemIntegrity"));
const PageAdminOnboardingOrchestrator = lazyWithRetry(() => import("@/pages/admin/PageAdminOnboardingOrchestrator"));
const PageCuriosityLanding = lazyWithRetry(() => import("@/pages/curiosity/PageCuriosityLanding"));
const PageSendWindowPolicy = lazyWithRetry(() => import("@/pages/admin/PageSendWindowPolicy"));

// Impact Counter
const PageImpactCounter = lazyWithRetry(() => import("@/pages/PageImpactCounter"));

// Extraction Engine
const PageAdminExtractionQueue = lazyWithRetry(() => import("@/pages/admin/PageAdminExtractionQueue"));
const PageAdminAeoCockpit = lazyWithRetry(() => import("@/pages/admin/PageAdminAeoCockpit"));
const PageVoiceLab = lazyWithRetry(() => import("@/pages/admin/PageVoiceLab"));
const PageFacebookExtractionEngine = lazyWithRetry(() => import("@/pages/admin/PageFacebookExtractionEngine"));
const PageAdminCoverageCityDomain = lazyWithRetry(() => import("@/pages/admin/PageAdminCoverageCityDomain"));

// QA Simulation
const PageAdminQASimulation = lazyWithRetry(() => import("@/pages/admin/PageAdminQASimulation"));
const PageSystemModeControlCenter = lazyWithRetry(() => import("@/pages/admin/system/PageSystemModeControlCenter"));
const PageAdminQASimulationRun = lazyWithRetry(() => import("@/pages/admin/PageAdminQASimulationRun"));
const PageAdminQASimulationTemplates = lazyWithRetry(() => import("@/pages/admin/PageAdminQASimulationTemplates"));

// Outbound Approvals
const PageAdminOutboundApprovals = lazyWithRetry(() => import("@/pages/admin/outbound/PageAdminOutboundApprovals"));
const PageAdminOutboundAutoFlagging = lazyWithRetry(() => import("@/pages/admin/outbound/PageAdminOutboundAutoFlagging"));
const PageSniperPipeline = lazyWithRetry(() => import("@/pages/admin/outbound/PageSniperPipeline"));
const PageSMSPipeline = lazyWithRetry(() => import("@/pages/admin/outbound/PageSMSPipeline"));
const PageAdminCommunications = lazyWithRetry(() => import("@/pages/admin/PageAdminCommunications"));

// Contractor Voice-First Landing
const PageContractorVoiceFirstLanding = lazyWithRetry(() => import("@/pages/contractor-landing/PageContractorVoiceFirstLanding"));
const PageAiTrustAudit = lazyWithRetry(() => import("@/pages/entrepreneur/PageAiTrustAudit"));
const PageWhyResultsAreDropping = lazyWithRetry(() => import("@/pages/entrepreneur/PageWhyResultsAreDropping"));
const PageBadgesConsommateur2026 = lazyWithRetry(() => import("@/pages/articles/PageBadgesConsommateur2026"));
const PageVerifierGrenierAvantFenetresThermopompe = lazyWithRetry(() => import("@/pages/articles/PageVerifierGrenierAvantFenetresThermopompe"));
const PageMoinsSoumissionsPlusFactures = lazyWithRetry(() => import("@/pages/articles/PageMoinsSoumissionsPlusFactures"));
const PageFournisseurPeinturePlusContrats = lazyWithRetry(() => import("@/pages/articles/PageFournisseurPeinturePlusContrats"));
const PageApparaitreRechercheIA2026 = lazyWithRetry(() => import("@/pages/articles/PageApparaitreRechercheIA2026"));
const PageSignaturePartner = lazyWithRetry(() => import("@/pages/partners/PageSignaturePartner"));
const PageAdminPartners = lazyWithRetry(() => import("@/pages/admin/partners/PageAdminPartners"));
const PageAdminContentGuard = lazyWithRetry(() => import("@/pages/admin/PageAdminContentGuard"));
const PageAdminAiVisibilityAudit = lazyWithRetry(() => import("@/pages/admin/PageAdminAiVisibilityAudit"));
const PageAdminAcquisitionFunnel = lazyWithRetry(() => import("@/pages/admin/PageAdminAcquisitionFunnel"));
const PageAdminFounderPipeline = lazyWithRetry(() => import("@/pages/admin/PageAdminFounderPipeline"));
const PageFounderLocalServices = lazyWithRetry(() => import("@/pages/founder/PageFounderLocalServices"));
const PageAdminRevenueIntelligence = lazyWithRetry(() => import("@/pages/admin/PageAdminRevenueIntelligence"));
const PageAdminSmsSprint = lazyWithRetry(() => import("@/pages/admin/PageAdminSmsSprint"));
const PageActivationSprint = lazyWithRetry(() => import("@/pages/PageActivationSprint"));
const PageAdminContentAudit = lazyWithRetry(() => import("@/pages/admin/PageAdminContentAudit"));
const PageAdminAcquisitionTests = lazyWithRetry(() => import("@/pages/admin/PageAdminAcquisitionTests"));
const PageAdminEmailCtaAudit = lazyWithRetry(() => import("@/pages/admin/PageAdminEmailCtaAudit"));
const PageAdminOutreachHealth = lazyWithRetry(() => import("@/pages/admin/PageAdminOutreachHealth"));
const PageAdminEmailSenderHealth = lazyWithRetry(() => import("@/pages/admin/PageAdminEmailSenderHealth"));
const PageAdminWaitingHomeowners = lazyWithRetry(() => import("@/pages/admin/PageAdminWaitingHomeowners"));
const PageContractorDemandLanding = lazyWithRetry(() => import("@/pages/contractor/PageContractorDemandLanding"));
const PageScanIALanding = lazyWithRetry(() => import("@/pages/scan-ia/PageScanIALanding"));
const PageScanIARun = lazyWithRetry(() => import("@/pages/scan-ia/PageScanIARun"));
const PageScanIAReport = lazyWithRetry(() => import("@/pages/scan-ia/PageScanIAReport"));
const PageScanIAActivationSuccess = lazyWithRetry(() => import("@/pages/scan-ia/PageScanIAActivationSuccess"));
const PageScanIAWizard = lazyWithRetry(() => import("@/pages/scan-ia/wizard/PageScanIAWizard"));
const PageIsrDemoPlanTest = lazyWithRetry(() => import("@/pages/demo/PageIsrDemoPlanTest"));
const PageIsrDemoSuccess = lazyWithRetry(() => import("@/pages/demo/PageIsrDemoSuccess"));
const PageIsrDemoCancel = lazyWithRetry(() => import("@/pages/demo/PageIsrDemoCancel"));
const PageAdminAiTrustDashboard = lazyWithRetry(() => import("@/pages/admin/PageAdminAiTrustDashboard"));
const PageAdminAiTrustTerritory = lazyWithRetry(() => import("@/pages/admin/PageAdminAiTrustTerritory"));
const PageDynamicPlanGeneration = lazyWithRetry(() => import("@/pages/entrepreneur/PageDynamicPlanGeneration"));
const PageAdminDynamicPricing = lazyWithRetry(() => import("@/pages/admin/PageAdminDynamicPricing"));
// Live Activation Pipeline (isroyal.ca)
const PageContractorJoinLive = lazyWithRetry(() => import("@/pages/contractor/PageContractorJoinLive"));
const PageContractorAnalysisLive = lazyWithRetry(() => import("@/pages/contractor/PageContractorAnalysisLive"));
const PageContractorActivated = lazyWithRetry(() => import("@/pages/contractor/PageContractorActivated"));
const PageContractorAIGrowth = lazyWithRetry(() => import("@/pages/contractor-growth/PageContractorAIGrowth"));

// Growth · Review Intelligence™
const PageReviewIntelligenceLanding = lazyWithRetry(() => import("@/pages/pro/growth/PageReviewIntelligenceLanding"));
const PageReviewsDashboard = lazyWithRetry(() => import("@/pages/pro/growth/PageReviewsDashboard"));
const PageReviewFlow = lazyWithRetry(() => import("@/pages/review/PageReviewFlow"));

// Nuclear Close — Personalized prospect landing
const PageProLandingNuclearClose = lazyWithRetry(() => import("@/pages/pro-landing/PageProLandingNuclearClose"));
const PageGoShortLink = lazyWithRetry(() => import("@/pages/PageGoShortLink"));
const PageProspectActivationSuccess = lazyWithRetry(() => import("@/pages/PageProspectActivationSuccess"));

// Voice Sales Plan Onboarding
const PageContractorPlanOnboarding = lazyWithRetry(() => import("@/pages/voice-sales/PageContractorPlanOnboarding"));

// Visual Search
const ProVisualSearchPage = lazyWithRetry(() => import("@/pages/ProVisualSearchPage"));
const PageRadonLanding = lazyWithRetry(() => import("@/pages/PageRadonLanding"));

// Intent homepage (direct route for testing)
const PageHomeIntentUNPRO = lazyWithRetry(() => import("@/pages/PageHomeIntentUNPRO"));

// Mission 48H — First Customer
const PageProScoreInstant = lazyWithRetry(() => import("@/pages/pro/PageProScoreInstant"));
const PageProActivate = lazyWithRetry(() => import("@/pages/pro/PageProActivate"));
const PageProIsolationQC = lazyWithRetry(() => import("@/pages/pro/PageProIsolationQC"));
const PageFirstDollarSprint = lazyWithRetry(() => import("@/pages/admin/PageFirstDollarSprint"));
const PageAdminFirstDollar = lazyWithRetry(() => import("@/pages/admin/PageAdminFirstDollar"));
const PageAdminFirstDollarBatches = lazyWithRetry(() => import("@/pages/admin/PageAdminFirstDollarBatches"));
const PageAdminSeoHealth = lazyWithRetry(() => import("@/pages/admin/PageAdminSeoHealth"));
const PageProWelcome = lazyWithRetry(() => import("@/pages/pro/PageProWelcome"));
const PageProPublicProfile = lazyWithRetry(() => import("@/pages/pro/PageProPublicProfile"));
const PageProPrivateOnboarding = lazyWithRetry(() => import("@/pages/pro/PageProPrivateOnboarding"));
const PageAdminAcquisitionAutopilot = lazyWithRetry(() => import("@/pages/admin/PageAdminAcquisitionAutopilot"));
const PageAdminFounders = lazyWithRetry(() => import("@/pages/admin/PageAdminFounders"));

// PIM — Passeport Intelligence Maison
const PagePIMLanding = lazyWithRetry(() => import("@/pages/PagePIMLanding"));
const PageAICrawlerLanding = lazyWithRetry(() => import("@/pages/PageAICrawlerLanding"));
const PageWhyUnpro = lazyWithRetry(() => import("@/pages/PageWhyUnpro"));
const PageHomeAlexConversationalLite = lazyWithRetry(() => import("@/pages/PageHomeAlexConversationalLite"));
const PageAlexConversationAnimated = lazyWithRetry(() => import("@/pages/PageAlexConversationAnimated"));

// Lead Pipe Empire
const LeadPipePagePlombEauCity = lazyWithRetry(() => import("@/pages/lead-pipe/PagePlombEauCity"));
const LeadPipePageTuyauxPlombQuartier = lazyWithRetry(() => import("@/pages/lead-pipe/PageTuyauxPlombQuartier"));
const LeadPipePageAdminEmpire = lazyWithRetry(() => import("@/pages/admin/PageLeadEmpireDashboard"));

// Google Project Audit (admin diagnostic)
const PageGoogleProjectUsageAudit = lazyWithRetry(() => import("@/pages/admin/PageGoogleProjectUsageAudit"));

// Calculators
const PageCalculateurTaxesQuebec = lazyWithRetry(() => import("@/pages/calculators/PageCalculateurTaxesQuebec"));
const PageIsRoyalCalculateurTaxes = lazyWithRetry(() => import("@/pages/calculators/PageIsRoyalCalculateurTaxes"));
const PaintingCalculatorPage = lazyWithRetry(() => import("@/pages/painting/PaintingCalculatorPage"));
const PageAIGrowthDiagnostic = lazyWithRetry(() => import("@/pages/diagnostic/PageAIGrowthDiagnostic"));
const PageDiagnostic = lazyWithRetry(() => import("@/pages/diagnostic/PageDiagnostic"));

// Lightweight loading fallback
const LazyFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-pulse text-muted-foreground text-sm">Chargement…</div>
  </div>
);

// ─── Lazy loaded pages ───
const PlaceholderPage = lazyWithRetry(() => import("@/pages/PlaceholderPage"));
const Unsubscribe = lazyWithRetry(() => import("@/pages/Unsubscribe"));
const CommentCaMarchePage = lazyWithRetry(() => import("@/pages/CommentCaMarchePage"));
const StartPage = lazyWithRetry(() => import("@/pages/StartPage"));
const AuthCallbackPage = lazyWithRetry(() => import("@/pages/AuthCallbackPage"));
const OnboardingPageUnpro = lazyWithRetry(() => import("@/pages/OnboardingPageUnpro"));
const LoginPageUnpro = lazyWithRetry(() => import("@/pages/LoginPageUnpro"));
const PreLoginRolePage = lazyWithRetry(() => import("@/pages/PreLoginRolePage"));
const NotFound = lazyWithRetry(() => import("@/pages/NotFound"));
const PageManifesto = lazyWithRetry(() => import("@/pages/PageManifesteUnpro"));
const PagePourquoiPasTroisSoumissions = lazyWithRetry(() => import("@/pages/PagePourquoiPasTroisSoumissions"));
const PageIntelligenceHub = lazyWithRetry(() => import("@/pages/PageIntelligenceHub"));
const PageUnproFAQ25 = lazyWithRetry(() => import("@/pages/PageUnproFAQ25"));
const PageAlexPromptRulesAdmin = lazyWithRetry(() => import("@/pages/PageAlexPromptRulesAdmin"));
const PageAlexConversationDebugAdmin = lazyWithRetry(() => import("@/pages/PageAlexConversationDebugAdmin"));

// Public
const PageAdLandingAipp = lazyWithRetry(() => import("@/pages/ad-landing/PageAdLandingAipp"));
const PageBusinessImport = lazyWithRetry(() => import("@/pages/business-import/PageBusinessImport"));
const PageBusinessCardImport = lazyWithRetry(() => import("@/pages/business-card/PageBusinessCardImport"));
const PageBusinessCardScannerHub = lazyWithRetry(() => import("@/pages/business-card/PageBusinessCardScannerHub"));
const PageContractorLeads = lazyWithRetry(() => import("@/pages/business-card/PageContractorLeads"));
const PageAlexGoalsStrategy = lazyWithRetry(() => import("@/pages/goals/PageAlexGoalsStrategy"));
const PageActivationGoals = lazyWithRetry(() => import("@/pages/entrepreneur/PageActivationGoals"));
const PageCheckoutStripe = lazyWithRetry(() => import("@/pages/checkout/PageCheckoutStripe"));
const PageCheckoutSuccess = lazyWithRetry(() => import("@/pages/checkout/PageCheckoutSuccess"));
const PageActivationStart = lazyWithRetry(() => import("@/pages/checkout/PageActivationStart"));
const SolicitationActivationPage = lazyWithRetry(() => import("@/pages/SolicitationActivationPage"));
const PageShortLinkRedirect = lazyWithRetry(() => import("@/pages/invitation/PageShortLinkRedirect"));
const PageUnproActivate = lazyWithRetry(() => import("@/pages/activation/PageUnproActivate"));
const PageAuditTokenRedirect = lazyWithRetry(() => import("@/pages/activation/PageAuditTokenRedirect"));
const PageAdminConversionLab = lazyWithRetry(() => import("@/pages/admin/PageAdminConversionLab"));
const PageInvitationLanding = lazyWithRetry(() => import("@/pages/invitation/PageInvitationLanding"));
const PageInvitationEdit = lazyWithRetry(() => import("@/pages/invitation/PageInvitationEdit"));
const PageInvitationActivate = lazyWithRetry(() => import("@/pages/invitation/PageInvitationActivate"));
const PageOutreachActivationSuccess = lazyWithRetry(() => import("@/pages/invitation/PageOutreachActivationSuccess"));
const PageOutreachFunnel = lazyWithRetry(() => import("@/pages/admin/PageOutreachFunnel"));
const AdminSolicitationPage = lazyWithRetry(() => import("@/pages/admin/AdminSolicitationPage"));
const PageAdminOutreachErrors = lazyWithRetry(() => import("@/pages/admin/PageAdminOutreachErrors"));
const PageAdminProviderHealth = lazyWithRetry(() => import("@/pages/admin/PageAdminProviderHealth"));
const PageAdminContractorsContacted = lazyWithRetry(() => import("@/pages/admin/PageAdminContractorsContacted"));
const PageCheckoutNativeScrollable = lazyWithRetry(() => import("@/pages/checkout/PageCheckoutNativeScrollable"));
const LandingContractorAIActivation = lazyWithRetry(() => import("@/pages/acquisition/LandingContractorAIActivation"));
const PageAdminPipelineProspects = lazyWithRetry(() => import("@/pages/admin/acquisition/PageAdminPipelineProspects"));
const PageAdminAcquisition = lazyWithRetry(() => import("@/pages/admin/acquisition/PageAdminAcquisition"));
const PageAdminAcquisitionMachine = lazyWithRetry(() => import("@/pages/admin/acquisition/PageAdminAcquisitionMachine"));
const PageAdminAcquisitionDuplicates = lazyWithRetry(() => import("@/pages/admin/acquisition/PageAdminAcquisitionDuplicates"));
const PageAdminAcquisitionPipeline = lazyWithRetry(() => import("@/pages/admin/acquisition/PageAdminAcquisitionPipeline"));
const PageAdminAcquisitionErrors = lazyWithRetry(() => import("@/pages/admin/acquisition/PageAdminAcquisitionErrors"));
const PageAdminAcquisitionEngagement = lazyWithRetry(() => import("@/pages/admin/acquisition/PageAdminAcquisitionEngagement"));
const PageAdminAcquisitionStripe = lazyWithRetry(() => import("@/pages/admin/acquisition/PageAdminAcquisitionStripe"));
const PageAdminAcquisitionActivation = lazyWithRetry(() => import("@/pages/admin/acquisition/PageAdminAcquisitionActivation"));
const PageContractorAIScoreLanding = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorAIScoreLanding"));
const PageAippPublic = lazyWithRetry(() => import("@/pages/aipp/PageAippPublic"));
const PageAiIndexedProfile = lazyWithRetry(() => import("@/pages/aipp/PageAiIndexedProfile"));
const PageAiEntity = lazyWithRetry(() => import("@/pages/ai/PageAiEntity"));
const PageAdminAiEntities = lazyWithRetry(() => import("@/pages/admin/PageAdminAiEntities"));
const PageAdminSmartContext = lazyWithRetry(() => import("@/pages/admin/PageAdminSmartContext"));
const PageAdminPlansMatrix = lazyWithRetry(() => import("@/pages/admin/PageAdminPlansMatrix"));
const PageAdminAutopilotMvp = lazyWithRetry(() => import("@/pages/admin/PageAdminAutopilotMvp"));
const PageAdminAutopilotRunDetail = lazyWithRetry(() => import("@/pages/admin/PageAdminAutopilotRunDetail"));
const PageAdminOutboundLandingFunnel = lazyWithRetry(() => import("@/pages/admin/outbound/PageAdminOutboundLandingFunnel"));
const PageOutboundLanding = lazyWithRetry(() => import("@/pages/outbound/PageOutboundLanding"));
const PageOutboundLandingSuccess = lazyWithRetry(() => import("@/pages/outbound/PageOutboundLandingSuccess"));

const PageAippImport = lazyWithRetry(() => import("@/pages/admin/PageAippImport"));
const PageAippProfiles = lazyWithRetry(() => import("@/pages/admin/PageAippProfiles"));
const PageContractorAippCockpit = lazyWithRetry(() => import("@/pages/contractor/PageContractorAippCockpit"));
const PageAcqActivation = lazyWithRetry(() => import("@/pages/acquisition/PageAcqActivation"));
const PageActivationSuccess = lazyWithRetry(() => import("@/pages/acquisition/PageActivationSuccess"));
const PageAdminWarRoom = lazyWithRetry(() => import("@/pages/admin/acquisition/PageAdminWarRoom"));
const PageAdminRevenueGateAudit = lazyWithRetry(() => import("@/pages/admin/PageAdminRevenueGateAudit"));
const PageAdminRevenuePathAudit = lazyWithRetry(() => import("@/pages/admin/PageAdminRevenuePathAudit"));
const PageTunnelReality = lazyWithRetry(() => import("@/pages/admin/PageTunnelReality"));
const PageAdminDispatchBottleneck = lazyWithRetry(() => import("@/pages/admin/PageAdminDispatchBottleneck"));
const PageAdminRecoverySprint = lazyWithRetry(() => import("@/pages/admin/PageAdminRecoverySprint"));
const PageAdminNormalization = lazyWithRetry(() => import("@/pages/admin/PageAdminNormalization"));
const PageAdminOps = lazyWithRetry(() => import("@/pages/admin/PageAdminOps"));
const PageAdminOperationsHealth = lazyWithRetry(() => import("@/pages/admin/PageAdminOperationsHealth"));
const PageAdminCRM = lazyWithRetry(() => import("@/pages/admin/PageAdminCRM"));
const PageAdminScout = lazyWithRetry(() => import("@/pages/admin/PageAdminScout"));
const PageAdminSiteHealth = lazyWithRetry(() => import("@/pages/admin/PageAdminSiteHealth"));
const AdminLaunchWarRoom = lazyWithRetry(() => import("@/pages/admin/AdminLaunchWarRoom"));
const PageAdminLaunchControl = lazyWithRetry(() => import("@/pages/admin/PageAdminLaunchControl"));
const PageAdminAiRevenueProof = lazyWithRetry(() => import("@/pages/admin/PageAdminAiRevenueProof"));
const PageAdminCriticalPathAudit = lazyWithRetry(() => import("@/pages/admin/PageAdminCriticalPathAudit"));
const AdminUIHealthMonitor = lazyWithRetry(() => import("@/pages/admin/AdminUIHealthMonitor"));
const Search = lazyWithRetry(() => import("@/pages/Search"));
const ContractorProfile = lazyWithRetry(() => import("@/pages/ContractorProfile"));
const Login = lazyWithRetry(() => import("@/pages/Login"));
const Signup = lazyWithRetry(() => import("@/pages/Signup"));
const HomeownersPage = lazyWithRetry(() => import("@/pages/HomeownersPage"));
const OwnerMenuPreviewPage = lazyWithRetry(() => import("@/pages/OwnerMenuPreviewPage"));
const PageMemoryCenter = lazyWithRetry(() => import("@/pages/PageMemoryCenter"));
const MenuIntelligenceAdminPage = lazyWithRetry(() => import("@/pages/admin/MenuIntelligenceAdminPage"));
const PageAdminEmailLogs = lazyWithRetry(() => import("@/pages/admin/PageAdminEmailLogs"));
const PageCampaignCenter = lazyWithRetry(() => import("@/pages/admin/campaign/PageCampaignCenter"));
const PageCampaignLogs = lazyWithRetry(() => import("@/pages/admin/campaign/PageCampaignLogs"));
const PageAdminManualTestSend = lazyWithRetry(() => import("@/pages/admin/PageAdminManualTestSend"));
const PageChallengeTracker = lazyWithRetry(() => import("@/pages/admin/PageChallengeTracker"));
const AdminProspectionEngine = lazyWithRetry(() => import("@/pages/admin/AdminProspectionEngine"));
const PageProspectionDashboard = lazyWithRetry(() => import("@/pages/admin/PageProspectionDashboard"));
const AdminProspectionProspects = lazyWithRetry(() => import("@/pages/admin/AdminProspectionProspects"));
const AdminProspectionAnalytics = lazyWithRetry(() => import("@/pages/admin/AdminProspectionAnalytics"));
const PageAdminCityActivityMatrix = lazyWithRetry(() => import("@/pages/admin/PageAdminCityActivityMatrix"));
const PageAdminActivitiesSecondaryManager = lazyWithRetry(() => import("@/pages/admin/PageAdminActivitiesSecondaryManager"));
const PageAlexPersonalizedLanding = lazyWithRetry(() => import("@/pages/public/PageAlexPersonalizedLanding"));
const PageAdminEmailTemplates = lazyWithRetry(() => import("@/pages/admin/PageAdminEmailTemplates"));
const PageAdminHandoffAnalytics = lazyWithRetry(() => import("@/pages/admin/PageAdminHandoffAnalytics"));
const ProfessionalsPage = lazyWithRetry(() => import("@/pages/ProfessionalsPage"));
const PartnersPage = lazyWithRetry(() => import("@/pages/PartnersPage"));
const PagePartenairesCertifies = lazyWithRetry(() => import("@/pages/PagePartenairesCertifies"));
const PartnerLogin = lazyWithRetry(() => import("@/pages/partner/PartnerLogin"));
const PartnerGuard = lazyWithRetry(() => import("@/pages/partner/PartnerGuard"));
const PartnerDashboard = lazyWithRetry(() => import("@/pages/partner/PartnerDashboard"));
const PartnerNouveauEntrepreneur = lazyWithRetry(() => import("@/pages/partner/PartnerNouveauEntrepreneur"));
const PartnerCrm = lazyWithRetry(() => import("@/pages/partner/PartnerCrm"));
const PartnerDevenirPartenaire = lazyWithRetry(() => import("@/pages/partner/PartnerDevenirPartenaire"));
const PagePrivateKeypad = lazyWithRetry(() => import("@/pages/private/PagePrivateKeypad"));
const PartnerEnAttente = lazyWithRetry(() => import("@/pages/partner/PartnerEnAttente"));
const AdminPartenaires = lazyWithRetry(() => import("@/pages/admin/AdminPartenaires"));
const AdminPartnerApplications = lazyWithRetry(() => import("@/pages/admin/AdminPartnerApplications"));
const DescribeProjectPage = lazyWithRetry(() => import("@/pages/DescribeProjectPage"));
const CompareQuotesPage = lazyWithRetry(() => import("@/pages/CompareQuotesPage"));
const ContractorOnboardingPage = lazyWithRetry(() => import("@/pages/ContractorOnboardingPage"));
const OnboardingFlow = lazyWithRetry(() => import("@/pages/OnboardingFlow"));
const PricingPage = lazyWithRetry(() => import("@/pages/PricingPage"));
const PricingHomeownersPage = lazyWithRetry(() => import("@/pages/PricingHomeownersPage"));
const PricingContractorsPage = lazyWithRetry(() => import("@/pages/PricingContractorsPage"));
const PageUpgradeHomeowner = lazyWithRetry(() => import("@/pages/upgrade/PageUpgradeHomeowner"));
const PageHomeownerWelcome = lazyWithRetry(() => import("@/pages/proprietaire/PageHomeownerWelcome"));
const PageVerificationReport = lazyWithRetry(() => import("@/pages/proprietaire/PageVerificationReport"));
const AIPPScorePage = lazyWithRetry(() => import("@/pages/AIPPScorePage"));
const MatchingResultsPage = lazyWithRetry(() => import("@/pages/MatchingResultsPage"));
const ContractorComparisonPage = lazyWithRetry(() => import("@/pages/ContractorComparisonPage"));
const DecisionAssistantPage = lazyWithRetry(() => import("@/pages/DecisionAssistantPage"));
const SmartRecommendationPage = lazyWithRetry(() => import("@/pages/SmartRecommendationPage"));
const DNAProfilePage = lazyWithRetry(() => import("@/pages/DNAProfilePage"));

// SEO Pages
const ServiceLocationPage = lazyWithRetry(() => import("@/pages/seo/ServiceLocationPage"));
const ProblemLocationPage = lazyWithRetry(() => import("@/pages/seo/ProblemLocationPage"));
const GuidePage = lazyWithRetry(() => import("@/pages/seo/GuidePage"));
const CityHubPage = lazyWithRetry(() => import("@/pages/seo/CityHubPage"));
const LocalSeoPage = lazyWithRetry(() => import("@/pages/seo/LocalSeoPage"));
const AdminLocalSeo = lazyWithRetry(() => import("@/pages/admin/AdminLocalSeo"));
const AdminSeoArticles = lazyWithRetry(() => import("@/pages/admin/AdminSeoArticles"));
const SeoDirectoryPage = lazyWithRetry(() => import("@/pages/seo/SeoDirectoryPage"));
const SeoArticlePage = lazyWithRetry(() => import("@/pages/seo/SeoArticlePage"));
const PageArticlesRecentCompressedFeed = lazyWithRetry(() => import("@/pages/articles/PageArticlesRecentCompressedFeed"));
const ProblemPage = lazyWithRetry(() => import("@/pages/seo/ProblemPage"));
const ProblemGraphPage = lazyWithRetry(() => import("@/pages/seo/ProblemGraphPage"));
const SolutionPage = lazyWithRetry(() => import("@/pages/seo/SolutionPage"));
const ProfessionPage = lazyWithRetry(() => import("@/pages/seo/ProfessionPage"));
const CityPage = lazyWithRetry(() => import("@/pages/seo/CityPage"));
const VillePage = lazyWithRetry(() => import("@/pages/seo/VillePage"));
const QuartierPage = lazyWithRetry(() => import("@/pages/seo/QuartierPage"));
const RuePage = lazyWithRetry(() => import("@/pages/seo/RuePage"));
const ProblemeLocationFrPage = lazyWithRetry(() => import("@/pages/seo/ProblemeLocationFrPage"));
const PropertyTypeHubPage = lazyWithRetry(() => import("@/pages/seo/PropertyTypeHubPage"));
const PropertyTypeCityPage = lazyWithRetry(() => import("@/pages/seo/PropertyTypeCityPage"));
const PropertyTypeProblemPage = lazyWithRetry(() => import("@/pages/seo/PropertyTypeProblemPage"));
const SeoPageRenderer = lazyWithRetry(() => import("@/pages/seo/SeoPageRenderer"));
const SeoSitemapPage = lazyWithRetry(() => import("@/pages/seo/SeoSitemapPage"));
const AdminSeoGenerator = lazyWithRetry(() => import("@/pages/admin/AdminSeoGenerator"));
const PageSeoAutopilot = lazyWithRetry(() => import("@/pages/admin/PageSeoAutopilot"));
const PagePrLoop = lazyWithRetry(() => import("@/pages/admin/PagePrLoop"));
const PropertyGraphPage = lazyWithRetry(() => import("@/pages/PropertyGraphPage"));
const PagePasseportMaison = lazyWithRetry(() => import("@/pages/PagePasseportMaison"));
const AlexChat = lazyWithRetry(() => import("@/pages/AlexChat"));
const AuthorityDashboardPage = lazyWithRetry(() => import("@/pages/AuthorityDashboardPage"));
const PressRelease = lazyWithRetry(() => import("@/pages/PressRelease"));
const AlexVoicePage = lazyWithRetry(() => import("@/pages/AlexVoicePage"));
const AlexVoiceRealtimePage = lazyWithRetry(() => import("@/pages/AlexVoiceRealtimePage"));
const AlexCommandCenterPage = lazyWithRetry(() => import("@/pages/AlexCommandCenterPage"));
const DesignPage = lazyWithRetry(() => import("@/pages/DesignPage"));
const DesignSharePage = lazyWithRetry(() => import("@/pages/DesignSharePage"));
const FlywheelPage = lazyWithRetry(() => import("@/pages/FlywheelPage"));
const EnergyPage = lazyWithRetry(() => import("@/pages/EnergyPage"));
const PreventiveMaintenancePage = lazyWithRetry(() => import("@/pages/PreventiveMaintenancePage"));
const CoproprietePage = lazyWithRetry(() => import("@/pages/CoproprietePage"));
const CondosPricingPage = lazyWithRetry(() => import("@/pages/condos/CondosPricingPage"));
const BuildingIntelligenceMap = lazyWithRetry(() => import("@/pages/BuildingIntelligenceMap"));
const AnswerEnginePage = lazyWithRetry(() => import("@/pages/AnswerEnginePage"));
const BusinessImportPage = lazyWithRetry(() => import("@/pages/BusinessImportPage"));
const GmbLinkPage = lazyWithRetry(() => import("@/pages/GmbLinkPage"));
const ContractorQuestionnairePage = lazyWithRetry(() => import("@/pages/ContractorQuestionnairePage"));
const VerifyContractorPage = lazyWithRetry(() => import("@/pages/VerifyContractorPage"));
const VerifyLandingPage = lazyWithRetry(() => import("@/pages/VerifyLandingPage"));
const PublicPropertyPage = lazyWithRetry(() => import("@/pages/PublicPropertyPage"));
const PropertyPassportPage = lazyWithRetry(() => import("@/pages/dashboard/PropertyPassportPage"));
const PropertyGrantsPage = lazyWithRetry(() => import("@/pages/dashboard/PropertyGrantsPage"));
const MessageCenterPage = lazyWithRetry(() => import("@/pages/dashboard/MessageCenterPage"));
const NotificationsPage = lazyWithRetry(() => import("@/pages/dashboard/NotificationsPage"));
const ProjectMatchesPage = lazyWithRetry(() => import("@/pages/dashboard/ProjectMatchesPage"));
const QrScanPage = lazyWithRetry(() => import("@/pages/QrScanPage"));
const DeepLinkPage = lazyWithRetry(() => import("@/pages/DeepLinkPage"));
const ReferralLandingPage = lazyWithRetry(() => import("@/pages/ReferralLandingPage"));
const UnlockPage = lazyWithRetry(() => import("@/pages/UnlockPage"));
const MyQRPerformancePage = lazyWithRetry(() => import("@/pages/MyQRPerformancePage"));
const QrGeneratorPage = lazyWithRetry(() => import("@/pages/QrGeneratorPage"));
const QrRedirectPage = lazyWithRetry(() => import("@/pages/QrRedirectPage"));
const PageAdminQrCodes = lazyWithRetry(() => import("@/pages/admin/PageAdminQrCodes"));
const ContributionApprovalPage = lazyWithRetry(() => import("@/pages/dashboard/ContributionApprovalPage"));
const ListingImportPage = lazyWithRetry(() => import("@/pages/ListingImportPage"));
const PageCalendarConnectionHub = lazyWithRetry(() => import("@/pages/calendar/PageCalendarConnectionHub"));
const PageCalendarConnectionSuccess = lazyWithRetry(() => import("@/pages/calendar/PageCalendarConnectionSuccess"));
const PageCalendarConnectionFailure = lazyWithRetry(() => import("@/pages/calendar/PageCalendarConnectionFailure"));
const PageAdminCalendarConversionDashboard = lazyWithRetry(() => import("@/pages/admin/PageAdminCalendarConversionDashboard"));
const PublicScoreCalculatorPage = lazyWithRetry(() => import("@/pages/PublicScoreCalculatorPage"));
const PropertyReportPage = lazyWithRetry(() => import("@/pages/dashboard/PropertyReportPage"));
const RenovationVisualizerPage = lazyWithRetry(() => import("@/pages/RenovationVisualizerPage"));
const RenovationLocationPage = lazyWithRetry(() => import("@/pages/seo/RenovationLocationPage"));
const DiscoveryFeedPage = lazyWithRetry(() => import("@/pages/DiscoveryFeedPage"));
const VerifierEntrepreneurPage = lazyWithRetry(() => import("@/pages/VerifierEntrepreneurPage"));
const AnalyzeDocumentPage = lazyWithRetry(() => import("@/pages/AnalyzeDocumentPage"));
const TransformationDetailPage = lazyWithRetry(() => import("@/pages/TransformationDetailPage"));
const TrendingPage = lazyWithRetry(() => import("@/pages/TrendingPage"));
const PropertyMapPage = lazyWithRetry(() => import("@/pages/PropertyMapPage"));
const VerificationSeoPage = lazyWithRetry(() => import("@/pages/seo/VerificationSeoPage"));
const AlignmentQuestionnairePage = lazyWithRetry(() => import("@/pages/AlignmentQuestionnairePage"));
const FounderPage = lazyWithRetry(() => import("@/pages/FounderPage"));
const AdminFounderInvites = lazyWithRetry(() => import("@/pages/admin/AdminFounderInvites"));
const AdminProspects = lazyWithRetry(() => import("@/pages/admin/AdminProspects"));
const AdminProspectImport = lazyWithRetry(() => import("@/pages/admin/AdminProspectImport"));
const AuditLandingPage = lazyWithRetry(() => import("@/pages/AuditLandingPage"));
const PageAlexGuidedOnboarding = lazyWithRetry(() => import("@/pages/signature/PageAlexGuidedOnboarding"));

// Contractor Onboarding AIPP Funnel
const PageContractorLandingAcquisition = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorLandingAcquisition"));
const PageContractorOnboardingStart = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorOnboardingStart"));
const PageContractorImportWorkspace = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorImportWorkspace"));
const PageContractorAIPPBuilder = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorAIPPBuilder"));
const PageContractorAssetsStudio = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorAssetsStudio"));
const PageContractorFAQBuilder = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorFAQBuilder"));
const PageContractorPlanRecommendation = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorPlanRecommendation"));
const PageContractorPersonalizedPlan = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorPersonalizedPlan"));
const PageContractorPricingIntake = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorPricingIntake"));
const PageAdminPricingIntelligence = lazyWithRetry(() => import("@/pages/admin/PageAdminPricingIntelligence"));
const PageAdminUnproStripeHealth = lazyWithRetry(() => import("@/pages/admin/PageAdminUnproStripeHealth"));
const PageContractorCheckout = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorCheckout"));
const PageContractorActivationSuccess = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorActivationSuccess"));
const PageContractorDashboardPostActivation = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorDashboardPostActivation"));
const PageContractorPersonalizedLanding = lazyWithRetry(() => import("@/pages/contractor-funnel/PageContractorPersonalizedLanding"));

// Contractor Activation Funnel V2 (9-screen)
const ScreenActivationLanding = lazyWithRetry(() => import("@/pages/entrepreneur/activation/ScreenLanding"));
const ScreenActivationAccount = lazyWithRetry(() => import("@/pages/entrepreneur/activation/ScreenAccount"));
const ScreenActivationImport = lazyWithRetry(() => import("@/pages/entrepreneur/activation/ScreenImport"));
const ScreenActivationScore = lazyWithRetry(() => import("@/pages/entrepreneur/activation/ScreenScore"));
const ScreenActivationChecklist = lazyWithRetry(() => import("@/pages/entrepreneur/activation/ScreenChecklist"));
const ScreenActivationCalendar = lazyWithRetry(() => import("@/pages/entrepreneur/activation/ScreenCalendar"));
const ScreenActivationPlan = lazyWithRetry(() => import("@/pages/entrepreneur/activation/ScreenPlan"));
const ScreenActivationPayment = lazyWithRetry(() => import("@/pages/entrepreneur/activation/ScreenPayment"));
const ScreenActivationSuccess = lazyWithRetry(() => import("@/pages/entrepreneur/activation/ScreenSuccess"));
const ContractorAvailabilityPage = lazyWithRetry(() => import("@/pages/ContractorAvailabilityPage"));
const PublicBookingPage = lazyWithRetry(() => import("@/pages/PublicBookingPage"));
const BookingClientDemoPage = lazyWithRetry(() => import("@/pages/BookingClientDemoPage"));
const BookingSettingsPage = lazyWithRetry(() => import("@/pages/BookingSettingsPage"));
const BookingPaymentSuccess = lazyWithRetry(() => import("@/pages/BookingPaymentSuccess"));
const BookingPaymentCancel = lazyWithRetry(() => import("@/pages/BookingPaymentCancel"));

// Trust Authority Layer
const PageHowUnproWorksAI = lazyWithRetry(() => import("@/pages/trust/PageHowUnproWorksAI"));
const PageRoadmapFeatures = lazyWithRetry(() => import("@/pages/trust/PageRoadmapFeatures"));
const PageCityServiceCoverage = lazyWithRetry(() => import("@/pages/trust/PageCityServiceCoverage"));
const PageGuidesHomeProblems = lazyWithRetry(() => import("@/pages/trust/PageGuidesHomeProblems"));
const PageReviewsVerified = lazyWithRetry(() => import("@/pages/trust/PageReviewsVerified"));

// Broker / Courtier
const CourtiersLandingPage = lazyWithRetry(() => import("@/pages/courtiers/CourtiersLandingPage"));
const BrokerOnboardingPage = lazyWithRetry(() => import("@/pages/courtiers/BrokerOnboardingPage"));
const BrokerDashboardPage = lazyWithRetry(() => import("@/pages/courtiers/BrokerDashboardPage"));
const BrokerLeadsPage = lazyWithRetry(() => import("@/pages/courtiers/BrokerLeadsPage"));
const BrokerProfilePage = lazyWithRetry(() => import("@/pages/courtiers/BrokerProfilePage"));
const BrokerAppointmentsPage = lazyWithRetry(() => import("@/pages/courtiers/BrokerAppointmentsPage"));

// Screenshot Intelligence Admin
const AdminScreenshotAnalyticsPage = lazyWithRetry(() => import("@/pages/admin/AdminScreenshotAnalyticsPage"));
const AdminScreenshotFrictionPage = lazyWithRetry(() => import("@/pages/admin/AdminScreenshotFrictionPage"));
const AdminScreenshotAlertsPage = lazyWithRetry(() => import("@/pages/admin/AdminScreenshotAlertsPage"));
const AdminScreenshotInsightsPage = lazyWithRetry(() => import("@/pages/admin/AdminScreenshotInsightsPage"));

// AI Self-Optimizing System
const AdminOptimizationDashboard = lazyWithRetry(() => import("@/pages/admin/AdminOptimizationDashboard"));
const AdminExperimentsPage = lazyWithRetry(() => import("@/pages/admin/AdminExperimentsPage"));
const AdminExperimentDetailPage = lazyWithRetry(() => import("@/pages/admin/AdminExperimentDetailPage"));
const AdminOptimizationRecommendations = lazyWithRetry(() => import("@/pages/admin/AdminOptimizationRecommendations"));
const AdminWinningVariantsPage = lazyWithRetry(() => import("@/pages/admin/AdminWinningVariantsPage"));

// Alex
const PageAdminAlexConversationRules = lazyWithRetry(() => import("@/pages/admin/PageAdminAlexConversationRules"));
const PageAdminAlexKnowledgePlans = lazyWithRetry(() => import("@/pages/admin/PageAdminAlexKnowledgePlans"));
const PageAdminAlexResponseAudit = lazyWithRetry(() => import("@/pages/admin/PageAdminAlexResponseAudit"));

// Recruitment Autonomous Engine
const PageAdminRecruitmentCommandCenter = lazyWithRetry(() => import("@/pages/admin/PageAdminRecruitmentCommandCenter"));
const PageAdminDataExtractionMonitor = lazyWithRetry(() => import("@/pages/admin/PageAdminDataExtractionMonitor"));
const PageAdminEmailCampaigns = lazyWithRetry(() => import("@/pages/admin/PageAdminEmailCampaigns"));

// 36h Strike Engine
const PageAdmin36hStrikeDashboard = lazyWithRetry(() => import("@/pages/admin/PageAdmin36hStrikeDashboard"));
const PageAdminStrikeLiveFeed = lazyWithRetry(() => import("@/pages/admin/PageAdminStrikeLiveFeed"));
const PageAdminStrikeAdjustments = lazyWithRetry(() => import("@/pages/admin/PageAdminStrikeAdjustments"));
const PageAdminContractorConversionFunnel = lazyWithRetry(() => import("@/pages/admin/PageAdminContractorConversionFunnel"));

// Stripe Live Verification
const PageAdminStripeVerificationCenter = lazyWithRetry(() => import("@/pages/admin/PageAdminStripeVerificationCenter"));

// Autonomous Acquisition Engine
const PageAgentAcquisitionMonitoring = lazyWithRetry(() => import("@/pages/admin/PageAgentAcquisitionMonitoring"));
const PageLandingContractorDynamicScore = lazyWithRetry(() => import("@/pages/conversion/PageLandingContractorDynamicScore"));

// Recruitment Automation Engine
const PageAdminRecruitmentOverview = lazyWithRetry(() => import("@/pages/admin/recruitment/PageAdminRecruitmentOverview"));
const PageAdminRecruitmentClusters = lazyWithRetry(() => import("@/pages/admin/recruitment/PageAdminRecruitmentClusters"));
const PageAdminRecruitmentCampaigns = lazyWithRetry(() => import("@/pages/admin/recruitment/PageAdminRecruitmentCampaigns"));
const PageAdminRecruitmentProspects = lazyWithRetry(() => import("@/pages/admin/recruitment/PageAdminRecruitmentProspects"));
const PageAdminRecruitmentSequences = lazyWithRetry(() => import("@/pages/admin/recruitment/PageAdminRecruitmentSequences"));
const PageAdminRecruitmentOnboarding = lazyWithRetry(() => import("@/pages/admin/recruitment/PageAdminRecruitmentOnboarding"));
const PageAdminRecruitmentPayments = lazyWithRetry(() => import("@/pages/admin/recruitment/PageAdminRecruitmentPayments"));
const PageAdminRecruitmentLogs = lazyWithRetry(() => import("@/pages/admin/recruitment/PageAdminRecruitmentLogs"));
const PageContractorJoinOffer = lazyWithRetry(() => import("@/pages/join/PageContractorJoinOffer"));
const PageContractorJoinCheckout = lazyWithRetry(() => import("@/pages/join/PageContractorJoinCheckout"));
const PageContractorJoinSuccess = lazyWithRetry(() => import("@/pages/join/PageContractorJoinSuccess"));
const PageContractorJoinResume = lazyWithRetry(() => import("@/pages/join/PageContractorJoinResume"));
const PageContractorPublicMagicAccess = lazyWithRetry(() => import("@/pages/join/PageContractorPublicMagicAccess"));
const PageContractorJoinPublic = lazyWithRetry(() => import("@/pages/join/PageContractorJoinPublic"));
const PageContractorJoinProfileGate = lazyWithRetry(() => import("@/pages/join/PageContractorJoinProfileGate"));
const PageAdminAlexDebugHome = lazyWithRetry(() => import("@/pages/admin/PageAdminAlexDebugHome"));
const PageAdminAlexSpeechTuning = lazyWithRetry(() => import("@/pages/admin/AlexSpeechTuning"));
const AlexVoiceAdmin = lazyWithRetry(() => import("@/pages/admin/AlexVoiceAdmin"));
const PageAdminAlexVoice = lazyWithRetry(() => import("@/pages/admin/alex/PageAdminAlexVoice"));
const PageVoiceHealth = lazyWithRetry(() => import("@/pages/admin/PageVoiceHealth"));
const PageAdminAlexContext = lazyWithRetry(() => import("@/pages/admin/alex/PageAdminAlexContext"));
const PageAdminAlexAnalytics = lazyWithRetry(() => import("@/pages/admin/alex/PageAdminAlexAnalytics"));

// Intent Funnel + Match Engine
const PageEntryUnifiedIntent = lazyWithRetry(() => import("@/pages/intent/PageEntryUnifiedIntent"));
const PageMatchResultsDynamic = lazyWithRetry(() => import("@/pages/intent/PageMatchResultsDynamic"));
const PageBookingInstant = lazyWithRetry(() => import("@/pages/intent/PageBookingInstant"));
const PageAlexConversationIntent = lazyWithRetry(() => import("@/pages/intent/PageAlexConversationIntent"));
const AdminPredictiveLeads = lazyWithRetry(() => import("@/pages/admin/AdminPredictiveLeads"));
const AdminDynamicMarketPricing = lazyWithRetry(() => import("@/pages/admin/AdminDynamicMarketPricing"));
const AdminPredictiveMarketBoard = lazyWithRetry(() => import("@/pages/admin/AdminPredictiveMarketBoard"));
const PageAlexPredictiveSeller = lazyWithRetry(() => import("@/pages/alex/PageAlexPredictiveSeller"));
const AdminZoneValueMap = lazyWithRetry(() => import("@/pages/admin/AdminZoneValueMap"));
const AdminVoiceControlPage = lazyWithRetry(() => import("@/pages/admin/AdminVoiceControlPage"));
const AdminVoiceOptimizerPage = lazyWithRetry(() => import("@/pages/admin/AdminVoiceOptimizerPage"));
const PageAdminVoicePronunciation = lazyWithRetry(() => import("@/pages/admin/PageAdminVoicePronunciation"));
const PageAdminBrandPronunciation = lazyWithRetry(() => import("@/pages/admin/PageAdminBrandPronunciation"));
const PageNoMatchFallback = lazyWithRetry(() => import("@/pages/PageNoMatchFallback"));
const PageAdminNoMatchMonitoring = lazyWithRetry(() => import("@/pages/admin/PageAdminNoMatchMonitoring"));
const EntrepreneurVoiceSalesPage = lazyWithRetry(() => import("@/pages/entrepreneur/EntrepreneurVoiceSalesPage"));
const AdminSalesAnalyticsPage = lazyWithRetry(() => import("@/pages/admin/AdminSalesAnalyticsPage"));
const HomeownerVoiceEntryPage = lazyWithRetry(() => import("@/pages/homeowner/HomeownerVoiceEntryPage"));
const AdminHomeownerAnalyticsPage = lazyWithRetry(() => import("@/pages/admin/AdminHomeownerAnalyticsPage"));

// Go-Live
const PageAdminGoLive = lazyWithRetry(() => import("@/pages/admin/PageAdminGoLive"));
const PageAdminGoLiveVerification = lazyWithRetry(() => import("@/pages/admin/PageAdminGoLiveVerification"));
const PageAdminGoLiveIncidents = lazyWithRetry(() => import("@/pages/admin/PageAdminGoLiveIncidents"));
const PageAdminGoLiveE2ETests = lazyWithRetry(() => import("@/pages/admin/PageAdminGoLiveE2ETests"));
const PageAdminGoLiveFunctionHealth = lazyWithRetry(() => import("@/pages/admin/PageAdminGoLiveFunctionHealth"));
const PageAdminGoLivePaymentHealth = lazyWithRetry(() => import("@/pages/admin/PageAdminGoLivePaymentHealth"));
const PageAdminNavigation = lazyWithRetry(() => import("@/pages/admin/PageAdminNavigation"));

// AIPP v2
const PageAuditAIPPv2 = lazyWithRetry(() => import("@/pages/PageAuditAIPPv2"));
const PageAuditResultsAIPPv2 = lazyWithRetry(() => import("@/pages/PageAuditResultsAIPPv2"));
const PageAdminAIPPv2Dashboard = lazyWithRetry(() => import("@/pages/admin/PageAdminAIPPv2Dashboard"));
const PageAippDebug = lazyWithRetry(() => import("@/pages/admin/PageAippDebug"));
const PageMissionControl = lazyWithRetry(() => import("@/pages/admin/PageMissionControl"));
const PageContractorAippAudit = lazyWithRetry(() => import("@/pages/PageContractorAippAudit"));

// Instant Audit Intake Funnel + Outreach + Sniper
const PageInstantAuditFunnel = lazyWithRetry(() => import("@/pages/PageInstantAuditFunnel"));
const PageOutreachLanding = lazyWithRetry(() => import("@/pages/PageOutreachLanding"));
const PageSniperCommandCenter = lazyWithRetry(() => import("@/pages/admin/PageSniperCommandCenter"));
const PageConciergeCockpit = lazyWithRetry(() => import("@/pages/admin/concierge/PageConciergeCockpit"));
const PageAutonomousEngine = lazyWithRetry(() => import("@/pages/admin/PageAutonomousEngine"));
const PageSmsDebug = lazyWithRetry(() => import("@/pages/admin/PageSmsDebug"));
const PageCommandCenterLeads = lazyWithRetry(() => import("@/pages/admin/PageCommandCenterLeads"));
const PageCommandCenterCampaigns = lazyWithRetry(() => import("@/pages/admin/PageCommandCenterCampaigns"));
const PageCommandCenterTerritories = lazyWithRetry(() => import("@/pages/admin/PageCommandCenterTerritories"));

// SEO Index Domination
const ContractorSeoPage = lazyWithRetry(() => import("@/pages/seo/ContractorSeoPage"));
const PageContractorPublicProfileISR = lazyWithRetry(() => import("@/pages/entrepreneur/PageContractorPublicProfileISR"));
const PageHomeownerBookingFunnel = lazyWithRetry(() => import("@/pages/homeowner/PageHomeownerBookingFunnel"));
const PageClaimWizard = lazyWithRetry(() => import("@/pages/entrepreneur/PageClaimWizard"));
const PageClaimWelcome = lazyWithRetry(() => import("@/pages/entrepreneur/PageClaimWelcome"));
const SolutionServiceCityPage = lazyWithRetry(() => import("@/pages/seo/SolutionServiceCityPage"));
const SolutionServicePage = lazyWithRetry(() => import("@/pages/seo/SolutionServicePage"));
const ContractorCityPage = lazyWithRetry(() => import("@/pages/seo/ContractorCityPage"));
const ProjectPage = lazyWithRetry(() => import("@/pages/seo/ProjectPage"));
const PageSeoIndexHealth = lazyWithRetry(() => import("@/pages/admin/PageSeoIndexHealth"));

// Entrepreneur Onboarding Flow
const PageOnboardingImport = lazyWithRetry(() => import("@/pages/entrepreneur/PageOnboardingImport"));
const PageOnboardingAnalyse = lazyWithRetry(() => import("@/pages/entrepreneur/PageOnboardingAnalyse"));
const PageOnboardingPlan = lazyWithRetry(() => import("@/pages/entrepreneur/PageOnboardingPlan"));
const PageOnboardingPayment = lazyWithRetry(() => import("@/pages/entrepreneur/PageOnboardingPayment"));
const PageOnboardingSuccess = lazyWithRetry(() => import("@/pages/entrepreneur/PageOnboardingSuccess"));
const PageVision5Ans = lazyWithRetry(() => import("@/pages/entrepreneur/PageVision5Ans"));

// Blog
const BlogIndexPage = lazyWithRetry(() => import("@/pages/blog/BlogIndexPage"));
const BlogArticlePage = lazyWithRetry(() => import("@/pages/blog/BlogArticlePage"));

// Journal — Authority content infrastructure
const JournalIndexPage = lazyWithRetry(() => import("@/pages/journal/JournalIndexPage"));
const JournalArticlePage = lazyWithRetry(() => import("@/pages/journal/JournalArticlePage"));
const AdminJournalPage = lazyWithRetry(() => import("@/pages/admin/AdminJournalPage"));

// Condos
const CondoHomePage = lazyWithRetry(() => import("@/pages/condos/CondoHomePage"));
const PageLandingCondoTeaser = lazyWithRetry(() => import("@/pages/condos/PageLandingCondoTeaser"));
const PageDiagnosticCondoIA = lazyWithRetry(() => import("@/pages/condos/PageDiagnosticCondoIA"));
const CondoLoi16Page = lazyWithRetry(() => import("@/pages/condos/CondoLoi16Page"));
const CondoCarnetPage = lazyWithRetry(() => import("@/pages/condos/CondoCarnetPage"));
const CondoFondsPage = lazyWithRetry(() => import("@/pages/condos/CondoFondsPage"));
const CondoAttestationPage = lazyWithRetry(() => import("@/pages/condos/CondoAttestationPage"));
const CondoTarifsPage = lazyWithRetry(() => import("@/pages/condos/CondoTarifsPage"));
const CondoOnboardingPage = lazyWithRetry(() => import("@/pages/condos/CondoOnboardingPage"));
const CondoDashboardPage = lazyWithRetry(() => import("@/pages/condos/CondoDashboardPage"));
const CondoBuildingPage = lazyWithRetry(() => import("@/pages/condos/CondoBuildingPage"));
const CondoComponentsPage = lazyWithRetry(() => import("@/pages/condos/CondoComponentsPage"));
const CondoMaintenancePage = lazyWithRetry(() => import("@/pages/condos/CondoMaintenancePage"));
const CondoDocumentsPage = lazyWithRetry(() => import("@/pages/condos/CondoDocumentsPage"));
const CondoReserveFundPage = lazyWithRetry(() => import("@/pages/condos/CondoReserveFundPage"));
const CondoQuotesPage = lazyWithRetry(() => import("@/pages/condos/CondoQuotesPage"));
const CondoReportsPage = lazyWithRetry(() => import("@/pages/condos/CondoReportsPage"));
const CondoBillingPage = lazyWithRetry(() => import("@/pages/condos/CondoBillingPage"));
const CondoRequestsPage = lazyWithRetry(() => import("@/pages/condos/CondoRequestsPage"));
const CondoVotingPage = lazyWithRetry(() => import("@/pages/condos/CondoVotingPage"));
const CondoFinancialsPage = lazyWithRetry(() => import("@/pages/condos/CondoFinancialsPage"));
const CondoUnitsPage = lazyWithRetry(() => import("@/pages/condos/CondoUnitsPage"));
const CondoIncidentsPage = lazyWithRetry(() => import("@/pages/condos/CondoIncidentsPage"));
const CondoContractorsPage = lazyWithRetry(() => import("@/pages/condos/CondoContractorsPage"));
const CondoCalendarPage = lazyWithRetry(() => import("@/pages/condos/CondoCalendarPage"));

// Homeowner Dashboard
const DashboardHome = lazyWithRetry(() => import("@/pages/dashboard/DashboardHome"));
const PropertiesList = lazyWithRetry(() => import("@/pages/dashboard/PropertiesList"));
const PropertyNew = lazyWithRetry(() => import("@/pages/dashboard/PropertyNew"));
const PropertyDetail = lazyWithRetry(() => import("@/pages/dashboard/PropertyDetail"));
const QuotesList = lazyWithRetry(() => import("@/pages/dashboard/QuotesList"));
const QuoteUploadPage = lazyWithRetry(() => import("@/pages/dashboard/QuoteUploadPage"));
const QuoteDetail = lazyWithRetry(() => import("@/pages/dashboard/QuoteDetail"));
const HomeScorePage = lazyWithRetry(() => import("@/pages/dashboard/HomeScorePage"));
const PropertyInsightsPage = lazyWithRetry(() => import("@/pages/dashboard/PropertyInsightsPage"));
const AccountPage = lazyWithRetry(() => import("@/pages/dashboard/AccountPage"));
const PageLogout = lazyWithRetry(() => import("@/pages/PageLogout"));
const PageMonProfil = lazyWithRetry(() => import("@/pages/PageMonProfil"));
const PageMonCompte = lazyWithRetry(() => import("@/pages/PageMonCompte"));
const HomeownerAppointments = lazyWithRetry(() => import("@/pages/dashboard/HomeownerAppointments"));
const BookingPage = lazyWithRetry(() => import("@/pages/dashboard/BookingPage"));
const DocumentUploadPage = lazyWithRetry(() => import("@/pages/dashboard/DocumentUploadPage"));
const ProjectNewPage = lazyWithRetry(() => import("@/pages/dashboard/ProjectNewPage"));
const ProjectWaitingPage = lazyWithRetry(() => import("@/pages/dashboard/ProjectWaitingPage"));
const SyndicateDashboard = lazyWithRetry(() => import("@/pages/dashboard/SyndicateDashboard"));
const SyndicateDetailDashboard = lazyWithRetry(() => import("@/pages/dashboard/SyndicateDetailDashboard"));
const SyndicateReserveFund = lazyWithRetry(() => import("@/pages/dashboard/SyndicateReserveFund"));
const ReserveFundAnalyzer = lazyWithRetry(() => import("@/pages/dashboard/ReserveFundAnalyzer"));
const SyndicateMaintenance = lazyWithRetry(() => import("@/pages/dashboard/SyndicateMaintenance"));
const SyndicateVotes = lazyWithRetry(() => import("@/pages/dashboard/SyndicateVotes"));
const SyndicateVoteCreate = lazyWithRetry(() => import("@/pages/dashboard/SyndicateVoteCreate"));
const SyndicateGrowthDashboard = lazyWithRetry(() => import("@/pages/dashboard/SyndicateGrowthDashboard"));
const LeadResults = lazyWithRetry(() => import("@/pages/dashboard/LeadResults"));
const MyPlacementsPage = lazyWithRetry(() => import("@/pages/dashboard/MyPlacementsPage"));

// Entrepreneur Funnel
const PageEntrepreneurLandingAIPP = lazyWithRetry(() => import("@/pages/entrepreneur/PageEntrepreneurLandingAIPP"));
const PageEntrepreneurDiagnosticLanding = lazyWithRetry(() => import("@/pages/entrepreneur/PageEntrepreneurDiagnosticLanding"));
const PageEntrepreneursLanding = lazyWithRetry(() => import("@/pages/entrepreneur/PageEntrepreneursLanding"));
const PageEntrepreneurScoreResult = lazyWithRetry(() => import("@/pages/entrepreneur/PageEntrepreneurScoreResult"));
const PageEntrepreneurPricing = lazyWithRetry(() => import("@/pages/entrepreneur/PageEntrepreneurPricing"));
const PageEntrepreneurDashboardLite = lazyWithRetry(() => import("@/pages/entrepreneur/PageEntrepreneurDashboardLite"));
const PageAIPPAnalysisLoading = lazyWithRetry(() => import("@/pages/entrepreneur/PageAIPPAnalysisLoading"));
const PageEntrepreneurImportProcessing = lazyWithRetry(() => import("@/pages/entrepreneur/PageEntrepreneurImportProcessing"));
const PagePricingCalculator = lazyWithRetry(() => import("@/pages/entrepreneur/PagePricingCalculator"));
const PageGuaranteeCalculator = lazyWithRetry(() => import("@/pages/entrepreneur/PageGuaranteeCalculator"));
const PageAiRecommendationAudit = lazyWithRetry(() => import("@/pages/entrepreneur/PageAiRecommendationAudit"));
const PageForfaitGrowthCalculator = lazyWithRetry(() => import("@/pages/entrepreneur/PageForfaitGrowthCalculator"));

const PagePlanResult = lazyWithRetry(() => import("@/pages/entrepreneur/PagePlanResult"));
const PageEntrepreneurGoalToPlanLanding = lazyWithRetry(() => import("@/pages/entrepreneur/PageEntrepreneurGoalToPlanLanding"));
const PagePaymentSuccess = lazyWithRetry(() => import("@/pages/entrepreneur/PagePaymentSuccess"));
const PagePaymentCancelled = lazyWithRetry(() => import("@/pages/entrepreneur/PagePaymentCancelled"));
const PageAIPPScoreReveal = lazyWithRetry(() => import("@/pages/entrepreneur/PageAIPPScoreReveal"));

// Contractor Pro
const ProDashboard = lazyWithRetry(() => import("@/pages/pro/ProDashboard"));
const ProProfile = lazyWithRetry(() => import("@/pages/pro/ProProfile"));
const ProAIPPScore = lazyWithRetry(() => import("@/pages/pro/ProAIPPScore"));
const ProReviews = lazyWithRetry(() => import("@/pages/pro/ProReviews"));
const ProDocuments = lazyWithRetry(() => import("@/pages/pro/ProDocuments"));
const ProAccount = lazyWithRetry(() => import("@/pages/pro/ProAccount"));
const ProAppointments = lazyWithRetry(() => import("@/pages/pro/ProAppointments"));
const ProLeads = lazyWithRetry(() => import("@/pages/pro/ProLeads"));
const ProLeadDetail = lazyWithRetry(() => import("@/pages/pro/ProLeadDetail"));
const ProBilling = lazyWithRetry(() => import("@/pages/pro/ProBilling"));
const ProTerritories = lazyWithRetry(() => import("@/pages/pro/ProTerritories"));
const ProAuthorityScore = lazyWithRetry(() => import("@/pages/pro/ProAuthorityScore"));
const ProIncomingProjects = lazyWithRetry(() => import("@/pages/pro/ProIncomingProjects"));
const PageContractorInbox = lazyWithRetry(() => import("@/pages/pro/PageContractorInbox"));
const PageJobDetailsLive = lazyWithRetry(() => import("@/pages/pro/PageJobDetailsLive"));
const ProPartnerNetwork = lazyWithRetry(() => import("@/pages/pro/ProPartnerNetwork"));
const ProExpertise = lazyWithRetry(() => import("@/pages/pro/ProExpertise"));
const PageContractorCompatibility = lazyWithRetry(() => import("@/pages/pro/PageContractorCompatibility"));
const PageContractorProfileInvite = lazyWithRetry(() => import("@/pages/pro/PageContractorProfileInvite"));
const ProTeams = lazyWithRetry(() => import("@/pages/pro/ProTeams"));
const ProEmergencySettings = lazyWithRetry(() => import("@/pages/pro/ProEmergencySettings"));
const ProDomainIntelligence = lazyWithRetry(() => import("@/pages/pro/ProDomainIntelligence"));
const ProMatchedLeads = lazyWithRetry(() => import("@/pages/pro/ProMatchedLeads"));
const ProSetupWizard = lazyWithRetry(() => import("@/pages/pro/ProSetupWizard"));
const EmergencyTrackingPage = lazyWithRetry(() => import("@/pages/EmergencyTrackingPage"));
const PageEntrepreneurPlanUsage = lazyWithRetry(() => import("@/pages/entrepreneur/PageEntrepreneurPlanUsage"));

// Admin
const AdminDashboard = lazyWithRetry(() => import("@/pages/admin/AdminDashboard"));
const PageAdminOmega = lazyWithRetry(() => import("@/pages/admin/PageAdminOmega"));
const PageAdminEntrepreneurActivation = lazyWithRetry(() => import("@/pages/admin/PageAdminEntrepreneurActivation"));
const AdminUsers = lazyWithRetry(() => import("@/pages/admin/AdminUsers"));
const AdminContractors = lazyWithRetry(() => import("@/pages/admin/AdminContractors"));
const AdminQuotes = lazyWithRetry(() => import("@/pages/admin/AdminQuotes"));
const AdminReviews = lazyWithRetry(() => import("@/pages/admin/AdminReviews"));
const AdminDocuments = lazyWithRetry(() => import("@/pages/admin/AdminDocuments"));
const AdminContractorDetail = lazyWithRetry(() => import("@/pages/admin/AdminContractorDetail"));
const PageAdminCreateContractorManual = lazyWithRetry(() => import("@/pages/admin/PageAdminCreateContractorManual"));
const AdminAppointments = lazyWithRetry(() => import("@/pages/admin/AdminAppointments"));
const AdminLeads = lazyWithRetry(() => import("@/pages/admin/AdminLeads"));
const AdminWarProspecting = lazyWithRetry(() => import("@/pages/admin/AdminWarProspecting"));
const AdminTerritories = lazyWithRetry(() => import("@/pages/admin/AdminTerritories"));
const AdminGrowth = lazyWithRetry(() => import("@/pages/admin/AdminGrowth"));
const AdminAgents = lazyWithRetry(() => import("@/pages/admin/AdminAgents"));
const PageAdminLiveAgents = lazyWithRetry(() => import("@/pages/admin/PageAdminLiveAgents"));
const AdminMedia = lazyWithRetry(() => import("@/pages/admin/AdminMedia"));
const AdminValidation = lazyWithRetry(() => import("@/pages/admin/AdminValidation"));
const AdminAnswerEngine = lazyWithRetry(() => import("@/pages/admin/AdminAnswerEngine"));
const AdminOperationsHub = lazyWithRetry(() => import("@/pages/admin/AdminOperationsHub"));
const AdminVerificationRuns = lazyWithRetry(() => import("@/pages/admin/AdminVerificationRuns"));
const AdminVerificationRunDetail = lazyWithRetry(() => import("@/pages/admin/AdminVerificationRunDetail"));
const AdminAlerts = lazyWithRetry(() => import("@/pages/admin/AdminAlerts"));
const AdminNavAnalytics = lazyWithRetry(() => import("@/pages/admin/AdminNavAnalytics"));
const AdminVerifiedContractors = lazyWithRetry(() => import("@/pages/admin/AdminVerifiedContractors"));
const PageAdminAcquisitionPipelineNew = lazyWithRetry(() => import("@/pages/admin/PageAdminAcquisitionPipeline"));
const PageAdminAcquisitionDiagnostics = lazyWithRetry(() => import("@/pages/admin/PageAdminAcquisitionDiagnostics"));
const PageAdminImportContractors = lazyWithRetry(() => import("@/pages/admin/PageAdminImportContractors"));
const AdminDuplicates = lazyWithRetry(() => import("@/pages/admin/AdminDuplicates"));
const AdminAutomation = lazyWithRetry(() => import("@/pages/admin/AdminAutomation"));
const PageAdminAutomationCommandCenter = lazyWithRetry(() => import("@/pages/admin/PageAdminAutomationCommandCenter"));
const AdminHomeGraph = lazyWithRetry(() => import("@/pages/admin/AdminHomeGraph"));
const AdminUOS = lazyWithRetry(() => import("@/pages/admin/AdminUOS"));
const AdminGrowthEngine = lazyWithRetry(() => import("@/pages/admin/AdminGrowthEngine"));
const AdminGrowthOS = lazyWithRetry(() => import("@/pages/admin/AdminGrowthOS"));
const AdminGrowthLiveMonitor = lazyWithRetry(() => import("@/pages/admin/AdminGrowthLiveMonitor"));
const ContractorGrowth = lazyWithRetry(() => import("@/pages/contractor/ContractorGrowth"));
const AdminPricingPage = lazyWithRetry(() => import("@/pages/admin/AdminPricingPage"));
const AdminCoupons = lazyWithRetry(() => import("@/pages/admin/AdminCoupons"));
const PageAdminPlanDistribution = lazyWithRetry(() => import("@/pages/admin/PageAdminPlanDistribution"));
const PageAdminPlanAppointmentsControl = lazyWithRetry(() => import("@/pages/admin/PageAdminPlanAppointmentsControl"));
const PageAdminClusterPlanProjectSizeMatrix = lazyWithRetry(() => import("@/pages/admin/PageAdminClusterPlanProjectSizeMatrix"));
const PageAdminProjectSizeExtensions = lazyWithRetry(() => import("@/pages/admin/PageAdminProjectSizeExtensions"));
const AdminRefusalSeoPage = lazyWithRetry(() => import("@/pages/admin/AdminRefusalSeoPage"));
const AdminAdsEngine = lazyWithRetry(() => import("@/pages/admin/AdminAdsEngine"));
const AdminDemandGrid = lazyWithRetry(() => import("@/pages/admin/AdminDemandGrid"));
const AdminSalesPsychology = lazyWithRetry(() => import("@/pages/admin/AdminSalesPsychology"));
const AdminRewardRules = lazyWithRetry(() => import("@/pages/admin/AdminRewardRules"));
const AdminDeepLinkAnalytics = lazyWithRetry(() => import("@/pages/admin/AdminDeepLinkAnalytics"));
const AdminAIGrowthInsights = lazyWithRetry(() => import("@/pages/admin/AdminAIGrowthInsights"));
const AdminAIGrowthDashboard = lazyWithRetry(() => import("@/pages/admin/AdminAIGrowthDashboard"));
const AdminCampaignLab = lazyWithRetry(() => import("@/pages/admin/AdminCampaignLab"));
const AdminAutopilotDashboard = lazyWithRetry(() => import("@/pages/admin/AdminAutopilotDashboard"));
const AdminSeoDominationDashboard = lazyWithRetry(() => import("@/pages/admin/AdminSeoDominationDashboard"));
const AdminMarketEngine = lazyWithRetry(() => import("@/pages/admin/AdminMarketEngine"));
const AdminNexusDashboard = lazyWithRetry(() => import("@/pages/admin/AdminNexusDashboard"));
const AdminDispatchCenter = lazyWithRetry(() => import("@/pages/admin/AdminDispatchCenter"));
const AdminCommercialEligibility = lazyWithRetry(() => import("@/pages/admin/AdminCommercialEligibility"));
const AdminOfficialSiteEnrichment = lazyWithRetry(() => import("@/pages/admin/AdminOfficialSiteEnrichment"));
const AdminOfficialAcquisition = lazyWithRetry(() => import("@/pages/admin/AdminOfficialAcquisition"));
const AdminDomainIntelligence = lazyWithRetry(() => import("@/pages/admin/AdminDomainIntelligence"));
const PageDomainHealthDashboard = lazyWithRetry(() => import("@/pages/admin/PageDomainHealthDashboard"));
const AdminBulkArticlesPage = lazyWithRetry(() => import("@/pages/admin/AdminBulkArticlesPage"));
const AdminProspectCampaigns = lazyWithRetry(() => import("@/pages/admin/AdminProspectCampaigns"));
const AdminRoadmapExecution = lazyWithRetry(() => import("@/pages/admin/AdminRoadmapExecution"));
const AdminOutreachDashboard = lazyWithRetry(() => import("@/pages/admin/AdminOutreachDashboard"));
const AdminOutreachCampaignNew = lazyWithRetry(() => import("@/pages/admin/AdminOutreachCampaignNew"));
const AdminOutreachCampaignDetail = lazyWithRetry(() => import("@/pages/admin/AdminOutreachCampaignDetail"));
const AdminOutreachTemplates = lazyWithRetry(() => import("@/pages/admin/AdminOutreachTemplates"));
const AdminOutreachAnalytics = lazyWithRetry(() => import("@/pages/admin/AdminOutreachAnalytics"));
const AdminContactVerification = lazyWithRetry(() => import("@/pages/admin/AdminContactVerification"));
const PageOutboundDashboard = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundDashboard"));
const PageOutreachLive = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutreachLive"));
const PageOutboundCampaigns = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundCampaigns"));
const PageOutboundLeadsQueue = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundLeadsQueue"));
const PageOutboundLeadProfile = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundLeadProfile"));
const PageOutboundSequences = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundSequences"));
const PageOutboundMailboxes = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundMailboxes"));
const PageOutboundAnalytics = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundAnalytics"));
const PageOutboundSuppressionCenter = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundSuppressionCenter"));
const PageOutboundLandingPages = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundLandingPages"));
const PageOutboundOpsCenter = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundOpsCenter"));
const PageOutboundReplies = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundReplies"));
const PageOutboundVerification = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundVerification"));
const PageOutboundTests = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundTests"));
const PageOutboundControlTower = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundControlTower"));
const PageOutboundTestCenter = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundTestCenter"));
const PageOutboundAutomations = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundAutomations"));
const PageOutboundLogs = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundLogs"));
const PageOutboundSettingsLite = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundSettingsLite"));
const PageOutboundEmailHealth = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundEmailHealth"));
const PageOutboundSequencesElite = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundSequencesElite"));
const PageOutboundSendingArchitecture = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundSendingArchitecture"));
const PageOutboundDeliverability = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundDeliverability"));
const PageOutboundAIRewrite = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundAIRewrite"));
const PageOutboundRevenue = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundRevenue"));
const PageOutboundSMSFallback = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundSMSFallback"));
const PageCampaignBuilderAutonomous = lazyWithRetry(() => import("@/pages/admin/outbound/PageCampaignBuilderAutonomous"));
const PageRunMonitorAutonomous = lazyWithRetry(() => import("@/pages/admin/outbound/PageRunMonitorAutonomous"));
const PagePipelineCommandCenterOutbound = lazyWithRetry(() => import("@/pages/admin/outbound/PagePipelineCommandCenterOutbound"));
const PageRunDetailsAgentExecution = lazyWithRetry(() => import("@/pages/admin/outbound/PageRunDetailsAgentExecution"));
const PageBlockedItemsRecoveryQueue = lazyWithRetry(() => import("@/pages/admin/outbound/PageBlockedItemsRecoveryQueue"));
const PageSystemHealthDependencies = lazyWithRetry(() => import("@/pages/admin/outbound/PageSystemHealthDependencies"));
const PageOutboundSettingsAutonomous = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundSettingsAutonomous"));
const PageOutboundTargetListInbox = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundTargetListInbox"));
const PageOutboundTargetReviewQueue = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundTargetReviewQueue"));
const PageOutboundAutopilotRuns = lazyWithRetry(() => import("@/pages/admin/outbound/PageOutboundAutopilotRuns"));
const PageCityFirstTargetHub = lazyWithRetry(() => import("@/pages/admin/outbound/PageCityFirstTargetHub"));
const PageCityExecutionMonitor = lazyWithRetry(() => import("@/pages/admin/outbound/PageCityExecutionMonitor"));
const PageRunDiagnostics = lazyWithRetry(() => import("@/pages/admin/outbound/PageRunDiagnostics"));
const PageAdminExecutionControl = lazyWithRetry(() => import("@/pages/admin/PageAdminExecutionControl"));
const PageAdminDominanceControl = lazyWithRetry(() => import("@/pages/admin/PageAdminDominanceControl"));
const PageAlexVoiceDebugAdmin = lazyWithRetry(() => import("@/pages/admin/PageAlexVoiceDebugAdmin"));
const PageAdminSMSImageTemplates = lazyWithRetry(() => import("@/pages/admin/sms-images/PageAdminSMSImageTemplates"));
const PageAdminBrandSettings = lazyWithRetry(() => import("@/pages/admin/PageAdminBrandSettings"));
const PageAdminBrandLogos = lazyWithRetry(() => import("@/pages/admin/PageAdminBrandLogos"));
const PageAdminCapacityFramework = lazyWithRetry(() => import("@/pages/admin/PageAdminCapacityFramework"));
const PageShareImageDashboard = lazyWithRetry(() => import("@/pages/admin/share-images/PageShareImageDashboard"));
const PageShareImageGenerate = lazyWithRetry(() => import("@/pages/admin/share-images/PageShareImageGenerate"));
const PageShareImageTemplates = lazyWithRetry(() => import("@/pages/admin/share-images/PageShareImageTemplates"));
const PageShareImageHistory = lazyWithRetry(() => import("@/pages/admin/share-images/PageShareImageHistory"));
const PageShareImagePreview = lazyWithRetry(() => import("@/pages/admin/share-images/PageShareImagePreview"));
const PageServiceEntityLanding = lazyWithRetry(() => import("@/pages/seo/PageServiceEntityLanding"));
const MesProprietesPage = lazyWithRetry(() => import("@/pages/MesProprietesPage"));
const AnalyserSoumissionsPage = lazyWithRetry(() => import("@/pages/AnalyserSoumissionsPage"));
const PageRecruitmentCloser = lazyWithRetry(() => import("@/pages/recruitment/PageRecruitmentCloser"));
const PageRecruitmentThankYou = lazyWithRetry(() => import("@/pages/recruitment/PageRecruitmentThankYou"));
const PageRepresentativeOnboarding = lazyWithRetry(() => import("@/pages/recruitment/PageRepresentativeOnboarding"));
const PageCareers = lazyWithRetry(() => import("@/pages/recruitment/PageCareers"));
const PageRecruitmentProgrammer = lazyWithRetry(() => import("@/pages/recruitment/PageRecruitmentProgrammer"));
const DecrireMonProjetPage = lazyWithRetry(() => import("@/pages/DecrireMonProjetPage"));
const ParlerAAlexPage = lazyWithRetry(() => import("@/pages/ParlerAAlexPage"));
const Alex100MPage = lazyWithRetry(() => import("@/pages/AlexPage"));
const ProblemesMaisonPage = lazyWithRetry(() => import("@/pages/ProblemesMaisonPage"));
const PagePyriteSousSol = lazyWithRetry(() => import("@/pages/problemes/PagePyriteSousSol"));
const VillesDesserviesPage = lazyWithRetry(() => import("@/pages/VillesDesserviesPage"));
const CityServicePage = lazyWithRetry(() => import("@/pages/CityServicePage"));
const ProfessionnelsPage2 = lazyWithRetry(() => import("@/pages/ProfessionnelsPage2"));
const EntretienPreventifPage = lazyWithRetry(() => import("@/pages/EntretienPreventifPage"));
const BlogPage2 = lazyWithRetry(() => import("@/pages/BlogPage2"));
const EmergencyPage = lazyWithRetry(() => import("@/pages/EmergencyPage"));
const RefusalSeoPage = lazyWithRetry(() => import("@/pages/seo/RefusalSeoPage"));

// Quote Separation: Comparison vs Client Record
const PageAnalyseTroisSoumissions = lazyWithRetry(() => import("@/pages/PageAnalyseTroisSoumissions"));
const PageImporterSoumissionComparative = lazyWithRetry(() => import("@/pages/PageImporterSoumissionComparative"));
const PageResultatAnalyseSoumissions = lazyWithRetry(() => import("@/pages/PageResultatAnalyseSoumissions"));
const PageSoumissionsDossierClient = lazyWithRetry(() => import("@/pages/PageSoumissionsDossierClient"));
const PageAjouterSoumissionAuDossier = lazyWithRetry(() => import("@/pages/PageAjouterSoumissionAuDossier"));

// Prospect Execution Engine
const PageAdminProspectExecutionDashboard = lazyWithRetry(() => import("@/pages/admin/prospect-execution/PageAdminProspectExecutionDashboard"));
const PageAdminProspectExecutionRunDetail = lazyWithRetry(() => import("@/pages/admin/prospect-execution/PageAdminProspectExecutionRunDetail"));

// Affiliate Tracking
const PageAffiliateDashboard = lazyWithRetry(() => import("@/pages/admin/affiliate/PageAffiliateDashboard"));
const PageAffiliatesHub = lazyWithRetry(() => import("@/pages/admin/affiliate/PageAffiliatesHub"));
const PageAffiliateWarRoom = lazyWithRetry(() => import("@/pages/affiliate/PageAffiliateWarRoom"));
const PageAffiliateActionMode = lazyWithRetry(() => import("@/pages/affiliate/PageAffiliateActionMode"));
const PageAffiliateCompanyWorkspace = lazyWithRetry(() => import("@/pages/affiliate/PageAffiliateCompanyWorkspace"));
const PageAffiliateAssignment = lazyWithRetry(() => import("@/pages/admin/affiliate/PageAffiliateAssignment"));
const PageAffiliateAttribution = lazyWithRetry(() => import("@/pages/admin/affiliate/PageAffiliateAttribution"));
const PageAffiliesPublic = lazyWithRetry(() => import("@/pages/affiliate/PageAffiliesPublic"));
const PageAffiliateOnboarding = lazyWithRetry(() => import("@/pages/affiliate/PageAffiliateOnboarding"));
const PageAffiliePublicProfile = lazyWithRetry(() => import("@/pages/affiliate/PageAffiliePublicProfile"));
const PageAffiliateLogin = lazyWithRetry(() => import("@/pages/affiliate/PageAffiliateLogin"));
const PageAffiliateShortLink = lazyWithRetry(() => import("@/pages/affiliate/PageAffiliateShortLink"));
const PageAdminAffiliateNew = lazyWithRetry(() => import("@/pages/admin/affiliate/PageAdminAffiliateNew"));
const PageAffiliateProspectImport = lazyWithRetry(() => import("@/pages/affiliate/PageAffiliateProspectImport"));

// Email Audit Center
const PageEmailAuditCenter = lazyWithRetry(() => import("@/pages/admin/email-health/PageEmailAuditCenter"));
const PageEmailHealthCenterV2 = lazyWithRetry(() => import("@/pages/admin/email-health/PageEmailHealthCenterV2"));
const PageEmailAuditHistory = lazyWithRetry(() => import("@/pages/admin/email-health/PageEmailAuditHistory"));
const PageAdminEmailControlCenter = lazyWithRetry(() => import("@/pages/admin/email-health/PageAdminEmailControlCenter"));
const PageAdminEmailWarmup = lazyWithRetry(() => import("@/pages/admin/email-health/PageAdminEmailWarmup"));
const PageAdminEmailDeliveryLogs = lazyWithRetry(() => import("@/pages/admin/email-health/PageAdminEmailLogs"));

// Email-to-Booking Conversion
const PageLandingPersonalizedAIPP = lazyWithRetry(() => import("@/pages/conversion/PageLandingPersonalizedAIPP"));
const PageBookingContractor = lazyWithRetry(() => import("@/pages/conversion/PageBookingContractor"));

const PageEntrepreneurJoin = lazyWithRetry(() => import("@/pages/entrepreneur/PageEntrepreneurJoin"));
const PageEntrepreneurHowItWorks = lazyWithRetry(() => import("@/pages/entrepreneur/PageEntrepreneurHowItWorks"));
const PageEntrepreneurPlans = lazyWithRetry(() => import("@/pages/entrepreneur/PageEntrepreneurPlans"));

// Owner Match
const PageOwnerMatch = lazyWithRetry(() => import("@/pages/match/PageOwnerMatch"));

// New V3 pages
const MesProprietes = lazyWithRetry(() => import("@/pages/MesProprietesPage"));
const AnalyserSoumissions = lazyWithRetry(() => import("@/pages/AnalyserSoumissionsPage"));
const LandingPageFounderPlans = lazyWithRetry(() => import("@/pages/LandingPageFounderPlansUNPRO"));

// Adaptive Homepage System
const HomeIntentRouterDynamic = lazyWithRetry(() => import("@/pages/HomeIntentRouterDynamic"));
const HomeHomeownerAdaptive = lazyWithRetry(() => import("@/pages/homeowner/HomeHomeownerAdaptive"));
const HomeContractorAdaptive = lazyWithRetry(() => import("@/pages/contractor-landing/HomeContractorAdaptive"));
const HomeCondoAdaptive = lazyWithRetry(() => import("@/pages/condos/HomeCondoAdaptive"));
const HomeProfessionalAdaptive = lazyWithRetry(() => import("@/pages/HomeProfessionalAdaptive"));

// IA Maison — Home Intelligence SEO cluster
const PageIaMaisonHub = lazyWithRetry(() => import("@/pages/ia-maison/PageIaMaisonHub"));
const PageIaMaisonArticle = lazyWithRetry(() => import("@/pages/ia-maison/PageIaMaisonArticle"));
const IA_MAISON_SLUGS = [
  "ia-peut-elle-detecter-fissure-fondation",
  "ia-peut-elle-detecter-infiltration-eau",
  "ia-peut-elle-detecter-moisissure",
  "ia-peut-elle-analyser-soumission",
  "ia-peut-elle-estimer-cout-renovation",
  "ia-peut-elle-detecter-probleme-isolation",
  "ia-peut-elle-identifier-risque-toiture",
  "ia-peut-elle-recommander-entrepreneur",
  "ia-maison-quebec",
  "quest-ce-que-lintelligence-residentielle",
] as const;

export const AppRouter = () => (
  <BrowserRouter>
    <ScrollRestoration />
    <BannerContinueFlow />
    <AuthReturnRouter />
    <AuthOverlayPremium />
    <Suspense fallback={<LazyFallback />}>
      <Routes>
        {/* Redirects for common mismatched entry points */}
        <Route path="/index" element={<HomeWithFeatureFlag />} />
        <Route path="/isolation-solution-royal" element={<Suspense fallback={<LazyFallback />}><PageSignaturePartner slug="isolation-solution-royal" /></Suspense>} />
        <Route path="/partenaires/:slug" element={<Suspense fallback={<LazyFallback />}><PageSignaturePartner /></Suspense>} />
        <Route path="/admin/partners" element={<Suspense fallback={<LazyFallback />}><PageAdminPartners /></Suspense>} />
        <Route path="/emergency-reset" element={<PageEmergencyReset />} />
        <Route path="/entrepreneur/aipp-analysis" element={<PageAIPPAnalysisLoading />} />

        {/* ISR demo plan/checkout (private, noindex) */}
        <Route path="/demo/isroyal-alex-plan-test" element={<Suspense fallback={<LazyFallback />}><PageIsrDemoPlanTest /></Suspense>} />
        <Route path="/demo/isroyal-alex-plan-test/success" element={<Suspense fallback={<LazyFallback />}><PageIsrDemoSuccess /></Suspense>} />
        <Route path="/demo/isroyal-alex-plan-test/cancel" element={<Suspense fallback={<LazyFallback />}><PageIsrDemoCancel /></Suspense>} />

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
        {/* `/` = « La fin des 3 soumissions » (PageHomeSimple). Legacy A/B variants stay on /v2 and /v3. */}
        <Route path="/" element={<HomeWithFeatureFlag />} />
        <Route path="/v2" element={<Suspense fallback={<LazyFallback />}><PageHomeVariantB /></Suspense>} />
        <Route path="/v3" element={<Suspense fallback={<LazyFallback />}><PageHomeVariantC /></Suspense>} />

        {/* IA Maison — Home Intelligence cluster */}
        <Route path="/ia-maison" element={<Suspense fallback={<LazyFallback />}><PageIaMaisonHub /></Suspense>} />
        {IA_MAISON_SLUGS.map((slug) => (
          <Route
            key={slug}
            path={`/${slug}`}
            element={<Suspense fallback={<LazyFallback />}><PageIaMaisonArticle slug={slug} /></Suspense>}
          />
        ))}

        <Route path="/pro/score" element={<Suspense fallback={<LazyFallback />}><PageProScoreInstant /></Suspense>} />
        <Route path="/pro/activate" element={<Suspense fallback={<LazyFallback />}><PageProActivate /></Suspense>} />
        <Route path="/isolation-qc" element={<Suspense fallback={<LazyFallback />}><PageProIsolationQC /></Suspense>} />
        <Route path="/admin/first-dollar-sprint" element={<Suspense fallback={<LazyFallback />}><PageFirstDollarSprint /></Suspense>} />
        <Route path="/admin/first-dollar" element={<Suspense fallback={<LazyFallback />}><PageAdminFirstDollar /></Suspense>} />
        <Route path="/admin/first-dollar/batches" element={<Suspense fallback={<LazyFallback />}><PageAdminFirstDollarBatches /></Suspense>} />
        <Route path="/admin/seo-health" element={<Suspense fallback={<LazyFallback />}><PageAdminSeoHealth /></Suspense>} />

        <Route path="/pro/welcome" element={<Suspense fallback={<LazyFallback />}><PageProWelcome /></Suspense>} />
        <Route path="/pro/profile/public/:contractorId" element={<Suspense fallback={<LazyFallback />}><PageProPublicProfile /></Suspense>} />
        <Route path="/pro/onboarding/:token" element={<Suspense fallback={<LazyFallback />}><PageProPrivateOnboarding /></Suspense>} />
        <Route path="/admin/acquisition-autopilot" element={<Suspense fallback={<LazyFallback />}><PageAdminAcquisitionAutopilot /></Suspense>} />


        <Route path="/admin/founders" element={<Suspense fallback={<LazyFallback />}><PageAdminFounders /></Suspense>} />
        <Route path="/pim" element={<Suspense fallback={<LazyFallback />}><PagePIMLanding /></Suspense>} />
        <Route path="/ai" element={<Suspense fallback={<LazyFallback />}><PageAICrawlerLanding /></Suspense>} />
        <Route path="/pourquoi-unpro" element={<Suspense fallback={<LazyFallback />}><PageWhyUnpro /></Suspense>} />
        <Route path="/visibilite-ia-entrepreneurs" element={<Suspense fallback={<LazyFallback />}><PageVisibiliteIA /></Suspense>} />
        <Route path="/admin/demandes-visibilite-ia" element={<Suspense fallback={<LazyFallback />}><AdminVisibiliteIALeads /></Suspense>} />
        <Route path="/intent" element={<Suspense fallback={<LazyFallback />}><HomeIntentRouterDynamic /></Suspense>} />
        <Route path="/homeowner" element={<Suspense fallback={<LazyFallback />}><HomeHomeownerAdaptive /></Suspense>} />
        <Route path="/contractor" element={<Suspense fallback={<LazyFallback />}><HomeContractorAdaptive /></Suspense>} />
        <Route path="/contractor-ai-growth" element={<Suspense fallback={<LazyFallback />}><PageContractorAIGrowth /></Suspense>} />
        <Route path="/condo-home" element={<Suspense fallback={<LazyFallback />}><HomeCondoAdaptive /></Suspense>} />
        <Route path="/professional" element={<Suspense fallback={<LazyFallback />}><HomeProfessionalAdaptive /></Suspense>} />
        <Route path="/impact" element={<Suspense fallback={<LazyFallback />}><PageImpactCounter /></Suspense>} />
        <Route path="/manifeste" element={<Suspense fallback={<LazyFallback />}><PageManifesto /></Suspense>} />
        <Route path="/pourquoi-pas-trois-soumissions" element={<Suspense fallback={<LazyFallback />}><PagePourquoiPasTroisSoumissions /></Suspense>} />
        <Route path="/intelligence" element={<Suspense fallback={<LazyFallback />}><PageIntelligenceHub /></Suspense>} />
        <Route path="/cest-quoi-unpro" element={<Suspense fallback={<LazyFallback />}><PageUnproFAQ25 /></Suspense>} />
        <Route path="/calculateur-taxes-quebec" element={<Suspense fallback={<LazyFallback />}><PageCalculateurTaxesQuebec /></Suspense>} />
        <Route path="/isroyal/calculateur-taxes" element={<Suspense fallback={<LazyFallback />}><PageIsRoyalCalculateurTaxes /></Suspense>} />
        <Route path="/peinture/calculateur" element={<Suspense fallback={<LazyFallback />}><PaintingCalculatorPage /></Suspense>} />
        <Route path="/:city/peinture/calculateur" element={<Suspense fallback={<LazyFallback />}><PaintingCalculatorPage /></Suspense>} />
        <Route path="/diagnostic-ia" element={<Suspense fallback={<LazyFallback />}><PageAIGrowthDiagnostic /></Suspense>} />
        <Route path="/diagnostic" element={<Suspense fallback={<LazyFallback />}><PageDiagnostic /></Suspense>} />
        <Route path="/go" element={<PageAdLandingAipp />} />
        <Route path="/aipp-check" element={<PageAdLandingAipp />} />
        <Route path="/scan-ia" element={<Suspense fallback={<LazyFallback />}><PageScanIALanding /></Suspense>} />
        <Route path="/scan-ia/scan" element={<Suspense fallback={<LazyFallback />}><PageScanIARun /></Suspense>} />
        <Route path="/scan-ia/wizard" element={<Suspense fallback={<LazyFallback />}><PageScanIAWizard /></Suspense>} />
        <Route path="/scan-ia/rapport" element={<Suspense fallback={<LazyFallback />}><PageScanIAWizard /></Suspense>} />
        <Route path="/scan-ia/activation-success" element={<Suspense fallback={<LazyFallback />}><PageScanIAActivationSuccess /></Suspense>} />
        <Route path="/_legacy/scan-ia/rapport" element={<Suspense fallback={<LazyFallback />}><PageScanIAReport /></Suspense>} />
        <Route path="/business-import" element={<PageBusinessImport />} />
        <Route path="/business-card-import" element={<PageBusinessCardImport />} />
        <Route path="/scanner" element={<PageBusinessCardScannerHub />} />
        <Route path="/leads" element={<PageContractorLeads />} />
        <Route path="/profile-completion" element={<PageBusinessImport />} />
        <Route path="/search" element={<AdminProtectedRoute><Search /></AdminProtectedRoute>} />
        <Route path="/diagnostic-photo" element={<Suspense fallback={<LazyFallback />}><ProVisualSearchPage /></Suspense>} />
        <Route path="/radon" element={<Suspense fallback={<LazyFallback />}><PageRadonLanding /></Suspense>} />
        <Route path="/contractors/:id" element={<ContractorProfile />} />
        <Route path="/entrepreneur/isolation-solution-royal" element={<Suspense fallback={<LazyFallback />}><PageContractorPublicProfileISR /></Suspense>} />
        <Route path="/entrepreneurs/pavage-alpha-laval" element={<Navigate to="/entrepreneur/pavage-alpha-laval" replace />} />
        <Route path="/entrepreneurs/:slug" element={<Suspense fallback={<LazyFallback />}><PageHomeownerBookingFunnel /></Suspense>} />
        <Route path="/entrepreneur/bienvenue" element={<Suspense fallback={<LazyFallback />}><PageClaimWelcome /></Suspense>} />
        <Route path="/entrepreneur/:slug/reclamer" element={<Suspense fallback={<LazyFallback />}><PageClaimWizard /></Suspense>} />
        <Route path="/entrepreneur/:slug" element={<Suspense fallback={<LazyFallback />}><ContractorSeoPage /></Suspense>} />
        <Route path="/login" element={<LoginPageUnpro />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/signup" element={<LoginPageUnpro />} />
        <Route path="/role" element={<PreLoginRolePage />} />
        <Route path="/onboarding" element={<UniversalRouteGuard anyAuth><OnboardingPageUnpro /></UniversalRouteGuard>} />
        <Route path="/start" element={<StartPage />} />

        {/* Contractor AI Activation */}
        <Route path="/activation-ia" element={<LandingContractorAIActivation />} />

        {/* Live Activation Pipeline */}
        <Route path="/contractor/join" element={<Suspense fallback={<LazyFallback />}><PageContractorJoinLive /></Suspense>} />
        <Route path="/contractor/analysis" element={<Suspense fallback={<LazyFallback />}><PageContractorAnalysisLive /></Suspense>} />
        <Route path="/contractor/activated" element={<Suspense fallback={<LazyFallback />}><PageContractorActivated /></Suspense>} />

        {/* Contractor Onboarding AIPP Funnel */}
        <Route path="/entrepreneur/join" element={<PageContractorLandingAcquisition />} />
        <Route path="/entrepreneur/ai-trust-audit" element={<Suspense fallback={<LazyFallback />}><PageAiTrustAudit /></Suspense>} />
        <Route path="/entrepreneur/pourquoi-vos-resultats-chutent" element={<Suspense fallback={<LazyFallback />}><PageWhyResultsAreDropping /></Suspense>} />
        <Route path="/pourquoi-vos-resultats-chutent" element={<Suspense fallback={<LazyFallback />}><PageWhyResultsAreDropping /></Suspense>} />
        <Route path="/articles/badges-choix-consommateur-2026" element={<Suspense fallback={<LazyFallback />}><PageBadgesConsommateur2026 /></Suspense>} />
        <Route path="/badges-choix-consommateur-2026" element={<Suspense fallback={<LazyFallback />}><PageBadgesConsommateur2026 /></Suspense>} />
        <Route path="/articles/verifier-grenier-avant-fenetres-thermopompe" element={<Suspense fallback={<LazyFallback />}><PageVerifierGrenierAvantFenetresThermopompe /></Suspense>} />
        <Route path="/articles/moins-de-soumissions-plus-de-factures" element={<Suspense fallback={<LazyFallback />}><PageMoinsSoumissionsPlusFactures /></Suspense>} />
        <Route path="/articles/fournisseur-peinture-plus-contrats" element={<Suspense fallback={<LazyFallback />}><PageFournisseurPeinturePlusContrats /></Suspense>} />
        <Route path="/articles/comment-apparaitre-resultats-recherche-ia-2026-entrepreneur" element={<Suspense fallback={<LazyFallback />}><PageApparaitreRechercheIA2026 /></Suspense>} />
        <Route path="/entrepreneur/plan-ia" element={<Suspense fallback={<LazyFallback />}><PageDynamicPlanGeneration /></Suspense>} />
        <Route path="/admin/dynamic-pricing" element={<Suspense fallback={<LazyFallback />}><PageAdminDynamicPricing /></Suspense>} />
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
        <Route path="/entrepreneur/plan-personnalise/:quoteId" element={<Suspense fallback={<LazyFallback />}><PageContractorPersonalizedPlan /></Suspense>} />
        <Route path="/entrepreneur/devis-personnalise" element={<Suspense fallback={<LazyFallback />}><PageContractorPricingIntake /></Suspense>} />
        <Route path="/entrepreneur/activation" element={<PageContractorActivationSuccess />} />
        <Route path="/entrepreneur/dashboard-post" element={<PageContractorDashboardPostActivation />} />
        <Route path="/contractor/:slug" element={<Suspense fallback={<LazyFallback />}><PageContractorPersonalizedLanding /></Suspense>} />

        {/* Contractor Activation Funnel V2 */}
        <Route path="/entrepreneur/activer" element={<Suspense fallback={<LazyFallback />}><ScreenActivationLanding /></Suspense>} />
        <Route path="/entrepreneur/activer/compte" element={<Suspense fallback={<LazyFallback />}><ScreenActivationAccount /></Suspense>} />
        <Route path="/entrepreneur/activer/analyse" element={<Suspense fallback={<LazyFallback />}><ScreenActivationImport /></Suspense>} />
        <Route path="/entrepreneur/activer/score" element={<Suspense fallback={<LazyFallback />}><ScreenActivationScore /></Suspense>} />
        <Route path="/entrepreneur/activer/profil" element={<Suspense fallback={<LazyFallback />}><ScreenActivationChecklist /></Suspense>} />
        <Route path="/entrepreneur/activer/calendrier" element={<Suspense fallback={<LazyFallback />}><ScreenActivationCalendar /></Suspense>} />
        <Route path="/entrepreneur/activer/plan" element={<Suspense fallback={<LazyFallback />}><ScreenActivationPlan /></Suspense>} />
        <Route path="/entrepreneur/activer/paiement" element={<Suspense fallback={<LazyFallback />}><ScreenActivationPayment /></Suspense>} />
        <Route path="/entrepreneur/activer/succes" element={<Suspense fallback={<LazyFallback />}><ScreenActivationSuccess /></Suspense>} />

        {/* Entrepreneur Funnel */}
        <Route path="/entrepreneur" element={<Suspense fallback={<LazyFallback />}><PageEntrepreneurDiagnosticLanding /></Suspense>} />
        <Route path="/entrepreneur/aipp-import" element={<PageEntrepreneurLandingAIPP />} />
        <Route path="/entrepreneurs" element={<PageEntrepreneursLanding />} />
        <Route path="/entrepreneur/analysis/loading" element={<PageAIPPAnalysisLoading />} />
        <Route path="/entrepreneur/score" element={<PageEntrepreneurScoreResult />} />
        <Route path="/aipp/:token/results" element={<PageAIPPScoreReveal />} />
        <Route path="/aipp/local/results" element={<PageAIPPScoreReveal />} />
        <Route path="/entrepreneur/pricing" element={<PageEntrepreneurPricing />} />
        <Route path="/entrepreneur/pricing-calculator" element={<PagePricingCalculator />} />
        <Route path="/entrepreneur/garantie" element={<PageGuaranteeCalculator />} />
        <Route path="/entrepreneur/calculateur-forfait" element={<Suspense fallback={<LazyFallback />}><PageForfaitGrowthCalculator /></Suspense>} />

        <Route path="/entrepreneurs/audit-ia" element={<PageAiRecommendationAudit />} />
        {/* Founder offer — local services & professionals (12 mois gratuits, puis 350 $/an) */}
        <Route path="/fondateurs" element={<Suspense fallback={<LazyFallback />}><PageFounderLocalServices /></Suspense>} />
        <Route path="/entrepreneur/audit-ia" element={<Navigate to="/entrepreneurs/audit-ia" replace />} />
        <Route path="/entrepreneurs/garantie" element={<PageGuaranteeCalculator />} />

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
        <Route path="/proprietaire/verifications/:reportId" element={<PageVerificationReport />} />
        <Route path="/owner-universe" element={<OwnerMenuPreviewPage />} />
        <Route path="/professionals" element={<ProfessionalsPage />} />
        <Route path="/entrepreneurs" element={<PageEntrepreneurJoin />} />
        <Route path="/entrepreneurs/disponibilite-categorie-specialite-ville" element={<ContractorAvailabilityPage />} />
        {/* Static /pro/* routes MUST be declared before /pro/:slug to guarantee match precedence */}
        <Route path="/pro/review-intelligence" element={<Suspense fallback={<LazyFallback />}><PageReviewIntelligenceLanding /></Suspense>} />
        <Route path="/pro/:slug" element={<Suspense fallback={<LazyFallback />}><PageProLandingNuclearClose /></Suspense>} />
        <Route path="/go/:slug" element={<Suspense fallback={<LazyFallback />}><PageGoShortLink /></Suspense>} />
        <Route path="/activation-success" element={<Suspense fallback={<LazyFallback />}><PageProspectActivationSuccess /></Suspense>} />
        <Route path="/admin/live-runs" element={<Suspense fallback={<LazyFallback />}><PageAdminLiveRuns /></Suspense>} />
        <Route path="/admin/prospect-sms" element={<Suspense fallback={<LazyFallback />}><PageAdminProspectSMS /></Suspense>} />
        <Route path="/admin/funnel-audit" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><AdminFunnelAudit /></Suspense></UniversalRouteGuard>} />
        <Route path="/admin/funnel-debug" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><AdminFunnelDebug /></Suspense></UniversalRouteGuard>} />
        <Route path="/admin/conversion-truth" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><AdminConversionTruth /></Suspense></UniversalRouteGuard>} />
        <Route path="/admin/conversion-lab" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageAdminConversionLab /></Suspense></UniversalRouteGuard>} />

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
        <Route path="/entrepreneur/objectifs/:token" element={<PageActivationGoals />} />
        <Route path="/checkout" element={<PageCheckoutStripe />} />
        <Route path="/checkout/success" element={<PageCheckoutSuccess />} />
        <Route path="/checkout/native/:planCode" element={<PageCheckoutNativeScrollable />} />
        <Route path="/activation" element={<Suspense fallback={<LazyFallback />}><SolicitationActivationPage /></Suspense>} />
        <Route path="/activation/start" element={<PageActivationStart />} />
        {/* SMS → 350 $ activation outreach tunnel — public routes */}
        <Route path="/r/:token" element={<Suspense fallback={<LazyFallback />}><PageShortLinkRedirect /></Suspense>} />
        <Route path="/unpro/activate/:token" element={<Suspense fallback={<LazyFallback />}><PageUnproActivate /></Suspense>} />
        {/* First-touch SMS → personalized free AI score (curiosity, no pricing) */}
        <Route path="/unpro/audit/:token" element={<Suspense fallback={<LazyFallback />}><PageAuditTokenRedirect /></Suspense>} />
        <Route path="/invitation/:token" element={<Suspense fallback={<LazyFallback />}><PageInvitationLanding /></Suspense>} />
        <Route path="/invitation/:token/edit" element={<Suspense fallback={<LazyFallback />}><PageInvitationEdit /></Suspense>} />
        <Route path="/invitation/:token/activate" element={<Suspense fallback={<LazyFallback />}><PageInvitationActivate /></Suspense>} />
        <Route path="/activation/success" element={<Suspense fallback={<LazyFallback />}><PageOutreachActivationSuccess /></Suspense>} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/pricing/proprietaires" element={<PricingHomeownersPage />} />
        <Route path="/pricing/entrepreneurs" element={<PricingContractorsPage />} />
        {/* Canonical upgrade surface (with feature + return context) */}
        <Route path="/upgrade" element={<PageUpgradeHomeowner />} />
        <Route path="/proprietaires/abonnement" element={<PageUpgradeHomeowner />} />
        <Route path="/compte/abonnement" element={<PageUpgradeHomeowner />} />
        {/* Legacy /tarifs links used across emails, checkout and SMS */}
        <Route path="/tarifs" element={<PricingHomeownersPage />} />
        <Route path="/tarifs/proprietaires" element={<PricingHomeownersPage />} />
        <Route path="/tarifs/entrepreneurs" element={<PricingContractorsPage />} />
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
        <Route path="/qr" element={<QrGeneratorPage />} />
        <Route path="/r/:shortCode" element={<QrRedirectPage />} />
        <Route path="/ref/:refCode" element={<ReferralLandingPage />} />
        <Route path="/admin/qr-codes" element={<PageAdminQrCodes />} />
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

        {/* Blueprint canonical routes — May 2026 */}
        <Route path="/solution/:service/:city" element={<Suspense fallback={<LazyFallback />}><SolutionServiceCityPage /></Suspense>} />
        <Route path="/solution/:service/:city/:neighborhood" element={<Suspense fallback={<LazyFallback />}><SolutionServiceCityPage /></Suspense>} />
        <Route path="/contractor/:slug/:city" element={<Suspense fallback={<LazyFallback />}><ContractorCityPage /></Suspense>} />
        <Route path="/contractor/:slug/:city/reviews" element={<Suspense fallback={<LazyFallback />}><ContractorCityPage /></Suspense>} />
        <Route path="/contractor/:slug/:city/projects" element={<Suspense fallback={<LazyFallback />}><ContractorCityPage /></Suspense>} />
        <Route path="/guide/:topic" element={<GuidePage />} />
        <Route path="/guide/:topic/:city" element={<GuidePage />} />
        <Route path="/project/:slug" element={<Suspense fallback={<LazyFallback />}><ProjectPage /></Suspense>} />

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

        {/* ─── Public navigation pages (wired to real pages) ─── */}
        <Route path="/proprietaires/passeport-maison" element={<PagePasseportMaison />} />
        <Route path="/proprietaires/score-maison" element={<ProtectedRoute requiredRole="homeowner"><HomeScorePage /></ProtectedRoute>} />
        <Route path="/outils-ia" element={<AnswerEnginePage />} />
        <Route path="/services/isolation-grenier" element={<ProblemesMaisonPage />} />
        <Route path="/services/toiture" element={<ProblemesMaisonPage />} />
        <Route path="/services/fondation" element={<ProblemesMaisonPage />} />
        <Route path="/services/fenetres" element={<ProblemesMaisonPage />} />
        <Route path="/services/chauffage" element={<ProblemesMaisonPage />} />
        <Route path="/entrepreneurs/creer-mon-profil" element={<ContractorOnboardingPage />} />
        <Route path="/entrepreneurs/pages-ia" element={<PageEntrepreneurLandingAIPP />} />
        <Route path="/entrepreneurs/score-aipp" element={<AIPPScorePage />} />
        <Route path="/entrepreneurs/profil-public" element={<ProtectedRoute requiredRole="contractor"><ProProfile /></ProtectedRoute>} />
        <Route path="/entrepreneurs/matching" element={<ProtectedRoute requiredRole="contractor"><ProMatchedLeads /></ProtectedRoute>} />
        <Route path="/entrepreneurs/badges" element={<AuthorityDashboardPage />} />
        <Route path="/entrepreneurs/demo" element={<BookingClientDemoPage />} />
        <Route path="/entrepreneurs/ambassadeur" element={<StaticContentPage slug="ambassadeurs" />} />
        <Route path="/ambassadeurs" element={<StaticContentPage slug="ambassadeurs" />} />
        <Route path="/aide" element={<StaticContentPage slug="aide" />} />
        <Route path="/professionnels" element={<ProfessionnelsPage2 />} />
        <Route path="/villes" element={<VillesDesserviesPage />} />
        {/* /guides handled below by PageGuidesHomeProblems */}
        {/* New V3 Navigation routes */}
        <Route path="/trouver" element={<Search />} />
        <Route path="/verifier" element={<VerifyLandingPage />} />
        <Route path="/planifier" element={<DescribeProjectPage />} />
        <Route path="/score-aipp" element={<AIPPScorePage />} />
        <Route path="/plans-prix" element={<PricingPage />} />
        <Route path="/favoris" element={<ProtectedRoute requiredRole="homeowner"><MyPlacementsPage /></ProtectedRoute>} />
        <Route path="/historique" element={<ProtectedRoute requiredRole="homeowner"><HomeownerAppointments /></ProtectedRoute>} />
        <Route path="/estimations-ai" element={<AnswerEnginePage />} />
        <Route path="/classement" element={<AuthorityDashboardPage />} />
        <Route path="/facturation" element={<ProtectedRoute requiredRole="contractor"><ProBilling /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute requiredRole="contractor"><ProAuthorityScore /></ProtectedRoute>} />
        <Route path="/settings-systeme" element={<ProtectedRoute requiredRole="homeowner"><AccountPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute requiredRole="homeowner"><NotificationsPage /></ProtectedRoute>} />
        <Route path="/opportunites" element={<ProtectedRoute requiredRole="contractor"><ProIncomingProjects /></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute requiredRole="homeowner"><MessageCenterPage /></ProtectedRoute>} />
        <Route path="/compte" element={<ProtectedRoute requiredRole="homeowner"><AccountPage /></ProtectedRoute>} />
        <Route path="/connexion-interstice" element={<LoginPageUnpro />} />
        <Route path="/mes-projets" element={<ProtectedRoute requiredRole="homeowner"><DashboardHome /></ProtectedRoute>} />
        <Route path="/mes-rendez-vous" element={<ProtectedRoute requiredRole="homeowner"><HomeownerAppointments /></ProtectedRoute>} />
        <Route path="/immeubles" element={<ProtectedRoute requiredRole="homeowner"><CondoBuildingPage /></ProtectedRoute>} />
        <Route path="/interventions" element={<ProtectedRoute requiredRole="homeowner"><CondoMaintenancePage /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute requiredRole="homeowner"><CondoDocumentsPage /></ProtectedRoute>} />
        <Route path="/loi-16" element={<CondoLoi16Page />} />
        <Route path="/fonds-prevoyance" element={<CondoFondsPage />} />
        <Route path="/rapports" element={<ProtectedRoute requiredRole="homeowner"><CondoReportsPage /></ProtectedRoute>} />
        <Route path="/registre" element={<ProtectedRoute requiredRole="homeowner"><CondoUnitsPage /></ProtectedRoute>} />
        <Route path="/photos-projets" element={<DiscoveryFeedPage />} />
        <Route path="/avis-clients" element={<PageReviewsVerified />} />
        <Route path="/certifications" element={<StaticContentPage slug="nos-standards" />} />
        <Route path="/profil-ai" element={<ProtectedRoute requiredRole="homeowner"><DNAProfilePage /></ProtectedRoute>} />
        <Route path="/alertes" element={<ProtectedRoute requiredRole="homeowner"><NotificationsPage /></ProtectedRoute>} />
        <Route path="/blog" element={<BlogIndexPage />} />
        <Route path="/blog/:slug" element={<BlogArticlePage />} />
        <Route path="/blog/category/:category" element={<BlogIndexPage />} />
        <Route path="/blog/city/:city" element={<BlogIndexPage />} />
        <Route path="/conseils-renovation" element={<BlogPage2 />} />
        <Route path="/journal" element={<JournalIndexPage />} />
        <Route path="/journal/:slug" element={<JournalArticlePage />} />
        <Route path="/admin/journal" element={<AdminProtectedRoute><AdminJournalPage /></AdminProtectedRoute>} />
        <Route path="/faq" element={<PageUnproFAQ25 />} />
        <Route path="/comment-ca-marche" element={<CommentCaMarchePage />} />
        <Route path="/comment-fonctionne-ia" element={<PageHowUnproWorksAI />} />
        <Route path="/roadmap" element={<PageRoadmapFeatures />} />
        <Route path="/couverture" element={<PageCityServiceCoverage />} />
        <Route path="/guides" element={<PageGuidesHomeProblems />} />
        <Route path="/avis-verifies" element={<PageReviewsVerified />} />
        <Route path="/verification" element={<StaticContentPage slug="verification" />} />
        <Route path="/nos-standards" element={<StaticContentPage slug="nos-standards" />} />
        <Route path="/pourquoi-pas-3-soumissions" element={<StaticContentPage slug="pourquoi-pas-3-soumissions" />} />
        <Route path="/a-propos" element={<StaticContentPage slug="a-propos" />} />
        <Route path="/partenaires" element={<PagePartenairesCertifies />} />
        <Route path="/partenaires-certifies" element={<PagePartenairesCertifies />} />
        <Route path="/partenaire" element={<PagePartenairesCertifies />} />
        <Route path="/partenaire/login" element={<PartnerLogin />} />
        <Route path="/cyndia" element={<PagePrivateKeypad slug="cyndia" />} />
        <Route path="/private/:slug" element={<PagePrivateKeypad />} />
        <Route path="/partenaire/devenir-partenaire" element={<PartnerDevenirPartenaire />} />
        <Route path="/partenaire/en-attente" element={<PartnerEnAttente />} />
        <Route path="/partenaire/dashboard" element={<PartnerGuard><PartnerDashboard /></PartnerGuard>} />
        <Route path="/partenaire/nouveau-entrepreneur" element={<PartnerGuard feature="onboarding"><PartnerNouveauEntrepreneur /></PartnerGuard>} />
        <Route path="/partenaire/crm" element={<PartnerGuard feature="crm"><PartnerCrm /></PartnerGuard>} />
        <Route path="/partenaire/leads" element={<PartnerGuard feature="leads"><PartnerCrm /></PartnerGuard>} />
        <Route path="/partenaire/pipeline" element={<PartnerGuard feature="pipeline"><PartnerCrm /></PartnerGuard>} />
        <Route path="/partenaire/rappels" element={<PartnerGuard feature="reminders"><PartnerCrm /></PartnerGuard>} />
        <Route path="/admin/partenaires" element={<AdminProtectedRoute><AdminPartenaires /></AdminProtectedRoute>} />
        <Route path="/admin/partner-applications" element={<AdminProtectedRoute><AdminPartnerApplications /></AdminProtectedRoute>} />
        <Route path="/contact" element={<StaticContentPage slug="contact" />} />
        <Route path="/conditions" element={<StaticContentPage slug="conditions" />} />
        <Route path="/confidentialite" element={<StaticContentPage slug="confidentialite" />} />
        <Route path="/cookies" element={<StaticContentPage slug="cookies" />} />
        <Route path="/sitemap" element={<SeoSitemapPage />} />
        <Route path="/accessibilite" element={<StaticContentPage slug="accessibilite" />} />

        {/* Entrepreneur Onboarding Flow */}
        <Route path="/entrepreneur/onboarding/import" element={<PageOnboardingImport />} />
        <Route path="/entrepreneur/onboarding/analyse" element={<PageOnboardingAnalyse />} />
        <Route path="/entrepreneur/onboarding/plan" element={<PageOnboardingPlan />} />
        <Route path="/entrepreneur/onboarding/payment" element={<PageOnboardingPayment />} />
        <Route path="/entrepreneur/onboarding/success" element={<PageOnboardingSuccess />} />
        <Route path="/entrepreneur/vision-5-ans/:companyId" element={<PageVision5Ans />} />
        <Route path="/entrepreneur/vision-5-ans" element={<PageVision5Ans />} />
        <Route path="/entrepreneur/onboarding/vision-5-ans/:companyId" element={<PageVision5Ans />} />
        <Route path="/entrepreneur/onboarding/vision-5-ans" element={<PageVision5Ans />} />

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
        <Route path="/alex-100m" element={<Alex100MPage />} />
        <Route path="/problemes-maison" element={<ProblemesMaisonPage />} />
        <Route path="/problemes/pyrite-sous-sol" element={<PagePyriteSousSol />} />
        <Route path="/villes-desservies" element={<VillesDesserviesPage />} />
        <Route path="/ville-service/:city/:service" element={<CityServicePage />} />
        <Route path="/professionnels2" element={<ProfessionnelsPage2 />} />
        <Route path="/entretien-preventif" element={<EntretienPreventifPage />} />
        <Route path="/blog2" element={<BlogPage2 />} />

        {/* ─── Condo pages (wired) ─── */}
        <Route path="/condo/passeport" element={<CoproprietePage />} />
        <Route path="/condo/documents" element={<CondoDocumentsPage />} />
        <Route path="/condo/dashboard" element={<CondoDashboardPage />} />
        <Route path="/condo/dossier" element={<CondoBuildingPage />} />
        <Route path="/condo/travaux" element={<CondoMaintenancePage />} />
        <Route path="/condo/historique" element={<CondoReportsPage />} />
        <Route path="/condo/inviter" element={<CondoUnitsPage />} />
        <Route path="/condo/loi-16" element={<CondoLoi16Page />} />
        <Route path="/condo/inspection" element={<CondoIncidentsPage />} />
        <Route path="/condo/guides" element={<PageGuidesHomeProblems />} />

        {/* ─── Pro extra pages (wired) ─── */}
        <Route path="/pro/stats" element={<ProtectedRoute requiredRole="contractor"><ProAuthorityScore /></ProtectedRoute>} />
        <Route path="/pro/visibility" element={<ProtectedRoute requiredRole="contractor"><ProAIPPScore /></ProtectedRoute>} />
        <Route path="/pro/recommendations" element={<ProtectedRoute requiredRole="contractor"><ProMatchedLeads /></ProtectedRoute>} />
        <Route path="/dashboard/maintenance" element={<ProtectedRoute requiredRole="homeowner"><PreventiveMaintenancePage /></ProtectedRoute>} />

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
        <Route path="/dashboard/projects/:projectId/waiting" element={<ProtectedRoute requiredRole="homeowner"><ProjectWaitingPage /></ProtectedRoute>} />
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
        <Route path="/profil-entrepreneur/:token" element={<PageContractorProfileInvite />} />
        <Route path="/pro/compatibilite" element={<ProtectedRoute requiredRole="contractor"><PageContractorCompatibility /></ProtectedRoute>} />

        <Route path="/pro/teams" element={<ProtectedRoute requiredRole="contractor"><ProTeams /></ProtectedRoute>} />
        <Route path="/pro/emergency-settings" element={<ProtectedRoute requiredRole="contractor"><ProEmergencySettings /></ProtectedRoute>} />
        <Route path="/pro/domain-intelligence" element={<ProtectedRoute requiredRole="contractor"><ProDomainIntelligence /></ProtectedRoute>} />
        <Route path="/pro/qr-performance" element={<ProtectedRoute requiredRole="contractor"><MyQRPerformancePage /></ProtectedRoute>} />
        <Route path="/pro/matched-leads" element={<ProtectedRoute requiredRole="contractor"><ProMatchedLeads /></ProtectedRoute>} />
        <Route path="/pro/notifications" element={<ProtectedRoute requiredRole="contractor"><NotificationsPage /></ProtectedRoute>} />
        <Route path="/pro/setup" element={<ProtectedRoute requiredRole="contractor"><ProSetupWizard /></ProtectedRoute>} />
        <Route path="/pro/booking-settings" element={<ProtectedRoute requiredRole="contractor"><BookingSettingsPage /></ProtectedRoute>} />

        {/* Growth · Review Intelligence™ (landing route lives above /pro/:slug) */}
        <Route path="/pro/growth/reviews" element={<ProtectedRoute requiredRole="contractor"><Suspense fallback={<LazyFallback />}><PageReviewsDashboard /></Suspense></ProtectedRoute>} />
        <Route path="/review/:token" element={<Suspense fallback={<LazyFallback />}><PageReviewFlow /></Suspense>} />



        {/* Admin */}
        <Route path="/admin/menu-intelligence" element={<AdminProtectedRoute><MenuIntelligenceAdminPage /></AdminProtectedRoute>} />
        <Route path="/admin/handoff-analytics" element={<AdminProtectedRoute><PageAdminHandoffAnalytics /></AdminProtectedRoute>} />
        <Route path="/admin/emails" element={<AdminProtectedRoute><PageAdminEmailLogs /></AdminProtectedRoute>} />
        <Route path="/admin/campaign-center" element={<AdminProtectedRoute><PageCampaignCenter /></AdminProtectedRoute>} />
        <Route path="/admin/campaign-logs" element={<AdminProtectedRoute><PageCampaignLogs /></AdminProtectedRoute>} />
        <Route path="/admin/manual-test-send" element={<AdminProtectedRoute><PageAdminManualTestSend /></AdminProtectedRoute>} />
        <Route path="/admin/challenge-tracker" element={<AdminProtectedRoute><PageChallengeTracker /></AdminProtectedRoute>} />
        <Route path="/admin/email-templates" element={<AdminProtectedRoute><PageAdminEmailTemplates /></AdminProtectedRoute>} />
        <Route path="/admin/aeo" element={<AdminProtectedRoute><PageAdminAeoCockpit /></AdminProtectedRoute>} />
        <Route path="/admin/alex/voice-lab" element={<AdminProtectedRoute><PageVoiceLab /></AdminProtectedRoute>} />
        <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/launch-war-room" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><AdminLaunchWarRoom /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/ai-revenue-proof" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAiRevenueProof /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/launch-control" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminLaunchControl /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/critical-path-audit" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminCriticalPathAudit /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/ui-health" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><AdminUIHealthMonitor /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/google-project-audit" element={<AdminProtectedRoute><PageGoogleProjectUsageAudit /></AdminProtectedRoute>} />
        <Route path="/admin/omega" element={<AdminProtectedRoute><PageAdminOmega /></AdminProtectedRoute>} />
        <Route path="/admin/activation" element={<AdminProtectedRoute><PageAdminEntrepreneurActivation /></AdminProtectedRoute>} />
        <Route path="/admin/concierge" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageConciergeCockpit /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/autonomous-engine" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAutonomousEngine /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/users" element={<AdminProtectedRoute><AdminUsers /></AdminProtectedRoute>} />
        <Route path="/admin/contractors" element={<AdminProtectedRoute><AdminContractors /></AdminProtectedRoute>} />
        <Route path="/admin/ai-trust" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAiTrustDashboard /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/ai-trust/territory" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAiTrustTerritory /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/acquisition" element={<AdminProtectedRoute><PageAdminAcquisition /></AdminProtectedRoute>} />
        <Route path="/admin/acquisition-machine" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAcquisitionMachine /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/acquisition/duplicates" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAcquisitionDuplicates /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/acquisition/pipeline" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAcquisitionPipeline /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/acquisition/errors" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAcquisitionErrors /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/acquisition/engagement" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAcquisitionEngagement /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/acquisition/stripe" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAcquisitionStripe /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/acquisition/activation" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAcquisitionActivation /></Suspense></AdminProtectedRoute>} />
        <Route path="/contractor/ai-score/:prospectId" element={<Suspense fallback={<LazyFallback />}><PageContractorAIScoreLanding /></Suspense>} />
        <Route path="/aipp/:slug" element={<PageAippPublic />} />
        <Route path="/ai-indexed-profiles/:slug" element={<PageAiIndexedProfile />} />
        <Route path="/ai/:slug" element={<Suspense fallback={<LazyFallback />}><PageAiEntity /></Suspense>} />
        <Route path="/admin/ai-entities" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAiEntities /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/smart-context" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminSmartContext /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/plans-matrix" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminPlansMatrix /></Suspense></AdminProtectedRoute>} />

        <Route path="/admin/aipp-import" element={<AdminProtectedRoute><PageAippImport /></AdminProtectedRoute>} />
        <Route path="/admin/aipp-profiles" element={<AdminProtectedRoute><PageAippProfiles /></AdminProtectedRoute>} />
        <Route path="/contractor/aipp-cockpit" element={<ProtectedRoute><PageContractorAippCockpit /></ProtectedRoute>} />
        <Route path="/activation/:slug" element={<PageAcqActivation />} />
        {/* Duplicate route removed — `/activation-success` is registered above (line 1042). */}
        <Route path="/admin/war-room" element={<AdminProtectedRoute><PageAdminWarRoom /></AdminProtectedRoute>} />
        <Route path="/admin/contractors/create-manual" element={<AdminProtectedRoute><PageAdminCreateContractorManual /></AdminProtectedRoute>} />
        <Route path="/admin/contractors/:id/compatibilite" element={<AdminProtectedRoute><PageContractorCompatibility /></AdminProtectedRoute>} />
        <Route path="/admin/contractors/:id" element={<AdminProtectedRoute><AdminContractorDetail /></AdminProtectedRoute>} />

        <Route path="/admin/quotes" element={<AdminProtectedRoute><AdminQuotes /></AdminProtectedRoute>} />
        <Route path="/admin/reviews" element={<AdminProtectedRoute><AdminReviews /></AdminProtectedRoute>} />
        <Route path="/admin/documents" element={<AdminProtectedRoute><AdminDocuments /></AdminProtectedRoute>} />
        <Route path="/admin/appointments" element={<AdminProtectedRoute><AdminAppointments /></AdminProtectedRoute>} />
        <Route path="/admin/leads" element={<AdminProtectedRoute><AdminLeads /></AdminProtectedRoute>} />
        <Route path="/admin/war-prospecting" element={<AdminProtectedRoute><AdminWarProspecting /></AdminProtectedRoute>} />
        <Route path="/admin/territories" element={<AdminProtectedRoute><AdminTerritories /></AdminProtectedRoute>} />
        <Route path="/admin/growth" element={<AdminProtectedRoute><AdminGrowth /></AdminProtectedRoute>} />
        <Route path="/admin/agents" element={<AdminProtectedRoute><AdminAgents /></AdminProtectedRoute>} />
        <Route path="/admin/live-agents" element={<AdminProtectedRoute><PageAdminLiveAgents /></AdminProtectedRoute>} />
        <Route path="/admin/media" element={<AdminProtectedRoute><AdminMedia /></AdminProtectedRoute>} />
        <Route path="/admin/validation" element={<AdminProtectedRoute><AdminValidation /></AdminProtectedRoute>} />
        <Route path="/admin/answer-engine" element={<AdminProtectedRoute><AdminAnswerEngine /></AdminProtectedRoute>} />
        <Route path="/admin/operations" element={<AdminProtectedRoute><AdminOperationsHub /></AdminProtectedRoute>} />
        <Route path="/admin/waiting-homeowners" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminWaitingHomeowners /></Suspense></AdminProtectedRoute>} />
        <Route path="/pro/demande/:city/:category" element={<Suspense fallback={<LazyFallback />}><PageContractorDemandLanding /></Suspense>} />
        <Route path="/admin/founder-verification" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageFounderVerification /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/pricing-intelligence" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminPricingIntelligence /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/unpro-stripe-health" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminUnproStripeHealth /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/system-mode" element={<AdminProtectedRoute><PageSystemModeControlCenter /></AdminProtectedRoute>} />
        <Route path="/admin/verification" element={<AdminProtectedRoute><AdminVerificationRuns /></AdminProtectedRoute>} />
        <Route path="/admin/verification/:id" element={<AdminProtectedRoute><AdminVerificationRunDetail /></AdminProtectedRoute>} />
        <Route path="/admin/alerts" element={<AdminProtectedRoute><AdminAlerts /></AdminProtectedRoute>} />
        <Route path="/admin/nav-analytics" element={<AdminProtectedRoute><AdminNavAnalytics /></AdminProtectedRoute>} />
        <Route path="/admin/verified-contractors" element={<AdminProtectedRoute><AdminVerifiedContractors /></AdminProtectedRoute>} />
        <Route path="/admin/acquisition-pipeline" element={<AdminProtectedRoute><PageAdminAcquisitionPipelineNew /></AdminProtectedRoute>} />
        <Route path="/admin/acquisition-diagnostics" element={<AdminProtectedRoute><PageAdminAcquisitionDiagnostics /></AdminProtectedRoute>} />
        <Route path="/admin/import-contractors" element={<AdminProtectedRoute><PageAdminImportContractors /></AdminProtectedRoute>} />
        <Route path="/admin/duplicates" element={<AdminProtectedRoute><AdminDuplicates /></AdminProtectedRoute>} />
        <Route path="/admin/automation" element={<AdminProtectedRoute><AdminAutomation /></AdminProtectedRoute>} />
        <Route path="/admin/automation-command-center" element={<AdminProtectedRoute><PageAdminAutomationCommandCenter /></AdminProtectedRoute>} />
        <Route path="/admin/go-live" element={<AdminProtectedRoute><PageAdminGoLive /></AdminProtectedRoute>} />
        <Route path="/admin/go-live/verification" element={<AdminProtectedRoute><PageAdminGoLiveVerification /></AdminProtectedRoute>} />
        <Route path="/admin/go-live/incidents" element={<AdminProtectedRoute><PageAdminGoLiveIncidents /></AdminProtectedRoute>} />
        <Route path="/admin/go-live/e2e-tests" element={<AdminProtectedRoute><PageAdminGoLiveE2ETests /></AdminProtectedRoute>} />
        <Route path="/admin/go-live/function-health" element={<AdminProtectedRoute><PageAdminGoLiveFunctionHealth /></AdminProtectedRoute>} />
        <Route path="/admin/go-live/payment-health" element={<AdminProtectedRoute><PageAdminGoLivePaymentHealth /></AdminProtectedRoute>} />
        <Route path="/admin/navigation" element={<AdminProtectedRoute><PageAdminNavigation /></AdminProtectedRoute>} />
        <Route path="/admin/aipp-v2" element={<AdminProtectedRoute><PageAdminAIPPv2Dashboard /></AdminProtectedRoute>} />
        <Route path="/admin/aipp-debug" element={<AdminProtectedRoute><PageAippDebug /></AdminProtectedRoute>} />
        <Route path="/admin/mission-control" element={<AdminProtectedRoute><PageMissionControl /></AdminProtectedRoute>} />
        <Route path="/contractor/aipp-audit/:contractorId" element={<PageContractorAippAudit />} />
        <Route path="/admin/home-graph" element={<AdminProtectedRoute><AdminHomeGraph /></AdminProtectedRoute>} />
        <Route path="/admin/uos" element={<AdminProtectedRoute><AdminUOS /></AdminProtectedRoute>} />
        <Route path="/admin/qa-simulation" element={<AdminProtectedRoute><PageAdminQASimulation /></AdminProtectedRoute>} />
        <Route path="/admin/qa-simulation/run/:runId" element={<AdminProtectedRoute><PageAdminQASimulationRun /></AdminProtectedRoute>} />
        <Route path="/admin/qa-simulation/templates" element={<AdminProtectedRoute><PageAdminQASimulationTemplates /></AdminProtectedRoute>} />
        <Route path="/admin/growth-engine" element={<AdminProtectedRoute><AdminGrowthEngine /></AdminProtectedRoute>} />
        <Route path="/admin/growth-os" element={<AdminProtectedRoute><AdminGrowthOS /></AdminProtectedRoute>} />
        <Route path="/admin/growth-live-monitor" element={<AdminProtectedRoute><AdminGrowthLiveMonitor /></AdminProtectedRoute>} />
        <Route path="/pro/growth" element={<ProtectedRoute><ContractorGrowth /></ProtectedRoute>} />
        <Route path="/admin/pricing" element={<AdminProtectedRoute><AdminPricingPage /></AdminProtectedRoute>} />
        <Route path="/admin/coupons" element={<AdminProtectedRoute><AdminCoupons /></AdminProtectedRoute>} />
        <Route path="/admin/plan-distribution" element={<AdminProtectedRoute><PageAdminPlanDistribution /></AdminProtectedRoute>} />
        <Route path="/admin/plan-appointments" element={<AdminProtectedRoute><PageAdminPlanAppointmentsControl /></AdminProtectedRoute>} />
        <Route path="/admin/cluster-project-size-matrix" element={<AdminProtectedRoute><PageAdminClusterPlanProjectSizeMatrix /></AdminProtectedRoute>} />
        <Route path="/admin/project-size-extensions" element={<AdminProtectedRoute><PageAdminProjectSizeExtensions /></AdminProtectedRoute>} />
        <Route path="/pro/plan-usage" element={<ProtectedRoute><PageEntrepreneurPlanUsage /></ProtectedRoute>} />
        <Route path="/admin/refusal-seo" element={<AdminProtectedRoute><AdminRefusalSeoPage /></AdminProtectedRoute>} />
        <Route path="/admin/ads-engine" element={<AdminProtectedRoute><AdminAdsEngine /></AdminProtectedRoute>} />
        <Route path="/admin/demand-grid" element={<AdminProtectedRoute><AdminDemandGrid /></AdminProtectedRoute>} />
        <Route path="/admin/sales-psychology" element={<AdminProtectedRoute><AdminSalesPsychology /></AdminProtectedRoute>} />
        <Route path="/admin/reward-rules" element={<AdminProtectedRoute><AdminRewardRules /></AdminProtectedRoute>} />
        <Route path="/admin/deep-link-analytics" element={<AdminProtectedRoute><AdminDeepLinkAnalytics /></AdminProtectedRoute>} />
        <Route path="/admin/ai-growth" element={<AdminProtectedRoute><AdminAIGrowthInsights /></AdminProtectedRoute>} />
        <Route path="/admin/seo-generator" element={<AdminProtectedRoute><AdminSeoGenerator /></AdminProtectedRoute>} />
        <Route path="/admin/seo-autopilot" element={<AdminProtectedRoute><PageSeoAutopilot /></AdminProtectedRoute>} />
        <Route path="/admin/pr-loop" element={<AdminProtectedRoute><PagePrLoop /></AdminProtectedRoute>} />
        <Route path="/admin/ai-dashboard" element={<AdminProtectedRoute><AdminAIGrowthDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/campaign-lab" element={<AdminProtectedRoute><AdminCampaignLab /></AdminProtectedRoute>} />
        <Route path="/admin/autopilot" element={<AdminProtectedRoute><AdminAutopilotDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/seo-domination" element={<AdminProtectedRoute><AdminSeoDominationDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/market-engine" element={<AdminProtectedRoute><AdminMarketEngine /></AdminProtectedRoute>} />
        <Route path="/admin/nexus" element={<AdminProtectedRoute><AdminNexusDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/dispatch-center" element={<AdminProtectedRoute><AdminDispatchCenter /></AdminProtectedRoute>} />
        <Route path="/admin/commercial-eligibility" element={<AdminProtectedRoute><AdminCommercialEligibility /></AdminProtectedRoute>} />
        <Route path="/admin/official-site-enrichment" element={<AdminProtectedRoute><AdminOfficialSiteEnrichment /></AdminProtectedRoute>} />
        <Route path="/admin/official-acquisition" element={<AdminProtectedRoute><AdminOfficialAcquisition /></AdminProtectedRoute>} />

        <Route path="/admin/solicitation" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><AdminSolicitationPage /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/outreach-errors" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminOutreachErrors /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/provider-health" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminProviderHealth /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/contractors-contacted" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminContractorsContacted /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/domain-intelligence" element={<AdminProtectedRoute><AdminDomainIntelligence /></AdminProtectedRoute>} />
        <Route path="/admin/domain-health" element={<AdminProtectedRoute><PageDomainHealthDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/alex-guardrails" element={<AdminProtectedRoute><PageAdminAlexConversationRules /></AdminProtectedRoute>} />
        <Route path="/admin/alex-debug" element={<AdminProtectedRoute><PageAdminAlexDebugHome /></AdminProtectedRoute>} />
        <Route path="/admin/alex-speech-tuning" element={<AdminProtectedRoute><PageAdminAlexSpeechTuning /></AdminProtectedRoute>} />
        <Route path="/admin/alex-voice-admin" element={<AdminProtectedRoute><AlexVoiceAdmin /></AdminProtectedRoute>} />
        <Route path="/admin/seo-articles" element={<AdminProtectedRoute><AdminSeoArticles /></AdminProtectedRoute>} />
        <Route path="/admin/bulk-articles" element={<AdminProtectedRoute><AdminBulkArticlesPage /></AdminProtectedRoute>} />
        <Route path="/admin/founder-invites" element={<AdminProtectedRoute><AdminFounderInvites /></AdminProtectedRoute>} />
        <Route path="/admin/prospects" element={<AdminProtectedRoute><AdminProspects /></AdminProtectedRoute>} />
        <Route path="/admin/prospects/import" element={<AdminProtectedRoute><AdminProspectImport /></AdminProtectedRoute>} />
        <Route path="/admin/prospects/campaigns" element={<AdminProtectedRoute><AdminProspectCampaigns /></AdminProtectedRoute>} />
        <Route path="/admin/roadmap-execution" element={<AdminProtectedRoute><AdminRoadmapExecution /></AdminProtectedRoute>} />
        <Route path="/admin/screenshot-analytics" element={<AdminProtectedRoute><AdminScreenshotAnalyticsPage /></AdminProtectedRoute>} />
        <Route path="/admin/screenshot-friction" element={<AdminProtectedRoute><AdminScreenshotFrictionPage /></AdminProtectedRoute>} />
        <Route path="/admin/screenshot-alerts" element={<AdminProtectedRoute><AdminScreenshotAlertsPage /></AdminProtectedRoute>} />
        <Route path="/admin/screenshot-insights" element={<AdminProtectedRoute><AdminScreenshotInsightsPage /></AdminProtectedRoute>} />
        <Route path="/admin/optimization" element={<AdminProtectedRoute><AdminOptimizationDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/experiments" element={<AdminProtectedRoute><AdminExperimentsPage /></AdminProtectedRoute>} />
        <Route path="/admin/experiments/:id" element={<AdminProtectedRoute><AdminExperimentDetailPage /></AdminProtectedRoute>} />
        <Route path="/admin/optimization/recommendations" element={<AdminProtectedRoute><AdminOptimizationRecommendations /></AdminProtectedRoute>} />
        <Route path="/admin/optimization/winners" element={<AdminProtectedRoute><AdminWinningVariantsPage /></AdminProtectedRoute>} />
        <Route path="/admin/predictive-leads" element={<AdminProtectedRoute><AdminPredictiveLeads /></AdminProtectedRoute>} />
        <Route path="/admin/dynamic-pricing-market" element={<AdminProtectedRoute><AdminDynamicMarketPricing /></AdminProtectedRoute>} />
        <Route path="/admin/predictive-market-board" element={<AdminProtectedRoute><AdminPredictiveMarketBoard /></AdminProtectedRoute>} />
        <Route path="/admin/zone-value" element={<AdminProtectedRoute><AdminZoneValueMap /></AdminProtectedRoute>} />
        <Route path="/admin/voice-control" element={<AdminProtectedRoute><AdminVoiceControlPage /></AdminProtectedRoute>} />
        <Route path="/admin/voice-optimizer" element={<AdminProtectedRoute><AdminVoiceOptimizerPage /></AdminProtectedRoute>} />
        <Route path="/admin/voice-optimizer/:id" element={<AdminProtectedRoute><AdminVoiceOptimizerPage /></AdminProtectedRoute>} />
        <Route path="/admin/voice-pronunciation" element={<AdminProtectedRoute><PageAdminVoicePronunciation /></AdminProtectedRoute>} />
        <Route path="/admin/brand-pronunciation" element={<AdminProtectedRoute><PageAdminBrandPronunciation /></AdminProtectedRoute>} />
        <Route path="/admin/alex/voice" element={<AdminProtectedRoute><PageAdminAlexVoice /></AdminProtectedRoute>} />
        <Route path="/admin/alex/voice/tests" element={<AdminProtectedRoute><PageAdminAlexVoice /></AdminProtectedRoute>} />
        <Route path="/admin/alex/context" element={<AdminProtectedRoute><PageAdminAlexContext /></AdminProtectedRoute>} />
        <Route path="/admin/alex/analytics" element={<AdminProtectedRoute><PageAdminAlexAnalytics /></AdminProtectedRoute>} />
        <Route path="/admin/alex/fallbacks" element={<AdminProtectedRoute><PageAdminAlexVoice /></AdminProtectedRoute>} />
        <Route path="/admin/voice-health" element={<AdminProtectedRoute><PageVoiceHealth /></AdminProtectedRoute>} />
        <Route path="/admin/sms-health" element={<AdminProtectedRoute><PageSmsHealth /></AdminProtectedRoute>} />
        <Route path="/admin/system-time" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminSystemTime /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/system-integrity" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminSystemIntegrity /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/onboarding-orchestrator" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminOnboardingOrchestrator /></Suspense></AdminProtectedRoute>} />
        <Route path="/ia/:slug" element={<PageCuriosityLanding />} />
        <Route path="/admin/outbound/send-windows" element={<AdminProtectedRoute><PageSendWindowPolicy /></AdminProtectedRoute>} />
        <Route path="/admin/system-health/alex-voice" element={<AdminProtectedRoute><PageVoiceHealth /></AdminProtectedRoute>} />
        <Route path="/admin/no-match-monitoring" element={<AdminProtectedRoute><PageAdminNoMatchMonitoring /></AdminProtectedRoute>} />
        <Route path="/admin/content-guard" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminContentGuard /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/ai-visibility-audit" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAiVisibilityAudit /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/acquisition-funnel" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAcquisitionFunnel /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/founder-pipeline" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminFounderPipeline /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/revenue-intelligence" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminRevenueIntelligence /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/acquisition/sms-sprint" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminSmsSprint /></Suspense></AdminProtectedRoute>} />
        <Route path="/activer/:slug" element={<Suspense fallback={<LazyFallback />}><PageActivationSprint /></Suspense>} />
        <Route path="/activer/:slug/succes" element={<Suspense fallback={<LazyFallback />}><PageActivationSprint /></Suspense>} />
        <Route path="/admin/content-audit" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminContentAudit /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/acquisition-tests" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAcquisitionTests /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/revenue-gate-audit" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminRevenueGateAudit /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/revenue-path-audit" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminRevenuePathAudit /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/tunnel-reality" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageTunnelReality /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/dispatch-bottleneck" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminDispatchBottleneck /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/recovery-sprint" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminRecoverySprint /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/normalization" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminNormalization /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/operations-health" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminOperationsHealth /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/crm" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminCRM /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/scout" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminScout /></Suspense></AdminProtectedRoute>} />





        <Route path="/admin/ops" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminOps /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/site-health" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminSiteHealth /></Suspense></AdminProtectedRoute>} />

        <Route path="/admin/email-cta-audit" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminEmailCtaAudit /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/outreach-health" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminOutreachHealth /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/email-sender-health" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminEmailSenderHealth /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/sales-analytics" element={<AdminProtectedRoute><AdminSalesAnalyticsPage /></AdminProtectedRoute>} />
        <Route path="/entrepreneur/sales" element={<EntrepreneurVoiceSalesPage />} />
        <Route path="/homeowner/voice" element={<HomeownerVoiceEntryPage />} />
        <Route path="/admin/homeowner-analytics" element={<AdminProtectedRoute><AdminHomeownerAnalyticsPage /></AdminProtectedRoute>} />
        <Route path="/alex/predictive-seller" element={<PageAlexPredictiveSeller />} />
        <Route path="/signature" element={<PageAlexGuidedOnboarding />} />
        <Route path="/admin/prospection" element={<AdminProtectedRoute><AdminProspectionEngine /></AdminProtectedRoute>} />
        <Route path="/admin/prospection-engine" element={<AdminProtectedRoute><PageProspectionDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/prospection/prospects" element={<AdminProtectedRoute><AdminProspectionProspects /></AdminProtectedRoute>} />
        <Route path="/admin/prospection/analytics" element={<AdminProtectedRoute><AdminProspectionAnalytics /></AdminProtectedRoute>} />
        <Route path="/admin/city-activity-matrix" element={<AdminProtectedRoute><PageAdminCityActivityMatrix /></AdminProtectedRoute>} />
        <Route path="/admin/services-secondaires" element={<AdminProtectedRoute><PageAdminActivitiesSecondaryManager /></AdminProtectedRoute>} />
        <Route path="/alex-landing" element={<PageAlexPersonalizedLanding />} />
        <Route path="/admin/outreach" element={<AdminProtectedRoute><AdminOutreachDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/outreach/new" element={<AdminProtectedRoute><AdminOutreachCampaignNew /></AdminProtectedRoute>} />
        <Route path="/admin/outreach/:id" element={<AdminProtectedRoute><AdminOutreachCampaignDetail /></AdminProtectedRoute>} />
        <Route path="/admin/outreach/templates" element={<AdminProtectedRoute><AdminOutreachTemplates /></AdminProtectedRoute>} />
        <Route path="/admin/outreach/analytics" element={<AdminProtectedRoute><AdminOutreachAnalytics /></AdminProtectedRoute>} />
        <Route path="/admin/contact-verification" element={<AdminProtectedRoute><AdminContactVerification /></AdminProtectedRoute>} />
        <Route path="/admin/outbound" element={<AdminProtectedRoute><PageOutboundControlTower /></AdminProtectedRoute>} />
        <Route path="/admin/autopilot-mvp" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAutopilotMvp /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/autopilot-mvp/run/:runId" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAutopilotRunDetail /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/outbound/legacy" element={<AdminProtectedRoute><PageOutboundDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/test-center" element={<AdminProtectedRoute><PageOutboundTestCenter /></AdminProtectedRoute>} />
        <Route path="/admin/outreach-live" element={<AdminProtectedRoute><PageOutreachLive /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/campaigns" element={<AdminProtectedRoute><PageOutboundCampaigns /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/leads" element={<AdminProtectedRoute><PageOutboundLeadsQueue /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/leads/:id" element={<AdminProtectedRoute><PageOutboundLeadProfile /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/sequences" element={<AdminProtectedRoute><PageOutboundSequences /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/mailboxes" element={<AdminProtectedRoute><PageOutboundMailboxes /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/analytics" element={<AdminProtectedRoute><PageOutboundAnalytics /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/suppressions" element={<AdminProtectedRoute><PageOutboundSuppressionCenter /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/landing-pages" element={<AdminProtectedRoute><PageOutboundLandingPages /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/landing-funnel" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminOutboundLandingFunnel /></Suspense></AdminProtectedRoute>} />
        <Route path="/pro/diagnostic/:slug" element={<Suspense fallback={<LazyFallback />}><PageOutboundLanding /></Suspense>} />
        <Route path="/pro/diagnostic/:slug/merci" element={<Suspense fallback={<LazyFallback />}><PageOutboundLandingSuccess /></Suspense>} />
        <Route path="/admin/outbound/ops" element={<AdminProtectedRoute><PageOutboundOpsCenter /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/replies" element={<AdminProtectedRoute><PageOutboundReplies /></AdminProtectedRoute>} />
        <Route path="/admin/communications" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminCommunications /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/outbound/verification" element={<AdminProtectedRoute><PageOutboundVerification /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/tests" element={<AdminProtectedRoute><PageOutboundTests /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/automations" element={<AdminProtectedRoute><PageOutboundAutomations /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/logs" element={<AdminProtectedRoute><PageOutboundLogs /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/settings-lite" element={<AdminProtectedRoute><PageOutboundSettingsLite /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/email-health" element={<AdminProtectedRoute><PageOutboundEmailHealth /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/sequences-elite" element={<AdminProtectedRoute><PageOutboundSequencesElite /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/sending-architecture" element={<AdminProtectedRoute><PageOutboundSendingArchitecture /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/deliverability" element={<AdminProtectedRoute><PageOutboundDeliverability /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/ai-rewrite" element={<AdminProtectedRoute><PageOutboundAIRewrite /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/revenue" element={<AdminProtectedRoute><PageOutboundRevenue /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/sms-fallback" element={<AdminProtectedRoute><PageOutboundSMSFallback /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/campaigns/new" element={<AdminProtectedRoute><PageCampaignBuilderAutonomous /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/runs" element={<AdminProtectedRoute><PagePipelineCommandCenterOutbound /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/runs/:runId" element={<AdminProtectedRoute><PageRunDetailsAgentExecution /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/blockers" element={<AdminProtectedRoute><PageBlockedItemsRecoveryQueue /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/health" element={<AdminProtectedRoute><PageSystemHealthDependencies /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/runs-legacy" element={<AdminProtectedRoute><PageRunMonitorAutonomous /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/settings" element={<AdminProtectedRoute><PageOutboundSettingsAutonomous /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/targets" element={<AdminProtectedRoute><PageOutboundTargetListInbox /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/targets/review" element={<AdminProtectedRoute><PageOutboundTargetReviewQueue /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/autopilot/runs" element={<AdminProtectedRoute><PageOutboundAutopilotRuns /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/cities" element={<AdminProtectedRoute><PageCityFirstTargetHub /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/cities/:slug" element={<AdminProtectedRoute><PageCityExecutionMonitor /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/diagnostics" element={<AdminProtectedRoute><PageRunDiagnostics /></AdminProtectedRoute>} />
        <Route path="/admin/outbound/sniper" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageSniperPipeline /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/outbound/sms" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageSMSPipeline /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/execution-control" element={<AdminProtectedRoute><PageAdminExecutionControl /></AdminProtectedRoute>} />
        <Route path="/admin/dominance" element={<AdminProtectedRoute><PageAdminDominanceControl /></AdminProtectedRoute>} />
        <Route path="/admin/voice-debug" element={<AdminProtectedRoute><PageAlexVoiceDebugAdmin /></AdminProtectedRoute>} />
        <Route path="/admin/alex-prompt-rules" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAlexPromptRulesAdmin /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/alex-conversation-debug" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAlexConversationDebugAdmin /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/alex-knowledge-plans" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAlexKnowledgePlans /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/alex-response-audit" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAlexResponseAudit /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/sms-images" element={<AdminProtectedRoute><PageAdminSMSImageTemplates /></AdminProtectedRoute>} />
        <Route path="/admin/brand" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminBrandSettings /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/brand-intelligence/logos" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminBrandLogos /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/capacity-framework" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminCapacityFramework /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/share-images" element={<AdminProtectedRoute><PageShareImageDashboard /></AdminProtectedRoute>} />
        <Route path="/admin/share-images/generate" element={<AdminProtectedRoute><PageShareImageGenerate /></AdminProtectedRoute>} />
        <Route path="/admin/share-images/templates" element={<AdminProtectedRoute><PageShareImageTemplates /></AdminProtectedRoute>} />
        <Route path="/admin/share-images/history" element={<AdminProtectedRoute><PageShareImageHistory /></AdminProtectedRoute>} />
        <Route path="/admin/share-images/preview" element={<AdminProtectedRoute><PageShareImagePreview /></AdminProtectedRoute>} />
        <Route path="/admin/extraction" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminExtractionQueue /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/facebook-extraction" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageFacebookExtractionEngine /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/extraction/coverage" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminCoverageCityDomain /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/outbound/approvals" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminOutboundApprovals /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/outbound/auto-flagging" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminOutboundAutoFlagging /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/prospect-execution" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminProspectExecutionDashboard /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/prospect-execution/:runId" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminProspectExecutionRunDetail /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/affiliates" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAffiliatesHub /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/affiliates/dashboard" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAffiliateDashboard /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/affiliates/assign" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAffiliateAssignment /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/affiliates/attribution" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAffiliateAttribution /></Suspense></AdminProtectedRoute>} />
        <Route path="/affiliate" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><PageAffiliateActionMode /></Suspense></ProtectedRoute>} />
        <Route path="/affiliate/crm" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><PageAffiliateWarRoom /></Suspense></ProtectedRoute>} />
        <Route path="/affiliate/company/:id" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><PageAffiliateCompanyWorkspace /></Suspense></ProtectedRoute>} />
        <Route path="/affiliate/prospects/import" element={<ProtectedRoute><Suspense fallback={<LazyFallback />}><PageAffiliateProspectImport /></Suspense></ProtectedRoute>} />
        <Route path="/affiliate/login" element={<Suspense fallback={<LazyFallback />}><PageAffiliateLogin /></Suspense>} />
        <Route path="/go/:slug" element={<Suspense fallback={<LazyFallback />}><PageAffiliateShortLink /></Suspense>} />
        <Route path="/admin/affiliates/new" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminAffiliateNew /></Suspense></AdminProtectedRoute>} />
        <Route path="/affilie" element={<Navigate to="/affilies" replace />} />
        <Route path="/affilies" element={<Suspense fallback={<LazyFallback />}><PageAffiliesPublic /></Suspense>} />
        <Route path="/affilies/onboarding" element={<Suspense fallback={<LazyFallback />}><PageAffiliateOnboarding /></Suspense>} />
        <Route path="/affilies/activer" element={<Navigate to="/affilies/onboarding" replace />} />
        <Route path="/a/:slug" element={<Suspense fallback={<LazyFallback />}><PageAffiliePublicProfile /></Suspense>} />
        <Route path="/lorraine" element={<Navigate to="/a/lorraine" replace />} />
        <Route path="/admin/email-health" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageEmailHealthCenterV2 /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/email-health-legacy" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageEmailAuditCenter /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/email-audit-history" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageEmailAuditHistory /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/email-control-center" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminEmailControlCenter /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/email-warmup" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminEmailWarmup /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/email-delivery-logs" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminEmailDeliveryLogs /></Suspense></AdminProtectedRoute>} />
        <Route path="/admin/acquisition-pipeline-legacy" element={<AdminProtectedRoute><Suspense fallback={<LazyFallback />}><PageAdminPipelineProspects /></Suspense></AdminProtectedRoute>} />
        <Route path="/services/:entitySlug/:citySlug" element={<PageServiceEntityLanding />} />
        <Route path="/audit/:slug" element={<AuditLandingPage />} />
        <Route path="/articles" element={<PageArticlesRecentCompressedFeed />} />
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

         {/* Autonomous Recruitment Engine — Command Pages */}
         <Route path="/admin/recruitment-command-center" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminRecruitmentCommandCenter /></UniversalRouteGuard>} />
         <Route path="/admin/data-extraction-monitor" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminDataExtractionMonitor /></UniversalRouteGuard>} />
         <Route path="/admin/email-campaigns" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminEmailCampaigns /></UniversalRouteGuard>} />
         <Route path="/admin/contractor-conversion-funnel" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminContractorConversionFunnel /></UniversalRouteGuard>} />

         {/* 36h Strike Engine */}
         <Route path="/admin/36h-strike-dashboard" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdmin36hStrikeDashboard /></UniversalRouteGuard>} />
         <Route path="/admin/strike-live-feed" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminStrikeLiveFeed /></UniversalRouteGuard>} />
         <Route path="/admin/strike-adjustments" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminStrikeAdjustments /></UniversalRouteGuard>} />

         {/* Stripe Live Verification */}
         <Route path="/admin/stripe-verification" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAdminStripeVerificationCenter /></UniversalRouteGuard>} />

         {/* Autonomous Acquisition Engine */}
         <Route path="/admin/acquisition-engine" element={<UniversalRouteGuard allowedRoles={["admin"]}><PageAgentAcquisitionMonitoring /></UniversalRouteGuard>} />
         <Route path="/contractor/score/:token" element={<PageLandingContractorDynamicScore />} />

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
         <Route path="/join" element={<Suspense fallback={<LazyFallback />}><PageContractorJoinPublic /></Suspense>} />
         {/* IMPORTANT: /join/profile MUST come before /join/:token so the literal wins */}
         <Route path="/join/profile" element={<Suspense fallback={<LazyFallback />}><PageContractorJoinProfileGate /></Suspense>} />
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

        {/* Calendar Connection Module */}
        <Route path="/calendar/connect" element={<Suspense fallback={<LazyFallback />}><PageCalendarConnectionHub /></Suspense>} />
        <Route path="/calendar/connect/success" element={<Suspense fallback={<LazyFallback />}><PageCalendarConnectionSuccess /></Suspense>} />
        <Route path="/calendar/connect/failure" element={<Suspense fallback={<LazyFallback />}><PageCalendarConnectionFailure /></Suspense>} />
        <Route path="/admin/calendar-conversion" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageAdminCalendarConversionDashboard /></Suspense></UniversalRouteGuard>} />

         {/* Instant Audit Intake Funnel */}
         <Route path="/audit" element={<Suspense fallback={<LazyFallback />}><PageInstantAuditFunnel /></Suspense>} />
         <Route path="/analyse/:slug" element={<Suspense fallback={<LazyFallback />}><PageOutreachLanding /></Suspense>} />
         <Route path="/admin/sniper" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageSniperCommandCenter /></Suspense></UniversalRouteGuard>} />
         <Route path="/admin/command-center" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageSniperCommandCenter /></Suspense></UniversalRouteGuard>} />
         <Route path="/admin/command-center/leads" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageCommandCenterLeads /></Suspense></UniversalRouteGuard>} />
         <Route path="/admin/command-center/campaigns" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageCommandCenterCampaigns /></Suspense></UniversalRouteGuard>} />
         <Route path="/admin/command-center/territories" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageCommandCenterTerritories /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/seo-index-health" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageSeoIndexHealth /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/sms-debug" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageSmsDebug /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/outreach-funnel" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageOutreachFunnel /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/contractor-generator-health" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageContractorGeneratorHealth /></Suspense></UniversalRouteGuard>} />

          <Route path="/admin/memory-health" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageMemoryHealth /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/revenue-reality" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageRevenueReality /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/contacted-contractors" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageContactedContractors /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/contractor/:id" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageContractorForensics /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/revenue-debug" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageRevenueDebug /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/outreach-command-center" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageOutreachCommandCenter /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/acquisition/sources/kijiji" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageAdminKijijiSource /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/system-health" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageSystemHealth /></Suspense></UniversalRouteGuard>} />

          <Route path="/admin/edge-function-health" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageEdgeFunctionHealth /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/replay-pipeline" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageReplayPipeline /></Suspense></UniversalRouteGuard>} />
          <Route path="/admin/test-sms" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><PageTestSMS /></Suspense></UniversalRouteGuard>} />
          <Route path="/journal/comment-unpro-recommande-le-bon-entrepreneur" element={<Suspense fallback={<LazyFallback />}><PageWhyUnproRecommends /></Suspense>} />

          {/* Lead Pipe Empire — SEO + Conversion */}
          <Route path="/plomb-eau/:ville" element={<Suspense fallback={<LazyFallback />}><LeadPipePagePlombEauCity /></Suspense>} />
          <Route path="/tuyaux-plomb/:quartier" element={<Suspense fallback={<LazyFallback />}><LeadPipePageTuyauxPlombQuartier /></Suspense>} />
          <Route path="/admin/lead-empire" element={<UniversalRouteGuard allowedRoles={["admin"]}><Suspense fallback={<LazyFallback />}><LeadPipePageAdminEmpire /></Suspense></UniversalRouteGuard>} />

          {/* Legacy/orphan link redirects — keeps old CTAs working */}
          <Route path="/logout" element={<Suspense fallback={<LazyFallback />}><PageLogout /></Suspense>} />
          <Route path="/profile" element={<Suspense fallback={<LazyFallback />}><PageMonProfil /></Suspense>} />
          <Route path="/account" element={<Suspense fallback={<LazyFallback />}><PageMonCompte /></Suspense>} />
          <Route path="/qr-code" element={<Navigate to="/qr" replace />} />
          <Route path="/settings" element={<Navigate to="/account" replace />} />
          <Route path="/aipp" element={<Navigate to="/entrepreneur" replace />} />
          <Route path="/auth" element={<Navigate to="/role" replace />} />
          <Route path="/inscription" element={<Navigate to="/role" replace />} />
          <Route path="/classification-projets" element={<Navigate to="/services" replace />} />
          <Route path="/solutions" element={<Navigate to="/services" replace />} />
          <Route path="/types-de-propriete" element={<Navigate to="/services" replace />} />
          <Route path="/compare" element={<Navigate to="/comparer" replace />} />
          <Route path="/decrire-projet" element={<Navigate to="/decrire-mon-projet" replace />} />
          <Route path="/soumission-travaux" element={<Navigate to="/decrire-mon-projet" replace />} />
          <Route path="/recherche" element={<Navigate to="/trouver" replace />} />
          <Route path="/trouver-entrepreneur" element={<Navigate to="/trouver" replace />} />
          <Route path="/scan" element={<Navigate to="/diagnostic-photo" replace />} />
          <Route path="/verifier-pro" element={<Navigate to="/verifier-un-entrepreneur" replace />} />
          <Route path="/verification-entrepreneur" element={<Navigate to="/verifier-un-entrepreneur" replace />} />

          {/* Legacy paths — sourced from routeRegistry so new redirects have
              one home instead of scattering <Navigate> calls. */}
          {Object.entries(LEGACY_REDIRECTS).map(([from, to]) => (
            <Route key={from} path={from} element={<Navigate to={to} replace />} />
          ))}

          {/* Canonical conversion routes */}
          <Route path="/project-created" element={<Suspense fallback={<LazyFallback />}><PageProjectCreatedSuccess /></Suspense>} />
          <Route path="/recommendations" element={<Suspense fallback={<LazyFallback />}><PageRecommendations /></Suspense>} />
          <Route path="/welcome" element={<Suspense fallback={<LazyFallback />}><PageRegistrationSuccess /></Suspense>} />

          {/* Catch-all: try fallback, then 404 */}
          <Route path="*" element={<FallbackRoutePage />} />
      </Routes>
    </Suspense>
    <FloatingAlexGuide />
  </BrowserRouter>
);
