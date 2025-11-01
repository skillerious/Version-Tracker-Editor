<p align="center">
  <img
    src="https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/ChatGPT-Image-Oct-29-2025-11_39_27-PM.png"
    alt="Version Tracker logo"
    width="220">
</p>

<h1 align="center">Version Tracker &ndash; Electron Edition</h1>

<p align="center">
  <em>A focused desktop editor for <code>repoversion.json</code> manifests with first-class GitHub integration.</em>
</p>

<p align="center">
  <a href="https://www.electronjs.org/">
    <img alt="Electron" src="https://img.shields.io/badge/Electron-31.x-47848F?logo=electron&logoColor=white">
  </a>
  <a href="https://nodejs.org/">
    <img alt="Node.js ≥ 18" src="https://img.shields.io/badge/Node.js-%E2%89%A5%2018-339933?logo=node.js&logoColor=white">
  </a>
  <img alt="Platforms" src="https://img.shields.io/badge/Windows%20|%20macOS%20|%20Linux-Desktop-0a84ff">
  <a href="#license">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-0b7285">
  </a>
</p>

<p align="center">
  <sub>Built by <strong>Robin Doak</strong> &mdash; <em>Skillerious</em></sub>
</p>

---

> Version Tracker is your all-in-one release command centre. Pull the latest manifest from GitHub, curate `repoversion.json` with precision, capture every change with real-time validation and preview, generate shareable insights for your team, and publish confidently—without ever leaving your desktop workflow.

---

## Table of contents

