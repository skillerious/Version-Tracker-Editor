<!--
  Version Tracker (Electron Edition) — README
  This README is optimized for GitHub rendering (dark/light), uses accessible
  headings, collapsible sections, and descriptive alt text for images.
-->

<h1 align="center">Version Tracker — Electron Edition</h1>

<p align="center">
  <em>A focused desktop editor for <code>repoversion.json</code> manifests with first‑class GitHub integration.</em>
</p>

<p align="center">
  <a href="https://www.electronjs.org/">
    <img alt="Electron" src="https://img.shields.io/badge/Electron-31.x-47848F?logo=electron&logoColor=white">
  </a>
  <a href="https://nodejs.org/">
    <img alt="Node.js >= 18" src="https://img.shields.io/badge/Node.js-%E2%89%A5%2018-339933?logo=node.js&logoColor=white">
  </a>
  <img alt="Platforms" src="https://img.shields.io/badge/Windows%20|%20macOS%20|%20Linux-Desktop-0a84ff">
  <a href="#license">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-0b7285">
  </a>
</p>

<p align="center">
  <sub>Built by <strong>Robin Doak</strong> — <em>Skillerious</em></sub>
</p>

<p align="center">
  <img alt="Main UI — Version Tracker" src="https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234623.png">
</p>

---

Version Tracker is a streamlined, form‑driven editor for maintaining version metadata across multiple applications. It fetches and commits a single source of truth—<code>repoversion.json</code>—directly to GitHub. Edit, validate, preview, and publish without leaving the desktop.

---

<details>
<summary><strong>Table of Contents</strong></summary>

