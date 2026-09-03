# Wavelength — MP3 Player

A fully client-side, static web MP3/audio player. No backend, no build step.

## Run

Serve the directory with any static file server and open `index.html`, e.g.:

```
cd mp3-player
python3 -m http.server 8080
# open http://localhost:8080
```

Opening `index.html` directly via `file://` also works in most browsers.

## Features

- Load local audio files (MP3, WAV, OGG, M4A, FLAC, AAC, Opus) via file picker or drag-and-drop
- ID3 tag parsing (title, artist, album, embedded album art) via a vendored copy of `jsmediatags`, with filename-based fallback (`Artist - Title.ext`)
- Play / pause / next / previous, shuffle, and repeat (off / all / one)
- Seek bar with elapsed/remaining time, volume with mute, and playback speed (0.5×–2×)
- Circular frequency-spectrum visualizer (Web Audio API `AnalyserNode`)
- Playlist panel: search/filter, drag-to-reorder, per-track remove, sort A–Z, clear all
- Keyboard shortcuts: `Space` play/pause, `←/→` seek ±5s, `↑/↓` volume, `N`/`P` next/prev, `M` mute, `S` shuffle, `R` repeat
- Media Session API integration (OS/lock-screen media controls)
- Light/dark theme toggle, responsive layout
- Settings (volume, shuffle, repeat, speed, theme) persisted to `localStorage`

## Notes

- Playlists are not persisted across page reloads — browsers do not allow re-reading local files by reference after a refresh, so only playback settings are saved.
- `vendor/jsmediatags.min.js` is a vendored copy (v3.9.7) so tag parsing works with no external network access.

## Structure

```
index.html      Markup
css/style.css   Styling (light/dark theme via CSS custom properties)
js/app.js       Application logic (single ES module, no dependencies beyond jsmediatags)
vendor/         Vendored third-party library (jsmediatags)
```
