const THEME_STORAGE_KEY = "nihongoQuest:theme";

export function getInitialTheme() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {}
  return "dark";
}

export function saveTheme(theme) {
  try {
    if (theme === "dark" || theme === "light") {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  } catch {}
}

export function applyThemeToDocument(theme) {
  try {
    document.documentElement.setAttribute("data-theme", theme === "light" ? "light" : "dark");
  } catch {}
}
