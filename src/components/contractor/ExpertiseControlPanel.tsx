/**
 * UNPRO — Expertise Control Panel
 * Manage capabilities, exclusions, and see real-time impact on project matching.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, XCircle, Plus, Trash2, Wrench, Ban,
  Eye, Settings2, Sparkles, ArrowRight
} from "lucide-react";
import type { ExpertisePreview } from "@/types/contractorEngine";

interface Capability {
  id: string;
  capability_type: string;
  category_slug?: string;
  service_slug?: string;
  material_slug?: string;
  structure_type?: string;
  building_type?: string;
}

interface Exclusion {
  id: string;
  exclusion_type: string;
  category_slug?: string;
  service_slug?: string;
  material_slug?: string;
  structure_type?: string;
  building_type?: string;
  reason_fr?: string;
}

interface Props {
  capabilities: Capability[];
  exclusions: Exclusion[];
  preview: ExpertisePreview;
  onAddCapability: (cap: { capability_type: string; service_slug: string }) => void;
  onRemoveCapability: (id: string) => void;
  onAddExclusion: (excl: { exclusion_type: string; service_slug: string; reason_fr?: string }) => void;
  onRemoveExclusion: (id: string) => void;
  executionModel?: {
    execution_mode: string;
    works_as_subcontractor: boolean;
    accepts_subcontractors: boolean;
    max_distance_km: number;
  };
  onUpdateExecution?: (model: any) => void;
}

const ExpertiseControlPanel = ({
  capabilities, exclusions, preview,
  onAddCapability, onRemoveCapability, onAddExclusion, onRemoveExclusion,
  executionModel, onUpdateExecution
}: Props) => {
  const [newCap, setNewCap] = useState("");
  const [newExcl, setNewExcl] = useState("");
  const [exclReason, setExclReason] = useState("");
  const [tab, setTab] = useState<"capabilities" | "exclusions" | "execution" | "preview">("capabilities");

  const getLabel = (item: Capability | Exclusion) =>
    item.service_slug || item.category_slug || item.material_slug || item.structure_type || item.building_type || "—";

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/10 border border-border/20 overflow-x-auto">
        {[
          { key: "capabilities" as const, label: "Compétences", icon: Wrench, count: capabilities.length },
          { key: "exclusions" as const, label: "Exclusions", icon: Ban, count: exclusions.length },
          { key: "execution" as const, label: "Mode d'exécution", icon: Settings2 },
          { key: "preview" as const, label: "Aperçu impact", icon: Eye },
        ].map(t => (
          <button
            key={t.key}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab(t.key)}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {"count" in t && t.count !== undefined && <span className="text-[10px] text-muted-foreground">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Capabilities */}
      {tab === "capabilities" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newCap}
              onChange={e => setNewCap(e.target.value)}
              placeholder="Ajouter une compétence (ex: isolation-grenier)"
              className="flex-1 h-9 text-xs rounded-xl bg-card/40 border-border/30"
            />
            <Button
              size="sm"
              className="h-9 rounded-xl text-xs"
              disabled={!newCap.trim()}
              onClick={() => { onAddCapability({ capability_type: "service", service_slug: newCap.trim() }); setNewCap(""); }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Ajouter
            </Button>
          </div>
          <div className="space-y-1.5">
            {capabilities.map(cap => (
              <div key={cap.id} className="flex items-center gap-2 p-2 rounded-lg border border-success/20 bg-success/[0.03]">
                <CheckCircle2 className="w-3.5 h-3.5 text-success flex-shrink-0" />
                <span className="text-xs text-foreground flex-1">{getLabel(cap)}</span>
                <Badge variant="outline" className="text-[9px] h-4">{cap.capability_type}</Badge>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onRemoveCapability(cap.id)}>
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
            {capabilities.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Aucune compétence déclarée</p>
            )}
          </div>
        </div>
      )}

      {/* Exclusions */}
      {tab === "exclusions" && (
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                value={newExcl}
                onChange={e => setNewExcl(e.target.value)}
                placeholder="Exclure un service (ex: toit-plat)"
                className="flex-1 h-9 text-xs rounded-xl bg-card/40 border-border/30"
              />
            </div>
            <Input
              value={exclReason}
              onChange={e => setExclReason(e.target.value)}
              placeholder="Raison (optionnel)"
              className="h-9 text-xs rounded-xl bg-card/40 border-border/30"
            />
            <Button
              size="sm"
              className="h-9 rounded-xl text-xs w-full"
              disabled={!newExcl.trim()}
              onClick={() => {
                onAddExclusion({ exclusion_type: "service", service_slug: newExcl.trim(), reason_fr: exclReason || undefined });
                setNewExcl("");
                setExclReason("");
              }}
            >
              <Ban className="w-3.5 h-3.5 mr-1" /> Ajouter une exclusion
            </Button>
          </div>
          <div className="space-y-1.5">
            {exclusions.map(excl => (
              <div key={excl.id} className="flex items-center gap-2 p-2 rounded-lg border border-destructive/20 bg-destructive/[0.03]">
                <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground">{getLabel(excl)}</span>
                  {excl.reason_fr && <p className="text-[10px] text-muted-foreground">{excl.reason_fr}</p>}
                </div>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onRemoveExclusion(excl.id)}>
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
            {exclusions.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Aucune exclusion déclarée</p>
            )}
          </div>
        </div>
      )}

      {/* Execution mode */}
      {tab === "execution" && executionModel && onUpdateExecution && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Mode d'exécution</Label>
            <Select
              value={executionModel.execution_mode}
              onValueChange={v => onUpdateExecution({ execution_mode: v })}
            >
              <SelectTrigger className="h-9 text-xs rounded-xl bg-card/40 border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Exécution directe</SelectItem>
                <SelectItem value="hybrid">Hybride (direct + sous-traitance)</SelectItem>
                <SelectItem value="subcontract">Sous-traitance principalement</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-card/30">
            <div>
              <p className="text-xs font-semibold text-foreground">Mode sous-traitant</p>
              <p className="text-[10px] text-muted-foreground">Apparaître dans les résultats de sous-traitance</p>
            </div>
            <Switch
              checked={executionModel.works_as_subcontractor}
              onCheckedChange={v => onUpdateExecution({ works_as_subcontractor: v })}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-card/30">
            <div>
              <p className="text-xs font-semibold text-foreground">Accepter les sous-traitants</p>
              <p className="text-[10px] text-muted-foreground">Permettre les recommandations d'équipe</p>
            </div>
            <Switch
              checked={executionModel.accepts_subcontractors}
              onCheckedChange={v => onUpdateExecution({ accepts_subcontractors: v })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Distance maximale : {executionModel.max_distance_km} km</Label>
            <input
              type="range"
              min={5}
              max={200}
              value={executionModel.max_distance_km}
              onChange={e => onUpdateExecution({ max_distance_km: parseInt(e.target.value) })}
              className="w-full accent-primary"
            />
          </div>
        </div>
      )}

      {/* Preview */}
      {tab === "preview" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Aperçu de l'impact de votre configuration sur les projets reçus
          </p>

          <div className="rounded-xl border border-success/20 bg-success/[0.03] p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-success">
              <CheckCircle2 className="w-4 h-4" />
              Projets que vous recevrez
            </div>
            {preview.included_examples.map((ex, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-foreground pl-6">
                <ArrowRight className="w-3 h-3 text-success/60" />
                <span>{ex.label_fr}</span>
              </div>
            ))}
            {preview.included_examples.length === 0 && (
              <p className="text-[10px] text-muted-foreground pl-6">Ajoutez des compétences pour voir les projets inclus</p>
            )}
          </div>

          <div className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-destructive">
              <XCircle className="w-4 h-4" />
              Projets exclus
            </div>
            {preview.excluded_examples.map((ex, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground pl-6">
                <ArrowRight className="w-3 h-3 text-destructive/60 mt-0.5" />
                <div>
                  <span>{ex.label_fr}</span>
                  {ex.reason_fr && <p className="text-[10px] text-muted-foreground">{ex.reason_fr}</p>}
                </div>
              </div>
            ))}
            {preview.excluded_examples.length === 0 && (
              <p className="text-[10px] text-muted-foreground pl-6">Ajoutez des exclusions pour voir les projets filtrés</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpertiseControlPanel;
