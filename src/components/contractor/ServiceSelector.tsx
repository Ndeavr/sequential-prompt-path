/**
 * UNPRO — Service Selector with plan-based limits, AI suggestions, upsell
 * Primary services = most visible on profile/SEO pages
 * Secondary services = additional offerings, limited by plan
 */
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, X, Sparkles, Lock, Crown, Wrench,
} from "lucide-react";
import UpgradeWindow from "./UpgradeWindow";

export interface ServiceSelection {
  primaryServices: string[];
  secondaryServices: string[];
}

interface ServiceSelectorProps {
  selection: ServiceSelection;
  onSelectionChange: (sel: ServiceSelection) => void;
  maxPrimary: number;
  maxSecondary: number;
  planName: string;
  planCode: string;
  /** AI-suggested services from imported site data */
  aiSuggestions?: string[];
}

/** Plan limits for services */
export const SERVICE_LIMITS: Record<string, { primary: number; secondary: number }> = {
  recrue: { primary: 2, secondary: 2 },
  pro: { primary: 3, secondary: 5 },
  premium: { primary: 4, secondary: 10 },
  elite: { primary: 6, secondary: 15 },
  signature: { primary: 8, secondary: 20 },
};

const NEXT_PLAN: Record<string, string> = {
  recrue: "Pro", pro: "Premium", premium: "Élite", elite: "Signature", signature: "Signature",
};

const NEXT_PLAN_LIMITS: Record<string, { primary: number; secondary: number }> = {
  recrue: SERVICE_LIMITS.pro,
  pro: SERVICE_LIMITS.premium,
  premium: SERVICE_LIMITS.elite,
  elite: SERVICE_LIMITS.signature,
  signature: SERVICE_LIMITS.signature,
};

/** Master service list — grouped by trade */
const SERVICE_CATALOG: { group: string; services: string[] }[] = [
  {
    group: "Toiture",
    services: [
      "Réfection de toiture", "Réparation de toiture", "Inspection de toiture",
      "Ventilation d'entretoit", "Gouttières et fascia", "Déneigement de toiture",
    ],
  },
  {
    group: "Isolation & Étanchéité",
    services: [
      "Isolation d'entretoit", "Isolation des murs", "Isolation du sous-sol",
      "Calfeutrage", "Pare-vapeur", "Test d'infiltrométrie",
    ],
  },
  {
    group: "Plomberie",
    services: [
      "Réparation de fuites", "Installation sanitaire", "Chauffe-eau",
      "Débouchage de drains", "Plomberie de salle de bain", "Plomberie commerciale",
    ],
  },
  {
    group: "Électricité",
    services: [
      "Mise à niveau du panneau", "Installation de prises", "Éclairage",
      "Câblage réseau", "Borne de recharge EV", "Inspection électrique",
    ],
  },
  {
    group: "Fondation & Structure",
    services: [
      "Réparation de fissures", "Imperméabilisation", "Drain français",
      "Soutènement", "Nivellement", "Inspection structurale",
    ],
  },
  {
    group: "CVC / Chauffage",
    services: [
      "Installation de fournaise", "Climatisation", "Thermopompe",
      "Plancher chauffant", "Ventilation mécanique", "Entretien CVC",
    ],
  },
  {
    group: "Rénovation générale",
    services: [
      "Rénovation de cuisine", "Rénovation de salle de bain", "Sous-sol",
      "Agrandissement", "Design intérieur", "Gestion de projet",
    ],
  },
  {
    group: "Décontamination",
    services: [
      "Décontamination de vermiculite", "Traitement de moisissure", "Amiante",
      "Pyrite", "Radon", "Nettoyage post-sinistre",
    ],
  },
  {
    group: "Extérieur",
    services: [
      "Paysagement", "Pavage", "Clôture", "Terrasse et patio",
      "Maçonnerie", "Revêtement extérieur",
    ],
  },
  {
    group: "Fenêtres & Portes",
    services: [
      "Remplacement de fenêtres", "Installation de portes", "Portes de garage",
      "Fenêtres écoénergétiques", "Moustiquaires",
    ],
  },
];

