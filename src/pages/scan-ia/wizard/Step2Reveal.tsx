import WizardShell from "./WizardShell";
import { useScanWizardState } from "./useScanWizardState";
import { Sparkles } from "lucide-react";

export default function Step2Reveal() {
  const { report } = useScanWizardState();
  const reveal = report?.company_reveal ?? {};
  const logo = reveal.logo_url as string | null;
  const cats: string[] = reveal.categories ?? [];
  const cities: string[] = reveal.service_cities ?? [];

  return (
    <WizardShell primaryLabel="Voir mon classement">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-6">
          {logo ? (
            <img
              src={logo}
              alt={report?.business_name ?? ""}
              className="h-20 w-20 rounded-2xl object-contain bg-white p-2"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-sky-500/30 to-emerald-500/20 flex items-center justify-center text-3xl font-bold text-white">
              {(report?.business_name ?? "?").slice(0, 1)}
            </div>
          )}
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white mb-3 max-w-sm">
          {report?.business_name}
        </h1>

        {cats.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center mb-4">
            {cats.map((c) => (
              <span
                key={c}
                className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/80"
              >
                {c}
              </span>
            ))}
          </div>
        )}

        {cities.length > 0 && (
          <p className="text-white/60 text-sm max-w-xs mb-8">
            Dessert&nbsp;: {cities.slice(0, 4).join(" · ")}
          </p>
        )}

        <div className="inline-flex items-center gap-2 text-sky-300 text-sm">
          <Sparkles className="h-4 w-4" />
          Alex a terminé votre évaluation
        </div>
      </div>
    </WizardShell>
  );
}
