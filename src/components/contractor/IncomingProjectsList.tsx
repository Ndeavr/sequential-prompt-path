/**
 * UNPRO — Incoming Projects List (Contractor Engine)
 * Premium SaaS cards showing matched projects with scope coverage.
 */

import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CheckCircle2, AlertTriangle, ArrowRight, MapPin, Clock, DollarSign,
  Zap, Target, Users, Star, Calendar, ChevronRight, Sparkles
} from "lucide-react";
import type { IncomingProject, MatchType } from "@/types/contractorEngine";

const matchTypeConfig: Record<MatchType, { label: string; color: string; bg: string; icon: any }> = {
  perfect: { label: "Match parfait", color: "text-success", bg: "bg-success/10 border-success/20", icon: CheckCircle2 },
  partial: { label: "Match partiel", color: "text-warning", bg: "bg-warning/10 border-warning/20", icon: AlertTriangle },
  subcontract_needed: { label: "Sous-traitance requise", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20", icon: Users },
};

const f = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] } },
  exit: { opacity: 0, y: -8 },
});

interface Props {
  projects: IncomingProject[];
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onFindSub: (id: string) => void;
  onBuildTeam: (id: string) => void;
}

const IncomingProjectsList = ({ projects, onAccept, onDecline, onFindSub, onBuildTeam }: Props) => {
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<string>("score");

  const filtered = projects.filter(p => {
    if (filter === "perfect") return p.match_type === "perfect";
    if (filter === "partial") return p.match_type === "partial";
    if (filter === "sub") return p.match_type === "subcontract_needed";
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "score") return b.match_score - a.match_score;
    if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sort === "urgency") return (a.urgency_level === "urgent" ? -1 : 1) - (b.urgency_level === "urgent" ? -1 : 1);
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs rounded-xl bg-card/40 border-border/30">
            <SelectValue placeholder="Filtrer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les projets</SelectItem>
            <SelectItem value="perfect">Match parfait</SelectItem>
            <SelectItem value="partial">Match partiel</SelectItem>
            <SelectItem value="sub">Sous-traitance</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[140px] h-9 text-xs rounded-xl bg-card/40 border-border/30">
            <SelectValue placeholder="Trier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Meilleur score</SelectItem>
            <SelectItem value="newest">Plus récent</SelectItem>
            <SelectItem value="urgency">Urgence</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{sorted.length} projet{sorted.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Cards */}
      <AnimatePresence mode="popLayout">
        {sorted.map((project, i) => {
          const config = matchTypeConfig[project.match_type];
          const Icon = config.icon;

          return (
            <motion.div
              key={project.id}
              {...f(i)}
              layout
              className={`rounded-2xl border ${config.bg} backdrop-blur-sm p-4 space-y-3 hover:shadow-[var(--shadow-md)] transition-shadow`}
            >
              {/* Header: Score + Category + Flags */}
              <div className="flex items-start gap-3">
                <div className="relative w-12 h-12 flex-shrink-0">
                  <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--muted)/0.2)" strokeWidth="3" />
                    <circle cx="24" cy="24" r="20" fill="none"
                      stroke={project.match_type === "perfect" ? "hsl(var(--success))" : project.match_type === "partial" ? "hsl(var(--warning))" : "hsl(var(--destructive))"}
                      strokeWidth="3" strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - project.match_score / 100)} strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">{project.match_score}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-foreground">{project.project_category}</h3>
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.color} ${config.bg}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.ai_summary_fr}</p>
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                {project.city && (
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.city}</span>
                )}
                {project.budget_range && (
                  <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{project.budget_range}</span>
                )}
                {project.timeline && (
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{project.timeline}</span>
                )}
                {project.preferred_date && (
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(project.preferred_date).toLocaleDateString("fr-CA")}</span>
                )}
                {project.urgency_level === "urgent" && (
                  <span className="flex items-center gap-1 text-destructive font-semibold"><Zap className="w-3 h-3" />Urgent</span>
                )}
              </div>

              {/* Scope Coverage Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Couverture de votre champ</span>
                  <span className="font-bold text-foreground">{project.scope_coverage.coverage_percent}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      project.scope_coverage.coverage_percent >= 90 ? "bg-success" :
                      project.scope_coverage.coverage_percent >= 50 ? "bg-warning" : "bg-destructive"
                    }`}
                    style={{ width: `${project.scope_coverage.coverage_percent}%` }}
                  />
                </div>
                {project.scope_coverage.out_of_scope.length > 0 && (
                  <p className="text-[10px] text-muted-foreground/70">
                    Hors champ : {project.scope_coverage.out_of_scope.slice(0, 3).join(", ")}
                    {project.scope_coverage.out_of_scope.length > 3 && ` +${project.scope_coverage.out_of_scope.length - 3}`}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {project.match_type === "perfect" && (
                  <Button size="sm" className="flex-1 h-8 rounded-xl text-xs font-semibold bg-success hover:bg-success/90 text-success-foreground" onClick={() => onAccept(project.id)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accepter
                  </Button>
                )}
                {project.match_type === "partial" && (
                  <>
                    <Button size="sm" className="flex-1 h-8 rounded-xl text-xs font-semibold" onClick={() => onAccept(project.id)}>
                      Accepter
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs border-border/30" onClick={() => onFindSub(project.id)}>
                      <Users className="w-3.5 h-3.5 mr-1" /> Sous-traitant
                    </Button>
                  </>
                )}
                {project.match_type === "subcontract_needed" && (
                  <>
                    <Button size="sm" variant="outline" className="flex-1 h-8 rounded-xl text-xs border-border/30" onClick={() => onBuildTeam(project.id)}>
                      <Users className="w-3.5 h-3.5 mr-1" /> Créer une équipe
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 rounded-xl text-xs border-border/30" onClick={() => onFindSub(project.id)}>
                      <Target className="w-3.5 h-3.5 mr-1" /> Sous-traitant
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="h-8 rounded-xl text-xs text-destructive/70 hover:text-destructive hover:bg-destructive/5" onClick={() => onDecline(project.id)}>
                  Refuser
                </Button>
                <Link to={`/pro/leads/${project.id}`}>
                  <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl p-0">
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {sorted.length === 0 && (
        <div className="text-center py-12">
          <Sparkles className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Aucun projet en attente</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Les projets correspondant à votre profil apparaîtront ici</p>
        </div>
      )}
    </div>
  );
};

export default IncomingProjectsList;
