import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw, ArrowRight } from "lucide-react";

export default function PageContractorJoinResume() {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-lg w-full space-y-6 text-center">
        <div className="flex justify-center">
          <div className="bg-amber-500/20 rounded-full p-4">
            <RotateCcw className="h-12 w-12 text-amber-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Reprendre votre inscription</h1>
          <p className="text-muted-foreground text-sm">
            Votre offre est toujours disponible. Reprenez là où vous avez arrêté pour activer votre compte UNPRO.
          </p>
        </div>

        <Card className="bg-card/80 backdrop-blur border-border/50">
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-medium">Votre offre est toujours valide</p>
            <p className="text-xs text-muted-foreground">Les places sont limitées dans votre territoire. Ne manquez pas cette opportunité.</p>
          </CardContent>
        </Card>

        <Button size="lg" className="w-full" onClick={() => window.location.href = `/join/${token}`}>
          Reprendre mon inscription <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
