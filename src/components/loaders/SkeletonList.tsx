export default function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/30 bg-card/50 p-4 animate-pulse">
          <div className="h-5 w-1/3 rounded bg-muted/30 mb-3" />
          <div className="h-4 w-full rounded bg-muted/20 mb-2" />
          <div className="h-4 w-2/3 rounded bg-muted/20" />
        </div>
      ))}
    </div>
  );
}
