import React from "react";
import { Home, RotateCcw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const CHUNK_RELOAD_FLAG = "unpro_chunk_reload";

export function isChunkLoadError(error: unknown): boolean {
  const msg = String((error as any)?.message ?? error ?? "");
  const name = String((error as any)?.name ?? "");
  return (
    name === "ChunkLoadError" ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Loading chunk [\w-]+ failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

export function tryRecoverFromChunkError(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_FLAG) === "1") return false;
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
  } catch {
    /* sessionStorage unavailable — bail */
    return false;
  }
  console.warn("[AppErrorBoundary] stale chunk detected — reloading once", error);
  window.location.reload();
  return true;
}

export function clearChunkReloadFlag() {
  try { sessionStorage.removeItem(CHUNK_RELOAD_FLAG); } catch { /* noop */ }
}

export default class AppErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    if (tryRecoverFromChunkError(error)) {
      return { hasError: false };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (tryRecoverFromChunkError(error)) return;
    console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-md space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Une erreur est survenue
            </h1>
            <p className="text-sm text-muted-foreground">
              L'application a rencontré un problème inattendu.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <RotateCcw className="h-4 w-4" />
                Recharger
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
              >
                <Home className="h-4 w-4" />
                Accueil
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
