import { cn } from "@/lib/utils";

export default function BadgeModelEstimateLive({ className }: { className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider",
      "bg-primary/15 text-primary border border-primary/20",
      className
    )}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
      </span>
      Estimation en direct
    </span>
  );
}
