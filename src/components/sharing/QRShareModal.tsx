/**
 * UNPRO — QR Share Modal (Adaptive by Role)
 * Homeowner: invite link | Contractor: profile + booking toggle | Affiliate: tracked link
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useReferralProfile, type ShareRole } from "@/hooks/useReferralProfile";
import { trackReferralEvent } from "@/hooks/useReferralAttribution";
import QRCodeCard from "./QRCodeCard";
import ShareActionsRow from "./ShareActionsRow";
import ReferralStatsCard from "./ReferralStatsCard";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface QRShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TITLES: Record<ShareRole, string> = {
  homeowner: "Invitez quelqu'un sur UNPRO",
  contractor: "Partagez votre profil UNPRO",
  affiliate: "Lien affilié UNPRO",
  admin: "Partager UNPRO",
};

const ROLE_ACCENT: Record<ShareRole, string> = {
  homeowner: "",
  contractor: "border-t-2 border-t-success",
  affiliate: "border-t-2 border-t-primary",
  admin: "",
};

function buildShareUrl(profile: { referralCode: string; role: ShareRole; contractorSlug?: string }, appointmentMode: boolean): string {
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

const QRShareModal = ({ open, onOpenChange }: QRShareModalProps) => {
  const { profile, stats, isLoading } = useReferralProfile();
  const [appointmentMode, setAppointmentMode] = useState(false);

  if (!open) return null;

  if (isLoading || !profile) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground text-sm">Chargement…</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const role = profile.role;
  const url = buildShareUrl(profile, appointmentMode);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      trackReferralEvent("qr_view", profile.referralCode, { role });
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className={`w-[calc(100vw-2rem)] max-w-md rounded-2xl p-4 sm:p-6 ${ROLE_ACCENT[role]}`}>
        <DialogHeader>
          <DialogTitle className="text-center text-lg sm:text-xl font-display">
            {TITLES[role]}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 sm:gap-6 py-2 sm:py-4 w-full overflow-hidden">
          {/* Contractor toggle */}
          {role === "contractor" && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 w-full">
              <Label htmlFor="mode-toggle" className="text-sm text-muted-foreground flex-1">
                {appointmentMode ? "Obtenir des rendez-vous" : "Voir mon profil"}
              </Label>
              <Switch
                id="mode-toggle"
                checked={appointmentMode}
                onCheckedChange={setAppointmentMode}
              />
            </div>
          )}

          {/* QR Code */}
          <QRCodeCard
            url={url}
            size={200}
            label={role === "contractor" && !appointmentMode
              ? "Scannez pour voir le profil"
              : "Scannez pour rejoindre UNPRO"}
          />

          {/* Share actions */}
          <ShareActionsRow
            url={url}
            referralCode={profile.referralCode}
            shareTitle={TITLES[role]}
            shareText={role === "contractor"
              ? "Découvrez mon profil sur UNPRO"
              : "Rejoignez UNPRO — la plateforme de rénovation intelligente"}
          />

          {/* Stats */}
          <div className="w-full pt-2 border-t border-border/10">
            <ReferralStatsCard role={role} stats={stats} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRShareModal;
