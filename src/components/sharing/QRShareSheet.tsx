/**
 * UNPRO — QR Share Sheet (Full-Screen Intent-Based)
 * Mobile-first bottom sheet with intent selector, dynamic QR, sharing actions.
 */
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useReferralProfile } from "@/hooks/useReferralProfile";
import { QR_INTENTS, getIntentsForRole, type QrIntent } from "@/config/qrIntents";
import { buildUnlockUrl, getUserQrStats } from "@/services/qrSharing";
import { trackReferralEvent } from "@/hooks/useReferralAttribution";
import QRCodeCard from "./QRCodeCard";
import ShareActionsRow from "./ShareActionsRow";
import {
  QrCode, Eye, MousePointerClick, CalendarCheck, Crown, Award,
  ChefHat, Bath, Search, AlertTriangle, Palette, Building2, UserPlus,
  ArrowLeft, Sparkles, X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const ICON_MAP: Record<string, React.ElementType> = {
  ChefHat, Bath, Search, AlertTriangle, Palette, Building2, UserPlus, Award, Crown, Sparkles,
};

interface QRShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QRShareSheet = ({ open, onOpenChange }: QRShareSheetProps) => {
  const { user, role } = useAuth();
  const { profile } = useReferralProfile();
  const [selectedIntent, setSelectedIntent] = useState<QrIntent | null>(null);

  const effectiveRole = (role || "guest") as "homeowner" | "contractor" | "admin" | "guest";
  const intents = useMemo(() => getIntentsForRole(effectiveRole), [effectiveRole]);

  // Reset selection when closing
  useEffect(() => {
    if (!open) setSelectedIntent(null);
  }, [open]);

  const { data: stats } = useQuery({
    queryKey: ["qr-share-stats", user?.id],
    queryFn: () => getUserQrStats(user!.id),
    enabled: !!user?.id && open,
  });

  const shareUrl = useMemo(() => {
    if (!selectedIntent) return "";
    return buildUnlockUrl({
      intent: selectedIntent.slug,
      referrerId: user?.id,
      role: role || "homeowner",
    });
  }, [selectedIntent, user?.id, role]);

  const handleSelectIntent = (intent: QrIntent) => {
    setSelectedIntent(intent);
    if (profile?.referralCode) {
      trackReferralEvent("qr_intent_selected", profile.referralCode, {
        targetType: intent.slug,
      });
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[95vh] rounded-3xl p-0 overflow-hidden border-0 shadow-2xl bg-card">
        <DialogHeader className="sr-only">
          <DialogTitle>Partager UNPRO</DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {selectedIntent ? (
            <QRView
              key="qr"
              intent={selectedIntent}
              url={shareUrl}
              referralCode={profile?.referralCode || ""}
              stats={stats}
              onBack={() => setSelectedIntent(null)}
              onClose={() => onOpenChange(false)}
            />
          ) : (
            <IntentSelector
              key="intents"
              intents={intents}
              stats={stats}
              onSelect={handleSelectIntent}
              onClose={() => onOpenChange(false)}
            />
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default QRShareSheet;

/* ─── Intent Selector View ─── */

function IntentSelector({
  intents,
  stats,
  onSelect,
  onClose,
}: {
  intents: QrIntent[];
  stats: any;
  onSelect: (i: QrIntent) => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="text-lg font-bold text-foreground font-display">Partager UNPRO</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Choisis pourquoi tu partages</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats bar */}
      {stats && (stats.totalScans > 0 || stats.totalSignups > 0) && (
        <div className="flex gap-3 px-5 pb-3">
          <StatPill icon={<Eye className="h-3 w-3" />} value={stats.totalScans} label="Scans" />
          <StatPill icon={<MousePointerClick className="h-3 w-3" />} value={stats.totalSignups} label="Inscriptions" />
          <StatPill icon={<CalendarCheck className="h-3 w-3" />} value={stats.totalBookings} label="RDV" />
        </div>
      )}

      {/* Intent grid */}
      <div className="px-4 pb-5 max-h-[60vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-2.5">
          {intents.map((intent) => {
            const Icon = ICON_MAP[intent.icon] || Sparkles;
            const isPremium = intent.stylePreset === "premium";
            return (
              <button
                key={intent.slug}
                onClick={() => onSelect(intent)}
                className={`relative flex flex-col items-start gap-2 p-3.5 rounded-2xl border text-left transition-all duration-200 active:scale-[0.97] ${
                  isPremium
                    ? "bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border-amber-500/20 hover:border-amber-500/40 shadow-[0_0_20px_-6px_hsl(38_92%_50%/0.15)]"
                    : "bg-muted/20 border-border/20 hover:border-primary/30 hover:bg-muted/40"
                }`}
              >
                {intent.badge && (
                  <Badge
                    className={`absolute top-2 right-2 text-[9px] px-1.5 py-0 border-0 ${
                      isPremium
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {intent.badge}
                  </Badge>
                )}
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                  isPremium
                    ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/10"
                    : "bg-primary/10"
                }`}>
                  <Icon className={`h-4.5 w-4.5 ${isPremium ? "text-amber-600 dark:text-amber-400" : "text-primary"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground leading-tight">{intent.labelFr}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{intent.subtitleFr}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ─── QR View (selected intent) ─── */

function QRView({
  intent,
  url,
  referralCode,
  stats,
  onBack,
  onClose,
}: {
  intent: QrIntent;
  url: string;
  referralCode: string;
  stats: any;
  onBack: () => void;
  onClose: () => void;
}) {
  const Icon = ICON_MAP[intent.icon] || Sparkles;
  const isPremium = intent.stylePreset === "premium";
  const randomCopy = intent.copyVariants[Math.floor(Math.random() * intent.copyVariants.length)];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col"
    >
      {/* Header */}
      <div className={`relative bg-gradient-to-b ${intent.gradient} px-5 pt-4 pb-4`}>
        <div className="flex items-center gap-2 mb-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 rounded-full -ml-1">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground truncate">{intent.labelFr}</h2>
              {intent.badge && (
                <Badge className={`text-[10px] shrink-0 border-0 ${
                  isPremium ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-primary/10 text-primary"
                }`}>
                  {intent.badge}
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Copy variant */}
        <div className="flex items-start gap-3">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
            isPremium
              ? "bg-gradient-to-br from-amber-500/20 to-yellow-500/10 shadow-[0_0_16px_-4px_hsl(38_92%_50%/0.3)]"
              : "bg-background/60 backdrop-blur-sm ring-1 ring-border/10"
          }`}>
            <Icon className={`h-6 w-6 ${isPremium ? "text-amber-500" : "text-primary"}`} />
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed italic">
            « {randomCopy} »
          </p>
        </div>
      </div>

      {/* QR + actions */}
      <div className="flex flex-col items-center gap-4 px-5 pb-5 pt-3">
        <QRCodeCard url={url} size={200} label={intent.subtitleFr} />

        <ShareActionsRow
          url={url}
          referralCode={referralCode}
          shareTitle={intent.labelFr}
          shareText={randomCopy}
        />

        {/* Stats */}
        <div className="w-full pt-3 border-t border-border/10">
          <div className="grid grid-cols-3 gap-2">
            <MiniStat icon={<QrCode className="h-3.5 w-3.5 text-primary" />} value={stats?.totalScans ?? 0} label="Scans" />
            <MiniStat icon={<MousePointerClick className="h-3.5 w-3.5 text-success" />} value={stats?.totalSignups ?? 0} label="Inscriptions" />
            <MiniStat icon={<CalendarCheck className="h-3.5 w-3.5 text-secondary" />} value={stats?.totalBookings ?? 0} label="RDV" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Micro components ─── */

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-muted/30 border border-border/10">
      {icon}
      <span className="text-xs font-bold text-foreground">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-muted/20 border border-border/10">
      {icon}
      <span className="text-lg font-bold text-foreground leading-none">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}
