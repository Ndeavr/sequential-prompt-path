/**
 * PanelTrustSignalsUltra — Dynamic trust badges: RBQ, NEQ, reviews, AI-verified.
 */
import { Shield, CheckCircle2, Star, Award } from "lucide-react";

interface Props {
  rbqVerified?: boolean;
  neqConfirmed?: boolean;
  reviewScore?: number;
  reviewCount?: number;
  aiVerified?: boolean;
}

export default function PanelTrustSignalsUltra({
  rbqVerified = true,
  neqConfirmed = true,
  reviewScore = 4.8,
  reviewCount = 127,
  aiVerified = true,
}: Props) {
  const badges = [
    { active: rbqVerified, icon: Shield, label: "RBQ vérifié", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    { active: neqConfirmed, icon: CheckCircle2, label: "NEQ confirmé", color: "text-green-400 bg-green-500/10 border-green-500/20" },
    { active: true, icon: Star, label: `${reviewScore} (${reviewCount} avis)`, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
    { active: aiVerified, icon: Award, label: "Vérifié par IA", color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {badges.filter(b => b.active).map((b, i) => (
        <div
          key={i}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${b.color}`}
        >
          <b.icon className="w-3.5 h-3.5" />
          {b.label}
        </div>
      ))}
    </div>
  );
}
