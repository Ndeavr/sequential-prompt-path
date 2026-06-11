import { CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  strengths: string[];
  weaknesses: string[];
}

export default function AIObservationsCard({ strengths, weaknesses }: Props) {
  return (
    <div className="glass-strong rounded-[28px] p-5 space-y-5">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <h4 className="text-readable font-semibold text-sm uppercase tracking-wider">Forces</h4>
        </div>
        <ul className="space-y-1.5">
          {strengths.map((s, i) => (
            <li key={i} className="text-readable-body text-sm flex gap-2">
              <span className="text-emerald-400">✓</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-white/5 pt-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h4 className="text-readable font-semibold text-sm uppercase tracking-wider">Opportunités</h4>
        </div>
        <ul className="space-y-1.5">
          {weaknesses.map((w, i) => (
            <li key={i} className="text-readable-body text-sm flex gap-2">
              <span className="text-amber-400">!</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
