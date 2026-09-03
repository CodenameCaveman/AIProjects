# AIProjects

## Pocket (phone UI)

`phone-ui/` — a static smartphone-style home screen (lock screen, app grid,
and a few working apps) deployed to GitHub Pages by
`.github/workflows/deploy-phone-ui.yml` on every push to `claude/phone-ui`
that touches `phone-ui/`. See `phone-ui/README.md` for details.

**One-time setup required before the first deploy goes live** (repo admin
only, cannot be done from a workflow or from here): in this repository on
GitHub, go to **Settings → Pages** and set **Build and deployment → Source**
to **GitHub Actions**. After that one toggle, every future push deploys
automatically — no further manual steps.

The live URL will be `https://<owner>.github.io/<repo>/` (shown on the
Settings → Pages screen, and in the workflow run's summary, once set up).

## MP3 player

`mp3-player/` — a static, client-side MP3/audio player. See
`mp3-player/README.md`. Not currently wired to GitHub Pages.
