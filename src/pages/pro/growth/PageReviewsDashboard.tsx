/**
 * Review Intelligence™ — Contractor dashboard
 */
import { useState } from "react";
import ContractorLayout from "@/layouts/ContractorLayout";
import { useContractorProfile } from "@/hooks/useContractor";
import { useReviewRequests, useReviews, useReputation } from "@/features/reviewIntelligence/hooks/useReviewRequests";
import SendRequestModal from "@/features/reviewIntelligence/components/SendRequestModal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared";
import { motion } from "framer-motion";
import { Send, Upload, Star, MessageSquare, TrendingUp, CheckCircle2, Sparkles, Users } from "lucide-react";
import { Link } from "react-router-dom";

const statusLabel: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "En attente", variant: "outline" },
  sent: { label: "Envoyé", variant: "secondary" },
  opened: { label: "Ouvert", variant: "secondary" },
  submitted: { label: "Soumis", variant: "default" },
  published: { label: "Publié", variant: "default" },
  expired: { label: "Expiré", variant: "outline" },
  failed: { label: "Échec", variant: "destructive" },
};

export default function PageReviewsDashboard() {
  const { data: profile, isLoading: pL } = useContractorProfile();
  const contractorId = profile?.id;
  const { data: requests, isLoading: rL } = useReviewRequests(contractorId);
  const { data: reviews, isLoading: revL } = useReviews(contractorId);
  const { data: reputation } = useReputation(contractorId);
  const [modalOpen, setModalOpen] = useState(false);

  if (pL || rL || revL) return <ContractorLayout><LoadingState /></ContractorLayout>;

  const reqs = requests ?? [];
  const revs = reviews ?? [];
  const sentCount = reqs.filter((r) => r.status !== "pending").length;
  const publishedCount = reqs.filter((r) => r.status === "published").length;
  const submittedCount = revs.length;
  const avgRating = revs.length ? revs.reduce((a, r) => a + r.rating, 0) / revs.length : 0;
  const googleConversion = sentCount ? Math.round((publishedCount / sentCount) * 100) : 0;
  const aiVisibility = reputation?.ai_visibility_score ?? 0;

  const kpis = [
    { icon: MessageSquare, label: "Avis collectés", value: submittedCount, color: "from-blue-500 to-cyan-500" },
    { icon: CheckCircle2, label: "Avis vérifiés", value: revs.filter((r) => r.is_verified).length, color: "from-emerald-500 to-teal-500" },
    { icon: Star, label: "Note moyenne", value: avgRating ? avgRating.toFixed(1) : "—", color: "from-amber-500 to-yellow-500" },
    { icon: Send, label: "Demandes envoyées", value: sentCount, color: "from-violet-500 to-purple-500" },
    { icon: TrendingUp, label: "Conversion Google", value: `${googleConversion}%`, color: "from-cyan-500 to-blue-500" },
    { icon: Sparkles, label: "Score visibilité IA", value: aiVisibility ? aiVisibility.toFixed(0) : "—", color: "from-primary to-cyan-400" },
  ];

  return (
    <ContractorLayout>
      <div className="dark max-w-5xl mx-auto space-y-6 pb-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-strong rounded-3xl p-6 md:p-8 border border-primary/20 relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-primary mb-2">Growth · Review Intelligence™</div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-1">
                Transformez vos clients en preuves
              </h1>
              <p className="text-sm text-muted-foreground">
                Envoyez, collectez et publiez des avis détaillés qui bâtissent la confiance et la visibilité IA.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setModalOpen(true)} className="rounded-full">
                <Send className="h-4 w-4 mr-2" />
                Envoyer une demande
              </Button>
              <Button variant="outline" className="rounded-full" disabled>
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </div>
          </div>
        </motion.div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {kpis.map((k, i) => {
            const Icon = k.icon;
            return (
              <motion.div
                key={k.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card className="glass-strong border border-white/5 p-4 rounded-2xl">
                  <div className={`h-9 w-9 rounded-xl bg-gradient-to-br ${k.color} flex items-center justify-center mb-3`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{k.label}</div>
                  <div className="text-2xl font-bold text-foreground">{k.value}</div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Requests list */}
        <Card className="glass-strong border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Demandes récentes</h2>
              <p className="text-xs text-muted-foreground">Suivi en temps réel</p>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          {reqs.length === 0 ? (
            <div className="p-10 text-center">
              <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">Aucune demande envoyée pour le moment.</p>
              <Button onClick={() => setModalOpen(true)} variant="outline" size="sm">
                Envoyer votre première demande
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {reqs.map((r) => (
                <div key={r.id} className="p-4 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-foreground truncate">{r.homeowner_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.project_type ?? "—"} {r.city ? `· ${r.city}` : ""} · {new Date(r.created_at).toLocaleDateString("fr-CA")}
                    </div>
                  </div>
                  <Badge variant={statusLabel[r.status]?.variant ?? "outline"}>
                    {statusLabel[r.status]?.label ?? r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="text-center text-xs text-muted-foreground">
          <Link to="/pro/review-intelligence" className="underline hover:text-foreground">Découvrir Review Intelligence™</Link>
        </div>

        {contractorId && (
          <SendRequestModal open={modalOpen} onOpenChange={setModalOpen} contractorId={contractorId} />
        )}
      </div>
    </ContractorLayout>
  );
}
