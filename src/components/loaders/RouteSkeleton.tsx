/**
 * RouteSkeleton — lightweight, scoped loading placeholder for guards & lazy routes.
 * Does NOT block the layout; renders a header bar + body blocks so navigation
 * always feels instant.
 */
export default function RouteSkeleton({ label }: { label?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="h-14 border-b border-border/30 bg-background/80 backdrop-blur" />
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <div className="h-8 w-2/3 rounded-md bg-muted/30 animate-pulse" />
        <div className="h-4 w-1/2 rounded bg-muted/20 animate-pulse" />
        <div className="grid gap-3 mt-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/15 animate-pulse" />
          ))}
        </div>
        {label ? (
          <p className="sr-only">{label}</p>
        ) : null}
      </div>
    </div>
  );
}
