# Pocket — a smartphone home screen in the browser

A static, dependency-free web app that mimics a phone's lock screen and home
screen, with a handful of working apps. No backend, no build step, no
accounts — open the link and use it.

## Apps

- **Clock** — current time, a stopwatch with laps, and a countdown timer (with an audible alert)
- **Calculator** — standard four-function calculator with keyboard support
- **Notes** — create, edit, and delete notes, saved to the browser
- **Weather** — current conditions for your location (via the free, key-free [Open-Meteo](https://open-meteo.com) API), falling back to a default city if location access is denied
- **Settings** — dark/light mode, wallpaper picker, and a "clear all data" reset

## Using it

- Tap/click the lock screen (or swipe up on a touchscreen) to unlock.
- Tap an app icon to open it; use the **Home** button top-left to return.
- Everything (notes, theme, wallpaper) is saved in the browser via `localStorage` — it's per-device, not synced between phones.
- On a phone, use the browser's "Add to Home Screen" option to install it like a real app (there's a manifest and icon set for that).

## Run locally

```
cd phone-ui
python3 -m http.server 8080
# open http://localhost:8080
```

## Deployment

Deployed automatically to GitHub Pages by
`.github/workflows/deploy-phone-ui.yml` on every push to this branch that
touches `phone-ui/`. See the repository root for the one-time setup step
required before the first deploy will go live.

## Structure

```
index.html          Markup: status bar, lock screen, home screen, app shell
css/style.css        All styling, including the desktop phone-bezel preview
js/main.js            Shell: clock ticking, lock/unlock, app navigation
js/ui.js               Small DOM/storage/toast helpers shared by every app
js/theme.js             Theme + wallpaper state, shared by main.js and Settings
js/apps/*.js            One module per app (clock, calculator, notes, weather, settings)
manifest.webmanifest   Enables "Add to Home Screen" / installable behavior
icons/                 Generated app icons (192/512/maskable/apple-touch)
```
