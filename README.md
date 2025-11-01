# Version Tracker (Electron Edition)

> A focused desktop editor for `repoversion.json` manifests—built for fast, reliable release management with first-class GitHub integration.

![Electron](https://img.shields.io/badge/Electron-31.x-47848F?logo=electron&logoColor=white)
![Node](https://img.shields.io/badge/Node.js-%E2%89%A5%2018-339933?logo=node.js&logoColor=white)
![Platforms](https://img.shields.io/badge/Windows%20|%20macOS%20|%20Linux-Desktop-0a84ff)
![License](https://img.shields.io/badge/License-MIT-0b7285)

Version Tracker is a streamlined, form-driven editor for version manifests. It pairs a polished desktop workspace with GitHub so you can review, validate, and publish release metadata without leaving the app.

---

## Table of Contents
- [Highlights](#highlights)
- [Screenshots](#screenshots)
- [Getting Started](#getting-started)
- [Working with GitHub](#working-with-github)
- [Configuration & Storage](#configuration--storage)
- [Editing Workflow](#editing-workflow)
- [Release Calendar](#release-calendar)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Data Model](#data-model)
- [Validation Rules](#validation-rules)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Development](#development)
- [License](#license)

---

## Highlights
- **Clean desktop workspace** – Custom titlebar, breadcrumb navigation, activity tabs, and a resizable app list keep everything fast and obvious.
- **GitHub-first flow** – Fetch and commit `repoversion.json` via the GitHub REST API with scoped-PAT checks, descriptive errors, and remote SHA tracking.
- **Secure token storage** – Uses `keytar` when available; falls back to `electron-store`. Environment overrides supported (`GITHUB_TOKEN`, `GITHUB_PERSONAL_TOKEN`).
- **Form-driven editing** – Edit global metadata, stable/beta tracks, and release history. Helpers for semver, slugify, next build code, promote/clone actions.
- **JSON preview & validation** – Live preview, copy/save actions, and validation rules so mistakes are caught before commit.
- **Release calendar** – A visual timeline of upcoming, recent, and stale releases with quick filters.
- **New-app wizard** – Three steps to scaffold an application with sensible defaults.
- **Status awareness** – Dirty indicator, toast messages, and keyboard hints (F5 / Ctrl|Cmd+S).
- **Responsive & accessible** – Compact density, focus outlines, high-contrast cards, and `prefers-reduced-motion` fallbacks.
- **Cross-platform packaging** – Electron Builder config included for distributables.

---

## Screenshots

> All screenshots are from the Electron Edition of Version Tracker.

**Main UI**  
![Main UI](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234623.png)

**Release calendar**  
![Release Calendar](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234640.png)

**About dialog**  
![About Dialog](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234649.png)

**Token dialog**  
![Token Dialog](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234707.png)

**Getting started**  
![Getting Started](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234736.png)

---

## Getting Started

1. **Install prerequisites**
   - Node.js **18+**
   - Windows, macOS, or Linux desktop
   - Native build tools for `keytar`:
     - **Windows:** MSVC Build Tools
     - **macOS:** Xcode Command Line Tools
     - **Linux:** `build-essential`

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Launch in dev**
   ```bash
   npm start
   ```
   The window maximises on launch (custom window controls provided).

4. **Package for distribution**
   ```bash
   npm run dist
   ```
   Outputs installers to `dist/`.

---

## Working with GitHub

1. Open **Settings** (activity bar → Settings).
2. Set the repository (defaults to `skillerious/Version-Tracker@main`).
3. **Set Token…** with a PAT that includes **Contents: read/write**.
   - Stored in OS keychain via `keytar` when available; otherwise `electron-store`.
   - If neither store holds a token, `GITHUB_TOKEN` (or `GITHUB_PERSONAL_TOKEN`) is used.
4. **Verify Token** – Confirms account, scopes, and SSO headers via `/user`.
5. **Fetch** (`F5`) – Retrieves and deserialises `repoversion.json` and records the remote blob SHA.
6. **Commit** (`Ctrl+S` / `Cmd+S`) – Re-validates, stamps `generated`, and uploads with proper SHA optimistic-locking.

Breadcrumbs in the title area link to owner → repo → branch → file; hold **Ctrl/Cmd** and click to open in your browser.

---

## Configuration & Storage

- **Repository settings** (owner, repo, branch, manifest path):  
  - Windows: `%APPDATA%/Version Tracker/config.json`  
  - macOS: `~/Library/Application Support/Version Tracker/config.json`  
  - Linux: `~/.config/Version Tracker/config.json`
- **Tokens:** OS keychain via `keytar`, fallback to `electron-store`.
- **Environment overrides:** `GITHUB_TOKEN`, `GITHUB_PERSONAL_TOKEN`.
- **UI & prefs:** Compact density, sidebar width, wizard progress, toast dismissals in `electron-store` and renderer `localStorage`.
- **Local cache:** “Save JSON…” writes only to the chosen path—no hidden copies.
- **Diagnostics:** About dialog includes runtime info; check the terminal running Electron for detailed logs.

---

## Editing Workflow

- **Sidebar apps:** Add/duplicate/delete; resize via splitter; hover highlights respect reduced-motion.
- **Dataset card:** Global metadata & `generated` timestamp (auto-updated on commit/preview).
- **App details:**  
  - ID slug, name, category, platform, arch, tags, description  
  - **Tracks:** Stable (required), Beta (optional) with `version`, `code`, `date`, `url`, `download`, `notes`
  - Quick actions: slugify ID, bump version (major/minor/patch), suggest next build code, promote Beta→Stable, clone Stable→Beta
- **History:** Table editor with inline editing, keyboard navigation, and deletions.
- **Preview tab:** Renders JSON with copy/save and validation results.
- **Wizard tab:** 3-step scaffold with guardrails.
- **Settings tab:** Repository/branch/path, token dialogs, compact density toggle.
- **Dialogs:** Token, About, and confirm prompts for destructive operations.
- **Status bar:** Dirty dot, status text, and shortcut hints.

---

## Release Calendar

A vertical timeline pulling from tracks and (optional) history:

- **Summary chips:** **Upcoming** (≤14 days), **Recent** (≤14 days ago), **Stale** (≥60 days)
- **Filters:** Toggle Stable/Beta/History; view **All / Upcoming / Stale**
- **Entries:** App, track, version, code, date, relative timing, and quick links
- **Undated:** Dashed outline with a reminder to set the ship date
- Auto-refreshes after fetch, commit, wizard, and edits.

---

## Keyboard Shortcuts

- `F5` – Fetch manifest
- `Ctrl + S` / `Cmd + S` – Commit changes
- `Ctrl + Click` / `Cmd + Click` (breadcrumbs) – Open on GitHub

---

## Data Model

`repoversion.json` is compact and automation-friendly:

```json
{
  "schemaVersion": 2,
  "generated": "2025-01-12T21:16:19Z",
  "contact": "mailto:releases@example.com",
  "apps": [
    {
      "id": "example-app",
      "name": "Example App",
      "tracks": {
        "stable": {
          "version": "2.6.2",
          "code": 20602,
          "date": "2025-01-12",
          "url": "https://example.com/release",
          "download": "https://example.com/release/download",
          "notes": "Key fixes and improvements."
        },
        "beta": {
          "version": "2.7.0-beta.1",
          "code": 20700,
          "date": "2025-01-18",
          "url": "https://example.com/beta"
        }
      },
      "history": [
        { "version": "2.5.9", "code": 20509, "date": "2024-11-02", "url": "https://example.com/release/2.5.9" }
      ]
    }
  ]
}
```

- **Tracks:** Stable required; Beta optional. Fields: `version`, `code` (int), `date` (`YYYY-MM-DD`), `url`, `download`, `notes`.
- **History:** Optional chronological entries; normalised and usable in the calendar.
- **generated:** Auto-stamped on commit/preview refresh.

---

## Validation Rules

- **IDs:** lowercase slugs (`[a-z0-9-]`), unique across `apps`.
- **Semver:** Permissive regex accepting pre-release/build metadata.
- **Dates:** `YYYY-MM-DD`; undated entries remain editable but are flagged.
- **URLs:** Must start with `http://` or `https://`.
- **Codes:** Whole numbers `>= 0`; “next code” quick action uses history.
- **Wizard:** Blocks finish until required fields are filled.
- **Commit:** Stamps `generated`, re-validates, and surfaces blocking issues in toasts and status bar.

---

## Troubleshooting

| Scenario | Fix |
|---|---|
| **Token verification fails** | Ensure PAT has **Contents: read/write**; re-verify and approve SSO if required. |
| **Fetch 404** | Check owner/repo/branch/path in Settings and that the PAT can access the repo. |
| **Commit 409** | Remote changed first. Fetch to refresh SHA, resolve locally, then commit again. |
| **Calendar shows “No releases match”** | Enable Stable/Beta/History filters and ensure entries contain enough data to render. |
| **`keytar` build errors** | Install native build tools (see prerequisites) or rely on the fallback store. |
| **Sluggish UI** | Enable compact density, close unused tabs, or prefer reduced motion at OS level. |

---

## Roadmap
- Pull-request mode to stage manifest changes before merging
- Release kits: JSON + notes + hashes as a distributable artefact
- Automated URL and checksum validation
- Multi-repo workspaces with quick switching and shared token storage
- Optional webhook notifications (Slack/Teams/email) on fetch/commit outcomes

---

## Project Structure

```
.
├─ main.js           # Electron main: window lifecycle, IPC, GitHub REST, token mgmt, dialogs
├─ preload.cjs       # Context-isolated bridge exposing whitelisted APIs (token, github, file, shell, win)
├─ renderer.js       # SPA logic: state, forms, wizard, validation, preview, dialogs, calendar
├─ index.html        # App shell: titlebar, toolbar, activity bar, tabbed workspace
├─ styles.css        # Theme, responsive grids, motion/hover, dialogs
├─ assets/           # SVG/ICO icons used across UI
```

---

## Tech Stack
- **Electron 31** (desktop shell & packaging)
- **Electron Builder** (NSIS/DMG/AppImage)
- **Electron Store** (settings/prefs)
- **Keytar** (OS keychains; optional native module)
- **Modern JavaScript** (ESM, async/await)
- **Marked** (render in-app Markdown docs)

---

## Development

- `npm start` – Launch in development (renderer reloads on save)
- `npm run dist` – Package with Electron Builder (artifacts in `dist/`)
- `preload.cjs` – Add new IPC channels here; keep Node modules out of the renderer
- Security defaults: `contextIsolation`, `sandbox`, and a tight preload surface

---

## License

Released under the **MIT License**.  
© Robin Doak — Skillerious
