type VeriScoreProps = {
  score: number;
  size?: number;
  label?: string;
};

function getLabel(score: number) {
  if (score >= 90) return "Ottimo";
  if (score >= 70) return "Buono";
  return "Criticità";
}

export function VeriScore({ score, size = 140, label }: VeriScoreProps) {
  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference * (normalized / 100);
  const tone = normalized >= 90 ? "var(--mint)" : normalized >= 70 ? "#d99b00" : "#dc3b3b";

  return (
    <div
      className="veriscore"
      style={{ width: size, height: size, color: tone }}
      aria-label={`VeriScore ${normalized} su 100`}
    >
      <svg viewBox="0 0 120 120" role="img" aria-hidden="true">
        <circle className="veriscore-track" cx="60" cy="60" r={radius} />
        <circle
          className="veriscore-progress"
          cx="60"
          cy="60"
          r={radius}
          strokeDasharray={`${progress} ${circumference - progress}`}
        />
        <text className="veriscore-label" x="60" y="46" textAnchor="middle">VeriScore</text>
        <text className="veriscore-value" x="60" y="73" textAnchor="middle">{normalized}</text>
        <text className="veriscore-status" x="60" y="89" textAnchor="middle">{label ?? getLabel(normalized)}</text>
      </svg>
    </div>
  );
}
