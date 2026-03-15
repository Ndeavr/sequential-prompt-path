/**
 * WhyThisContractorIsRecommended — Public trust explanation module.
 *
 * Renders user-friendly explanations of why a contractor inspires confidence.
 * Never exposes admin internals, raw scores, or private notes.
 *
 * Variants:
 *   "inline"   → one-line label for compact cards
 *   "compact"  → small expandable block for recommendation/match cards
 *   "full"     → detailed panel for contractor profile page
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Globe, Star, Briefcase, FileCheck,
  ChevronDown, Info, CheckCircle, AlertCircle,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

/* ── Public signal categories ── */
export interface PublicTrustSignal {
  key: string;
  label_fr: string;
  icon: React.ReactNode;
  present: boolean;
}

export interface WhyRecommendedInput {
  admin_verified?: boolean;
  verification_status?: string | null;
  aipp_score?: number | null;
  rating?: number | null;
  review_count?: number | null;
  years_experience?: number | null;
  has_rbq?: boolean;
  has_neq?: boolean;
  has_insurance?: boolean;
  has_website?: boolean;
  credential_count?: number;
  internal_verified_at?: string | null;
}

type Variant = "inline" | "compact" | "full";

interface Props {
  contractor: WhyRecommendedInput;
  variant?: Variant;
  className?: string;
}

/* ── Derive public-safe signals from contractor data ── */
function deriveSignals(c: WhyRecommendedInput): PublicTrustSignal[] {
  const signals: PublicTrustSignal[] = [];

  if (c.admin_verified) {
    signals.push({
      key: "admin_verified",
      label_fr: "Profil validé par UnPRO",
      icon: <ShieldCheck className="h-3.5 w-3.5 text-success" />,
      present: true,
    });
  }

  // Business identity coherence
  const identityStrength =
    (c.has_rbq ? 1 : 0) + (c.has_neq ? 1 : 0) + (c.has_insurance ? 1 : 0);
  signals.push({
    key: "identity",
    label_fr:
      identityStrength >= 2
        ? "Données d'entreprise claires"
        : identityStrength === 1
        ? "Identité partiellement confirmée"
        : "Certaines validations restent à compléter",
    icon: <Briefcase className="h-3.5 w-3.5 text-primary" />,
    present: identityStrength >= 1,
  });

  // Web presence
  if (c.has_website) {
    signals.push({
      key: "web",
      label_fr: "Présence web professionnelle",
      icon: <Globe className="h-3.5 w-3.5 text-secondary" />,
      present: true,
    });
  }

  // Review quality
  const reviewCount = c.review_count ?? 0;
  const rating = c.rating ?? 0;
  if (reviewCount >= 5 && rating >= 3.5) {
    signals.push({
      key: "reviews",
      label_fr: "Avis publics globalement rassurants",
      icon: <Star className="h-3.5 w-3.5 text-warning" />,
      present: true,
    });
  } else if (reviewCount > 0) {
    signals.push({
      key: "reviews",
      label_fr: "Quelques avis disponibles",
      icon: <Star className="h-3.5 w-3.5 text-muted-foreground" />,
      present: true,
    });
  }

  // Credentials / certifications
  if ((c.credential_count ?? 0) >= 2) {
    signals.push({
      key: "credentials",
      label_fr: "Certifications ou accréditations détectées",
      icon: <FileCheck className="h-3.5 w-3.5 text-accent" />,
      present: true,
    });
  }

  return signals;
}

/** One-line summary for very compact contexts */
function getInlineSummary(c: WhyRecommendedInput): string | null {
  if (c.admin_verified) return "Profil validé par UnPRO";
  const identity = (c.has_rbq ? 1 : 0) + (c.has_neq ? 1 : 0) + (c.has_insurance ? 1 : 0);
  const reviews = (c.review_count ?? 0) >= 5 && (c.rating ?? 0) >= 3.5;
  if (identity >= 2 && reviews) return "Informations cohérentes détectées";
  if (c.verification_status === "verified") return "Identité suffisamment confirmée";
  if (identity >= 1 || c.has_website) return "Certaines validations restent à compléter";
  return null;
}

