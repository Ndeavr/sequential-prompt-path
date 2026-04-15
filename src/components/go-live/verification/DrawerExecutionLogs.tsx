import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  meta?: Record<string, unknown>;
}

interface DrawerExecutionLogsProps {
  open: boolean;
  onClose: () => void;
  title: string;
  logs: LogEntry[];
}

const levelColors: Record<string, string> = {
  info: "bg-blue-500/20 text-blue-400",
  warn: "bg-yellow-500/20 text-yellow-400",
  error: "bg-red-500/20 text-red-400",
};

export default function DrawerExecutionLogs({ open, onClose, title, logs }: DrawerExecutionLogsProps) {
  return (
    <Drawer open={open} onOpenChange={(o) => !o && onClose()}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="text-sm">{title}</DrawerTitle>
          <DrawerDescription className="text-xs">{logs.length} entrées</DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="px-4 pb-4 max-h-[60vh]">
          <div className="space-y-1.5 font-mono text-[11px]">
            {logs.length === 0 && <p className="text-muted-foreground text-center py-4">Aucun log</p>}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 items-start p-1.5 rounded bg-muted/30">
                <span className="text-muted-foreground flex-shrink-0 w-16">{new Date(log.timestamp).toLocaleTimeString("fr-CA")}</span>
                <Badge variant="outline" className={`text-[9px] px-1 py-0 flex-shrink-0 ${levelColors[log.level] || ""}`}>{log.level}</Badge>
                <span className="break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
