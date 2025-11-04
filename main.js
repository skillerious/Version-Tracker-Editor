import { app, BrowserWindow, ipcMain, dialog, shell } from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import { fileURLToPath } from "node:url";
import Store from "electron-store";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const DATA_DIR_NAME = "VersionTrackerEditor";
const SETTINGS_FILE = "settings.json";
const TOKEN_META_FILE = "token-info.json";

function getDataRoot() {
  return path.join(app.getPath("appData"), DATA_DIR_NAME);
}

await fs.mkdir(getDataRoot(), { recursive: true });

const store = new Store({
  name: "version-tracker",
  cwd: getDataRoot()
});

const APP_METADATA = {
  description: "A focused workspace for auditing and publishing release manifests with GitHub-driven workflows.",
  author: "Skillerious / Robin Doak",
  homepage: "https://github.com/skillerious/Version-Tracker"
};

const DEFAULT_REPO = { owner: "skillerious", repo: "Version-Tracker", branch: "main", path: "repoversion.json" };
const TOKEN_STORE_KEY = "github_token";
const LEGACY_MIGRATION_FLAG = "__legacy_token_migrated__";
const LEGACY_SERVICE = "VersionTrackerEditor_GitHub";
const LEGACY_ACCOUNT = "token";

let keytarModulePromise = null;
function loadKeytarModule() {
  if (!keytarModulePromise) {
    keytarModulePromise = import("keytar").catch(() => null);
  }
  return keytarModulePromise;
}

function normalizeToken(token) {
  return String(token ?? "").trim();
}

function safeGetAppPath(key) {
  try {
    return app.getPath(key);
  } catch {
    return "";
  }
}

function getLegacyStorePaths() {
  const paths = new Set();
  const userData = safeGetAppPath("userData");
  if (userData) paths.add(path.join(userData, "version-tracker.json"));
  const appData = safeGetAppPath("appData");
  if (appData) {
    paths.add(path.join(appData, "version-tracker", "version-tracker.json"));
    paths.add(path.join(appData, "VersionTrackerEditor-nodejs", "Config", "version-tracker.json"));
  }
  const currentStorePath = store?.path ? path.normalize(store.path) : "";
  return Array.from(paths).filter((candidate) => candidate && path.normalize(candidate) !== currentStorePath);
}