/** Headline text for full/compact variants */
function getHeadline(c: WhyRecommendedInput): string {
  if (c.admin_verified) return "Cette entreprise possède un dossier interne validé par notre équipe.";
  const identity = (c.has_rbq ? 1 : 0) + (c.has_neq ? 1 : 0) + (c.has_insurance ? 1 : 0);
  if (identity >= 2 && (c.review_count ?? 0) >= 3)
    return "Les informations publiques trouvées semblent cohérentes.";
  if (identity >= 1)
    return "L'identité de l'entreprise paraît bien reliée aux données détectées.";
  return "Nous avons trouvé des signaux utiles, mais certaines informations restent non confirmées.";
}

/* ═══════════════════════════════════════════ */

export default function WhyThisContractorIsRecommended({
  contractor,
  variant = "full",
  className = "",
}: Props) {
  const signals = deriveSignals(contractor);
  const presentSignals = signals.filter((s) => s.present);

  /* ── Inline: one chip ── */
  if (variant === "inline") {
    const label = getInlineSummary(contractor);
    if (!label) return null;
    const isVerified = contractor.admin_verified;
    return (
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
          isVerified
            ? "text-success bg-success/8 border-success/20"
            : "text-muted-foreground bg-muted/50 border-border/40"
        } ${className}`}
      >
        {isVerified && <ShieldCheck className="h-2.5 w-2.5" />}
        {label}
      </span>
    );
  }

  /* ── Compact: collapsible mini-block ── */
  if (variant === "compact") {
    if (presentSignals.length === 0) return null;
    return (
      <Collapsible>
        <CollapsibleTrigger className={`w-full text-left ${className}`}>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer group">
            <Info className="h-3 w-3 shrink-0" />
            <span className="underline decoration-dotted underline-offset-2">
              Pourquoi ce profil inspire davantage confiance ?
            </span>
            <ChevronDown className="h-3 w-3 ml-auto transition-transform group-data-[state=open]:rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-1.5 pl-1">
            {presentSignals.slice(0, 4).map((s) => (
              <div key={s.key} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {s.icon}
                <span>{s.label_fr}</span>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  /* ── Full: detailed panel for profile page ── */
  const headline = getHeadline(contractor);
  const isAdminVerified = contractor.admin_verified === true;
  const verifiedDate = contractor.internal_verified_at
    ? new Date(contractor.internal_verified_at).toLocaleDateString("fr-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Card className={`glass-card border-0 shadow-sm overflow-hidden ${className}`}>
      {isAdminVerified && (
        <div className="h-1 bg-gradient-to-r from-success via-success/60 to-success/20" />
      )}
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className={`h-4 w-4 ${isAdminVerified ? "text-success" : "text-primary"}`} />
          <h2 className="text-sm font-bold text-foreground">
            Pourquoi cet entrepreneur est recommandé
          </h2>
        </div>

        <p className="text-[13px] text-muted-foreground leading-relaxed mb-4">{headline}</p>

        {/* Signal list */}
        <div className="space-y-2.5">
          {presentSignals.map((s) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-2.5"
            >
              <div className="mt-0.5 shrink-0">{s.icon}</div>
              <span className="text-[12px] text-foreground leading-relaxed">{s.label_fr}</span>
            </motion.div>
          ))}
        </div>

        {/* Verified date */}
        {isAdminVerified && verifiedDate && (
          <p className="text-[11px] text-muted-foreground/70 mt-3">
            Dernière validation par UnPRO : {verifiedDate}
          </p>
        )}

        {/* Incomplete notice */}
        {!isAdminVerified && presentSignals.length <= 2 && (
          <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-muted/30 border border-border/30">
            <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Ce profil n'a pas encore été entièrement validé. Les informations présentées reflètent les données publiques disponibles.
            </p>
          </div>
        )}

        {/* Explanatory microcopy */}
        <p className="text-[10px] text-muted-foreground/60 mt-4 leading-relaxed">
          Les profils validés ou cohérents peuvent être mis en avant lorsqu'ils correspondent aussi à votre projet, votre zone et votre catégorie de travaux.
        </p>
      </CardContent>
    </Card>
  );
}
