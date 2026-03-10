interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  colorClass?: string;
}

const ScoreRing = ({ score, size = 96, strokeWidth = 8, label, colorClass }: ScoreRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    colorClass ??
    (score >= 70
      ? "text-success"
      : score >= 45
      ? "text-accent"
      : "text-destructive");

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`score-ring ${color}`}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-xl font-bold">{score}</span>
        {label && <span className="text-[10px] text-muted-foreground font-medium">{label}</span>}
      </div>
    </div>
  );
};

export default ScoreRing;
