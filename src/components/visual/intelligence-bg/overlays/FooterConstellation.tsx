/**
 * Footer overlay — constellation de données + quelques lignes connectées.
 * Évoque : "UNPRO continue de travailler même lorsque vous quittez le site."
 */
const STARS = Array.from({ length: 40 }, (_, i) => ({
  x: (i * 137) % 1600,
  y: (i * 73) % 1000,
  r: 1 + ((i * 19) % 10) / 8,
}));

const LINKS: Array<[number, number]> = [
  [0, 3], [1, 4], [2, 7], [5, 11], [6, 9], [8, 14], [10, 17],
  [12, 19], [13, 21], [15, 23], [18, 25], [20, 28], [22, 30],
  [24, 31], [26, 33], [29, 36], [32, 37], [34, 38], [35, 39],
];

export default function FooterConstellation() {
  return (
    <svg
      aria-hidden
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: 0.35 }}
    >
      <g stroke="#7DD3FC" strokeWidth="0.4" fill="none" opacity="0.5">
        {LINKS.map(([a, b], i) => (
          <line
            key={i}
            x1={STARS[a].x} y1={STARS[a].y}
            x2={STARS[b].x} y2={STARS[b].y}
          />
        ))}
      </g>
      <g fill="#BAE6FD">
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x} cy={s.y} r={s.r}
            style={{ animation: `ub-twinkle 5s ease-in-out ${(i * 0.2) % 5}s infinite` }}
          />
        ))}
      </g>
    </svg>
  );
}
