/**
 * AlexErrorBoundary — Isolates Alex UI crashes from the rest of the app.
 */
import React from "react";
import { hardResetAlexSession } from "./services/alexHardRecovery";

interface State { hasError: boolean; }

export default class AlexErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error: Error) {
    console.error("[AlexErrorBoundary]", error);
    try { hardResetAlexSession("react_error_boundary"); } catch {}
  }

  reset = () => {
    try { hardResetAlexSession("user_recover"); } catch {}
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="fixed bottom-4 right-4 z-[100] max-w-sm rounded-2xl border border-border/40 bg-card/90 backdrop-blur-xl p-4 shadow-2xl">
        <p className="text-sm text-foreground mb-3">
          Alex a été réinitialisée. Vous pouvez continuer.
        </p>
        <div className="flex gap-2">
          <button
            onClick={this.reset}
            className="text-xs px-3 py-1.5 rounded-full bg-primary text-primary-foreground hover:opacity-90"
          >
            Relancer Alex
          </button>
        </div>
      </div>
    );
  }
}
