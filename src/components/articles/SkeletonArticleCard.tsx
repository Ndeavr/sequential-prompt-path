export default function SkeletonArticleCard() {
  return (
    <div className="rounded-xl border border-border/30 bg-card/50 overflow-hidden animate-pulse">
      <div className="aspect-[16/9] bg-muted/20" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-muted/20" />
          <div className="h-5 w-12 rounded-full bg-muted/20" />
        </div>
        <div className="h-5 w-4/5 rounded bg-muted/20" />
        <div className="h-4 w-full rounded bg-muted/10" />
        <div className="h-4 w-2/3 rounded bg-muted/10" />
      </div>
    </div>
  );
}
