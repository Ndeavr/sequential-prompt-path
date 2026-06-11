/**
 * Alex overlay — Neural Home Intelligence Field.
 * L'orb (au centre) semble alimenter le réseau périphérique.
 */
const CENTER = { x: 800, y: 500 };
const PERIPH = [
  { x: 280, y: 200 }, { x: 1320, y: 220 },
  { x: 220, y: 520 }, { x: 1380, y: 480 },
  { x: 320, y: 820 }, { x: 1280, y: 800 },
  { x: 800, y: 140 }, { x: 800, y: 880 },
];

export default function NeuralHomeIntelligenceField() {
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none">
      {/* Halo respirant */}
      <div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: 520,
          height: 520,
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle, rgba(59,130,246,0.28) 0%, rgba(59,130,246,0) 70%)",
          animation: "ub-breath 6s ease-in-out infinite",
        }}
      />
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.18 }}
      >
        <g stroke="#3B82F6" strokeWidth="0.7" fill="none" strokeLinecap="round">
          {PERIPH.map((p, i) => (
            <line
              key={i}
              x1={CENTER.x} y1={CENTER.y}
              x2={p.x} y2={p.y}
              strokeDasharray="6 10"
              style={{ animation: `ub-twinkle 5s ease-in-out ${i * 0.3}s infinite` }}
            />
          ))}
        </g>
        <g fill="#3B82F6">
          {PERIPH.map((p, i) => (
            <circle
              key={i}
              cx={p.x} cy={p.y} r="3"
              style={{ animation: `ub-twinkle 4s ease-in-out ${i * 0.4}s infinite` }}
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
