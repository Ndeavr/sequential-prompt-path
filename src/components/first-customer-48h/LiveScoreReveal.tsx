/**
 * LiveScoreReveal — cinematic sequential reveal of the 5 AI score bars
 * while pro-score-instant runs in parallel.
 */
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

interface Scores {
  visibility: number;
  trust: number;
  authority: number;
  profile: number;
  growth: number;
}

interface Props {
  targets: Scores | null;
  onComplete: () => void;
}

const DIMENSIONS: { key: keyof Scores; label: string; caption: string }[] = [
  { key: "visibility", label: "Visibilité IA", caption: "Analyse des moteurs IA…" },
  { key: "trust", label: "Confiance numérique", caption: "Lecture des avis Google…" },
  { key: "authority", label: "Autorité locale", caption: "Cartographie du territoire…" },
  { key: "profile", label: "Profil entrepreneur", caption: "Audit du profil…" },
  { key: "growth", label: "Potentiel de croissance", caption: "Projection 12 mois…" },
];

const PLACEHOLDER: Scores = {
  visibility: 68,
  trust: 70,
  authority: 75,
  profile: 65,
  growth: 72,
};

const ROW_DURATION = 1100;
const ROW_STAGGER = 750;

function tone(v: number) {
  if (v >= 80) return "#10B981";
  if (v >= 65) return "#F5C85A";
  return "#F97316";
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

interface RowState {
  status: "pending" | "active" | "done";
  value: number;
  target: number;
}

export default function LiveScoreReveal({ targets, onComplete }: Props) {
  const [rows, setRows] = useState<RowState[]>(
    DIMENSIONS.map(() => ({ status: "pending", value: 0, target: 0 }))
  );
  const targetsRef = useRef<Scores | null>(targets);
  const completedRef = useRef(false);

  useEffect(() => {
    targetsRef.current = targets;
  }, [targets]);

  useEffect(() => {
    const timeouts: number[] = [];
    const rafs: number[] = [];

    DIMENSIONS.forEach((dim, i) => {
      const t = window.setTimeout(() => {
        const startTarget =
          (targetsRef.current ?? PLACEHOLDER)[dim.key];

        setRows((prev) => {
          const next = [...prev];
          next[i] = { status: "active", value: 0, target: startTarget };
          return next;
        });

        const start = performance.now();
        const tick = (now: number) => {
          const elapsed = now - start;
          const p = Math.min(1, elapsed / ROW_DURATION);
          const eased = easeOutCubic(p);
          const live =
            (targetsRef.current ?? PLACEHOLDER)[dim.key];
          const value = Math.round(eased * live);

          setRows((prev) => {
            const next = [...prev];
            if (next[i].status === "pending") return prev;
            next[i] = {
              status: p >= 1 ? "done" : "active",
              value,
              target: live,
            };
            return next;
          });

          if (p < 1) {
            rafs.push(requestAnimationFrame(tick));
          } else if (i === DIMENSIONS.length - 1 && !completedRef.current) {
            completedRef.current = true;
            window.setTimeout(onComplete, 350);
          }
        };
        rafs.push(requestAnimationFrame(tick));
      }, i * ROW_STAGGER);
      timeouts.push(t);
    });

    return () => {
      timeouts.forEach(clearTimeout);
      rafs.forEach(cancelAnimationFrame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="rounded-3xl p-5 md:p-6 border bg-white animate-fade-in"
      style={{
        borderColor: "rgba(11,18,32,0.08)",
        boxShadow: "0 12px 28px -12px rgba(11,18,32,0.18)",
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Loader2 size={16} className="animate-spin" style={{ color: "#2563FF" }} />
        <h2
          className="text-[16px] md:text-[18px] font-extrabold"
          style={{ color: "#0B1220", letterSpacing: "-0.02em" }}
        >
          Analyse en direct de votre entreprise
        </h2>
      </div>

      <div className="space-y-4">
        {DIMENSIONS.map((dim, i) => {
          const row = rows[i];
          const isActive = row.status === "active";
          const isDone = row.status === "done";
          const isPending = row.status === "pending";
          const fillColor = isDone ? tone(row.target) : "#2563FF";
          const pct = isPending ? 0 : (row.value / 100) * 100;

          return (
            <div
              key={dim.key}
              className="transition-all duration-300"
              style={{ opacity: isPending ? 0.45 : 1 }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-[13px]"
                  style={{
                    color: "#0B1220",
                    fontWeight: isActive || isDone ? 700 : 600,
                  }}
                >
                  {dim.label}
                </span>
                <span className="flex items-center gap-1.5 text-[13px] font-bold tabular-nums" style={{ color: isDone ? tone(row.target) : "#0B1220" }}>
                  {isPending ? (
                    <span style={{ color: "#94A3B8" }}>--<span className="text-[10px] font-medium">/100</span></span>
                  ) : (
                    <>
                      {row.value}
                      <span className="text-[10px] font-medium opacity-60">/100</span>
                    </>
                  )}
                  {isDone && <CheckCircle2 size={14} style={{ color: "#10B981" }} />}
                </span>
              </div>

              <div
                className="relative h-2 rounded-full overflow-hidden"
                style={{ background: "#E2E8F0" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    background: fillColor,
                    transition: "background-color 400ms ease",
                  }}
                />
                {isActive && (
                  <div
                    className="absolute inset-y-0 w-1/3 pointer-events-none"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)",
                      animation: "lsr-shimmer 1.2s linear infinite",
                    }}
                  />
                )}
              </div>

              <div
                className="text-[11px] mt-1.5 transition-colors duration-300"
                style={{ color: isDone ? "#10B981" : "#64748B" }}
              >
                {isDone ? "✓ Terminé" : isActive ? dim.caption : "En attente…"}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes lsr-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
