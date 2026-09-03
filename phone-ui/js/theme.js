import { readStore, writeStore } from "./ui.js";

const KEY = "pocket:settings";

export const WALLPAPERS = [
  { id: "violet", value: "linear-gradient(160deg, #7c5cff 0%, #ff5ca8 100%)" },
  { id: "ocean", value: "linear-gradient(160deg, #0f7bff 0%, #00d4c8 100%)" },
  { id: "sunset", value: "linear-gradient(160deg, #ff7a45 0%, #ffb347 60%, #ff5ca8 100%)" },
  { id: "forest", value: "linear-gradient(160deg, #0f5132 0%, #34a06b 60%, #a8e063 100%)" },
  { id: "midnight", value: "linear-gradient(160deg, #0f0d17 0%, #241c3d 55%, #3d2c5f 100%)" },
];

export function loadSettings() {
  return readStore(KEY, { theme: "dark", wallpaper: "violet" });
}

export function saveSettings(settings) {
  writeStore(KEY, settings);
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function applyWallpaper(id) {
  const wp = WALLPAPERS.find((w) => w.id === id) || WALLPAPERS[0];
  document.documentElement.style.setProperty("--wallpaper", wp.value);
}

export function applySettings(settings) {
  applyTheme(settings.theme);
  applyWallpaper(settings.wallpaper);
}
