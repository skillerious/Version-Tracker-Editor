# Version Tracker (Electron Edition)

Version Tracker is a desktop editor for `repoversion.json` manifests that mirrors the workflow of Visual Studio Code while staying focused on release management. It pairs a rich, form-driven editor with GitHub integration so you can review, validate, and publish version metadata without leaving the app.

![Main workspace](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/Screenshot-2025-10-21-193013.png)

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

## Highlights
- **VS Code-inspired workspace** - Custom titlebar with hover animations, draggable breadcrumb navigation, activity bar tabs, and a resizable application list keep navigation intuitive.
- **GitHub-first workflow** - Fetch and commit `repoversion.json` through the GitHub REST API with scoped PAT verification, descriptive error feedback, and SHA tracking.
- **Secure token storage** - Persists your Personal Access Token with `keytar` when available, falls back to `electron-store`, and includes a Verify dialog that surfaces account, scope, and SSO details.
- **Form-driven editing** - Edit schema-wide metadata, stable/beta tracks, and release history with validation for semver, slug formats, dates, and required URLs.
- **Versioning helpers** - One-click version bumpers, automatic slugify, promote/clone actions between release tracks, and history builders speed up routine updates.
- **JSON preview and validation** - Preview the generated manifest, copy it to the clipboard, save locally, or run validation checks before committing upstream.
- **Release calendar timeline** - Visualise upcoming, recent, and stale releases across every app with filters for track types and a timeline summary.
- **New-app wizard** - Three-step wizard scaffolds an application with IDs, versions, and download links in seconds.
- **Status awareness** - Dirty indicator in the status bar, toast-style status messages, and keyboard shortcut hints keep the editing state obvious.
- **Responsive and accessible design** - Compact density mode, `prefers-reduced-motion` fallbacks, focus outlines, and high-contrast cards keep the UI usable across environments.
- **Cross-platform packaging** - Electron Builder configuration is included for producing distributable builds.

## Screenshots
- ![Main user interface](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/Screenshot-2025-10-21-193013.png)  
  Full editor showing the sidebar application list, editor form, and activity tabs.
- ![About dialog](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/Screenshot-2025-10-21-193751.png)  
  Polished dialog summarising features and keyboard shortcuts with a quick link to the GitHub repo.
- ![Documentation reference view](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/Screenshot-2025-10-21-193319.png)  
  Markdown-ready guidance that can surface schema details and workflow tips directly inside the app.
- ![Confirmation and ignore workflow](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/Screenshot-2025-10-21-193337.png)  
  Safety prompts appear before discarding, skipping, or ignoring critical actions.