- [Highlights](#highlights)
- [Screenshots](#screenshots)
- [Quickstart](#quickstart)
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

</details>

## Highlights

- **Clean desktop workspace** — Custom titlebar, breadcrumb navigation, activity tabs, and a resizable app list keep everything fast and obvious.  
- **GitHub‑first flow** — Fetch and commit `repoversion.json` via the GitHub REST API with scoped‑PAT checks, descriptive errors, and remote SHA tracking.  
- **Secure token storage** — Uses `keytar` when available; falls back to `electron-store`. Env overrides supported (`GITHUB_TOKEN`, `GITHUB_PERSONAL_TOKEN`).  
- **Form‑driven editing** — Edit global metadata, stable/beta tracks, and release history. Helpers for semver, slugify, next build code, promote/clone actions.  
- **JSON preview & validation** — Live preview, copy/save actions, and validation rules catch mistakes before commit.  
- **Release calendar** — Visual timeline of upcoming, recent, and stale releases with filters.  
- **New‑app wizard** — Three quick steps to scaffold an application with sensible defaults.  
- **Status awareness** — Dirty indicator, toast messages, and keyboard hints (<kbd>F5</kbd> / <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>S</kbd>).  
- **Responsive & accessible** — Compact density, focus outlines, high‑contrast cards, and `prefers-reduced-motion` fallbacks.  
- **Cross‑platform packaging** — Electron Builder config included for distributables.  

---

## Screenshots

> All screenshots are from the Electron Edition of Version Tracker.

<table>
  <tr>
    <td width="50%"><strong>Main UI</strong><br>
      <img alt="Main UI" src="https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234623.png">
    </td>
    <td width="50%"><strong>Release Calendar</strong><br>
      <img alt="Release Calendar" src="https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234640.png">
    </td>
  </tr>
  <tr>
    <td width="50%"><strong>About Dialog</strong><br>
      <img alt="About Dialog" src="https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234649.png">
    </td>
    <td width="50%"><strong>Token Dialog</strong><br>
      <img alt="Token Dialog" src="https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234707.png">
    </td>
  </tr>
  <tr>
    <td width="50%"><strong>Getting Started</strong><br>
      <img alt="Getting Started Dialog" src="https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234736.png">
    </td>
    <td width="50%"></td>
  </tr>
</table>

---

## Quickstart

### 1) Prerequisites
- **Node.js 18+**
- **Windows / macOS / Linux** desktop
- Native build tools for `keytar` (optional but recommended):
  - Windows: MSVC Build Tools
  - macOS: Xcode Command Line Tools
  - Linux: `build-essential`

### 2) Install & Run

```bash
# install dependencies
npm install

# start in development
npm start

# package distributables
npm run dist  # outputs to ./dist
```

> The window maximises on launch; custom window controls are provided.

---

## Working with GitHub

1. Open **Settings** (activity bar → Settings).  
2. Set the target repository (defaults to `skillerious/Version-Tracker@main`).  
3. Click **Set Token…** and provide a Personal Access Token (PAT) with **Contents: read/write**.  
   - Tokens are stored in the OS keychain via `keytar` when available; otherwise `electron-store`.  
   - If neither store contains a token, the app uses `GITHUB_TOKEN` / `GITHUB_PERSONAL_TOKEN` (env).  
4. Click **Verify Token** — the app checks your account, scopes, and any SSO headers via `/user`.  
5. **Fetch** (<kbd>F5</kbd>) loads `repoversion.json` and records the remote blob SHA.  
6. **Commit** (<kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>S</kbd>) re‑validates, stamps `generated`, and uploads with SHA optimistic‑locking.  

> Breadcrumbs in the title area link owner → repo → branch → file; hold <kbd>Ctrl/Cmd</kbd> and click to open in your browser.

---

## Configuration & Storage

- **Repository settings** (owner, repo, branch, manifest path)  
  - Windows: `%APPDATA%/Version Tracker/config.json`  
  - macOS: `~/Library/Application Support/Version Tracker/config.json`  
  - Linux: `~/.config/Version Tracker/config.json`
- **Tokens**: OS keychain (`keytar`), fallback `electron-store`  
- **Environment overrides**: `GITHUB_TOKEN`, `GITHUB_PERSONAL_TOKEN`  
- **UI & preferences**: Compact density, sidebar width, wizard progress, toast dismissals (renderer `localStorage` + store)  
- **Local cache**: “Save JSON…” only writes to your chosen path (no hidden copies)  
- **Diagnostics**: About dialog shows runtime info; terminal logs provide detail

---

## Editing Workflow

- **Sidebar apps** — Add, duplicate, delete; resize with the splitter; hover highlights respect reduced motion.  
- **Dataset card** — Global metadata & `generated` timestamp (auto on commit/preview).  
- **App details**  
  - ID slug, name, category, platform, arch, tags, description  
  - **Tracks**: Stable (required), Beta (optional) with `version`, `code`, `date`, `url`, `download`, `notes`  
  - Quick actions: slugify ID, bump version (major/minor/patch), suggest next build code, promote Beta→Stable, clone Stable→Beta  
- **History** — Table editor with inline editing, keyboard navigation, and deletions.  
- **Preview** — JSON render with copy & save actions and validation results.  
- **Wizard** — 3‑step scaffold with guardrails.  
- **Settings** — Repo/branch/path, token dialogs, compact density toggle.  
- **Status bar** — Dirty dot, status text, and shortcut hints.  

---

## Release Calendar

A vertical timeline pulling from tracks and (optional) history:

- **Summary chips** — **Upcoming** (≤ 14 days), **Recent** (≤ 14 days ago), **Stale** (≥ 60 days)  
- **Filters** — Toggle Stable / Beta / History; choose **All / Upcoming / Stale**  
- **Entries** — App, track, version, code, date, relative timing, and quick links  
- **Undated** — Dashed outline with a reminder to set the ship date  
- Auto‑refresh after fetch, commit, wizard, and edits  

---

## Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Fetch manifest | <kbd>F5</kbd> |
| Commit changes | <kbd>Ctrl</kbd> + <kbd>S</kbd> / <kbd>Cmd</kbd> + <kbd>S</kbd> |
| Open breadcrumbs on GitHub | <kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + Click |

---

## Data Model

`repoversion.json` is compact and automation‑friendly:

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

- **Tracks**: Stable required; Beta optional. Fields: `version`, `code` (int), `date` (`YYYY-MM-DD`), `url`, `download`, `notes`.  
- **History**: Optional chronological entries; normalised and used by the calendar.  
- **generated**: Auto‑stamped on commit/preview refresh.  

---

## Validation Rules

- **IDs** — Lowercase slugs (`[a-z0-9-]`), unique across `apps`.  
- **Semver** — Permissive regex accepting pre‑release/build metadata.  
- **Dates** — `YYYY-MM-DD`; undated entries are editable but flagged.  
- **URLs** — Must start with `http://` or `https://`.  
- **Codes** — Whole numbers `>= 0`; “next code” uses history.  
- **Wizard** — Blocks finish until required fields are filled.  
- **Commit** — Stamps `generated`, re‑validates, and surfaces blocking issues.  

---

## Troubleshooting

| Scenario | Fix |
|---|---|
| Token verification fails | Ensure PAT has **Contents: read/write**; re‑verify; approve SSO if required. |
| Fetch returns 404 | Check owner/repo/branch/path; ensure the PAT can access the repo. |
| Commit rejected with 409 | Remote changed first — fetch to refresh SHA, resolve locally, commit again. |
| Calendar shows “No releases match” | Enable Stable/Beta/History filters; ensure entries contain enough data. |
| `keytar` build errors | Install native build tools (see prerequisites) or rely on the fallback store. |
| App feels sluggish | Enable compact density; close unused tabs; prefer reduced motion at OS level. |

---

## Roadmap

- PR mode to stage manifest changes before merging  
- Release kits: JSON + notes + hashes as a distributable artefact  
- Automated URL and checksum validation  
- Multi‑repo workspaces with quick switching and shared token storage  
- Optional webhook notifications (Slack/Teams/email) for fetch/commit outcomes  

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
└─
```

---

## Tech Stack

- **Electron 31** — desktop shell & packaging  
- **Electron Builder** — NSIS / DMG / AppImage  
- **Electron Store** — settings & preferences  
- **Keytar** — OS keychains (optional native module)  
- **Modern JavaScript** — ESM, async/await  
- **Marked** — in‑app Markdown rendering  

---

## Development

- `npm start` — Launch in development (renderer reloads on save)  
- `npm run dist` — Package with Electron Builder (artifacts in `dist/`)  
- `preload.cjs` — Add new IPC channels here; keep Node modules out of the renderer  
- Security defaults: `contextIsolation`, `sandbox`, tight preload surface  

---

## License

Released under the **MIT License**.  
© Robin Doak — Skillerious
