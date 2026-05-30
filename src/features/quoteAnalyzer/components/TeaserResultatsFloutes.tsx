/**
 * TeaserResultatsFloutes — Blurred preview shown behind the auth gate.
 */
export default function TeaserResultatsFloutes({ fileCount }: { fileCount: number }) {
  return (
    <div className="pointer-events-none select-none blur-md opacity-60 space-y-4">
      <div className="rounded-2xl border border-border/60 bg-card/80 p-5 space-y-3">
        <div className="h-5 w-2/3 bg-muted rounded" />
        <div className="h-32 bg-muted rounded-xl" />
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/80 p-5 space-y-2">
        <div className="h-4 w-1/2 bg-muted rounded" />
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-4 w-2/3 bg-muted rounded" />
      </div>
      <p className="text-xs text-center text-muted-foreground blur-none">
        {fileCount} soumission{fileCount > 1 ? "s" : ""} analysée{fileCount > 1 ? "s" : ""}
      </p>
    </div>
  );
}