async function readJsonIfExists(target) {
  try {
    const text = await fs.readFile(target, "utf-8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function writeJsonFile(target, data) {
  const dir = path.dirname(target);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(target, JSON.stringify(data, null, 2), "utf-8");
}

async function findLegacyFileToken() {
  const candidates = getLegacyStorePaths();
  for (const file of candidates) {
    const data = await readJsonIfExists(file);
    if (data && typeof data === "object" && data.github_token) {
      const token = normalizeToken(data.github_token);
      if (token) return { token, file };
    }
  }
  return null;
}

async function clearLegacyFileTokens() {
  const removed = [];
  const errors = [];
  const candidates = getLegacyStorePaths();
  for (const file of candidates) {
    if (!(await pathExists(file))) continue;
    let data = await readJsonIfExists(file);
    if (!data || typeof data !== "object") continue;
    if (!data.github_token) continue;
    try {
      delete data.github_token;
      await writeJsonFile(file, data);
      removed.push(file);
    } catch (err) {
      errors.push({ file, error: err });
    }
  }
  return { removed, errors };
}

async function findLegacyKeytarToken() {
  const keytar = await loadKeytarModule();
  if (!keytar?.getPassword) return null;
  try {
    const direct = normalizeToken(await keytar.getPassword(LEGACY_SERVICE, LEGACY_ACCOUNT));
    if (direct) return { token: direct, account: LEGACY_ACCOUNT };
  } catch (err) {
    console.warn("Failed to read keytar token for default account:", err);
  }
  if (keytar?.findCredentials) {
    try {
      const credentials = await keytar.findCredentials(LEGACY_SERVICE);
      for (const credential of credentials) {
        if (!credential?.account) continue;
        const token = normalizeToken(credential?.password);
        if (token) return { token, account: credential.account };
      }
    } catch (err) {
      console.warn("Failed to enumerate legacy keytar credentials:", err);
    }
  }
  return null;
}

async function clearLegacyKeytarTokens() {
  const keytar = await loadKeytarModule();
  if (!keytar?.deletePassword) return { removed: false, accounts: [], errors: [] };
  const accountsCleared = new Set();
  const errors = [];
  try {
    if (await keytar.deletePassword(LEGACY_SERVICE, LEGACY_ACCOUNT)) accountsCleared.add(LEGACY_ACCOUNT);
  } catch (err) {
    errors.push({ account: LEGACY_ACCOUNT, error: err });
  }
  if (keytar?.findCredentials) {
    try {
      const credentials = await keytar.findCredentials(LEGACY_SERVICE);
      for (const credential of credentials) {
        if (!credential?.account) continue;
        try {
          if (await keytar.deletePassword(LEGACY_SERVICE, credential.account)) {
            accountsCleared.add(credential.account);
          }
        } catch (err) {
          errors.push({ account: credential.account, error: err });
        }
      }
    } catch (err) {
      errors.push({ account: "*enumerate*", error: err });
    }
  }
  return { removed: accountsCleared.size > 0, accounts: Array.from(accountsCleared), errors };
}

async function clearLegacyTokenSources() {
  const fileResult = await clearLegacyFileTokens();
  const keytarResult = await clearLegacyKeytarTokens();
  const errors = [
    ...fileResult.errors.map((entry) => ({
      source: entry.file,
      message: entry.error?.message || String(entry.error)
    })),
    ...keytarResult.errors.map((entry) => ({
      source: entry.account,
      message: entry.error?.message || String(entry.error)
    }))
  ];
  return {
    fileRemoved: fileResult.removed,
    keytarRemoved: keytarResult.removed,
    keytarAccounts: keytarResult.accounts,
    errors
  };
}

async function findLegacyToken() {
  const keytarToken = await findLegacyKeytarToken();
  if (keytarToken?.token) return { token: keytarToken.token, source: "keytar", meta: keytarToken };
  const fileToken = await findLegacyFileToken();
  if (fileToken?.token) return { token: fileToken.token, source: "legacy-store", meta: fileToken };
  return null;
}

async function migrateLegacyTokenIfPresent() {
  if (store.get(LEGACY_MIGRATION_FLAG, false)) return null;
  const legacy = await findLegacyToken();
  if (!legacy?.token) {
    store.set(LEGACY_MIGRATION_FLAG, true);
    return null;
  }
  store.set(TOKEN_STORE_KEY, legacy.token);
  const cleanup = await clearLegacyTokenSources();
  console.info(`Migrated GitHub token from ${legacy.source} to AppData store.`);
  store.set(LEGACY_MIGRATION_FLAG, true);
  return { token: legacy.token, source: "store", migratedFrom: legacy.source, cleanup };
}
async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}
async function ensureDataHome(payload = {}) {
  const repo = payload?.repo && typeof payload.repo === "object" ? payload.repo : DEFAULT_REPO;
  const dir = getDataRoot();
  await fs.mkdir(dir, { recursive: true });
  const settingsPath = path.join(dir, SETTINGS_FILE);
  const tokenMetaPath = path.join(dir, TOKEN_META_FILE);
  const created = { settings: false, tokenMeta: false };

  if (!(await pathExists(settingsPath))) {
    const defaultSettings = {
      created: new Date().toISOString(),
      repo,
      notes: "Update this file to override default repository settings for Version Tracker Editor."
    };
    await fs.writeFile(settingsPath, JSON.stringify(defaultSettings, null, 2), "utf-8");
    created.settings = true;
  }
  if (!(await pathExists(tokenMetaPath))) {
    const defaultTokenMeta = {
      lastVerified: null,
      scopes: [],
      note: "Metadata captured after verifying your GitHub personal access token."
    };
    await fs.writeFile(tokenMetaPath, JSON.stringify(defaultTokenMeta, null, 2), "utf-8");
    created.tokenMeta = true;
  }
  return {
    dir,
    paths: {
      settings: settingsPath,
      tokenMeta: tokenMetaPath,
      store: store.path
    },
    created
  };
}
async function getDataStatus() {
  const dir = getDataRoot();
  const dirExists = await pathExists(dir);
  const settingsPath = path.join(dir, SETTINGS_FILE);
  const tokenMetaPath = path.join(dir, TOKEN_META_FILE);
  const settingsExists = dirExists && await pathExists(settingsPath);
  const tokenMetaExists = dirExists && await pathExists(tokenMetaPath);
  return {
    dir,
    dirExists,
    settingsExists,
    tokenMetaExists,
    storePath: store.path,
    paths: {
      settings: settingsPath,
      tokenMeta: tokenMetaPath
    }
  };
}

function getPreloadPath() {
  return path.join(__dirname, "preload.cjs"); // CommonJS preload
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 980,
    minHeight: 640,
    show: false,
    title: "Version Tracker",
    backgroundColor: "#1e1e1e",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    trafficLightPosition: { x: 12, y: 12 },
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false
    }
  });

  let closingApproved = false;
  const handleForceClose = (event) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (senderWindow && senderWindow === win) {
      closingApproved = true;
      win.close();
    }
  };

  win.on("close", (event) => {
    if (closingApproved || win.webContents.isDestroyed()) return;
    event.preventDefault();
    try {
      win.webContents.send("app:before-close");
    } catch (error) {
      console.warn("Failed to notify renderer before close:", error);
      closingApproved = true;
      win.close();
    }
  });

  ipcMain.on("win:force-close", handleForceClose);

  win.on("closed", () => {
    ipcMain.removeListener("win:force-close", handleForceClose);
  });

  win.loadFile("index.html");
  win.once("ready-to-show", () => {
    win.maximize();
    win.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// -------- Token storage
async function getToken() {
  const stored = normalizeToken(store.get(TOKEN_STORE_KEY, ""));
  if (stored) return { token: stored, source: "store" };
  const migrated = await migrateLegacyTokenIfPresent();
  if (migrated?.token) return migrated;
  const env = normalizeToken(process.env.GITHUB_TOKEN);
  if (env) return { token: env, source: "env" };
  return { token: "", source: "none" };
}

ipcMain.handle("token:get", async () => {
  const result = await getToken();
  console.info("token:get -> result", {
    source: result?.source || "none",
    hasToken: !!result?.token,
    migratedFrom: result?.migratedFrom || null,
    storePath: store.path
  });
  return result;
});
ipcMain.handle("token:set", async (_e, token) => {
  if (!token || typeof token !== "string") throw new Error("Empty token");
  const trimmed = normalizeToken(token);
  if (!trimmed) throw new Error("Empty token");
  store.set(TOKEN_STORE_KEY, trimmed);
  store.set(LEGACY_MIGRATION_FLAG, true);
  console.info("token:set -> stored token in AppData store.", { path: store.path });
  const cleanup = await clearLegacyTokenSources();
  if (cleanup.errors.length) {
    console.warn("Legacy token cleanup reported issues after set:", cleanup.errors);
  }
  return { ok: true, source: "store", cleanup };
});
ipcMain.handle("token:remove", async () => {
  try {
    store.delete(TOKEN_STORE_KEY);
  } catch (err) {
    console.error("Failed to delete token from electron-store:", err);
    throw new Error(`Token removal failed while clearing local storage: ${err.message}`);
  }

  const cleanup = await clearLegacyTokenSources();
  if (cleanup.errors.length) {
    console.warn("Legacy token cleanup reported issues during removal:", cleanup.errors);
  }

  const next = await getToken();
  if (next.token && next.source !== "env") {
    const detail = cleanup.errors.length
      ? ` Legacy cleanup errors: ${cleanup.errors.map((entry) => `${entry.source}: ${entry.message}`).join("; ")}`
      : "";
    throw new Error(`Token removal incomplete: ${next.source} still reports a token.${detail}`);
  }

  console.info("token:remove -> token cleared from AppData store.", { path: store.path, cleanup });

  return { ok: !next.token || next.source === "env", next, cleanup };
});
ipcMain.handle("token:info", async () => {
  const info = await getToken();
  const { token, source } = info;
  if (!token) return { hasToken: false, source, scopes: [], acceptedScopes: [], login: null };
  const res = await fetch("https://api.github.com/user", { headers: ghHeaders(token) });
  const scopes = (res.headers.get("x-oauth-scopes") || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const acceptedScopes = (res.headers.get("x-accepted-oauth-scopes") || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  if (!res.ok) {
    const body = await res.text();
    return {
      hasToken: true,
      source,
      scopes,
      acceptedScopes,
      login: null,
      error: `GitHub user lookup failed: ${res.status} ${res.statusText}\n${body || "(empty body)"}`
    };
  }
  const profile = await res.json();
  return {
    hasToken: true,
    source,
    scopes,
    acceptedScopes,
    login: profile?.login || null,
    name: profile?.name || null,
    type: profile?.type || null
  };
});

// -------- GitHub API
function ghHeaders(token) {
  const trimmed = normalizeToken(token);
  const scheme = /^gh[us]_/.test(trimmed) ? "Bearer" : "token";
  return {
    "Authorization": `${scheme} ${trimmed}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "VersionTracker-Electron"
  };
}

function formatGitHubError(op, res, raw) {
  const text = typeof raw === "string" ? raw : "";
  let message = text;
  try {
    const parsed = JSON.parse(text || "{}");
    message = parsed.message || text || "(no response body)";
    if (Array.isArray(parsed.errors) && parsed.errors.length) {
      const details = parsed.errors
        .map((err) => {
          if (typeof err === "string") return err;
          if (err?.message) return err.message;
          if (err?.code) return `${err.code}${err?.field ? ` (${err.field})` : ""}`;
          return JSON.stringify(err);
        })
        .join("; ");
      message += `\nDetails: ${details}`;
    }
    if (parsed.documentation_url) {
      message += `\nDocs: ${parsed.documentation_url}`;
    }
  } catch {
    if (!text) message = "(no response body)";
  }

  const scopes = (res.headers.get("x-oauth-scopes") || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const accepted = (res.headers.get("x-accepted-oauth-scopes") || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  const sso = res.headers.get("x-github-sso");
  const hints = [];
  hints.push(`Token scopes: ${scopes.length ? scopes.join(", ") : "(none reported)"}.`);
  if (accepted.length) hints.push(`Endpoint expects scopes: ${accepted.join(", ")}.`);
  if (res.status === 403 && !scopes.includes("repo") && accepted.some(scope => scope.includes("repo"))) {
    hints.push("Add the 'repo' scope (or 'public_repo' for public repositories) to your personal access token.");
  }
  if (sso) {
    hints.push(`GitHub SSO status: ${sso}. Visit https://github.com/settings/tokens and enable SSO for this token if your organization enforces it.`);
  }

  return `GitHub ${op} failed: ${res.status} ${res.statusText}\n${message}${hints.length ? `\n${hints.join("\n")}` : ""}`;
}

ipcMain.handle("github:getFile", async (_e, { owner, repo, branch, path: filePath }) => {
  const { token } = await getToken();
  if (!token) throw new Error("No GitHub token stored.");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;
  let res;
  try {
    res = await fetch(url, { headers: ghHeaders(token) });
  } catch (error) {
    const code = error?.cause?.code || error?.code || "";
    const detail = code ? ` (${code})` : "";
    console.error("GitHub getFile network error:", error);
    throw new Error(`Network error fetching ${owner}/${repo}/${filePath} from GitHub${detail}. Check your internet connection or DNS settings.`);
  }
  const body = await res.text();
  if (!res.ok) throw new Error(formatGitHubError("GET", res, body));
  const js = JSON.parse(body);
  const text = Buffer.from(js.content || "", "base64").toString("utf-8");
  return { text, sha: js.sha || "" };
});

ipcMain.handle("github:putFile", async (_e, { owner, repo, branch, path: filePath, text, baseSha, message }) => {
  const { token } = await getToken();
  if (!token) throw new Error("No GitHub token stored.");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const body = {
    message: message || `chore: update repoversion.json (${new Date().toISOString()})`,
    content: Buffer.from(text, "utf-8").toString("base64"),
    branch
  };
  if (baseSha) body.sha = baseSha;
  let res;
  try {
    res = await fetch(url, {
      method: "PUT",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (error) {
    const code = error?.cause?.code || error?.code || "";
    const detail = code ? ` (${code})` : "";
    console.error("GitHub putFile network error:", error);
    throw new Error(`Network error updating ${owner}/${repo}/${filePath} on GitHub${detail}. Check your internet connection or DNS settings.`);
  }
  const out = await res.text();
  if (!res.ok) throw new Error(formatGitHubError("PUT", res, out));
  try { return JSON.parse(out); } catch { return { raw: out }; }
});

// -------- Files
ipcMain.handle("file:openJSON", async () => {
  const win = BrowserWindow.getFocusedWindow();
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: "Open repoversion.json",
    filters: [{ name: "JSON", extensions: ["json"] }],
    properties: ["openFile"]
  });
  if (canceled || !filePaths?.length) return { canceled: true };
  const text = await fs.readFile(filePaths[0], "utf-8");
  return { path: filePaths[0], text };
});

// Read a JSON file from the application's directory (synchronous path resolution)
ipcMain.handle("file:readJSON", async (_e, relPath) => {
  if (!relPath || typeof relPath !== "string") throw new Error("file:readJSON requires a relative path string");
  const abs = path.join(__dirname, relPath);
  const text = await fs.readFile(abs, "utf-8");
  try { return JSON.parse(text); } catch (err) { throw new Error(`Invalid JSON in ${relPath}: ${err.message}`); }
});

// Write a JSON file to the application's directory. In packaged apps this may fail due to permissions.
ipcMain.handle("file:writeJSON", async (_e, relPath, obj) => {
  if (!relPath || typeof relPath !== "string") throw new Error("file:writeJSON requires a relative path string");
  const abs = path.join(__dirname, relPath);
  const text = JSON.stringify(obj, null, 2);
  await fs.writeFile(abs, text, "utf-8");
  return { path: abs };
});

ipcMain.handle("file:saveJSON", async (_e, text) => {
  const win = BrowserWindow.getFocusedWindow();
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Save repoversion.json",
    defaultPath: path.join(os.homedir(), "repoversion.json"),
    filters: [{ name: "JSON", extensions: ["json"] }]
  });
  if (canceled || !filePath) return { canceled: true };
  await fs.writeFile(filePath, text, "utf-8");
  return { path: filePath };
});

ipcMain.handle("app:info", async () => {
  const status = await getDataStatus();
  const packaged = typeof app.isPackaged === "boolean"
    ? app.isPackaged
    : (typeof app.isPackaged === "function" ? app.isPackaged() : false);
  return {
    name: app.getName(),
    version: app.getVersion(),
    description: APP_METADATA.description || app.getName(),
    author: APP_METADATA.author || "",
    homepage: APP_METADATA.homepage || "",
    isPackaged: packaged,
    environment: {
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      v8: process.versions.v8
    },
    platform: {
      os: os.type(),
      release: os.release(),
      arch: os.arch()
    },
    paths: {
      data: status.dir,
      settings: status.paths.settings,
      tokenMeta: status.paths.tokenMeta,
      store: status.storePath
    },
    repo: DEFAULT_REPO
  };
});

ipcMain.handle("setup:status", async () => {
  return getDataStatus();
});
ipcMain.handle("setup:ensure", async (_e, payload = {}) => {
  const result = await ensureDataHome(payload);
  const status = await getDataStatus();
  return { ...result, status };
});
ipcMain.handle("setup:openDir", async () => {
  const dir = getDataRoot();
  await fs.mkdir(dir, { recursive: true });
  await shell.openPath(dir);
  return { dir };
});
ipcMain.handle("setup:prefs:get", async () => {
  const skip = store.get("preferences.skipOnboarding", false);
  return { skipOnboarding: !!skip };
});
ipcMain.handle("setup:prefs:set", async (_e, prefs = {}) => {
  if (typeof prefs.skipOnboarding === "boolean") {
    store.set("preferences.skipOnboarding", prefs.skipOnboarding);
  }
  const skip = store.get("preferences.skipOnboarding", false);
  return { skipOnboarding: !!skip };
});

ipcMain.handle("shell:openExternal", async (_e, url) => {
  await shell.openExternal(url);
  return { ok: true };
});

// -------- Window controls
ipcMain.on("win:minimize", (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w) w.minimize();
});
ipcMain.on("win:close", (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w) w.close();
});
ipcMain.handle("win:maximizeToggle", (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (!w) return false;
  if (w.isMaximized()) { w.unmaximize(); return false; }
  w.maximize(); return true;
});
ipcMain.handle("win:isMaximized", (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  return w ? w.isMaximized() : false;
});
