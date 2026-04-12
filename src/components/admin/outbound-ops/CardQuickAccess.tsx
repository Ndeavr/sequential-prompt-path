import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LucideIcon, ArrowRight } from "lucide-react";
import BadgePipelineState from "./BadgePipelineState";

interface CardQuickAccessProps {
  title: string;
  summary: string;
  status: string;
  icon: LucideIcon;
  href: string;
  ctaLabel?: string;
}

export default function CardQuickAccess({ title, summary, status, icon: Icon, href, ctaLabel = "Ouvrir" }: CardQuickAccessProps) {
  const nav = useNavigate();
  return (
    <Card className="hover:border-primary/30 transition-colors cursor-pointer group" onClick={() => nav(href)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-5 w-5 text-primary" /></div>
          <BadgePipelineState state={status} />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{summary}</p>
        </div>
        <Button variant="ghost" size="sm" className="w-full justify-between text-xs group-hover:text-primary">
          {ctaLabel} <ArrowRight className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
}
