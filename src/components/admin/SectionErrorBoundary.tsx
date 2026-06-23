/**
 * UNPRO — SectionErrorBoundary
 * Isolates a dashboard section so a single failed query/render never
 * brings down the whole admin page.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  onRetry?: () => void;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[SectionErrorBoundary]", this.props.title, error, info);
  }

  reset = () => {
    this.setState({ error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || "Erreur inconnue";
      return (
        <Card className="p-4 border-amber-500/40 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-amber-200">
                Composant indisponible — {this.props.title}
              </div>
              <div className="text-xs text-muted-foreground mt-1 break-words font-mono">
                {msg.length > 240 ? msg.slice(0, 240) + "…" : msg}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={this.reset} className="shrink-0">
              <RotateCw className="h-3 w-3 mr-1" /> Réessayer
            </Button>
          </div>
        </Card>
      );
    }
    return this.props.children;
  }
}

export default SectionErrorBoundary;
