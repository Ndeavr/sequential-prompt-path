import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, ExternalLink } from "lucide-react";

interface DomainData {
  domain: string;
  status: string;
  website_live: boolean;
  screenshot_url: string | null;
}

export function PanelProspectWebsiteCapture({ domain }: { domain: DomainData }) {
  return (
    <Card className="border-border/40">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" /> Capture site
          </CardTitle>
          <a href={`https://${domain.domain}`} target="_blank" rel="noopener" className="text-xs text-primary flex items-center gap-1 hover:underline">
            {domain.domain} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent>
        {domain.screenshot_url ? (
          <div className="rounded-lg overflow-hidden border border-border/30">
            <img
              src={domain.screenshot_url}
              alt={`Capture de ${domain.domain}`}
              className="w-full h-auto object-cover max-h-48"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Aucune capture disponible</p>
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className={domain.website_live ? "bg-emerald-500/10 text-emerald-400 text-xs" : "bg-red-500/10 text-red-400 text-xs"}>
            {domain.website_live ? "En ligne" : "Hors ligne"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