- [What’s new](#whats-new)
- [Feature highlights](#feature-highlights)
- [Screenshots](#screenshots)
- [Quickstart](#quickstart)
- [Working with GitHub](#working-with-github)
- [Settings dashboard](#settings-dashboard)
- [Update experience](#update-experience)
- [Editing workflow](#editing-workflow)
- [Release calendar](#release-calendar)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Data model](#data-model)
- [Validation rules](#validation-rules)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Project structure](#project-structure)
- [Tech stack](#tech-stack)
- [Development](#development)
- [License](#license)

---

## What’s new

| Area | Improvements |
| --- | --- |
| Settings dashboard | Two-column control centre with connection overview, token health badges, workspace path utilities, and persistent preferences saved to `localStorage`. |
| Update workflow | Titlebar download glyph now reflects state (available, checking, current, error) and opens a modal summarising versions and highlights. |
| Wizard | “Create application” wizard always appends a fresh item. Duplicate IDs are blocked before finish. |
| Token & verification | Settings mirrors onboarding: storage source, account info, timestamps, and scope tags refresh after each check. |
| Preferences | Toggles for auto-fetch on launch, commit confirmations, compact density, and helper tips survive restarts. |
| Quality of life | Path copy buttons handle missing clipboard APIs gracefully and every settings action posts a helpful status/toast. |

---

## Feature highlights

- **GitHub-first flow** &mdash; Fetch and commit via REST `/contents` endpoints with optimistic locking and SHA tracking.
- **Form-driven editing** &mdash; Edit global metadata, stable/beta tracks, and release history with helpers for semver, slugifying, and build code increments.
- **Live preview & validation** &mdash; JSON mirror updates in real time; validation rules catch mistakes before commit.
- **Release calendar** &mdash; Timeline view with filters for upcoming, recent, stale, past, and undated releases.
- **New-app wizard** &mdash; Three guided steps with instant preview output.
- **Status awareness** &mdash; Dirty indicator, toast notifications, keyboard hints (`F5`, `Ctrl/Cmd + S`).
- **Responsive UI** &mdash; Compact density mode, keyboard navigability, and high contrast cards.

---

## Screenshots

| Main editor | Release calendar |
| --- | --- |
| ![Main editor](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234623.png) | ![Release calendar](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234640.png) |

| About dialog | Token dialog |
| --- | --- |
| ![About dialog](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234649.png) | ![Token dialog](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234707.png) |

---

## Quickstart

```bash
git clone https://github.com/skillerious/VersionTrackerEditorElectron.git
cd VersionTrackerEditorElectron
npm install
npm start
```

1. Launch the workspace (`npm start`) and follow onboarding to set owner/repo/branch/path, store a PAT, verify scopes, and prepare workspace storage.
2. Fetch the manifest (press `F5` or use the **Fetch** button).
3. Update applications via the editor tabs; JSON preview stays in sync.
4. Commit to GitHub (`Ctrl`/`Cmd` + `S`). Optional confirmation depends on your settings toggle.

To package installers run `npm run dist`; for unpacked builds use `npm run pack`.

---

## Working with GitHub

| Action | Description |
| --- | --- |
| Fetch | GET `/repos/:owner/:repo/contents/:path?ref=branch` and capture the returned SHA. |
| Commit | PUT `/repos/:owner/:repo/contents/:path` with base64 content plus stored SHA to apply edits. |
| Token storage | Uses `keytar` when available, falls back to `electron-store`. `GITHUB_TOKEN` or `GITHUB_PERSONAL_TOKEN` env vars override both. |
| Verification | `/user` request records login/name/type, emitted scopes, accepted scopes, and timestamp. |

> Enterprise tokens may require enabling SSO. The verification card and settings badges call that out directly.

---

## Settings dashboard

- **Connection overview** &mdash; Cards show repository, branch, manifest path, token status, verification state, and short SHA.
- **Token & access** &mdash; Status chip, storage source, account meta, last verified timestamp, and scope tags stay in sync with the onboarding flow.
- **Preferences** &mdash; Tactile toggle buttons for:
  - Auto fetch on launch
  - Commit confirmation
  - Compact density
  - Show helper tips
- **Workspace storage** &mdash; Copy/open commands for workspace directory, settings JSON, token metadata, and Electron Store path.
- **Quick actions** &mdash; `Refresh status` re-runs onboarding checks; `Prepare workspace` creates baseline folders and files.

Preferences are persisted under `localStorage["vt.settings.preferences"]`.

---

## Update experience

- Titlebar update button shifts colour based on state (available, checking, current, error).
- Modal dialog summarises current vs available version, release highlights, and offers download, recheck, remind me later, and external release links.
- Button and modal share the same dynamic SVG so visual cues remain consistent.

---

## Editing workflow

1. Choose an application in the sidebar (breadcrumbs update automatically).
2. Edit stable/beta tracks with helpers for versioning, code suggestions, and promote/clone shortcuts.
3. Update history via the inline table (duplicate safeguards built in).
4. Use JSON preview and validation to confirm changes.
5. Commit to GitHub (optional confirmation prompt depending on settings).

---

## Release calendar

- Grouped by upcoming, recent, stale, past, and undated statuses with month dividers and coloured chips.
- Highlights surface the next planned release, latest shipped build, longest-stale track, and undated count.
- Filters include status view, include/exclude undated, and search by name or track.
- Entry cards show versions, codes, dates, quick links, notes, and relative timing.

---

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `F5` | Fetch manifest |
| `Ctrl/Cmd + S` | Commit manifest |
| `Ctrl/Cmd + ,` | Open Settings tab |
| `Ctrl/Cmd + Shift + P` | Toggle compact density |
| `Alt + Left/Right` | Switch activity tabs |
| `Ctrl/Cmd + F` | Focus release calendar search |

---

## Data model

```json
{
  "schemaVersion": 2,
  "generated": "2025-01-07T13:30:00Z",
  "contact": "releases@example.com",
  "apps": [
    {
      "id": "example-app",
      "name": "Example App",
      "tracks": {
        "stable": {
          "version": "1.4.2",
          "code": 1420,
          "date": "2025-01-03",
          "url": "https://github.com/example/app/releases/tag/v1.4.2",
          "download": "https://example.com/app/download/v1.4.2"
        },
        "beta": {
          "version": "1.5.0-beta1",
          "code": 1501,
          "date": "2025-01-10",
          "download": "https://example.com/app/download/v1.5.0-beta1"
        }
      },
      "history": [
        {
          "version": "1.4.1",
          "code": 1410,
          "date": "2024-12-01",
          "url": "https://example.com/app/1.4.1"
        }
      ]
    }
  ]
}
```

---

## Validation rules

- App IDs must match `^[a-z0-9][a-z0-9-]{1,}$`.
- Versions allow semver-like strings (with optional pre-release segment).
- Build codes are non-negative integers.
- Dates use ISO `YYYY-MM-DD`.
- URLs must start with `http` or `https`.
- Duplicate app IDs or history entries are rejected.

---

## Troubleshooting

| Scenario | Resolution |
| --- | --- |
| No token stored | Use **Settings → Token & access → Set token** or set `GITHUB_TOKEN` / `GITHUB_PERSONAL_TOKEN`. |
| Verification fails with SSO | Enable SSO for the PAT in GitHub settings, then rerun verification. |
| `fetch failed` / DNS errors | Confirm access to `https://api.github.com` and retry when online. |
| Update dialog shows error | Indicates the update feed was unreachable; use **Check again** once connectivity returns. |
| Workspace folder missing | Click **Prepare workspace** in Settings to rebuild directories and metadata. |

---

## Roadmap

- Automated release notes ingestion for the update dialog.
- Multi-repo workspace switching.
- Additional validation (stable/beta consistency, date windows).
- Bulk history editing.
- Optional notifications (Slack, Teams) after commits.

---

## Project structure

```
VersionTrackerEditorElectron/
├─ main.js              # Electron main process bootstrap
├─ preload.cjs          # Context bridge exposing IPC APIs
├─ renderer.js          # Renderer logic and UI bindings
├─ index.html           # Single-page shell rendered by Electron
├─ styles.css           # Workspace styling and theme variables
├─ assets/              # Icons, logos, SVGs
└─ package.json         # Scripts, dependencies, builder config
```

---

## Tech stack

- Electron 31.x
- Node.js 18+
- keytar (optional secure storage)
- electron-store (persistence fallback)
- marked (rendering markdown snippets)

---

## Development

```bash
npm install
npm start
```

- `npm run dist` builds platform installers.
- `npm run pack` creates unpacked artifacts.
- Linting/formatting tooling coming soon.
- Keep docs fresh by updating screenshots in `assets/`.

---

## License

Released under the [MIT License](LICENSE).

© Robin Doak (Skillerious). Contributions welcome!
