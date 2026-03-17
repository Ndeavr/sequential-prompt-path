/**
 * UNPRO — Partner Network Panel
 * Manage trusted partners, favorites, blocked contractors.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Star, Heart, Ban, Users, MessageSquare, Award,
  ChevronRight, Plus, MoreHorizontal
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface Partner {
  id: string;
  partner_contractor_id: string;
  relationship_type: string;
  status: string;
  internal_rating: number;
  success_rate: number;
  collaboration_count: number;
  is_favorite: boolean;
  is_blocked: boolean;
  private_notes?: string;
  partner?: {
    business_name: string;
    specialty?: string;
    city?: string;
    logo_url?: string;
    rating?: number;
  };
}

interface Props {
  partners: Partner[];
  onToggleFavorite: (id: string, current: boolean) => void;
  onToggleBlock: (id: string, current: boolean) => void;
  onUpdateNotes: (id: string, notes: string) => void;
}

const f = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.35 } },
});

const PartnerNetworkPanel = ({ partners, onToggleFavorite, onToggleBlock, onUpdateNotes }: Props) => {
  const [tab, setTab] = useState<"all" | "favorites" | "blocked">("all");
  const [editingNotes, setEditingNotes] = useState<string | null>(null);

  const filtered = partners.filter(p => {
    if (tab === "favorites") return p.is_favorite && !p.is_blocked;
    if (tab === "blocked") return p.is_blocked;
    return !p.is_blocked;
  });

  const tabs = [
    { key: "all" as const, label: "Tous", count: partners.filter(p => !p.is_blocked).length },
    { key: "favorites" as const, label: "Favoris", count: partners.filter(p => p.is_favorite).length },
    { key: "blocked" as const, label: "Bloqués", count: partners.filter(p => p.is_blocked).length },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/10 border border-border/20">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
              tab === t.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label} {t.count > 0 && <span className="ml-1 text-[10px] text-muted-foreground">({t.count})</span>}
          </button>
        ))}
      </div>

      {/* Partner cards */}
      {filtered.map((partner, i) => (
        <motion.div
          key={partner.id}
          {...f(i)}
          className={`rounded-xl border p-3 space-y-2 transition-all ${
            partner.is_blocked
              ? "border-destructive/20 bg-destructive/[0.03]"
              : partner.is_favorite
                ? "border-primary/20 bg-primary/[0.03]"
                : "border-border/30 bg-card/30"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-foreground flex-shrink-0">
              {partner.partner?.business_name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground truncate">
                  {partner.partner?.business_name || "Entrepreneur"}
                </span>
                {partner.is_favorite && <Heart className="w-3 h-3 text-primary fill-primary" />}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {partner.partner?.specialty && <span>{partner.partner.specialty}</span>}
                {partner.partner?.city && <><span>·</span><span>{partner.partner.city}</span></>}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onToggleFavorite(partner.id, partner.is_favorite)}>
                  <Heart className="w-3.5 h-3.5 mr-2" />
                  {partner.is_favorite ? "Retirer des favoris" : "Marquer favori"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingNotes(editingNotes === partner.id ? null : partner.id)}>
                  <MessageSquare className="w-3.5 h-3.5 mr-2" />
                  Notes privées
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onToggleBlock(partner.id, partner.is_blocked)}
                >
                  <Ban className="w-3.5 h-3.5 mr-2" />
                  {partner.is_blocked ? "Débloquer" : "Bloquer"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stats */}
          <div className="flex gap-4 text-[10px]">
            <div>
              <span className="text-muted-foreground">Collaborations</span>
              <p className="font-bold text-foreground">{partner.collaboration_count}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Taux de succès</span>
              <p className="font-bold text-foreground">{Math.round(partner.success_rate * 100)}%</p>
            </div>
            {partner.partner?.rating && partner.partner.rating > 0 && (
              <div>
                <span className="text-muted-foreground">Note publique</span>
                <p className="font-bold text-foreground flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 text-yellow-400" />{partner.partner.rating.toFixed(1)}
                </p>
              </div>
            )}
            {partner.internal_rating > 0 && (
              <div>
                <span className="text-muted-foreground">Note interne</span>
                <p className="font-bold text-foreground">{partner.internal_rating.toFixed(1)}/5</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {editingNotes === partner.id && (
            <div className="space-y-1.5 pt-1">
              <Textarea
                defaultValue={partner.private_notes || ""}
                placeholder="Notes privées sur ce partenaire..."
                className="min-h-[50px] text-xs rounded-lg bg-card/40 border-border/30"
                onBlur={e => {
                  onUpdateNotes(partner.id, e.target.value);
                  setEditingNotes(null);
                }}
              />
            </div>
          )}
        </motion.div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-10">
          <Users className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">
            {tab === "favorites" ? "Aucun partenaire favori" : tab === "blocked" ? "Aucun partenaire bloqué" : "Aucun partenaire dans votre réseau"}
          </p>
        </div>
      )}
    </div>
  );
};

export default PartnerNetworkPanel;
