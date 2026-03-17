/**
 * UNPRO — Team Builder Panel
 * Create project teams with scope coverage and compatibility.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users, Plus, X, CheckCircle2, UserPlus, Sparkles, Wrench
} from "lucide-react";

interface TeamMember {
  id: string;
  contractor_id: string;
  role_label: string;
  scope_slugs: string[];
  status: string;
  contractor?: {
    business_name: string;
    specialty?: string;
    city?: string;
  };
}

interface Team {
  id: string;
  team_name?: string;
  status: string;
  compatibility_score: number;
  confidence_score: number;
  members: TeamMember[];
}

interface Props {
  teams: Team[];
  onCreateTeam: (name: string) => void;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted/20 text-muted-foreground",
  active: "bg-success/10 text-success",
  completed: "bg-primary/10 text-primary",
  invited: "bg-warning/10 text-warning",
  accepted: "bg-success/10 text-success",
  declined: "bg-destructive/10 text-destructive",
};

const TeamBuilderPanel = ({ teams, onCreateTeam }: Props) => {
  const [newTeamName, setNewTeamName] = useState("");

  return (
    <div className="space-y-4">
      {/* Create team */}
      <div className="flex gap-2">
        <Input
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
          placeholder="Nom de l'équipe projet..."
          className="flex-1 h-9 text-xs rounded-xl bg-card/40 border-border/30"
        />
        <Button
          size="sm"
          className="h-9 rounded-xl text-xs"
          disabled={!newTeamName.trim()}
          onClick={() => { onCreateTeam(newTeamName.trim()); setNewTeamName(""); }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Créer
        </Button>
      </div>

      {/* Teams list */}
      {teams.map((team, i) => (
        <motion.div
          key={team.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
          className="rounded-xl border border-border/30 bg-card/30 p-4 space-y-3"
        >
          {/* Header */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground flex-1">{team.team_name || "Équipe sans nom"}</h3>
            <Badge className={`text-[9px] ${statusColors[team.status] || statusColors.draft}`}>
              {team.status === "draft" ? "Brouillon" : team.status === "active" ? "Active" : "Terminée"}
            </Badge>
          </div>

          {/* Scores */}
          <div className="flex gap-4">
            <div className="text-center">
              <div className="relative w-10 h-10 mx-auto">
                <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--muted)/0.2)" strokeWidth="3" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--primary))" strokeWidth="3"
                    strokeDasharray={2 * Math.PI * 16} strokeDashoffset={2 * Math.PI * 16 * (1 - team.compatibility_score / 100)}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                  {Math.round(team.compatibility_score)}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">Compat.</p>
            </div>
            <div className="text-center">
              <div className="relative w-10 h-10 mx-auto">
                <svg viewBox="0 0 40 40" className="w-10 h-10 -rotate-90">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--muted)/0.2)" strokeWidth="3" />
                  <circle cx="20" cy="20" r="16" fill="none" stroke="hsl(var(--accent))" strokeWidth="3"
                    strokeDasharray={2 * Math.PI * 16} strokeDashoffset={2 * Math.PI * 16 * (1 - team.confidence_score / 100)}
                    strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                  {Math.round(team.confidence_score)}
                </span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-1">Confiance</p>
            </div>
          </div>

          {/* Members */}
          <div className="space-y-1.5">
            {team.members.map(member => (
              <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/20 bg-card/20">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {member.contractor?.business_name || "Membre"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{member.role_label}</p>
                </div>
                <Badge className={`text-[9px] h-4 ${statusColors[member.status] || statusColors.invited}`}>
                  {member.status === "invited" ? "Invité" : member.status === "accepted" ? "Accepté" : "Refusé"}
                </Badge>
              </div>
            ))}
            {team.members.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-2">Aucun membre ajouté</p>
            )}
          </div>
        </motion.div>
      ))}

      {teams.length === 0 && (
        <div className="text-center py-10">
          <Users className="w-7 h-7 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Aucune équipe projet créée</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Créez une équipe pour les projets nécessitant plusieurs spécialistes</p>
        </div>
      )}
    </div>
  );
};

export default TeamBuilderPanel;
