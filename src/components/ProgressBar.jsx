export default function ProgressBar({ current, max, colorClass = "" }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  return (
    <div className={`progress-bar-track ${colorClass}`}>
      <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}
