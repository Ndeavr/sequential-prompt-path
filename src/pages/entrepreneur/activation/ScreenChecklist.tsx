/**
 * Screen 5 — Smart Completion Checklist
 * "Alex complète mon profil" invokes real edge function; jump-to-payment at ≥70%.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, Building2, Shield, Wrench, MapPin, Image, Settings, Save, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useActivationFunnel } from "@/hooks/useActivationFunnel";
import { useHesitationRescue } from "@/hooks/useHesitationRescue";
import { useFounderSlots } from "@/hooks/useFounderSlots";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";
import EmptyStateFallback from "@/components/ui/EmptyStateFallback";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Section {
  key: string;
  title: string;
  icon: React.ElementType;
  estimatedMin: number;
  impactLabel: string;
  completionPercent: number;
}

export default function ScreenChecklist() {
  const navigate = useNavigate();
  const { state, updateFunnel, completionBySection, overallCompletion, saving, funnelId, pollImportStatus } = useActivationFunnel();
  const [openSection, setOpenSection] = useState<string | null>("identity");
  const [alexBusy, setAlexBusy] = useState(false);
  const founder = useFounderSlots();
  useHesitationRescue({ screenKey: "checklist" });

  const runAlexAutocomplete = async () => {
    if (!funnelId || alexBusy) return;
    setAlexBusy(true);
    try {
      const { error } = await supabase.functions.invoke("alex-autocomplete-profile", { body: { funnel_id: funnelId } });
      if (error) throw error;
      // Poll a few times to refresh state as steps complete
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        await pollImportStatus();
      }
      toast({ title: "Alex a complété votre profil", description: "Vérifiez chaque section ci-dessous — vous pouvez tout ajuster." });
    } catch (e) {
      toast({ title: "Alex n'a pas pu tout compléter", description: "Complétez les sections manuellement — vos données sont sauvegardées." , variant: "destructive" });
    } finally {
      setAlexBusy(false);
    }
  };

  const sections: Section[] = [
    { key: "identity", title: "Identité d'entreprise", icon: Building2, estimatedMin: 2, impactLabel: "Confiance", completionPercent: completionBySection.identity },
    { key: "compliance", title: "RBQ et conformité", icon: Shield, estimatedMin: 1, impactLabel: "Vérification", completionPercent: completionBySection.compliance },
    { key: "services", title: "Services offerts", icon: Wrench, estimatedMin: 2, impactLabel: "Matching", completionPercent: completionBySection.services },
    { key: "zones", title: "Zones de service", icon: MapPin, estimatedMin: 2, impactLabel: "Visibilité locale", completionPercent: completionBySection.zones },
    { key: "media", title: "Logo, photos et vidéos", icon: Image, estimatedMin: 3, impactLabel: "Conversion", completionPercent: completionBySection.media },
    { key: "preferences", title: "Préférences et capacité", icon: Settings, estimatedMin: 2, impactLabel: "Qualité des leads", completionPercent: completionBySection.preferences },
  ];

  const totalMinutes = sections.reduce((sum, s) => sum + (s.completionPercent < 100 ? s.estimatedMin : 0), 0);

  const DEMO_SERVICES = [
    "Isolation de toiture", "Décontamination", "Ventilation soffite",
    "Isolation murs", "Nettoyage conduits", "Réparation toiture",
    "Inspection résidentielle", "Évaluation énergétique",
  ];

  const DEMO_ZONES = [
    "Montréal", "Laval", "Longueuil", "Rive-Nord", "Rive-Sud",
    "Terrebonne", "Blainville", "Saint-Jérôme",
  ];

  const toggleService = (service: string) => {
    const current = state.selected_services;
    const updated = current.includes(service)
      ? current.filter(s => s !== service)
      : [...current, service];
    updateFunnel({ selected_services: updated });
  };

  const toggleZone = (zone: string) => {
    const current = state.selected_zones;
    const updated = current.includes(zone)
      ? current.filter(z => z !== zone)
      : [...current, zone];
    updateFunnel({ selected_zones: updated });
  };

  const handleContinue = () => navigate("/entrepreneur/activer/calendrier");

  return (
    <FunnelLayout currentStep="aipp_builder" showProgress={false}>
      <div className="max-w-lg mx-auto pb-24 sm:pb-0">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-foreground">Complétez votre profil</h1>
          {saving && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground animate-pulse">
              <Save className="w-3 h-3" /> Sauvegarde…
            </span>
          )}
          {!saving && overallCompletion > 0 && (
            <span className="flex items-center gap-1 text-xs text-emerald-500">
              <Check className="w-3 h-3" /> Sauvegardé
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-2">
          Chaque section améliore votre score et votre visibilité.
        </p>

        {/* Progress + time estimate */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${overallCompletion}%` }}
              />
            </div>
            <span className="text-xs font-medium text-foreground">{overallCompletion}%</span>
          </div>
          {totalMinutes > 0 && (
            <span className="text-xs text-muted-foreground">~{totalMinutes} min restantes</span>
          )}
        </div>

        {/* Alex — real autocomplete action */}
        <motion.button
          type="button"
          onClick={runAlexAutocomplete}
          disabled={alexBusy}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "w-full mb-4 rounded-2xl border p-4 text-left transition-all",
            alexBusy ? "border-primary/40 bg-primary/10" : "border-primary/30 bg-primary/5 hover:border-primary/50",
          )}
        >
          <div className="flex items-center gap-3">
            {alexBusy ? <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" /> : <Sparkles className="w-5 h-5 text-primary shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-foreground">
                {alexBusy ? "Alex analyse votre entreprise…" : "Alex complète mon profil"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {alexBusy
                  ? "Site, Google Business, RBQ, NEQ, logo, photos, catégories, villes."
                  : "Détection automatique : RBQ, NEQ, logo, photos, catégories, zones."}
              </div>
            </div>
            {!alexBusy && <ArrowRight className="w-4 h-4 text-primary shrink-0" />}
          </div>
        </motion.button>

        {/* Fast-path to payment when profile is credible */}
        {overallCompletion >= 70 && founder.remaining > 0 && (
          <motion.button
            type="button"
            onClick={async () => {
              await updateFunnel({ selected_plan: "founder", billing_cycle: "monthly" });
              navigate("/entrepreneur/activer/paiement");
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  Profil prêt à {overallCompletion}% — activez pour 1 $
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {founder.remaining}/{founder.total} places Fondateur restantes
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
          </motion.button>
        )}

        <div className="space-y-3">
          {sections.map((section) => (
            <motion.div
              key={section.key}
              className="rounded-xl border border-border/50 bg-card/50 overflow-hidden"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <button
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                onClick={() => setOpenSection(openSection === section.key ? null : section.key)}
              >
                <section.icon className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{section.title}</span>
                    <span className={cn(
                      "text-xs font-medium",
                      section.completionPercent === 100 ? "text-emerald-500" : "text-muted-foreground"
                    )}>
                      {section.completionPercent}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">{section.estimatedMin} min</span>
                    <span className="text-[10px] text-primary/60">• {section.impactLabel}</span>
                  </div>
                </div>
                {section.completionPercent === 100 ? (
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform shrink-0",
                    openSection === section.key && "rotate-180"
                  )} />
                )}
              </button>

              {openSection === section.key && (
                <div className="px-4 pb-4 pt-1 border-t border-border/30">
                  {section.key === "identity" && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Nom d'entreprise</Label>
                        <Input value={state.business_name} onChange={(e) => updateFunnel({ business_name: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Téléphone</Label>
                        <Input value={state.phone} onChange={(e) => updateFunnel({ phone: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Courriel</Label>
                        <Input value={state.email} onChange={(e) => updateFunnel({ email: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Site web</Label>
                        <Input value={state.website} onChange={(e) => updateFunnel({ website: e.target.value })} className="mt-1" />
                      </div>
                    </div>
                  )}

                  {section.key === "compliance" && (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Numéro de licence RBQ</Label>
                        <Input
                          placeholder="1234-5678-90"
                          value={(state.imported_data as any)?.rbq_number || ""}
                          onChange={(e) => updateFunnel({ imported_data: { ...state.imported_data, rbq_number: e.target.value } })}
                          className="mt-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">La vérification RBQ sera effectuée automatiquement.</p>
                    </div>
                  )}

                  {section.key === "services" && (
                    <>
                      {DEMO_SERVICES.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {DEMO_SERVICES.map(service => (
                            <button
                              key={service}
                              onClick={() => toggleService(service)}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                state.selected_services.includes(service)
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-card border-border/50 text-muted-foreground hover:border-primary/40"
                              )}
                            >
                              {service}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <EmptyStateFallback
                          title="Aucun service détecté"
                          description="Ajoutez vos services manuellement."
                          onManualAdd={() => {}}
                        />
                      )}
                    </>
                  )}

                  {section.key === "zones" && (
                    <div className="flex flex-wrap gap-2">
                      {DEMO_ZONES.map(zone => (
                        <button
                          key={zone}
                          onClick={() => toggleZone(zone)}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                            state.selected_zones.includes(zone)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card border-border/50 text-muted-foreground hover:border-primary/40"
                          )}
                        >
                          {zone}
                        </button>
                      ))}
                    </div>
                  )}

                  {section.key === "media" && (
                    <div className="text-center py-6 border-2 border-dashed border-border/50 rounded-xl">
                      <Image className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Glissez vos photos ici ou cliquez pour téléverser</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Logo, photos de projets, avant/après</p>
                    </div>
                  )}

                  {section.key === "preferences" && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {["Résidentiel", "Commercial", "Condo", "Urgences"].map(pref => (
                          <button
                            key={pref}
                            onClick={() => {
                              const current = state.preferences as Record<string, boolean>;
                              updateFunnel({ preferences: { ...current, [pref]: !current[pref] } });
                            }}
                            className={cn(
                              "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                              (state.preferences as any)?.[pref]
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card border-border/50 text-muted-foreground"
                            )}
                          >
                            {pref}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Desktop CTA */}
        <Button
          size="lg"
          className="w-full h-14 text-base font-semibold rounded-xl mt-6 hidden sm:flex"
          onClick={handleContinue}
        >
          Continuer
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>

      <StickyMobileCTA
        label="Continuer"
        onClick={handleContinue}
        icon={<ArrowRight className="w-5 h-5 mr-2" />}
      />
    </FunnelLayout>
  );
}
