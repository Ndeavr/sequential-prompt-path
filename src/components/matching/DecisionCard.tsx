/**
 * UNPRO — Decision Assistant Card
 * Single contractor decision card with explanation, strengths, cautions, and action.
 */

import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck, CheckCircle, AlertTriangle, MapPin, Star,
  Phone, Calendar, Upload, Sparkles, ArrowRight,
} from "lucide-react";
import type { DecisionSuggestion } from "@/services/contractor/decisionAssistantEngine";

interface DecisionCardProps {
  suggestion: DecisionSuggestion;
}

const ACTION_CONFIG: Record<
  DecisionSuggestion["suggested_action"],
  { icon: typeof Phone; variant: "default" | "outline" | "secondary"; route: (id: string) => string }
> = {
  contact: { icon: Phone, variant: "default", route: (id) => `/contractors/${id}` },
  book: { icon: Calendar, variant: "default", route: (id) => `/dashboard/book/${id}` },
  upload_quote: { icon: Upload, variant: "secondary", route: () => "/dashboard/quotes/upload" },
  ask_alex: { icon: Sparkles, variant: "outline", route: () => "/alex" },
};

const DecisionCard = ({ suggestion }: DecisionCardProps) => {
  const { contractor: c, priority_rank, explanation_fr, strengths_fr, cautions_fr, suggested_action, action_label_fr } = suggestion;
  const actionCfg = ACTION_CONFIG[suggested_action];
  const isTop = priority_rank === 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: priority_rank * 0.06, duration: 0.35 }}
    >
      <Card className={`relative overflow-hidden transition-all ${isTop ? "ring-2 ring-primary/30 shadow-glow" : ""}`}>
        {isTop && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
        )}

        <CardContent className="p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
                {c.logo_url ? (
                  <img src={c.logo_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-base font-bold text-muted-foreground">
                    {(c.business_name ?? "?")[0]}
                  </span>
                )}
              </div>
              {isTop && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-[9px] font-bold text-primary-foreground">1</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-display font-semibold text-sm truncate">{c.business_name}</h3>
                {c.admin_verified && <ShieldCheck className="w-3.5 h-3.5 text-success shrink-0" />}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {c.city && (
                  <span className="flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" /> {c.city}
                  </span>
                )}
                {c.specialty && (
                  <>
                    <span className="text-border">·</span>
                    <span className="truncate">{c.specialty}</span>
                  </>
                )}
              </div>
              {c.rating && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="w-3 h-3 text-warning fill-warning" />
                  <span className="text-xs font-medium">{c.rating}</span>
                  <span className="text-[10px] text-muted-foreground">({c.review_count ?? 0})</span>
                </div>
              )}
            </div>

            {/* Rank badge */}
            <Badge
              variant="outline"
              className={`shrink-0 text-xs px-2 ${isTop ? "border-primary/30 text-primary bg-primary/5" : "border-border/40"}`}
            >
              #{priority_rank}
            </Badge>
          </div>

          {/* Explanation */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border/20 mb-3">
            <p className="text-xs text-foreground leading-relaxed">{explanation_fr}</p>
          </div>

          {/* Strengths */}
          {strengths_fr.length > 0 && (
            <div className="space-y-1 mb-2">
              {strengths_fr.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <CheckCircle className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Cautions */}
          {cautions_fr.length > 0 && (
            <div className="space-y-1 mb-3">
              {cautions_fr.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{c}</span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-1">
            <Button asChild size="sm" variant={actionCfg.variant} className="flex-1">
              <Link to={actionCfg.route(suggestion.contractor.id)}>
                <actionCfg.icon className="w-3.5 h-3.5 mr-1.5" />
                {action_label_fr}
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link to={`/contractors/${suggestion.contractor.id}`}>
                Voir le profil <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DecisionCard;
