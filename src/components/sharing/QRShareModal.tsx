/**
 * UNPRO — QR Share Modal (Adaptive by Role + Feature Context)
 * Premium SaaS modal with preview card, contextual text, test link, and stats.
 * Bilingual FR/EN support.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useReferralProfile, type ShareRole } from "@/hooks/useReferralProfile";
import { trackReferralEvent } from "@/hooks/useReferralAttribution";
import QRCodeCard from "./QRCodeCard";
import ShareActionsRow from "./ShareActionsRow";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/ui/LanguageToggle";
import {
  ExternalLink, QrCode, Eye, MousePointerClick,
  Palette, BarChart3, CalendarCheck, Home, Sparkles,
} from "lucide-react";

export type ShareFeature = "general" | "kitchen" | "bathroom" | "design" | "home_score" | "booking" | "profile";

interface QRShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature?: ShareFeature;
  previewImage?: string;
  subtitle?: string;
}

// ─── Feature metadata (bilingual) ───

const FEATURE_CONFIG: Record<ShareFeature, {
  icon: React.ElementType;
  qrLabel: { fr: string; en: string };
  title: { fr: string; en: string };
  subtitle: { fr: string; en: string };
  gradient: string;
  badge?: { fr: string; en: string };
}> = {
  general: {
    icon: Home,
    qrLabel: { fr: "Scannez pour rejoindre UNPRO", en: "Scan to join UNPRO" },
    title: { fr: "Partagez UNPRO", en: "Share UNPRO" },
    subtitle: { fr: "La plateforme de rénovation intelligente", en: "The smart renovation platform" },
    gradient: "from-primary/15 via-primary/5 to-transparent",
  },
  kitchen: {
    icon: Palette,
    qrLabel: { fr: "Scannez pour rénover cette cuisine", en: "Scan to renovate this kitchen" },
    title: { fr: "Design cuisine IA", en: "AI Kitchen Design" },
    subtitle: { fr: "Visualisez votre nouvelle cuisine en quelques secondes", en: "Visualize your new kitchen in seconds" },
    gradient: "from-violet-500/15 via-fuchsia-500/5 to-transparent",
    badge: { fr: "Design IA", en: "AI Design" },
  },
  bathroom: {
    icon: Palette,
    qrLabel: { fr: "Scannez pour rénover cette salle de bain", en: "Scan to renovate this bathroom" },
    title: { fr: "Design salle de bain IA", en: "AI Bathroom Design" },
    subtitle: { fr: "Imaginez votre nouvelle salle de bain", en: "Imagine your new bathroom" },
    gradient: "from-cyan-500/15 via-blue-500/5 to-transparent",
    badge: { fr: "Design IA", en: "AI Design" },
  },
  design: {
    icon: Palette,
    qrLabel: { fr: "Scannez pour visualiser cette rénovation", en: "Scan to visualize this renovation" },
    title: { fr: "Design IA UNPRO", en: "UNPRO AI Design" },
    subtitle: { fr: "Transformez n'importe quelle pièce avec l'intelligence artificielle", en: "Transform any room with artificial intelligence" },
    gradient: "from-violet-500/15 via-purple-500/5 to-transparent",
    badge: { fr: "Design IA", en: "AI Design" },
  },
  home_score: {
    icon: BarChart3,
    qrLabel: { fr: "Scannez pour voir le score de cette maison", en: "Scan to see this home's score" },
    title: { fr: "Score Maison", en: "Home Score" },
    subtitle: { fr: "Évaluation instantanée de l'état de la propriété", en: "Instant assessment of the property's condition" },
    gradient: "from-emerald-500/15 via-teal-500/5 to-transparent",
    badge: { fr: "Score gratuit", en: "Free score" },
  },
  booking: {
    icon: CalendarCheck,
    qrLabel: { fr: "Scannez pour prendre rendez-vous", en: "Scan to book an appointment" },
    title: { fr: "Rendez-vous garanti", en: "Guaranteed appointment" },
    subtitle: { fr: "Réservez directement avec un entrepreneur vérifié", en: "Book directly with a verified contractor" },
    gradient: "from-blue-500/15 via-cyan-500/5 to-transparent",
    badge: { fr: "Exclusif", en: "Exclusive" },
  },
  profile: {
    icon: Sparkles,
    qrLabel: { fr: "Scannez pour voir le profil", en: "Scan to view profile" },
    title: { fr: "Profil entrepreneur", en: "Contractor profile" },
    subtitle: { fr: "Certifications, avis et réalisations vérifiés", en: "Verified certifications, reviews, and work" },
    gradient: "from-amber-500/15 via-orange-500/5 to-transparent",
    badge: { fr: "Vérifié", en: "Verified" },
  },
};

// ─── Helpers ───

const ROLE_TITLES: Record<ShareRole, { fr: string; en: string }> = {
  homeowner: { fr: "Invitez quelqu'un sur UNPRO", en: "Invite someone to UNPRO" },
  contractor: { fr: "Partagez votre profil UNPRO", en: "Share your UNPRO profile" },
  affiliate: { fr: "Lien affilié UNPRO", en: "UNPRO affiliate link" },
  admin: { fr: "Partager UNPRO", en: "Share UNPRO" },
};

const modalT = {
  profileMode: { fr: "Mode profil", en: "Profile mode" },
  bookingMode: { fr: "Mode rendez-vous", en: "Booking mode" },
  testLink: { fr: "Tester le lien", en: "Test link" },
  scans: { fr: "Scans", en: "Scans" },
  actions: { fr: "Actions", en: "Actions" },
};

function buildShareUrl(
  profile: { referralCode: string; role: ShareRole; contractorSlug?: string },
  appointmentMode: boolean
): string {
  const base = window.location.origin;
  if (profile.role === "contractor" && profile.contractorSlug && !appointmentMode) {
    return `${base}/pro/${profile.contractorSlug}?ref=${profile.referralCode}`;
  }
  if (profile.role === "affiliate") {
    return `${base}/r/${profile.referralCode}?utm_source=affiliate`;
  }
  if (profile.role === "contractor" && appointmentMode) {
    return `${base}/r/${profile.referralCode}?intent=book`;
  }
  return `${base}/r/${profile.referralCode}`;
}

// ─── Component ───

const QRShareModal = ({ open, onOpenChange, feature = "general", previewImage, subtitle: customSubtitle }: QRShareModalProps) => {
  const { lang } = useLanguage();
  const { profile, stats, isLoading } = useReferralProfile();
  const [appointmentMode, setAppointmentMode] = useState(false);

  if (!open) return null;

  if (isLoading || !profile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const role = profile.role;
  const url = buildShareUrl(profile, appointmentMode);

  const effectiveFeature = role === "contractor" && !appointmentMode ? "profile" : 
                           role === "contractor" && appointmentMode ? "booking" : feature;
  const config = FEATURE_CONFIG[effectiveFeature] || FEATURE_CONFIG.general;
  const FeatureIcon = config.icon;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) trackReferralEvent("qr_view", profile.referralCode, { role });
    onOpenChange(isOpen);
  };

  const handleTestLink = () => {
    window.open(url, "_blank", "noopener");
    trackReferralEvent("test_link", profile.referralCode, { role });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md max-h-[90vh] rounded-2xl p-0 overflow-y-auto overflow-x-hidden border-0 shadow-2xl">
        {/* ── Preview Card Header ── */}
        <div className={`relative bg-gradient-to-b ${config.gradient} px-5 pt-5 pb-4`}>
          <DialogHeader className="sr-only">
            <DialogTitle>{ROLE_TITLES[role][lang]}</DialogTitle>
          </DialogHeader>

          <div className="flex items-start gap-3.5">
            {previewImage ? (
              <div className="h-16 w-16 rounded-xl overflow-hidden shrink-0 ring-2 ring-background/50 shadow-md">
                <img src={previewImage} alt="" className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-16 w-16 rounded-xl bg-background/60 backdrop-blur-sm flex items-center justify-center shrink-0 ring-1 ring-border/10 shadow-md">
                <FeatureIcon className="h-7 w-7 text-primary" />
              </div>
            )}

            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-base font-bold text-foreground truncate">{config.title[lang]}</h2>
                {config.badge && (
                  <Badge variant="secondary" className="text-[10px] shrink-0 bg-primary/10 text-primary border-0">
                    {config.badge[lang]}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                {customSubtitle || config.subtitle[lang]}
              </p>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col items-center gap-4 px-5 pb-5">
          {/* Contractor mode toggle */}
          {role === "contractor" && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 w-full border border-border/10">
              <Label htmlFor="mode-toggle" className="text-sm text-muted-foreground flex-1">
                {appointmentMode ? modalT.bookingMode[lang] : modalT.profileMode[lang]}
              </Label>
              <Switch id="mode-toggle" checked={appointmentMode} onCheckedChange={setAppointmentMode} />
            </div>
          )}

          {/* QR Code */}
          <QRCodeCard url={url} size={200} label={config.qrLabel[lang]} />

          {/* Test link button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTestLink}
            className="gap-2 text-xs text-muted-foreground hover:text-foreground rounded-full"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            {modalT.testLink[lang]}
          </Button>

          {/* Share actions */}
          <ShareActionsRow
            url={url}
            referralCode={profile.referralCode}
            shareTitle={config.title[lang]}
            shareText={config.subtitle[lang]}
          />

          {/* Stats */}
          <div className="w-full pt-3 border-t border-border/10">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/10">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <QrCode className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground leading-none">{stats?.totalViews ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{modalT.scans[lang]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/20 border border-border/10">
                <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                  <MousePointerClick className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground leading-none">{stats?.totalSignups ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{modalT.actions[lang]}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRShareModal;
