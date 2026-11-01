"use client";

interface ScoreGaugeProps {
  score: number; // 0-100
  active?: boolean; // false = jauge "verrouillée" (grise, position neutre)
}

function colorForScore(score: number): string {
  if (score >= 80) return "#1F8A5C"; // positive
  if (score >= 60) return "#0A1F44"; // primary
  if (score >= 35) return "#C3C9D2"; // accent/argent
  return "#9AA3B1";
}

export default function ScoreGauge({ score, active = true }: ScoreGaugeProps) {
  const pct = Math.min(100, Math.max(0, score));
  const color = active ? colorForScore(pct) : "#C3C9D2";

  return (
    <div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-tint">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${active ? pct : 50}%`, background: color }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span>Pas urgent</span>
        <span>Agis maintenant</span>
      </div>
    </div>
  );
}
