export type DarkThemeKey = "theme-modern-teal" | "theme-modern-blue" | "theme-modern-ember";
export type LightThemeKey = "theme-light-neutral" | "theme-light-blue" | "theme-light-warm";
export type ThemeKey = DarkThemeKey | LightThemeKey;
export type ThemeMode = "dark" | "light";

export interface ThemeInfo {
  key: ThemeKey;
  label: string;
  mode: ThemeMode;
}

export const DARK_THEMES: ThemeInfo[] = [
  { key: "theme-modern-teal", label: "Teal", mode: "dark" },
  { key: "theme-modern-blue", label: "Blue", mode: "dark" },
  { key: "theme-modern-ember", label: "Ember", mode: "dark" },
];

export const LIGHT_THEMES: ThemeInfo[] = [
  { key: "theme-light-neutral", label: "Neutral", mode: "light" },
  { key: "theme-light-blue", label: "Blue", mode: "light" },
  { key: "theme-light-warm", label: "Warm", mode: "light" },
];

export const ALL_THEMES: ThemeInfo[] = [...DARK_THEMES, ...LIGHT_THEMES];

export function getThemeMode(theme: ThemeKey): ThemeMode {
  return theme.startsWith("theme-light-") ? "light" : "dark";
}

export function isLightTheme(theme: ThemeKey): theme is LightThemeKey {
  return theme.startsWith("theme-light-");
}

export function isDarkTheme(theme: ThemeKey): theme is DarkThemeKey {
  return theme.startsWith("theme-modern-");
}

export function getThemesByMode(mode: ThemeMode): ThemeInfo[] {
  return mode === "light" ? LIGHT_THEMES : DARK_THEMES;
}

export function getDefaultTheme(mode: ThemeMode): ThemeKey {
  return mode === "light" ? "theme-light-neutral" : "theme-modern-teal";
}