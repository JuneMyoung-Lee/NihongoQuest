export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      aria-label={isDark ? "라이트모드로 전환" : "다크모드로 전환"}
    >
      <span className="theme-toggle-icon">{isDark ? "☀️" : "🌙"}</span>
      <span className="theme-toggle-label">{isDark ? "라이트" : "다크"}</span>
    </button>
  );
}
