interface ProgressBarProps {
  current: number;
  total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
  const pct = Math.round((current / total) * 100);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted">
        <span>
          Étape {current} sur {total}
        </span>
        <span>{pct} %</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-tint">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
