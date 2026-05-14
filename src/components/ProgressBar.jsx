export default function ProgressBar({ current, max, colorClass = "", hpColors = false }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  let hpClass = "";
  if (hpColors) {
    hpClass = pct <= 25 ? "hp-danger" : pct <= 55 ? "hp-warning" : "hp-ok";
  }
  return (
    <div className={`progress-bar-track ${colorClass}`}>
      <div className={`progress-bar-fill ${hpClass}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
