import { useEffect, useState } from "react";
import { Channel, describeNextOpening, loadWindows, SendWindowRow } from "@/lib/communications/sendWindow";

interface Props {
  channel: Channel;
  className?: string;
}

export function SendWindowBadge({ channel, className = "" }: Props) {
  const [rows, setRows] = useState<SendWindowRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadWindows(channel).then((r) => {
      if (!cancelled) {
        setRows(r);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [channel]);

  if (loading) {
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground ${className}`}>
        Chargement…
      </span>
    );
  }

  const { open, label } = describeNextOpening(rows);
  const tone = open
    ? "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30"
    : "bg-amber-500/15 text-amber-200 border border-amber-400/30";

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${tone} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${open ? "bg-emerald-400" : "bg-amber-400"}`} />
      {channel.toUpperCase()} · {label}
    </span>
  );
}
