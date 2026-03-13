/**
 * UNPRO — Contextual Upgrade Window
 * Premium, non-aggressive upsell triggered at the exact moment of perceived value.
 * Supports all plan limit triggers across the contractor experience.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowUpRight, Check, Crown, Sparkles, TrendingUp, MapPin,
  Wrench, Camera, Globe, BarChart3, Users, Zap,
} from "lucide-react";
import {
  CONTRACTOR_PLANS, formatPlanPrice, getYearlySavingsPercent,
  getMonthlyEquivalent, type ContractorPlan,
} from "@/config/contractorPlans";

/* ------------------------------------------------------------------ */
/*  Trigger types                                                      */
/* ------------------------------------------------------------------ */

export type UpgradeTrigger =
  | "cities_limit"
  | "categories_limit"
  | "services_limit"
  | "photos_limit"
  | "seo_zones_limit"
  | "publish_blocked"
  | "advanced_analytics"
  | "leads_limit";

interface TriggerConfig {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  unlocks: string[];
  roi: string;
}

const TRIGGER_CONFIG: Record<UpgradeTrigger, TriggerConfig> = {
  cities_limit: {
    icon: MapPin,
    title: "Débloquez plus de villes",
    subtitle: "Chaque ville ajoutée augmente votre bassin de clients potentiels.",
    unlocks: [
      "Plus de villes desservies",
      "Visibilité sur les pages locales SEO",
      "Matching avec plus de propriétaires",
      "Leads dans de nouvelles zones",
    ],
    roi: "En moyenne, chaque ville ajoutée génère 2 à 5 demandes de soumission supplémentaires par mois.",
  },
  categories_limit: {
    icon: Crown,
    title: "Ajoutez des catégories",
    subtitle: "Plus de catégories = plus de types de projets accessibles.",
    unlocks: [
      "Plus de catégories secondaires",
      "Pages publiques par spécialité",
      "Diversification de votre offre",
      "Matching élargi dans votre zone",
    ],
    roi: "Les entrepreneurs avec 3+ catégories reçoivent 40 % plus de demandes.",
  },
  services_limit: {
    icon: Wrench,
    title: "Élargissez vos services",
    subtitle: "Affichez tout ce que vous savez faire pour capter plus de projets.",
    unlocks: [
      "Plus de services principaux et secondaires",
      "Pages SEO par type de service",
      "Matching sur des projets variés",
      "Profil plus complet = meilleur score AIPP",
    ],
    roi: "Les profils avec 5+ services convertissent 2× plus de visiteurs en demandes.",
  },
  photos_limit: {
    icon: Camera,
    title: "Montrez plus de réalisations",
    subtitle: "Les photos renforcent la confiance et augmentent les conversions.",
    unlocks: [
      "Plus de photos de projets",
      "Galerie étendue sur votre page publique",
      "Photos dans les résultats de recherche",
      "Score AIPP amélioré",
    ],
    roi: "Les profils avec galerie photo génèrent 3× plus de clics que ceux sans photos.",
  },
  seo_zones_limit: {
    icon: Globe,
    title: "Étendez votre présence SEO",
    subtitle: "Apparaissez dans plus de recherches locales Google.",
    unlocks: [
      "Pages ville + service personnalisées",
      "Référencement local amélioré",
      "Présence sur les pages problème",
      "Backlinks internes vers votre profil",
    ],
    roi: "Chaque page SEO locale peut générer 50 à 200 visites organiques par mois.",
  },
  publish_blocked: {
    icon: Zap,
    title: "Publiez votre page professionnelle",
    subtitle: "Votre page publique n'est pas encore activée.",
    unlocks: [
      "Page publique indexée par Google",
      "URL personnalisée partageable",
      "Avis et score visibles",
      "Formulaire de contact intégré",
    ],
    roi: "Une page publique active reçoit en moyenne 15 visites/jour dans les 30 premiers jours.",
  },
  advanced_analytics: {
    icon: BarChart3,
    title: "Accédez aux statistiques avancées",
    subtitle: "Comprenez d'où viennent vos clients et optimisez votre profil.",
    unlocks: [
      "Tableau de bord analytique",
      "Taux de conversion par source",
      "Comparaison avec les concurrents",
      "Rapports mensuels automatiques",
    ],
    roi: "Les entrepreneurs qui suivent leurs métriques optimisent leur ROI de 25 %.",
  },
  leads_limit: {
    icon: Users,
    title: "Recevez plus de leads",
    subtitle: "Ne manquez aucune opportunité dans votre zone.",
    unlocks: [
      "Plus de leads qualifiés par mois",
      "Priorité dans la distribution",
      "Notifications en temps réel",
      "Accès aux leads premium",
    ],
    roi: "Les plans supérieurs reçoivent en moyenne 3× plus de demandes de soumission.",
  },
};

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface UpgradeWindowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: UpgradeTrigger;
  currentPlanId: string;
  /** Override the specific limit that was hit */
  currentLimit?: number;
  /** Optional promo code to pre-fill */
  promoCode?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function UpgradeWindow({
  open, onOpenChange, trigger, currentPlanId, currentLimit, promoCode: initialPromo,
}: UpgradeWindowProps) {
  const navigate = useNavigate();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("year");
  const [promoInput, setPromoInput] = useState(initialPromo || "");

  const config = TRIGGER_CONFIG[trigger];
  const TriggerIcon = config.icon;

  const currentPlan = CONTRACTOR_PLANS.find((p) => p.id === currentPlanId);
  const currentIdx = CONTRACTOR_PLANS.findIndex((p) => p.id === currentPlanId);
  const suggestedPlan = CONTRACTOR_PLANS[Math.min(currentIdx + 1, CONTRACTOR_PLANS.length - 1)];

  if (!currentPlan || !suggestedPlan) return null;

  const savingsPct = getYearlySavingsPercent(suggestedPlan);
  const monthlyEquiv = getMonthlyEquivalent(suggestedPlan);

  const handleUpgrade = () => {
    onOpenChange(false);
    // Navigate with plan pre-selected
    navigate(`/pro/billing?plan=${suggestedPlan.id}&interval=${billingInterval}${promoInput ? `&promo=${promoInput}` : ""}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden gap-0">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background px-6 pt-6 pb-4">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TriggerIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-base font-bold text-foreground">
                  {config.title}
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  {config.subtitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Plan comparison */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {/* Current plan */}
            <Card className="border-border bg-muted/30">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Actuel</p>
                </div>
                <p className="text-sm font-bold text-foreground">{currentPlan.name}</p>
                <p className="text-lg font-bold text-foreground">
                  {formatPlanPrice(currentPlan.monthlyPrice)}
                  <span className="text-[10px] font-normal text-muted-foreground">/mois</span>
                </p>
                {currentLimit !== undefined && (
                  <Badge variant="outline" className="text-[10px]">
                    Limite: {currentLimit}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Suggested plan */}
            <Card className="border-primary/40 bg-primary/5 relative">
              <div className="absolute -top-2.5 right-3">
                <Badge className="text-[9px] bg-primary text-primary-foreground px-2 gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Recommandé
                </Badge>
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">Suggéré</p>
                </div>
                <p className="text-sm font-bold text-foreground">{suggestedPlan.name}</p>
                <p className="text-lg font-bold text-foreground">
                  {formatPlanPrice(suggestedPlan.monthlyPrice)}
                  <span className="text-[10px] font-normal text-muted-foreground">/mois</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* What you unlock */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Ce que vous débloquez</p>
            <div className="space-y-1.5">
              {config.unlocks.map((u, i) => (
                <motion.div
                  key={u}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground">{u}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ROI */}
          <div className="flex items-start gap-2 bg-primary/5 rounded-lg p-3 border border-primary/10">
            <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">{config.roi}</p>
          </div>

          {/* Billing toggle */}
          <Tabs value={billingInterval} onValueChange={(v) => setBillingInterval(v as "month" | "year")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="month" className="text-xs">Mensuel</TabsTrigger>
              <TabsTrigger value="year" className="text-xs relative">
                Annuel
                {savingsPct > 0 && (
                  <Badge className="absolute -top-2 -right-1 text-[8px] bg-green-500/90 text-white px-1 py-0">
                    -{savingsPct}%
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="month" className="mt-2">
              <p className="text-center text-xs text-muted-foreground">
                <span className="text-lg font-bold text-foreground">{formatPlanPrice(suggestedPlan.monthlyPrice)}</span>
                /mois · Annulable en tout temps
              </p>
            </TabsContent>
            <TabsContent value="year" className="mt-2">
              <p className="text-center text-xs text-muted-foreground">
                <span className="text-lg font-bold text-foreground">{monthlyEquiv}</span>
                /mois · Facturé {formatPlanPrice(suggestedPlan.yearlyPrice)}/an
              </p>
            </TabsContent>
          </Tabs>

          {/* Promo code */}
          <div className="flex gap-2">
            <Input
              value={promoInput}
              onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
              placeholder="Code promo / Pionnier"
              className="h-8 text-xs flex-1"
            />
            {promoInput && (
              <Badge variant="outline" className="text-[10px] shrink-0 self-center border-primary/30 text-primary">
                Appliqué
              </Badge>
            )}
          </div>

          {/* CTAs */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-xs h-10"
            >
              Plus tard
            </Button>
            <Button
              onClick={handleUpgrade}
              className="flex-1 text-xs h-10 gap-1.5 bg-primary hover:bg-primary/90"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Passer au {suggestedPlan.name}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <p className="text-[10px] text-center text-muted-foreground">
            Satisfait ou remboursé pendant 14 jours · Sans engagement
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook for easy trigger anywhere                                     */
/* ------------------------------------------------------------------ */

export function useUpgradeWindow(currentPlanId: string) {
  const [state, setState] = useState<{
    open: boolean;
    trigger: UpgradeTrigger;
    currentLimit?: number;
  }>({ open: false, trigger: "cities_limit" });

  const showUpgrade = (trigger: UpgradeTrigger, currentLimit?: number) => {
    setState({ open: true, trigger, currentLimit });
  };

  const upgradeProps: UpgradeWindowProps = {
    open: state.open,
    onOpenChange: (open) => setState((s) => ({ ...s, open })),
    trigger: state.trigger,
    currentPlanId,
    currentLimit: state.currentLimit,
  };

  return { showUpgrade, upgradeProps };
}
