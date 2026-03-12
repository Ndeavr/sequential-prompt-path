import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useSyndicateVotes, useVoteResponses, useSyndicateMembers, useSubmitVote } from "@/hooks/useSyndicate";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Vote, Plus, CheckCircle2, Clock, XCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";

const statusMap: Record<string, { label: string; variant: any; icon: any }> = {
  draft: { label: "Brouillon", variant: "outline", icon: Clock },
  open: { label: "Ouvert", variant: "default", icon: Vote },
  closed: { label: "Fermé", variant: "secondary", icon: CheckCircle2 },
  cancelled: { label: "Annulé", variant: "destructive", icon: XCircle },
};

const VoteCard = ({ vote, syndicateId }: { vote: any; syndicateId: string }) => {
  const { user } = useAuth();
  const { data: responses } = useVoteResponses(vote.id);
  const { data: members } = useSyndicateMembers(syndicateId);
  const submitVote = useSubmitVote();
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);

  const totalMembers = members?.length ?? 0;
  const totalResponses = responses?.length ?? 0;
  const participation = totalMembers > 0 ? (totalResponses / totalMembers) * 100 : 0;
  const quorumMet = participation >= (vote.quorum_percentage ?? 50);

  const userMember = members?.find((m: any) => m.user_id === user?.id);
  const userVoted = responses?.some((r: any) => r.user_id === user?.id);

  const choiceResults = (vote.syndicate_vote_choices ?? []).map((c: any) => {
    const count = responses?.filter((r: any) => r.choice_id === c.id).length ?? 0;
    return { ...c, count, pct: totalResponses > 0 ? (count / totalResponses) * 100 : 0 };
  });

  const handleVote = async () => {
    if (!selectedChoice || !userMember) return;
    try {
      await submitVote.mutateAsync({ vote_id: vote.id, choice_id: selectedChoice, member_id: userMember.id });
      toast.success("Vote enregistré !");
    } catch {
      toast.error("Erreur lors du vote.");
    }
  };

  const cfg = statusMap[vote.status] || statusMap.draft;
  const Icon = cfg.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{vote.title}</CardTitle>
            {vote.description && <p className="text-sm text-muted-foreground mt-1">{vote.description}</p>}
          </div>
          <Badge variant={cfg.variant} className="flex items-center gap-1">
            <Icon className="h-3 w-3" /> {cfg.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Participation */}
        <div>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Participation
            </span>
            <span className="font-medium">{totalResponses}/{totalMembers} ({participation.toFixed(0)}%)</span>
          </div>
          <Progress value={participation} className="h-2" />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">Quorum: {vote.quorum_percentage}%</span>
            <Badge variant={quorumMet ? "default" : "outline"} className="text-xs">
              {quorumMet ? "Quorum atteint" : "Quorum non atteint"}
            </Badge>
          </div>
        </div>

        {/* Results / Vote */}
        <div className="space-y-2">
          {choiceResults.map((c: any) => (
            <div
              key={c.id}
              onClick={() => !userVoted && vote.status === "open" && setSelectedChoice(c.id)}
              className={`relative p-3 rounded-lg border transition-all cursor-pointer ${
                selectedChoice === c.id
                  ? "border-primary bg-primary/5"
                  : "border-border/30 hover:border-border/60"
              } ${userVoted || vote.status !== "open" ? "pointer-events-none" : ""}`}
            >
              <div className="flex items-center justify-between relative z-10">
                <span className="text-sm font-medium">{c.label}</span>
                <span className="text-sm font-semibold">{c.pct.toFixed(0)}% ({c.count})</span>
              </div>
              <div
                className="absolute inset-0 rounded-lg bg-primary/8 transition-all"
                style={{ width: `${c.pct}%` }}
              />
            </div>
          ))}
        </div>

        {vote.status === "open" && !userVoted && userMember && (
          <Button
            onClick={handleVote}
            disabled={!selectedChoice || submitVote.isPending}
            className="w-full"
          >
            {submitVote.isPending ? "Envoi…" : "Soumettre mon vote"}
          </Button>
        )}

        {userVoted && (
          <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Vous avez déjà voté
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const SyndicateVotes = () => {
  const { id } = useParams<{ id: string }>();
  const { data: votes, isLoading } = useSyndicateVotes(id);

  if (isLoading) return <DashboardLayout><LoadingState /></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader
        title="Votes"
        description="Résolutions et assemblées"
        action={
          <Button asChild size="sm">
            <Link to={`/dashboard/syndicates/${id}/votes/new`}><Plus className="h-4 w-4 mr-1" /> Nouveau vote</Link>
          </Button>
        }
      />

      {!votes?.length ? (
        <EmptyState
          icon={<Vote className="h-10 w-10 text-muted-foreground/40" />}
          message="Aucun vote — Créez une résolution pour commencer."
          action={
            <Button asChild>
              <Link to={`/dashboard/syndicates/${id}/votes/new`}><Plus className="h-4 w-4 mr-1" /> Créer un vote</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {votes.map((vote: any, i: number) => (
            <motion.div key={vote.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <VoteCard vote={vote} syndicateId={id!} />
            </motion.div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default SyndicateVotes;
