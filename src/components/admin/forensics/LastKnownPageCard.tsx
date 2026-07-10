/**
 * UNPRO — Last-known page card (prominent).
 */
import { MapPin } from "lucide-react";

export default function LastKnownPageCard({ path }: { path: string | null }) {
  return (
    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 backdrop-blur-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-blue-100">Dernière page connue</h3>
      </div>
      <div className="font-mono text-lg break-all text-blue-50">
        {path || "—"}
      </div>
    </div>
  );
}
