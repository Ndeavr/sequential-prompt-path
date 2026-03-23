/**
 * UNPRO Condos — Voting & Decisions Page (Board only)
 */
import CondoLayout from "@/layouts/CondoLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Vote, CheckCircle2, Clock, AlertTriangle } from "lucide-react";

const mockVotes = [
  { id: "1", title: "Remplacement toiture 2026", status: "active", yesVotes: 12, noVotes: 3, totalUnits: 20, deadline: "2026-04-15" },
  { id: "2", title: "Augmentation cotisations spéciales", status: "active", yesVotes: 8, noVotes: 7, totalUnits: 20, deadline: "2026-04-20" },
  { id: "3", title: "Mandat gestionnaire Copro+", status: "closed", yesVotes: 16, noVotes: 4, totalUnits: 20, deadline: "2026-03-01" },
];

export default function CondoVotingPage() {
  return (
    <CondoLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Votes & décisions</h1>
            <p className="text-sm text-muted-foreground mt-1">Gérez les résolutions et suivez les votes du syndicat</p>
          </div>
          <Button className="rounded-xl gap-2">
            <Plus className="h-4 w-4" /> Créer un vote
          </Button>
        </div>

        <div className="space-y-4">
          {mockVotes.map((vote) => {
            const participation = ((vote.yesVotes + vote.noVotes) / vote.totalUnits) * 100;
            const approval = vote.yesVotes + vote.noVotes > 0
              ? (vote.yesVotes / (vote.yesVotes + vote.noVotes)) * 100
              : 0;
            const isActive = vote.status === "active";

            return (
              <Card key={vote.id} className="border-border/30">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${isActive ? "bg-primary/10" : "bg-muted/50"}`}>
                        <Vote className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{vote.title}</p>
                        <p className="text-xs text-muted-foreground">Échéance : {vote.deadline}</p>
                      </div>
                    </div>
                    <Badge variant={isActive ? "default" : "secondary"}>
                      {isActive ? "En cours" : "Fermé"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Participation ({Math.round(participation)}%)</p>
                      <Progress value={participation} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">{vote.yesVotes + vote.noVotes} / {vote.totalUnits} unités</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Approbation ({Math.round(approval)}%)</p>
                      <Progress value={approval} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">Pour : {vote.yesVotes} · Contre : {vote.noVotes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </CondoLayout>
  );
}