- ![Settings and token management](https://raw.githubusercontent.com/Skillerious87/SwiftImageHost/main/images/TargetTracker/Screenshot-2025-10-21-193026.png)  
  Repository configuration, secure token storage, and verification tools live inside the Settings tab.

## Getting Started
1. **Install prerequisites**
   - [Node.js](https://nodejs.org/) 18 or later (Electron 31 requires a modern runtime).
   - Windows, macOS, or Linux with desktop access. `keytar` builds native bindings, so ensure build tools are present (Xcode CLT on macOS, MSVC Build Tools on Windows, build-essential on Linux).
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Launch the app**
   ```bash
   npm start
   ```
   The app maximises on launch. Use the custom window buttons to restore or minimise as needed.
4. **Package for distribution (optional)**
   ```bash
   npm run dist
   ```
   Electron Builder outputs installers under the `dist/` folder.

## Working with GitHub
1. Open the **Settings** tab (activity bar -> Settings).
2. Update the repository coordinates if you are not targeting the default `skillerious/Version-Tracker@main`.
3. Click **Set Token...** to provide a GitHub Personal Access Token (PAT) with the **Contents: read/write** scope.  
   - Tokens are stored via `keytar` when available, otherwise inside the local `electron-store`.  
   - Environment variable fallback: if neither store contains a token, `GITHUB_TOKEN` will be used.
4. Use **Verify Token** to confirm the token scopes, associated account, and any required SSO authorisations. Validation happens through the GitHub `/user` endpoint and reports missing scopes or SSO headers directly in the UI.
5. **Fetch** (`F5` or toolbar -> refresh icon) retrieves `repoversion.json`, deserialises it, and populates the UI while recording the remote SHA.
6. **Commit** (`Ctrl+S` / `Cmd+S` or toolbar -> git icon) validates the manifest, stamps a new generated timestamp, and uploads changes. Responses include detailed hints whenever GitHub rejects the request (missing scope, SSO restriction, etc.).
7. Breadcrumbs along the titlebar provide quick navigation to the owner, repository, branch tree, and file blob on GitHub; hold `Ctrl`/`Cmd` and click to open in your default browser.

## Configuration & Storage
- **Repository settings** (owner, repo, branch, manifest path) persist via `electron-store` under your OS application data folder:  
  - Windows: `%APPDATA%/Version Tracker/config.json`  
  - macOS: `~/Library/Application Support/Version Tracker/config.json`  
  - Linux: `~/.config/Version Tracker/config.json`
- **Tokens** are written to the OS password vault when `keytar` is available (Windows Credential Manager, macOS Keychain, GNOME Keyring/KWallet). If native bindings are unavailable, a fallback encrypted store is used inside the same config directory.
- **Onboarding preferences** (e.g. "Skip getting started") and UI choices such as compact density live in the same store; delete the config file to reset the workspace.
- **Local cache**: When you use "Save JSON..." the manifest is written wherever you choose; no unprompted copies are retained.
- **Environment overrides**: Supplying `GITHUB_TOKEN` or `GITHUB_PERSONAL_TOKEN` at launch provides a token without storing it. Workspace settings respect these variables unless overridden manually.
- **Per-device tweaks**: Sidebar width, wizard progress, and toast dismissals are stored in the renderer's `localStorage`; clear the Electron profile (or run with `--guest`) to reset them.
- **Diagnostics**: Use the About dialog to copy runtime information, or inspect console logs from the terminal session that launched Electron for in-depth troubleshooting.

## Editing Workflow
- **Sidebar applications**
  - Add, duplicate, or delete apps.  
  - Drag the sidebar edge to resize.  
  - Hover animations highlight the active selection while respecting `prefers-reduced-motion`.
- **Dataset card**
  - Manage global metadata like contact information and generated timestamp (auto-updated on commit/save).
- **App details**
  - ID slug, display name, category, platform, architecture, tags, and description fields.
  - Stable and optional Beta tracks with fields for semantic version, build code, release date, URLs, download links, notes, and hash data.
  - Quick actions: auto-slugify IDs, bump version (major/minor/patch), suggest next build code, promote Beta -> Stable, clone Stable -> Beta.
- **History management**
  - Append or remove historic releases within a table-driven editor. Each row supports inline editing, keyboard navigation, and deletion.
- **Preview tab**
  - Renders the generated JSON, provides copy and save-as buttons, and runs validation to enumerate issues before publishing.
- **Wizard tab**
  - Guided three-step flow to scaffold new applications with recommended defaults.
- **Settings tab**
  - Repository, branch, file path inputs.
  - Token dialogs (set, verify) and a toggle for compact density mode.
- **Dialogs and confirmations**
  - Token dialog (password-style input) and About dialog (feature summary plus shortcuts).
  - Built-in confirmation prompts guard destructive actions like deleting apps or dismissing unsaved changes.
- **Status bar**
  - Dirty indicator dot (turns cyan when unsaved).
  - Status text updates for fetch, commit, validation, clipboard copy.
  - Shortcut hints remind you of F5 and Ctrl/Cmd+S combos.

## Release Calendar
The **Calendar** tab surfaces every planned or historic release in a vertical timeline so you can prioritise work quickly.

- Summary chips highlight how many releases are **Upcoming** (within 14 days), **Recent** (shipped within 14 days), or **Stale** (older than 60 days).
- Filters let you toggle Stable, Beta, or History entries, and switch between *All*, *Upcoming*, or *Stale* views.
- Each entry shows app name, track, version, build code, release date, relative timing, and quick links to release or download URLs.
- Undated items appear with a dashed outline, reminding you to capture the ship date before publishing.
- The timeline automatically refreshes after fetches, commits, wizard actions, or manual edits, so it always reflects the latest manifest state.

## Keyboard Shortcuts
- `F5` - Fetch the latest `repoversion.json` from GitHub.
- `Ctrl + S` / `Cmd + S` - Commit changes back to GitHub.
- `Ctrl + Click` (breadcrumb items) - Open GitHub links in the browser.
- Standard editing shortcuts are respected across text inputs and tables.

## Data Model
`repoversion.json` follows a compact schema designed for downstream automation.

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

- **Tracks**: Stable is required; Beta is optional and can be toggled per app. Each track may include version, numeric build code, ISO date, release URL, download URL, and freeform notes.
- **History**: Optional chronological entries that the editor normalises (ensuring dates, codes, and URLs stay consistent). History rows are also pulled into the calendar when enabled.
- **Generated**: Auto-updated timestamp whenever you commit or explicitly refresh the preview, useful for audit trails.

## Validation Rules
The editor performs real-time checks to catch issues before they ship.

- **Identifiers**: App IDs must be lowercase slug strings (`[a-z0-9-]`) and unique across the manifest.
- **Semantic versions**: Stable and beta versions are validated against a permissive semver regex allowing pre-release/build metadata.
- **Dates**: Track and history dates must be in `YYYY-MM-DD` format; undated entries remain editable but are flagged in tooltips and the calendar.
- **URLs**: Release and download fields require `http://` or `https://` prefixes.
- **Codes**: Build codes must be whole numbers >= 0. Quick actions suggest the next code based on history.
- **Wizard**: Blocks finishing until required fields are populated and guides you to fix errors step by step.
- **Commit**: Before uploading, the app stamps `generated`, re-validates the manifest, and surfaces any blocking issues in toasts and the status bar.

## Troubleshooting
| Scenario | Fix |
|----------|-----|
| **Token verification fails** | Confirm the PAT includes `Contents: read/write`, re-run **Verify Token**, and ensure SSO is approved if your org requires it. |
| **Fetch returns 404** | Check Settings for owner/repo/branch/path typos and verify the GitHub token has access to the target repo. |
| **Commit rejected with 409** | Another change landed first. Fetch to refresh the remote SHA, resolve conflicts locally, then commit again. |
| **Calendar shows "No releases match"** | Enable the Stable/Beta/History filters and ensure your tracks include dates or other fields so entries are detectable. |
| **Keytar build errors** | Install native build tooling (`npm install --global --production windows-build-tools` on Windows, Xcode CLT on macOS, `build-essential` on Linux) or fall back to the bundled electron-store. |
| **App feels sluggish** | Toggle compact density in Settings, close unused tabs, or reduce animations via system-level `prefers-reduced-motion`. |

## Roadmap
- GitHub pull-request mode for staging manifest changes before merging to main.
- Release kits: bundle JSON, notes, and hashes into a distributable artifact.
- Automated URL and checksum validation jobs running in the background.
- Multi-repo workspaces with quick switching and shared token storage.
- Optional webhook notifications (Slack, Teams, email) on fetch/commit outcomes.

## Project Structure
| Path | Description |
|------|-------------|
| `main.js` | Electron main process: window lifecycle, IPC wiring, GitHub REST calls, secure token management, file dialogs, and window controls. |
| `preload.cjs` | Bridge that exposes whitelisted APIs (`token`, `github`, `file`, `shell`, `win`) to the renderer with `contextIsolation` enabled. |
| `renderer.js` | SPA-style front-end logic: state management, GitHub fetch/commit orchestration, form rendering, wizard, validation, previews, and dialogs. |
| `index.html` | Application shell with titlebar, toolbar, activity bar, and tabbed workspace layout. |
| `styles.css` | VS Code-inspired theming, responsive grids, motion/hover treatments, and dialog styling. |
| `assets/` | SVG/ICO iconography used across the toolbar, sidebar, and dialogs. |
| `GHtoken*.txt` | Local convenience files (not required for production) for storing development PATs outside of keytar. |

## Tech Stack
- **Electron 31** for cross-platform desktop packaging.
- **Electron Builder** for distribution (NSIS/DMG/AppImage options configurable in `package.json`).
- **Electron Store** for persistent settings when secure keychains are unavailable.
- **Keytar** (optional native module) for OS-level secret storage.
- **Modern JavaScript** with ES modules, async/await, and DOM-driven UI (no frontend framework required).
- **Marked** is bundled so Markdown documentation can be rendered directly in the UI.

## Development
- `npm start` launches the app in development mode with reload-on-save for renderer resources.
- `npm run dist` packages the application using Electron Builder (outputs to `dist/`). Adjust `package.json > build` for custom targets or icons.
- `preload.cjs` exposes a minimal, vetted API surface. Add new IPC channels here rather than importing Node modules directly in the renderer.
- The renderer avoids frameworks to keep bundle size small. If you add dependencies, update `package.json` and confirm they work within Electron's security constraints (`contextIsolation`, `sandbox`, CSP, etc.).
- To instrument debugging, use Chrome DevTools (`Ctrl+Shift+I` / `Cmd+Opt+I`) and the `console` output from `main.js` in the terminal.

## License
Released under the MIT License (see `package.json`).  
(c) Robin Doak - Skillerious.
