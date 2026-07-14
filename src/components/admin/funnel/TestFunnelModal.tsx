import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRunFunnelTest, type TestRunResult } from "@/hooks/useFunnelDebug";
import { X, Check, AlertCircle } from "lucide-react";

export default function TestFunnelModal({ onClose }: { onClose: () => void }) {
  const [phone, setPhone] = useState("+15142499522");
  const [name, setName] = useState("Test Funnel Debug");
  const [category, setCategory] = useState("Plombier");
  const [city, setCity] = useState("Montréal");
  const [result, setResult] = useState<TestRunResult | null>(null);
  const run = useRunFunnelTest();

  const onRun = async () => {
    setResult(null);
    try {
      const r = await run.mutateAsync({ phone, name, category, city });
      setResult(r);
    } catch (e: any) {
      setResult({ ok: false, trace: [], first_break: { step: "invocation", detail: { error: e.message } } });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-start md:items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card border border-border/30 rounded-2xl w-full max-w-2xl p-6 my-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Tester le funnel complet</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label className="text-xs">
            Téléphone
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm font-mono" />
          </label>
          <label className="text-xs">
            Entreprise
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">
            Catégorie
            <input value={category} onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">
            Ville
            <input value={city} onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm" />
          </label>
        </div>

        <Button onClick={onRun} disabled={run.isPending} className="w-full">
          {run.isPending ? "Exécution en cours… (jusqu'à 45s)" : "Lancer le test E2E"}
        </Button>

        {result && (
          <div className="mt-4 space-y-2">
            <div className={`rounded-xl p-3 border ${result.first_break ? "border-red-500/40 bg-red-500/10" : "border-emerald-500/40 bg-emerald-500/10"}`}>
              <div className="flex items-center gap-2 font-semibold text-sm">
                {result.first_break ? <AlertCircle className="w-4 h-4 text-red-400" /> : <Check className="w-4 h-4 text-emerald-400" />}
                {result.first_break ? `Rupture à: ${result.first_break.step}` : "SMS livré — attend clic utilisateur"}
              </div>
              {result.first_break?.detail?.error && (
                <div className="text-xs text-red-300 mt-1">{String(result.first_break.detail.error)}</div>
              )}
              {result.note && <div className="text-xs text-muted-foreground mt-2">{result.note}</div>}
              {result.sms_url && (
                <div className="text-xs mt-2">
                  URL SMS: <a href={result.sms_url} target="_blank" className="text-primary underline break-all">{result.sms_url}</a>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/30 p-3">
              <div className="text-xs font-semibold mb-2">Trace</div>
              <ul className="space-y-1">
                {result.trace.map((t, i) => (
                  <li key={i} className="text-xs flex items-start gap-2">
                    {t.ok ? <Check className="w-3 h-3 text-emerald-400 mt-0.5" /> : <X className="w-3 h-3 text-red-400 mt-0.5" />}
                    <span className="font-mono text-muted-foreground">{new Date(t.at).toLocaleTimeString("fr-CA")}</span>
                    <span className="font-semibold">{t.step}</span>
                    {t.detail && <span className="text-muted-foreground truncate">{JSON.stringify(t.detail).slice(0, 120)}</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
