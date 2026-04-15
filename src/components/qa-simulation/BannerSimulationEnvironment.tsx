import { FlaskConical, Server, ShieldCheck } from "lucide-react";

const ENV_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  test: { icon: <FlaskConical className="w-4 h-4" />, label: "Environnement Test", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  staging: { icon: <Server className="w-4 h-4" />, label: "Environnement Staging", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
  "safe-production": { icon: <ShieldCheck className="w-4 h-4" />, label: "Safe Production Check", color: "bg-red-500/10 text-red-400 border-red-500/30" },
};

interface Props {
  environment: string;
}

export default function BannerSimulationEnvironment({ environment }: Props) {
  const cfg = ENV_CONFIG[environment] || ENV_CONFIG.test;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${cfg.color}`}>
      {cfg.icon}
      <span className="font-medium">{cfg.label}</span>
    </div>
  );
}