const ALL_SERVICES = SERVICE_CATALOG.flatMap((g) => g.services);

export default function ServiceSelector({
  selection, onSelectionChange, maxPrimary, maxSecondary,
  planName, planCode, aiSuggestions = [],
}: ServiceSelectorProps) {
  const [search, setSearch] = useState("");
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellType, setUpsellType] = useState<"primary" | "secondary">("primary");
  

  const isPrimary = (s: string) => selection.primaryServices.includes(s);
  const isSecondary = (s: string) => selection.secondaryServices.includes(s);
  const isSelected = (s: string) => isPrimary(s) || isSecondary(s);

  const primaryCount = selection.primaryServices.length;
  const secondaryCount = selection.secondaryServices.length;
  const primaryRemaining = maxPrimary - primaryCount;
  const secondaryRemaining = maxSecondary - secondaryCount;

  // AI suggestions not yet selected
  const activeSuggestions = useMemo(
    () => aiSuggestions.filter((s) => !isSelected(s)).slice(0, 4),
    [aiSuggestions, selection]
  );

  const filteredCatalog = useMemo(() => {
    if (!search.trim()) return SERVICE_CATALOG;
    const q = search.toLowerCase();
    return SERVICE_CATALOG
      .map((g) => ({
        ...g,
        services: g.services.filter((s) => s.toLowerCase().includes(q)),
      }))
      .filter((g) => g.services.length > 0);
  }, [search]);

  const handleToggle = (service: string, asPrimary: boolean) => {
    if (isPrimary(service)) {
      // Remove from primary
      onSelectionChange({
        ...selection,
        primaryServices: selection.primaryServices.filter((s) => s !== service),
      });
      return;
    }
    if (isSecondary(service)) {
      // Remove from secondary
      onSelectionChange({
        ...selection,
        secondaryServices: selection.secondaryServices.filter((s) => s !== service),
      });
      return;
    }

    // Adding new
    if (asPrimary) {
      if (primaryCount >= maxPrimary) {
        setUpsellType("primary");
        setShowUpsell(true);
        return;
      }
      onSelectionChange({
        ...selection,
        primaryServices: [...selection.primaryServices, service],
      });
    } else {
      if (secondaryCount >= maxSecondary) {
        setUpsellType("secondary");
        setShowUpsell(true);
        return;
      }
      onSelectionChange({
        ...selection,
        secondaryServices: [...selection.secondaryServices, service],
      });
    }
  };

  const promoteToPrimary = (service: string) => {
    if (primaryCount >= maxPrimary) {
      setUpsellType("primary");
      setShowUpsell(true);
      return;
    }
    onSelectionChange({
      primaryServices: [...selection.primaryServices, service],
      secondaryServices: selection.secondaryServices.filter((s) => s !== service),
    });
  };

  const demoteToSecondary = (service: string) => {
    if (secondaryCount >= maxSecondary) {
      setUpsellType("secondary");
      setShowUpsell(true);
      return;
    }
    onSelectionChange({
      primaryServices: selection.primaryServices.filter((s) => s !== service),
      secondaryServices: [...selection.secondaryServices, service],
    });
  };

  const nextLimits = NEXT_PLAN_LIMITS[planCode] || { primary: 4, secondary: 10 };

  return (
    <div className="space-y-4">
      {/* Counters */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 bg-primary/5 rounded-lg px-3 py-2 border border-primary/20">
          <Crown className="w-4 h-4 text-primary shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-foreground">{primaryCount}/{maxPrimary}</p>
            <p className="text-[10px] text-muted-foreground">Principaux</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-accent/30 rounded-lg px-3 py-2 border border-border">
          <Wrench className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-foreground">{secondaryCount}/{maxSecondary}</p>
            <p className="text-[10px] text-muted-foreground">Secondaires</p>
          </div>
        </div>
      </div>

      {/* Selected primary services */}
      {selection.primaryServices.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Services principaux</p>
          <div className="flex flex-wrap gap-1.5">
            {selection.primaryServices.map((s) => (
              <Badge
                key={s}
                className="bg-primary/10 text-primary border-primary/30 text-xs gap-1 cursor-pointer hover:bg-destructive/10"
                variant="outline"
                onClick={() => handleToggle(s, true)}
              >
                <Crown className="w-3 h-3" /> {s} <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Selected secondary services */}
      {selection.secondaryServices.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Services secondaires</p>
          <div className="flex flex-wrap gap-1.5">
            {selection.secondaryServices.map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="text-xs gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => handleToggle(s, false)}
              >
                {s} <X className="w-3 h-3" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* AI suggestions */}
      {activeSuggestions.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-primary uppercase tracking-wide flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Recommandé d'ajouter
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {activeSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleToggle(s, primaryCount < maxPrimary)}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 text-left hover:bg-primary/10 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground flex-1">{s}</span>
                <Badge variant="outline" className="text-[9px] border-primary/30 text-primary shrink-0">
                  + Ajouter
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un service…"
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Service catalog */}
      <div className="space-y-3 max-h-72 overflow-y-auto">
        {filteredCatalog.map((group) => (
          <div key={group.group} className="space-y-1">
            <p className="text-[11px] font-semibold text-muted-foreground px-1">{group.group}</p>
            <div className="grid grid-cols-1 gap-1">
              {group.services.map((service) => {
                const primary = isPrimary(service);
                const secondary = isSecondary(service);
                const selected = primary || secondary;
                const locked = !selected && primaryRemaining <= 0 && secondaryRemaining <= 0;
                const isSuggested = aiSuggestions.includes(service) && !selected;

                return (
                  <div
                    key={service}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all ${
                      primary
                        ? "bg-primary/10 border-primary/40 text-foreground font-medium"
                        : secondary
                        ? "bg-accent/30 border-accent/50 text-foreground"
                        : locked
                        ? "bg-muted/30 border-border text-muted-foreground opacity-60"
                        : "bg-card border-border text-muted-foreground hover:border-primary/30 cursor-pointer"
                    }`}
                  >
                    <span className="flex-1">{service}</span>

                    {isSuggested && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-primary/30 text-primary shrink-0">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" /> Suggéré
                      </Badge>
                    )}

                    {primary && (
                      <>
                        <Badge variant="default" className="text-[9px] h-4 shrink-0">Principal</Badge>
                        <button
                          className="text-[9px] text-muted-foreground hover:text-foreground"
                          onClick={() => demoteToSecondary(service)}
                        >
                          ↓
                        </button>
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleToggle(service, true)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}

                    {secondary && (
                      <>
                        <button
                          className="text-[9px] text-primary hover:underline shrink-0"
                          onClick={() => promoteToPrimary(service)}
                        >
                          ↑ Principal
                        </button>
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => handleToggle(service, false)}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}

                    {!selected && !locked && (
                      <div className="flex gap-1 shrink-0">
                        {primaryRemaining > 0 && (
                          <button
                            className="text-[9px] text-primary hover:underline"
                            onClick={() => handleToggle(service, true)}
                          >
                            ★ Principal
                          </button>
                        )}
                        <button
                          className="text-[9px] text-muted-foreground hover:text-foreground"
                          onClick={() => handleToggle(service, false)}
                        >
                          + Secondaire
                        </button>
                      </div>
                    )}

                    {locked && <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Upsell */}
      <UpgradeWindow
        open={showUpsell}
        onOpenChange={setShowUpsell}
        trigger="services_limit"
        currentPlanId={planCode}
        currentLimit={upsellType === "primary" ? maxPrimary : maxSecondary}
      />
    </div>
  );
}
