<p align="center">
  <img
    src="https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/ChatGPT-Image-Oct-29-2025-11_39_27-PM.png"
    alt="Version Tracker logo"
    width="220">
</p>

<p align="center">
  <em>A focused desktop editor for <code>repoversion.json</code> manifests with first-class GitHub integration.</em>
</p>

<p align="cen

https://github.com/user-attachments/assets/0e235ad5-e42b-46f7-82e8-51d3a546cb52

ter">
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
  <sub>Built by <strong>Robin Doak</strong> — <em>Skillerious</em></sub>
</p>

---

> **Version Tracker** is your all‑in‑one release command centre. Pull the latest manifest from GitHub, curate <code>repoversion.json</code> with precision, capture every change with real‑time validation and preview, generate shareable insights for your team, and publish confidently — without ever leaving your desktop workflow.

---

## 📚 Table of contents

- [What’s new](#-whats-new)
- [Feature highlights](#-feature-highlights)
- [Screenshots](#-screenshots)
- [Quickstart](#-quickstart)
- [Onboarding overview](#-onboarding-overview)
- [Working with GitHub](#-working-with-github)
- [Architecture overview](#-architecture-overview)
- [Token management](#-token-management)
- [Commit lifecycle](#-commit-lifecycle)
- [Persistence & storage](#-persistence--storage)
- [Logs & debugging](#-logs--debugging)
- [Settings dashboard](#-settings-dashboard)
- [Update experience](#-update-experience)
- [Editing workflow](#-editing-workflow)
- [Release calendar](#-release-calendar)
- [Keyboard shortcuts](#-keyboard-shortcuts)
- [Data model](#-data-model)
- [Validation rules](#-validation-rules)
- [Troubleshooting](#-troubleshooting)
- [Roadmap](#-roadmap)
- [Project structure](#-project-structure)
- [Tech stack](#-tech-stack)
- [Development](#-development)
- [License](#-license)

---

## 🚀 What’s new

| Area | Highlights |
|------|------------|
| **Token handling** | Tokens are migrated into the AppData‑backed Electron store, legacy keytar and historical files are scrubbed automatically, and the devtools console reports the active token source (store, env, or legacy). |
| **Commit workflow** | Every commit runs connectivity checks, validation, dirty‑form consolidation, and a scope preflight that stops 403 responses before the request is sent. |
| **Onboarding & verification** | Onboarding mirrors the settings dashboard, showing storage source, account metadata, scope chips, and actionable errors immediately after each change. |
| **Settings dashboard** | The control centre lists workspace paths, token health badges, commit preferences, and utility actions such as opening the workspace directory or re‑running setup. |
| **Update system** | Title‑bar indicators and the update dialog summarise available builds, release highlights, download links, and background check logs. |
| **Quality of life** | Long‑running actions surface status/toast feedback, clipboard fallbacks keep copy buttons safe, and the wizard blocks duplicate IDs before you finish. |

---

## ✨ Feature highlights

- **GitHub‑first flow** — Fetch and commit through the REST `/contents` endpoints with optimistic locking, SHA tracking, and detailed error handling that explains scope failures.
- **Form‑driven editing** — Update global metadata, stable/beta tracks, and release history with helpers for semantic version increments, slug generation, and build‑code arithmetic.
- **Live preview & validation** — The JSON mirror updates as you type, while validation rules highlight inconsistencies before a commit leaves your machine.
- **Onboarding companion** — A guided workflow helps you configure the repository, prepare workspace storage, supply a PAT, and verify GitHub access from a single dialog.
- **Release calendar** — Filterable timeline view for upcoming, recent, stale, and undated releases with quick toggles for stable/beta/history channels.
- **Status awareness** — Dirty‑state indicators, contextual toasts, SHA badges, keyboard shortcuts (`F5`, `Ctrl/Cmd + S`, `Ctrl/Cmd + ,`), and inline status lines keep you oriented.
- **Resilient token storage** — Tokens live in `%AppData%\VersionTrackerEditor\version-tracker.json`; environment overrides are detected and reported in logs.
- **Commit guardrails** — Preflight checks stop the commit button when scopes are insufficient, routing you directly to the token dialog with remediation tips.
- **Token verification loop** — The verification dialog records account, scope, and timestamp metadata pulled from GitHub, persisting results to `token-info.json` for auditing.

---

## 🖼 Screenshots

| Main editor | Release calendar |
|-------------|-----------------|
| ![Main editor](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234623.png) | ![Release calendar](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234640.png) |

| About dialog | Token dialog |
|--------------|--------------|
| ![About dialog](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234649.png) | ![Token dialog](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/VersionTrackerScreenShots/Screenshot-2025-10-31-234707.png) |

---

## ⚡ Quickstart

```bash
git clone https://github.com/skillerious/VersionTrackerEditorElectron.git
cd VersionTrackerEditorElectron
npm install
npm start
```

1. Install **Node.js 18+** and **Git**.
2. Run `npm start` to launch the development build of Electron.
3. Complete onboarding: configure repo defaults, prepare workspace storage, and store a PAT with the required scopes.
4. Press `F5` (or click **Fetch**) to pull `repoversion.json`. Modify the manifest and press `Ctrl/Cmd + S` to commit via GitHub.
5. Use `npm run dist` to build installers when you are ready to ship.

---

## 🧭 Onboarding overview

1. **Repository** — Enter owner, repository, branch, and manifest path. Values persist to `%AppData%/VersionTrackerEditor/settings.json`.
2. **Token** — Paste a PAT with `Contents: read/write` (fine‑grained) or `repo` (classic). The dialog shows the storage source and environment overrides.
3. **Verify** — Run verification to fetch account metadata, accepted scopes, and SSO requirements. Results persist to `token-info.json`.
4. **Workspace** — Prepare the workspace folder; baseline files and directories are created in `%AppData%/VersionTrackerEditor`.
5. **Finish** — Once all steps are green, fetching, editing, and committing are fully enabled.

---

## 🔐 Working with GitHub

### Personal access token requirements

- Use a **fine‑grained PAT** scoped to `Contents: read/write` for `Skillerious/Version-Tracker` (or `repo` for classic tokens).
- Stored PATs live in `%AppData%/VersionTrackerEditor/version-tracker.json` and never touch the Git repository.
- Environment variables `GITHUB_TOKEN` or `GITHUB_PERSONAL_TOKEN` override the stored value. The UI warns you when the override lacks the required scope.

### Verification flow

1. Open **Settings → Token & access → Verify stored token**.
2. The dialog invokes `token:info`, calling `https://api.github.com/user` with the active token.
3. Scope chips, account metadata, and the `lastVerified` timestamp update automatically; failures include remediation hints and documentation links.

### Environment overrides

- The console logs `token:get -> source: env` when an environment token is active. Remove or rotate the variable to fall back to the stored PAT.
- After clearing environment variables, restart your shell (or VS Code) and relaunch the app; the log should switch to `token:get -> source: store`.

---

## 🏗 Architecture overview

| Layer | Responsibilities | Key file |
|-------|------------------|----------|
| **Main process** | Window lifecycle, storage preparation, IPC handlers (`token:*`, `github:*`, `setup:*`, `file:*`, `app:info`, `shell:*`, `win:*`). | `main.js` |
| **Preload** | Exposes a safe `vt` namespace and bridges renderer requests via context isolation. | `preload.cjs` |
| **Renderer** | UI state machine, onboarding, fetch/commit workflows, dialogs, validation, release calendar rendering. | `renderer.js` |

**IPC channels**

| Channel | Description |
|---------|-------------|
| `token:get/set/remove/info` | Read, persist, delete, and verify GitHub tokens (including migration and cleanup reporting). |
| `github:getFile/putFile` | Pull and push `repoversion.json` using REST with optimistic locking. |
| `setup:status/ensure/openDir` | Prepare workspace storage and expose paths to the renderer. |
| `file:openJSON/saveJSON/readJSON/writeJSON` | Local JSON helpers for import/export utilities. |
| `app:info` | Returns metadata, environment versions, and resolved paths for the About dialog. |
| `win:*` | Window controls (minimise, maximise toggle, force close). |

---

## 🔑 Token management

- **Storage location** — `%AppData%/VersionTrackerEditor/version-tracker.json` stores the PAT and UI preferences.
- **Migration** — `token:get` searches legacy keytar entries and historical files, migrating them into the Electron store and logging the previous source.
- **Cleanup** — `token:remove` clears the stored PAT and purges legacy keytar credentials, returning a cleanup report to the renderer.
- **Diagnostics** — Open devtools to monitor `token:get -> ...` logs and verify which token source is active.

---

## ✅ Commit lifecycle

1. **Connectivity** — Pings `https://api.github.com/zen`; if unreachable, a toast asks you to retry later.
2. **Token preflight** — Confirms a PAT exists and advertises `Contents: read/write` or `repo` scope before continuing.
3. **Apply edits** — When the form is dirty, you are prompted to apply changes so the JSON preview and backing data remain in sync.
4. **Validation** — Renderer‑side validation lists issues in a toast; no network calls are made until all problems are resolved.
5. **Confirmation** — Optional confirmation dialog summarises target repo, branch, SHA, and apps.
6. **Publish** — `github:putFile` uploads the new manifest with the previous SHA for optimistic locking.
7. **Post‑commit** — SHA badges update, dirty state clears, onboarding/status panels refresh, and a success toast references the short SHA.

---

## 💾 Persistence & storage

| File | Location | Purpose |
|------|----------|---------|
| `settings.json` | `%AppData%/VersionTrackerEditor/settings.json` | Repo defaults, created timestamp, onboarding notes. |
| `token-info.json` | `%AppData%/VersionTrackerEditor/token-info.json` | Last verification metadata, scopes, account details. |
| `version-tracker.json` | `%AppData%/VersionTrackerEditor/version-tracker.json` | Electron‑store payload (preferences, PAT, migration flag). |
| **Electron store** | `%AppData%/VersionTrackerEditor` | Backing store for UI preferences and token values. |
| **Manifest** | GitHub repository | Primary `repoversion.json` managed through the app. |

---

## 🪛 Logs & debugging

- Press `Ctrl/Cmd + Shift + I` to open devtools.
- Watch for structured logs such as `token:get -> ...`, `GitHub commit failed`, and onboarding status updates.
- The main process logs migration, cleanup, and network errors to the terminal running `npm start`.
- Use **About → Copy details** to export environment and path information when filing issues.

---

## 🛠 Settings dashboard

- Connection overview cards showing repository, branch, manifest path, and current SHA.
- Token status badges with storage source, scopes, last verification, and error messaging.
- Workspace utilities to open directories, rerun setup, and copy absolute paths.
- Preference toggles for auto fetch on launch, commit confirmations, compact density, and helper tips.

---

## 🔁 Update experience

- Title‑bar glyphs indicate whether an update is available, checking, current, or failed.
- The update dialog summarises release notes, download links, and links to the GitHub release page.
- Background checks run on a timer; manual checks are available from the settings card.

---

## ✍️ Editing workflow

- Sidebar applications map to stable/beta/history forms with semantic helpers.
- Build code incrementers and version bumpers speed up routine release prep.
- History entries support add, duplicate, and delete operations with inline validation.
- The JSON preview mirrors every change, enabling quick copy/paste to other tools.

---

## 📅 Release calendar

- Switch between **all**, **stable**, **beta**, and **history** views.
- Toggle undated entries, filter by channel, and search by app name.
- Reset filters with a single click to return to the overview.

---

## ⌨️ Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `F5` | Fetch manifest |
| `Ctrl/Cmd + S` | Commit manifest |
| `Ctrl/Cmd + ,` | Open Settings tab |
| `Ctrl/Cmd + Shift + P` | Toggle compact density |
| `Alt + Left/Right` | Switch activity tabs |
| `Ctrl/Cmd + F` | Focus release calendar search |

---

## 🧱 Data model

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

## 🧪 Validation rules

- App IDs must match: `^[a-z0-9][a-z0-9-]{1,}$`
- Versions follow semantic versioning (pre‑release tags allowed).
- Build codes are non‑negative integers.
- Dates use ISO `YYYY-MM-DD`.
- URLs must start with `http` or `https`.
- Duplicate app IDs or history entries are rejected.

---

## 🆘 Troubleshooting

| Scenario | Resolution |
|----------|------------|
| **No token stored** | Use **Settings → Token & access → Set token** or provide `GITHUB_TOKEN` / `GITHUB_PERSONAL_TOKEN`. |
| **Verification fails with SSO** | Enable SSO for the PAT in GitHub, then rerun verification. |
| **Commit button opens token dialog** | The active token lacks `Contents: read/write`. Paste a refreshed PAT via the token dialog. |
| **GitHub returns 403 with “Token scopes: (none reported)”** | Remove or update the `GITHUB_TOKEN` environment variable; restart your shell so the app can use the stored PAT. |
| **Fetch failed / DNS errors** | Confirm network access to `https://api.github.com` and retry when online. |
| **Update dialog shows error** | Indicates the update feed was unreachable; click **Check again** once connectivity returns. |
| **Workspace folder missing** | Click **Prepare workspace** in Settings to rebuild directories and metadata. |
| **Unsure which token is active** | Open devtools; look for `token:get -> source: ...` logs to confirm whether the PAT comes from AppData or the environment. |

---

## 🛣 Roadmap

- Automated release notes ingestion for the update dialog.
- Multi‑repo workspace switching.
- Additional validation (stable/beta consistency, release date windows).
- Bulk history editing.
- Optional notifications (Slack, Teams) after commits.

---

## 🗂 Project structure

```text
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

## 🧰 Tech stack

- Electron **31.x**
- Node.js **18+**
- `electron-store` (persistence)
- `keytar` (optional secure storage; migrated automatically if present)
- `marked` (markdown rendering)
- Vanilla HTML/CSS/JS with modern browser APIs

---

## 🛠 Development

```bash
npm install
npm start
```

- `npm run dist` builds platform installers.
- `npm run pack` creates unpacked artifacts.
- Keep `assets/` screenshots updated when the UI changes.
- Pull requests should update documentation where relevant.

---

## 📄 License

Released under the [MIT License](LICENSE).

&copy; Robin Doak (Skillerious). Contributions welcome!
