import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useImpactSnapshot, fmtHours, fmtDateQc } from "@/hooks/useImpactSnapshot";

/** Brief highlight only when the server value actually changes. */
function useChanged(value: unknown) {
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (prev.current !== undefined && prev.current !== value) {
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 900);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value]);
  return flash;
}

export default function HomeImpactCounter() {
  const { data, error, loading } = useImpactSnapshot();
  const flash = useChanged(data?.hours_saved);

  const hours = loading && !data ? "…" : data ? fmtHours(data.hours_saved) : "Indisponible";
  const dollars = data && data.dollars_status === "measured" && data.dollars_saved != null
    ? `${data.dollars_saved.toLocaleString("fr-CA")} $`
    : loading && !data ? "…" : "Mesure en cours";

  return (
    <section aria-labelledby="impact-home-title" className="mx-auto w-full max-w-xl px-4 py-6">
      <div className="rounded-[28px] border border-border bg-card/80 p-5 shadow-sm backdrop-blur">
        <h2 id="impact-home-title" className="text-base font-semibold tracking-tight text-foreground">
          Le bon match. Moins de temps perdu.
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-3" aria-live="polite">
          <div className="min-w-0 rounded-2xl bg-muted/50 p-3">
            <dt className="text-xs text-muted-foreground">Heures épargnées</dt>
            <dd className={`mt-1 truncate text-2xl font-semibold tabular-nums text-foreground transition-colors duration-700 motion-reduce:transition-none ${flash ? "text-primary" : ""}`}>
              {hours}
            </dd>
            {data && <span className="text-[11px] text-muted-foreground">Estimation</span>}
          </div>
          <div className="min-w-0 rounded-2xl bg-muted/50 p-3">
            <dt className="text-xs text-muted-foreground">$ épargnés</dt>
            <dd className="mt-1 truncate text-lg font-semibold tabular-nums text-foreground">{dollars}</dd>
            {data && data.dollars_status !== "measured" && (
              <span className="text-[11px] text-muted-foreground">Aucune source vérifiée</span>
            )}
          </div>
        </dl>
        <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
          {data
            ? `Depuis le ${fmtDateQc(data.period_start)} · ${data.eligible_matches} rendez-vous confirmés · mis à jour ${fmtDateQc(data.computed_at)}${error ? " (dernière valeur connue)" : ""}`
            : error ? "Données momentanément indisponibles." : "Chargement…"}
        </p>
        <Link
          to="/impact"
          className="mt-3 inline-block rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Comprendre notre impact →
        </Link>
      </div>
    </section>
  );
}
