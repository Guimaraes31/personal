export function ProgressRing({ value, label }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;
  return (
    <div className="progress-ring" role="img" aria-label={label ?? `${safe}% concluído`}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="progress-ring__track" cx="50" cy="50" r={radius} />
        <circle className="progress-ring__value" cx="50" cy="50" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <span className="progress-ring__label">{safe}%</span>
    </div>
  );
}
