/**
 * UNPRO — Next Best Action Card
 * Shows the single most impactful action a homeowner can take right now.
 * Context-aware: adapts based on property state.
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight, Home, FileText, Camera, ShieldCheck,
  TrendingUp, Upload, Sparkles, Award,
} from "lucide-react";

export type ActionType =
  | "claim_property"
  | "complete_passport"
  | "upload_document"
  | "add_photo"
  | "request_certification"
  | "improve_score"
  | "create_account"
  | "add_property";

interface NextBestActionProps {
  action: ActionType;
  propertyId?: string;
  completionPct?: number;
  scoreGain?: number;
  className?: string;
}

const ACTION_CONFIG: Record<ActionType, {
  icon: React.ElementType;
  title: string;
  description: string;
  cta: string;
  path: string;
  iconBg: string;
}> = {
  claim_property: {
    icon: Home,
    title: "Réclamez votre propriété",
    description: "Devenez propriétaire vérifié pour accéder à votre Passeport Maison complet.",
    cta: "Réclamer",
    path: "/dashboard/properties",
    iconBg: "bg-primary/10 text-primary",
  },
  complete_passport: {
    icon: FileText,
    title: "Complétez votre Passeport",
    description: "Chaque information ajoutée améliore la précision de votre score.",
    cta: "Continuer",
    path: "/dashboard/properties",
    iconBg: "bg-accent/10 text-accent",
  },
  upload_document: {
    icon: Upload,
    title: "Ajoutez un document",
    description: "Téléversez une facture ou un rapport pour enrichir votre dossier.",
    cta: "Téléverser",
    path: "/dashboard/documents/upload",
    iconBg: "bg-warning/10 text-warning",
  },
  add_photo: {
    icon: Camera,
    title: "Photographiez votre panneau",
    description: "Une photo du panneau électrique apporte +20 points de confiance.",
    cta: "Ajouter",
    path: "/dashboard/documents/upload",
    iconBg: "bg-secondary/10 text-secondary",
  },
  request_certification: {
    icon: Award,
    title: "Demandez la certification",
    description: "Votre Passeport est suffisamment complet pour la certification UnPRO.",
    cta: "Demander",
    path: "/dashboard/properties",
    iconBg: "bg-success/10 text-success",
  },
  improve_score: {
    icon: TrendingUp,
    title: "Améliorez votre score",
    description: "3 actions simples peuvent augmenter votre score de 15+ points.",
    cta: "Voir les actions",
    path: "/dashboard/home-score",
    iconBg: "bg-primary/10 text-primary",
  },
  create_account: {
    icon: Sparkles,
    title: "Créez votre compte gratuit",
    description: "Accédez à votre Passeport Maison et suivez l'évolution de votre propriété.",
    cta: "S'inscrire",
    path: "/signup",
    iconBg: "bg-primary/10 text-primary",
  },
  add_property: {
    icon: Home,
    title: "Ajoutez votre propriété",
    description: "Commencez votre Passeport Maison pour suivre l'état de votre bien.",
    cta: "Ajouter",
    path: "/dashboard/properties/new",
    iconBg: "bg-primary/10 text-primary",
  },
};

export function NextBestAction({ action, propertyId, completionPct, scoreGain, className = "" }: NextBestActionProps) {
  const navigate = useNavigate();
  const config = ACTION_CONFIG[action];
  const Icon = config.icon;

  const targetPath = propertyId && config.path.includes("/dashboard/properties")
    ? `/dashboard/properties/${propertyId}/passport`
    : config.path;

  return (
    <Card className={`border-primary/15 bg-primary/[0.02] shadow-[var(--shadow-md)] ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${config.iconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-sm font-semibold text-foreground">{config.title}</h3>
              {scoreGain && (
                <span className="text-[10px] font-bold text-success bg-success/10 px-1.5 py-0.5 rounded-full">
                  +{scoreGain} pts
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{config.description}</p>
            {completionPct !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <Progress value={completionPct} className="flex-1 h-1.5" />
                <span className="text-[10px] font-semibold text-muted-foreground">{completionPct}%</span>
              </div>
            )}
          </div>
          <Button
            size="sm"
            className="shrink-0 gap-1 text-xs"
            onClick={() => navigate(targetPath)}
          >
            {config.cta}
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Determine the best action based on property state.
 */
export function determineNextAction(opts: {
  isAuthenticated: boolean;
  hasProperties: boolean;
  hasClaimed: boolean;
  passportPct: number;
  hasDocuments: boolean;
  certificationEligible: boolean;
}): ActionType {
  if (!opts.isAuthenticated) return "create_account";
  if (!opts.hasProperties) return "add_property";
  if (!opts.hasClaimed) return "claim_property";
  if (opts.certificationEligible) return "request_certification";
  if (opts.passportPct < 30) return "complete_passport";
  if (!opts.hasDocuments) return "upload_document";
  if (opts.passportPct < 70) return "complete_passport";
  return "improve_score";
}
