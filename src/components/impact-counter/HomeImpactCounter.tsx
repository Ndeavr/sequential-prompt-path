import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useImpactSnapshot, fmtHours } from "@/hooks/useImpactSnapshot";
import { impactScenario, impactAnimationProgress } from "@/lib/impactScenario";
import { Button } from "@/components/ui/button";
import "./impact-dials.css";

/** One sweep per mounted visit; subsequent server updates never reset it. */
function useDialEntrance(ready: boolean) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);
  useEffect(() => {
    if (!visible || !ready) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let stopped = false;
    const finish = () => {
      stopped = true;
      cancelAnimationFrame(frame);
      setProgress(1);
    };
    const tick = (now: number) => {
      if (stopped) return;
      if (startedAt.current === null) startedAt.current = now;
      const next = impactAnimationProgress(now - startedAt.current);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick);
    };
    const onPreference = () => { if (preference.matches) finish(); };
    if (preference.matches) finish();
    else frame = requestAnimationFrame(tick);
    preference.addEventListener?.("change", onPreference);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      preference.removeEventListener?.("change", onPreference);
    };
  }, [visible, ready]);
  return { ref, progress };
}

export default function HomeImpactCounter() {
  const { data } = useImpactSnapshot();
  const scenario = impactScenario(data);
  const { ref, progress } = useDialEntrance(Boolean(scenario));
  const metrics = [
    { label: "Temps total potentiel", value: scenario?.total },
    { label: "Propriétaire", value: scenario?.homeowner },
    { label: "Entrepreneur", value: scenario?.contractor },
  ];

  return (
    <section ref={ref} aria-labelledby="impact-home-title" className="impact-dials home-light mx-auto w-full max-w-3xl px-5 py-8 sm:py-12">
        <h2 id="impact-home-title" className="text-2xl font-semibold text-foreground">
          Le bon match. Moins de temps perdu.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Impact potentiel estimé de l'IA depuis le 1er janvier 2026</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Estimations fondées sur des hypothèses explicites, non sur les résultats UNPRO.</p>
        <p className="mt-5 font-medium text-foreground">Scénario type : un projet, un jumelage exclusif.</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Illustration par parcours, pas un total sectoriel cumulé.</p>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map((metric, index) => (
            <div key={metric.label} className={`impact-instrument ${index === 0 ? "col-span-2 sm:col-span-1" : ""}`}>
              <dt className="impact-instrument-label">{metric.label}</dt>
              <dd className="sr-only">{metric.value === undefined ? "Données en consolidation" : `${fmtHours(metric.value)}, estimation par parcours type`}</dd>
              <div className="impact-instrument-face" aria-hidden="true">
                <svg viewBox="0 0 220 120" focusable="false">
                  <path className="impact-instrument-track" d="M 20 108 A 90 90 0 0 1 200 108" pathLength="100" />
                  <path className="impact-instrument-ticks" d="M 29 108 H 35 M 40 65 L 45 68 M 68 37 L 71 42 M 110 27 V 33 M 152 37 L 149 42 M 180 65 L 175 68 M 185 108 H 191" />
                  <path className="impact-instrument-arc" d="M 20 108 A 90 90 0 0 1 200 108" pathLength="100" strokeDasharray={`${metric.value === undefined ? 0 : progress * 100} 100`} />
                </svg>
                <p className="impact-instrument-value" data-impact-value={metric.label}>
                  {metric.value === undefined ? "—" : (metric.value * progress).toLocaleString("fr-CA", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                  {metric.value !== undefined && <span className="impact-instrument-unit"> h</span>}
                </p>
              </div>
            </div>
          ))}
        </dl>
        {!scenario && <p role="status" className="mt-3 text-sm text-muted-foreground">Données en consolidation. Aucun total sectoriel validé.</p>}
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Économies en dollars : données en consolidation. Aucun montant vérifié pour ce scénario.</p>
        <Button asChild variant="link" className="mt-2 h-auto min-h-11 whitespace-normal px-0 text-left">
          <Link to="/impact#calcul">Comment nous calculons →</Link>
        </Button>
    </section>
  );
}
