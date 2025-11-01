/* global vt */

// -------- Guards (helpful if preload fails during setup)
if (!("vt" in window)) {
  document.addEventListener("DOMContentLoaded", () => {
    const el = document.createElement("div");
    el.style.cssText = "padding:12px;background:#3c3c3c;color:#fff;font:13px Segoe UI, sans-serif";
    el.textContent = "Preload failed to load. Ensure preload.cjs exists and main.js points to it.";
    document.body.innerHTML = "";
    document.body.appendChild(el);
  });
}

// -------- Validators / utils
const RX_SEMVER = /^[0-9]+(\.[0-9]+)*([\-a-z0-9\.]+)?$/i;
const RX_SLUG   = /^[a-z0-9][a-z0-9\-]{1,}$/;
const RX_HTTP   = /^https?:\/\//i;

const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

const state = {
  repo: { owner: "skillerious", repo: "Version-Tracker", branch: "main", path: "repoversion.json" },
  sha: null,
  data: { schemaVersion: 2, generated: isoNow(), contact: "", apps: [] },
  currentIndex: null,
  dirty: false,
  formDirty: false,
  tab: "tab-editor",
  editorSection: "section-dataset",
  wizardPage: 1,
  calendar: {
    filters: { stable: true, beta: true, history: false },
    view: "all",
    includeUndated: true,
    search: ""
  }
};
let shaPopoverOpen = false;
const wizardState = {
  idTouched: false,
  lastValues: null,
  validation: { errors: { 1: [], 2: [], 3: [] }, warnings: [] }
};
const SETTINGS_PREF_KEY = "vt.settings.preferences";
let settingsPrefs = {
  autoFetchOnLaunch: true,
  confirmBeforeCommit: false,
  showHelperTips: true,
  compactDensity: false
};
const ONBOARDING_STEPS = ["repo", "token", "verify", "data"];
const ONBOARDING_DEFAULT_LABELS = {
  repo: "Pending setup",
  token: "Token not stored",
  verify: "Not checked",
  data: "Workspace not prepared"
};
const ONBOARDING_STEP_TITLES = {
  repo: "Repository target",
  token: "Store a token",
  verify: "Verify access",
  data: "Workspace storage"
};
const ONBOARDING_STATUS_ICONS = {
  pending: `<svg viewBox="0 0 16 16" fill="none" role="presentation" focusable="false"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5" opacity=".9"></circle><path d="M8 4.5v7M4.5 8h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"></path></svg>`,
  progress: `<svg viewBox="0 0 16 16" fill="none" role="presentation" focusable="false"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5" opacity=".55"></circle><path d="M8 4.25a.75.75 0 0 1 .53.22l2.6 2.6a.75.75 0 0 1 0 1.06l-2.6 2.6a.75.75 0 0 1-1.28-.53V8.81a3.56 3.56 0 0 0-1.85 1.01.75.75 0 0 1-1.06-1.06A5.06 5.06 0 0 1 7.67 7.3V5a.75.75 0 0 1 .33-.62.75.75 0 0 1 .46-.13Z" fill="currentColor"></path></svg>`,
  done: `<svg viewBox="0 0 16 16" fill="none" role="presentation" focusable="false"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5" opacity=".85"></circle><path d="M5.1 8.25 7.1 10.2 10.9 6.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
  error: `<svg viewBox="0 0 16 16" fill="none" role="presentation" focusable="false"><circle cx="8" cy="8" r="6.25" stroke="currentColor" stroke-width="1.5" opacity=".85"></circle><path d="M8 5v3.6m0 2.4h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"></path></svg>`
};
const onboarding = {
  tokenInfo: null,
  dataStatus: null,
  storedToken: null,
  activeStep: "repo",
  preferences: { skipOnboarding: false },
  stepState: {
    repo: { status: "pending", label: ONBOARDING_DEFAULT_LABELS.repo },
    token: { status: "pending", label: ONBOARDING_DEFAULT_LABELS.token },
    verify: { status: "pending", label: ONBOARDING_DEFAULT_LABELS.verify },
    data: { status: "pending", label: ONBOARDING_DEFAULT_LABELS.data }
  }
};

function isoNow(){
  const d = new Date();
  return new Date(Date.UTC(
    d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
    d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), 0
  )).toISOString().replace(/\.\d{3}Z$/, "Z");
}
function slugify(s){ return (s || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "app"; }
function escapeHtml(str){
  return String(str ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[ch]);
}
function setStatus(msg, ms=3000){
  $("#sbText").textContent = msg;
  if (ms > 0) {
    const tag = Symbol("sb");
    setStatus._tag = tag;
    setTimeout(() => { if (setStatus._tag === tag) $("#sbText").textContent = "Ready."; }, ms);
  }
}
const UPDATE_STATUS_META = {
  pending: { tooltip: "Update status pending", chip: "Status pending" },
  checking: { tooltip: "Checking for updates…", chip: "Checking updates" },
  available: { tooltip: "Update available", chip: "Update available" },
  current: { tooltip: "Up to date", chip: "Up to date" },
  error: { tooltip: "Update check failed", chip: "Check failed" }
};
const UPDATE_STATUS_COPY = {
  pending: { title: "Checking update status", lead: "We’ll let you know once we’ve fetched release information." },
  checking: { title: "Checking for updates…", lead: "Hang tight while we contact GitHub for the latest release." },
  available: { title: "A fresh build is ready", lead: "Download the latest Version Tracker release to get new features and fixes." },
  current: { title: "You’re up to date", lead: "You’re running the latest Version Tracker build." },
  error: { title: "Update check failed", lead: "We couldn’t reach the update service. Try again shortly." }
};
const updateState = { status: "available" };
function setUpdateStatus(status = "pending", overrides = {}) {
  const normalized = UPDATE_STATUS_META[status] ? status : "pending";
  updateState.status = normalized;
  const meta = UPDATE_STATUS_META[normalized] || {};
  const copy = UPDATE_STATUS_COPY[normalized] || {};
  const tooltip = overrides.tooltip || meta.tooltip || "Check for updates";
  const chipText = overrides.chip || meta.chip || "Update status";
  const titleText = overrides.title || copy.title || "Version Tracker updates";
  const leadText = overrides.lead || copy.lead || "";

  const btn = $("#btnUpdate");
  if (btn) {
    btn.dataset.state = normalized;
    btn.title = tooltip;
    btn.setAttribute("aria-label", tooltip);
  }
  const header = $("#updateDialogHeader");
  if (header) header.dataset.state = normalized;
  const chip = $("#updateDialogStatus");
  if (chip) {
    chip.dataset.state = normalized;
    chip.textContent = chipText;
  }
  const titleEl = $("#updateDialogTitle");
  if (titleEl) titleEl.textContent = titleText;
  const leadEl = $("#updateDialogLead");
  if (leadEl) leadEl.textContent = leadText;
}
function openUpdateDialog(){
  const dlg = $("#updateDialog");
  if (!dlg) return;
  setUpdateStatus(updateState.status);
  if (!dlg.open) dlg.showModal();
}
function closeUpdateDialog(){
  const dlg = $("#updateDialog");
  if (dlg?.open) dlg.close();
}
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const CALENDAR_DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_RECENT_WINDOW = 14;
const CALENDAR_STALE_WINDOW = 60;
const CALENDAR_STATUS_TEXT = {
  "upcoming": "Future",
  "upcoming-soon": "Upcoming",
  recent: "Recent",
  stale: "Stale",
  past: "Past",
  undated: "Undated"
};
function parseIsoDateStrict(value){
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return Number.isNaN(date.getTime()) ? null : date;
}
function startOfTodayUtc(){
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
function diffInDays(date, base){
  if (!date || !base) return NaN;
  return Math.round((date.getTime() - base.getTime()) / CALENDAR_DAY_MS);
}
function describeRelativeDays(diff){
  if (!Number.isFinite(diff)) return "No date";
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1) return `In ${diff} days`;
  if (diff === -1) return "Yesterday";
  const abs = Math.abs(diff);
  if (abs < 30) return `${abs} days ago`;
  const weeks = Math.round(abs / 7);
  if (abs < 60) return `${weeks} wk${weeks === 1 ? "" : "s"} ago`;
  const months = Math.round(abs / 30);
  return `${months} mo${months === 1 ? "" : "s"} ago`;
}
function classifyCalendarStatus(diff){
  if (!Number.isFinite(diff)) return "undated";
  if (diff > CALENDAR_RECENT_WINDOW) return "upcoming";
  if (diff >= 0) return "upcoming-soon";
  const abs = Math.abs(diff);
  if (abs <= CALENDAR_RECENT_WINDOW) return "recent";
  if (abs >= CALENDAR_STALE_WINDOW) return "stale";
  return "past";
}
function formatCalendarDateParts(date){
  if (!date) return { day: "--", month: "Date TBC", weekday: "" };
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = MONTH_NAMES[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const weekday = WEEKDAY_NAMES[date.getUTCDay()];
  return { day, month: `${month} ${year}`, weekday };
}
function shortenNotes(text, max = 220){
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3).trimEnd()}...`;
}
const toastState = { nextId: 0 };
const TOKEN_VERIFY_ICONS = {
  loading: `<svg viewBox="0 0 24 24" fill="none" role="presentation" focusable="false" class="spin"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="2" opacity=".28"></circle><path d="M20.5 12a8.5 8.5 0 0 0-8.5-8.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>`,
  ok: `<svg viewBox="0 0 24 24" fill="none" role="presentation" focusable="false"><path d="M5.5 13.5 10 18l9-10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
  warn: `<svg viewBox="0 0 24 24" fill="none" role="presentation" focusable="false"><path d="M12 8v4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="12" cy="16.5" r="1" fill="currentColor"></circle></svg>`,
  error: `<svg viewBox="0 0 24 24" fill="none" role="presentation" focusable="false"><path d="m7.5 7.5 9 9m0-9-9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`,
  empty: `<svg viewBox="0 0 24 24" fill="none" role="presentation" focusable="false"><path d="M11 16h2m-1-3.5a2.5 2.5 0 1 0-2.5-2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="12" cy="18" r="1" fill="currentColor"></circle></svg>`
};
function dismissToast(toast){
  if (!toast || toast.dataset.dismissed === "1") return;
  toast.dataset.dismissed = "1";
  const timer = toast.dataset.timerId ? Number(toast.dataset.timerId) : 0;
  if (timer) clearTimeout(timer);
  toast.classList.remove("is-visible");
  toast.addEventListener("transitionend", () => toast.remove(), { once: true });
}
function showToast(message, options = {}){
  const stack = $("#toastStack");
  if (!stack) return null;
  const { variant = "info", duration = 4200, meta = "" } = options;
  const toast = document.createElement("div");
  toast.className = `toast toast-${variant}`;
  toast.setAttribute("role", "status");
  toast.dataset.toastId = String(++toastState.nextId);

  const icon = document.createElement("span");
  icon.className = "toast-icon";

  const body = document.createElement("div");
  body.className = "toast-body";

  const msgEl = document.createElement("div");
  msgEl.className = "toast-message";
  msgEl.innerHTML = escapeHtml(message);
  body.append(msgEl);

  if (meta) {
    const metaEl = document.createElement("div");
    metaEl.className = "toast-meta";
    metaEl.innerHTML = escapeHtml(meta);
    body.append(metaEl);
  }

  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast-close";
  close.setAttribute("aria-label", "Dismiss notification");
  close.textContent = "\u00D7";
  close.addEventListener("click", () => dismissToast(toast));

  toast.append(icon, body, close);
  stack.append(toast);

  requestAnimationFrame(() => toast.classList.add("is-visible"));

  if (duration > 0) {
    const timerId = window.setTimeout(() => dismissToast(toast), duration);
    toast.dataset.timerId = String(timerId);
  }

  return toast;
}
function updateDirtyIndicator(){
  const dirty = state.dirty || state.formDirty;
  $("#dirtyDot").classList.toggle("dirty", dirty);
  document.title = `Version Tracker${dirty ? " *" : ""}`;
  const commitBtn = $("#btnCommit");
  if (commitBtn) {
    commitBtn.classList.toggle("needs-apply", !!state.formDirty);
    commitBtn.classList.toggle("needs-commit", !state.formDirty && !!state.dirty);
  }
}
function setDirty(flag){
  state.dirty = !!flag;
  updateDirtyIndicator();
}
function setFormDirty(flag){
  state.formDirty = !!flag;
  updateDirtyIndicator();
}
function setButtonBusy(btn, busy){
  if (!btn) return;
  btn.disabled = !!busy;
  btn.classList.toggle("is-busy", !!busy);
  if (busy) btn.setAttribute("aria-busy", "true");
  else btn.removeAttribute("aria-busy");
}
function pill(el, kind, text){ el.className = `pill ${kind ? `pill-${kind}` : "pill-dim"}`; el.textContent = text ?? "--"; }
function bumpVersion(v, kind){
  const m = (v || "").split("-")[0].match(/\d+/g) || [];
  let [maj, min, pat] = (m.map(n => parseInt(n,10))).concat([0,0,0]).slice(0,3);
  if (kind === "major") { maj++; min=0; pat=0; }
  else if (kind === "minor") { min++; pat=0; }
  else { pat++; }
  return `${maj}.${min}.${pat}`;
}
function maxHistoryCode(){ return collectHistory().reduce((m, r) => Math.max(m, parseInt(r.code||0,10)), 0); }
function todayDate(){ return new Date().toISOString().slice(0,10); }

let historySelectionKey = null;
let fetchInFlight = false;
let commitInFlight = false;
function summarizeStableTrack(app){
  const stable = app?.tracks?.stable || {};
  const parts = [];
  if (stable.version) parts.push(`Stable ${stable.version}`);
  if (stable.code) parts.push(`#${stable.code}`);
  if (stable.date) parts.push(stable.date);
  return parts.join(" | ") || "";
}
function summarizeBetaTrack(app){
  const beta = app?.tracks?.beta || {};
  if (!beta.version) return "";
  const parts = [`Beta ${beta.version}`];
  if (beta.code) parts.push(`#${beta.code}`);
  return parts.join(" | ");
}
function buildAppSummary(app){
  const chunks = [];
  const stableText = summarizeStableTrack(app);
  if (stableText) chunks.push(stableText);
  const betaText = summarizeBetaTrack(app);
  if (betaText) chunks.push(betaText);
  if (!chunks.length) return "No release data yet";
  return chunks.join("   |   ");
}
function onAppListActivate(e){
  const item = e.currentTarget;
  const idx = Number(item.dataset.index);
  if (!Number.isNaN(idx)) selectApp(idx);
}
function createAppListItem(app){
  const li = document.createElement("li");
  li.className = "app-item";
  li.tabIndex = 0;
  li.dataset.appId = app.id;

  const main = document.createElement("div");
  main.className = "app-item-main";
  const header = document.createElement("div");
  header.className = "app-item-header";
  const nameEl = document.createElement("div");
  nameEl.className = "app-name";
  const idEl = document.createElement("div");
  idEl.className = "app-id";
  header.append(nameEl, idEl);
  const metaEl = document.createElement("div");
  metaEl.className = "app-meta";
  main.append(header, metaEl);

  li.append(main);

  li.addEventListener("click", onAppListActivate);
  li.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onAppListActivate(event);
    }
  });

  updateAppListItem(li, app);
  return li;
}
function updateAppListItem(li, app){
  li.dataset.appId = app.id;
  const nameEl = li.querySelector(".app-name");
  if (nameEl) nameEl.textContent = app.name || app.id;
  const metaEl = li.querySelector(".app-meta");
  if (metaEl) metaEl.textContent = buildAppSummary(app);
  const idEl = li.querySelector(".app-id");
  if (idEl) idEl.textContent = app.id;
  li.setAttribute("aria-label", `${app.name || app.id} - ${metaEl?.textContent || ""}`);
}
function updateSelectedAppPill(){
  const pillEl = $("#selectedAppPill");
  if (!pillEl) return;
  const apps = state.data.apps || [];
  const idx = state.currentIndex;
  if (idx == null || idx < 0 || idx >= apps.length) {
    pillEl.textContent = "No app selected";
    pillEl.classList.add("pill-dim");
    pillEl.removeAttribute("title");
    pillEl.dataset.appId = "";
  } else {
    const app = apps[idx] || {};
    const label = app.name || app.id || "Unnamed app";
    pillEl.textContent = label;
    pillEl.classList.remove("pill-dim");
    pillEl.title = app.id || "";
    pillEl.dataset.appId = app.id || "";
  }
}
function refreshShaBadge(){
  const badge = $("#shaBadge");
  const valueEl = $("#shaBadgeValue");
  const popover = $("#shaPopover");
  const popValue = $("#shaPopoverValue");
  const hasSha = typeof state.sha === "string" && state.sha.length > 0;
  if (!hasSha && shaPopoverOpen) shaPopoverOpen = false;

  if (badge) {
    badge.disabled = !hasSha;
    badge.classList.toggle("is-empty", !hasSha);
    badge.setAttribute("aria-expanded", hasSha && shaPopoverOpen ? "true" : "false");
    badge.setAttribute("aria-label", hasSha ? `Manifest SHA ${state.sha}` : "No manifest SHA yet");
    badge.setAttribute("title", hasSha ? `Manifest SHA ${state.sha}` : "No manifest SHA yet");
  }
  if (valueEl) valueEl.textContent = hasSha ? state.sha.slice(0, 8) : "--";
  if (popValue) popValue.textContent = hasSha ? state.sha : "No commit SHA available yet.";
  if (popover) {
    const show = hasSha && shaPopoverOpen;
    popover.hidden = !show;
    popover.dataset.visible = show ? "1" : "0";
    popover.setAttribute("aria-hidden", show ? "false" : "true");
  }
  refreshSettingsSnapshot();
}
function toggleShaPopover(){
  if (!state.sha) return;
  shaPopoverOpen = !shaPopoverOpen;
  refreshShaBadge();
}
function closeShaPopover(){
  if (!shaPopoverOpen) return;
  shaPopoverOpen = false;
  refreshShaBadge();
}
function revealActiveApp(){
  const list = $("#appsList");
  if (!list) return;
  const active = list.querySelector("li.active");
  if (active) active.scrollIntoView({ block: "nearest", inline: "nearest" });
}
function normalizeHistoryEntry(entry = {}){
  const version = (entry.version || "").trim();
  const rawCode = entry.code;
  const codeNum = rawCode === "" || rawCode == null ? NaN : Number.parseInt(rawCode, 10);
  const code = Number.isNaN(codeNum) ? 0 : Math.max(0, codeNum);
  let date = (entry.date || "").trim();
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) date = "";
  const url = (entry.url || "").trim();
  return { version, code, date, url };
}
function historyKey(entry){ const n = normalizeHistoryEntry(entry); return `${n.version}::${n.code}::${n.date || ""}::${n.url}`; }
function readHistoryRow(row){
  const [vEl, cEl, dEl, uEl] = row.querySelectorAll("input");
  return {
    version: vEl?.value?.trim() || "",
    code: cEl?.value ?? "",
    date: dEl?.value ?? "",
    url: uEl?.value?.trim() || ""
  };
}
function collectHistoryRows(){
  return $$("#historyTable tbody tr").map(row => ({ ...readHistoryRow(row), row }));
}
function sanitizeHistory(entries = [], stableTrack = null){
  const map = new Map();
  const push = (raw, priority = 0) => {
    const normalized = normalizeHistoryEntry(raw);
    if (!normalized.version && !normalized.code && !normalized.url) return;
    if (!normalized.date && stableTrack?.date) normalized.date = stableTrack.date;
    const key = normalized.version || `code:${normalized.code}`;
    if (map.has(key)) {
      const existing = map.get(key);
      existing.code = Number.isFinite(normalized.code) ? normalized.code : existing.code;
      existing.date = normalized.date || existing.date;
      existing.url = normalized.url || existing.url;
      existing.priority = Math.max(existing.priority ?? 0, priority);
    } else {
      map.set(key, { ...normalized, priority });
    }
  };
  entries.forEach(entry => push(entry, 0));
  if (stableTrack?.version) {
    push({
      version: stableTrack.version,
      code: stableTrack.code,
      date: stableTrack.date,
      url: stableTrack.url || stableTrack.download || ""
    }, 1);
  }
  const list = Array.from(map.values()).map(({ priority, ...rest }) => ({
    ...rest,
    date: rest.date || stableTrack?.date || todayDate()
  }));
  list.sort((a, b) => {
    const codeDiff = (b.code ?? 0) - (a.code ?? 0);
    if (codeDiff !== 0) return codeDiff;
    if (a.version && b.version) return b.version.localeCompare(a.version, undefined, { numeric: true, sensitivity: "base" });
    if (a.version) return -1;
    if (b.version) return 1;
    return 0;
  });
  return list;
}
function updateHistoryRemoveState(){
  const hasRows = $$("#historyTable tbody tr").length > 0;
  const btn = $("#btnHistRemove");
  if (btn) btn.disabled = !hasRows;
}
function selectHistoryRow(row){
  $$("#historyTable tbody tr").forEach(r => r.classList.toggle("selected", r === row));
  historySelectionKey = row ? row.dataset.key : null;
  updateHistoryRemoveState();
}
function removeHistoryRow(row){
  if (!row) return;
  const next = row.nextElementSibling || row.previousElementSibling || null;
  row.remove();
  setFormDirty(true);
  if (next) selectHistoryRow(next);
  else { historySelectionKey = null; updateHistoryRemoveState(); }
  updateHistoryDiagnostics();
}
let historyDiagnosticsTimer = null;
function scheduleHistoryDiagnostics(){
  if (historyDiagnosticsTimer) window.clearTimeout(historyDiagnosticsTimer);
  historyDiagnosticsTimer = window.setTimeout(() => {
    historyDiagnosticsTimer = null;
    updateHistoryDiagnostics();
  }, 120);
}
function updateHistoryDiagnostics(){
  const rows = collectHistoryRows();
  const byVersion = new Map();
  rows.forEach(entry => {
    if (!entry.version) return;
    const key = entry.version.toLowerCase();
    byVersion.set(key, (byVersion.get(key) || 0) + 1);
  });
  rows.forEach((entry) => {
    const issues = [];
    if (entry.version && !RX_SEMVER.test(entry.version)) issues.push("Version should follow semver.");
    if (entry.version && byVersion.get(entry.version.toLowerCase()) > 1) issues.push("Duplicate version.");
    const rawCode = entry.code === "" ? NaN : Number.parseInt(entry.code, 10);
    if (Number.isNaN(rawCode) || rawCode < 0) issues.push("Code must be a non-negative number.");
    if (entry.date && !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) issues.push("Date must be YYYY-MM-DD.");
    if (entry.url && !RX_HTTP.test(entry.url)) issues.push("URL should start with http(s)://");
    const row = entry.row;
    if (!row) return;
    row.classList.toggle("has-warning", issues.length > 0);
    if (issues.length) row.title = issues.join(" | ");
    else row.removeAttribute("title");
  });
}
function createHistoryRow(entry){
  const normalized = normalizeHistoryEntry(entry);
  const tr = document.createElement("tr");
  tr.dataset.key = historyKey(normalized);
  const inputs = [
    { type: "text", value: normalized.version, placeholder: "1.2.3" },
    { type: "number", value: String(normalized.code), attr: { min: "0", step: "1" } },
    { type: "date", value: normalized.date },
    { type: "url", value: normalized.url, placeholder: "https://..." }
  ];
  const updateRowKey = () => {
    const raw = readHistoryRow(tr);
    tr.dataset.key = historyKey(raw);
    if (tr.classList.contains("selected")) historySelectionKey = tr.dataset.key;
  };
  inputs.forEach(cfg => {
    const td = document.createElement("td");
    const input = document.createElement("input");
    input.type = cfg.type;
    if (cfg.placeholder) input.placeholder = cfg.placeholder;
    if (cfg.attr) Object.entries(cfg.attr).forEach(([k, v]) => input.setAttribute(k, v));
    input.value = cfg.value || "";
    input.addEventListener("input", () => {
      setFormDirty(true);
      updateRowKey();
      scheduleHistoryDiagnostics();
    });
    td.append(input);
    tr.append(td);
  });
  const btnCell = document.createElement("td");
  const btn = document.createElement("button");
  btn.className = "ghost danger small";
  btn.title = "Remove entry";
  btn.textContent = "\u00D7";
  btn.addEventListener("click", () => removeHistoryRow(tr));
  btnCell.append(btn);
  tr.append(btnCell);
  return tr;
}
function renderHistoryTable(entries = [], options = {}){
  const tbody = $("#historyTable tbody");
  if (!tbody) return;
  const focusKey = options.focusKey ?? historySelectionKey;
  const frag = document.createDocumentFragment();
  entries.forEach(entry => {
    const row = createHistoryRow(entry);
    if (focusKey && row.dataset.key === focusKey) row.classList.add("selected");
    frag.append(row);
  });
  tbody.innerHTML = "";
  tbody.append(frag);
  if (focusKey) {
    const match = Array.from(tbody.querySelectorAll("tr")).find(r => r.dataset.key === focusKey);
    historySelectionKey = match ? focusKey : null;
  } else {
    historySelectionKey = null;
  }
  updateHistoryRemoveState();
  scheduleHistoryDiagnostics();
}
function suggestHistoryEntry(){
  const stable = collectTrack("st");
  const current = collectHistoryRows().map(({ row: _, ...rest }) => rest);
  const normalized = sanitizeHistory(current, stable);
  const highestCode = normalized.reduce((max, entry) => Math.max(max, entry.code || 0), Number.isFinite(stable.code) ? stable.code : 0);
  let version = "";
  if (stable.version && !normalized.some(entry => entry.version === stable.version)) {
    version = stable.version;
  } else if (normalized.length && RX_SEMVER.test(normalized[0].version)) {
    version = bumpVersion(normalized[0].version, "patch");
  }
  const url = stable.url || normalized[0]?.url || "";
  const date = stable.date || todayDate();
  return { version, code: highestCode + 1, date, url };
}
function addHistoryRow(rec){
  const stable = collectTrack("st");
  const rawRows = collectHistoryRows().map(({ row: _, ...rest }) => rest);
  const entry = rec ? normalizeHistoryEntry(rec) : suggestHistoryEntry();
  rawRows.push(entry);
  const normalized = sanitizeHistory(rawRows, stable);
  let focusKey = null;
  for (const item of normalized) {
    if (item.version === entry.version && item.code === entry.code) {
      focusKey = historyKey(item);
      break;
    }
  }
  if (!focusKey && normalized.length) focusKey = historyKey(normalized[0]);
  renderHistoryTable(normalized, { focusKey });
  setFormDirty(true);
  scheduleHistoryDiagnostics();
}

// -------- Titlebar controls
async function updateMaxBtn() {
  try {
    const isMax = await vt.win.isMaximized();
    const btn = $("#winMax");
    btn.classList.toggle("is-restore", isMax);
    btn.title = isMax ? "Restore" : "Maximize";
    btn.setAttribute("aria-label", isMax ? "Restore" : "Maximize");
  } catch {}
}
function bindTitlebar() {
  const updateBtn = $("#btnUpdate");
  if (updateBtn) {
    updateBtn.addEventListener("click", () => {
      if (updateBtn.dataset.state === "checking") return;
      openUpdateDialog();
    });
  }
  $("#winMin").addEventListener("click", () => vt.win.minimize());
  $("#winMax").addEventListener("click", async () => { await vt.win.maximizeToggle(); updateMaxBtn(); });
  $("#winClose").addEventListener("click", () => vt.win.close());
  window.addEventListener("resize", () => { updateMaxBtn(); });
  updateMaxBtn();
}

// -------- Breadcrumbs (scrollable + links)
function setBreadcrumbs(parts){
  // parts: [{label, href?, meta?}]
  const track = $("#bcTrack");
  track.innerHTML = "";

  const createDivider = () => {
    const divider = document.createElement("span");
    divider.className = "chev";
    divider.textContent = ">";
    divider.setAttribute("aria-hidden", "true");
    return divider;
  };

  parts.forEach((part, index) => {
    const crumb = document.createElement("span");
    crumb.className = `breadcrumb${part.href ? " has-link" : ""}`;

    const label = escapeHtml(part.label || "");
    const meta = part.meta ? `<span class="crumb-label">${escapeHtml(part.meta)}</span>` : "";
    const value = `<span class="crumb-value">${label || "--"}</span>`;

    if (part.href) {
      const link = document.createElement("a");
      link.href = "#";
      link.dataset.href = part.href;
      link.innerHTML = `${meta}${value}`;
      link.title = part.title || `Open ${part.label} on GitHub`;
      crumb.append(link);
    } else {
      crumb.innerHTML = `${meta}${value}`;
    }

    track.append(crumb);
    if (index < parts.length - 1) track.append(createDivider());
  });

  // open with shell + keyboard access
  track.querySelectorAll("a[data-href]").forEach((link) => {
    const open = () => vt.shell.open(link.dataset.href);
    link.addEventListener("click", (e) => { e.preventDefault(); open(); });
    link.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
  });

  // scroll to end initially
  track.scrollLeft = track.scrollWidth;

  // enable wheel horizontal + drag
  bindBreadcrumbsScroll();
}
function updateBreadcrumbsFromState(){
  const { owner, repo, branch, path } = state.repo;
  const root = `https://github.com/${owner}/${repo}`;
  const tree = `${root}/tree/${encodeURIComponent(branch)}`;
  const file = `${root}/blob/${encodeURIComponent(branch)}/${encodeURI(path)}`;
  setBreadcrumbs([
    { label: owner, meta: "Owner", href: `https://github.com/${owner}`, title: `Open ${owner} profile` },
    { label: repo,  meta: "Repository", href: root, title: `Open ${repo} repository` },
    { label: branch, meta: "Branch", href: tree, title: `Browse ${branch} branch` },
    { label: path,  meta: "Manifest", href: file, title: `Open ${path}` }
  ]);
}
function bindBreadcrumbsScroll(){
  const track = $("#bcTrack");
  let dragging = false, sx = 0, sl = 0;

  // Vertical wheel -> horizontal scroll (like VS Code)
  const onWheel = (e) => {
    if (!e.shiftKey && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      track.scrollLeft += e.deltaY;
    }
  };
  track.addEventListener("wheel", onWheel, { passive: false });

  // Click-drag to scroll
  track.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (e.target.closest("a[data-href]")) return;
    dragging = true; sx = e.clientX; sl = track.scrollLeft;
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    track.scrollLeft = sl - (e.clientX - sx);
  });
  track.addEventListener("pointerup", (e) => {
    if (dragging) track.releasePointerCapture(e.pointerId);
    dragging = false;
  });
  track.addEventListener("pointerleave", () => { dragging = false; });
}

// -------- Tabs & Activity bar (with per-tab scroll memory)
const scrollPos = {};
const sectionScrollPos = {};
function switchTab(id){
  const content = $("#content");
  if (!content) return;
  if (state.tab === "tab-editor" && state.editorSection) {
    sectionScrollPos[state.editorSection] = content.scrollTop;
  }
  if (state.tab) {
    scrollPos[state.tab] = content.scrollTop;
  }

  state.tab = id;
  $$("#activity button").forEach(b => b.classList.toggle("active", b.dataset.tab === id));
  $$("#content .tabpage").forEach(p => p.classList.toggle("active", p.id === id));

  if (id === "tab-editor") {
    switchEditorSection(state.editorSection || "section-dataset", { restore: true });
  } else {
    content.scrollTop = scrollPos[id] || 0;
  }
}
function bindTabs(){
  $$("#activity button").forEach(b => b.addEventListener("click", () => switchTab(b.dataset.tab)));
  $$("#editorTabBar .editor-tab").forEach(b => b.addEventListener("click", () => switchEditorSection(b.dataset.section)));
}
function switchEditorSection(id, options = {}){
  const sections = $$("#editorSections .editor-section");
  if (!sections.length) return;
  const content = $("#content");
  const ids = sections.map(sec => sec.id);
  const target = ids.includes(id) ? id : ids[0];

  if (!options.restore && content && state.editorSection) {
    sectionScrollPos[state.editorSection] = content.scrollTop;
  }

  state.editorSection = target;
  $$("#editorTabBar .editor-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.section === target));
  sections.forEach(sec => sec.classList.toggle("active", sec.id === target));

  if (content) {
    const next = sectionScrollPos[target] ?? 0;
    content.scrollTop = next;
  }
}

// -------- Resizable sidebar (remember width)
function bindSidebarResize(){
  const handle = $("#sidebar-resize-handle");
  const sidebar = $("#sidebar");
  const workbench = $("#workbench");
  let startX = 0, startW = 320, dragging = false;

  // restore last width
  const saved = Number(localStorage.getItem("vt.sidebar.width") || 0);
  if (saved) workbench.style.gridTemplateColumns = `${Math.min(520, Math.max(220, saved))}px 1fr`;

  handle.addEventListener("mousedown", (e) => {
    dragging = true; startX = e.clientX; startW = sidebar.getBoundingClientRect().width;
    document.body.style.cursor = "ew-resize"; e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const w = Math.min(520, Math.max(220, startW + dx));
    workbench.style.gridTemplateColumns = `${w}px 1fr`;
  });
  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false; document.body.style.cursor = "";
    const w = sidebar.getBoundingClientRect().width;
    localStorage.setItem("vt.sidebar.width", String(Math.round(w)));
  });
}

// -------- Apps list rendering
function renderApps(options = {}){
  const ul = $("#appsList");
  if (!ul) return;
  const existing = new Map();
  Array.from(ul.children).forEach((li) => {
    if (li.dataset.appId) existing.set(li.dataset.appId, li);
  });

  const fragment = document.createDocumentFragment();
  const apps = state.data.apps || [];
  apps.forEach((app, idx) => {
    let li = existing.get(app.id);
    if (li) {
      existing.delete(app.id);
      updateAppListItem(li, app);
    } else {
      li = createAppListItem(app);
      li.classList.add("is-entering");
      requestAnimationFrame(() => li.classList.remove("is-entering"));
    }
    li.dataset.index = String(idx);
    li.classList.toggle("active", idx === state.currentIndex);
    fragment.append(li);
  });

  ul.replaceChildren(fragment);

  refreshShaBadge();
  updateSelectedAppPill();

  if (!options.skipReveal && state.currentIndex != null) {
    requestAnimationFrame(() => revealActiveApp());
  }

  renderReleaseCalendar();
}

// -------- Release calendar view
function hasTrackData(track){
  if (!track) return false;
  const hasVersion = typeof track.version === "string" ? track.version.trim().length > 0 : Boolean(track.version);
  const hasDate = typeof track.date === "string" ? track.date.trim().length > 0 : false;
  const hasNotes = typeof track.notes === "string" ? track.notes.trim().length > 0 : false;
  const hasUrl = typeof track.url === "string" ? track.url.trim().length > 0 : false;
  const hasDownload = typeof track.download === "string" ? track.download.trim().length > 0 : false;
  const hasCode = track.code !== undefined && track.code !== null && !(typeof track.code === "number" && Number.isNaN(track.code));
  return hasVersion || hasDate || hasNotes || hasUrl || hasDownload || hasCode;
}
function hasHistoryData(entry){
  if (!entry) return false;
  const hasVersion = typeof entry.version === "string" ? entry.version.trim().length > 0 : Boolean(entry.version);
  const hasDate = typeof entry.date === "string" ? entry.date.trim().length > 0 : false;
  const hasUrl = typeof entry.url === "string" ? entry.url.trim().length > 0 : false;
  const hasCode = entry.code !== undefined && entry.code !== null && !(typeof entry.code === "number" && Number.isNaN(entry.code));
  return hasVersion || hasDate || hasUrl || hasCode;
}
function buildCalendarEntry({ appId, appName, type, label, source, today, index }){
  if (!source) return null;
  const rawDate = typeof source.date === "string" ? source.date.trim() : "";
  const date = parseIsoDateStrict(rawDate);
  const diff = date ? diffInDays(date, today) : NaN;
  const status = classifyCalendarStatus(diff);
  const parts = formatCalendarDateParts(date);
  const relative = describeRelativeDays(diff);
  const versionRaw = typeof source.version === "string" ? source.version.trim() : source.version || "";
  const version = versionRaw || "";
  const codeRaw = source.code;
  let code = null;
  if (codeRaw !== undefined && codeRaw !== null && codeRaw !== "") {
    const parsed = Number.parseInt(codeRaw, 10);
    if (Number.isFinite(parsed)) code = parsed;
  }
  const notesFullRaw = typeof source.notes === "string" ? source.notes : "";
  const notesFull = notesFullRaw.trim();
  const notes = shortenNotes(notesFull);
  const url = typeof source.url === "string" ? source.url.trim() : "";
  const download = typeof source.download === "string" ? source.download.trim() : "";
  const links = [];
  if (url) links.push({ href: url, label: type === "history" ? "History link" : "Release page" });
  if (download && download !== url) links.push({ href: download, label: "Download" });
  const keyParts = [appId || "app", type];
  if (version) keyParts.push(`v:${version}`);
  if (rawDate) keyParts.push(`d:${rawDate}`);
  if (code !== null) keyParts.push(`c:${code}`);
  if (index != null) keyParts.push(`i:${index}`);
  const key = keyParts.join("|");
  return {
    key,
    appId,
    appName,
    type,
    trackLabel: label,
    version,
    code,
    notes,
    notesFull,
    date,
    rawDate,
    status,
    statusLabel: CALENDAR_STATUS_TEXT[status] || "Scheduled",
    diff,
    relative,
    day: parts.day,
    month: parts.month,
    weekday: parts.weekday,
    links
  };
}
function collectCalendarEntries(){
  const today = startOfTodayUtc();
  const apps = state.data.apps || [];
  const entries = [];
  apps.forEach((app) => {
    const appId = app.id || "";
    const appName = app.name || app.id || "Untitled app";
    const tracks = app.tracks || {};
    if (hasTrackData(tracks.stable)) {
      const entry = buildCalendarEntry({ appId, appName, type: "stable", label: "Stable", source: tracks.stable, today });
      if (entry) entries.push(entry);
    }
    if (hasTrackData(tracks.beta)) {
      const entry = buildCalendarEntry({ appId, appName, type: "beta", label: "Beta", source: tracks.beta, today });
      if (entry) entries.push(entry);
    }
    if (Array.isArray(app.history)) {
      app.history.forEach((hist, idx) => {
        if (!hasHistoryData(hist)) return;
        const entry = buildCalendarEntry({ appId, appName, type: "history", label: "History", source: hist, today, index: idx });
        if (entry) entries.push(entry);
      });
    }
  });
  return entries;
}
function sortCalendarEntries(list){
  const upcoming = [];
  const undated = [];
  const past = [];
  list.forEach((entry) => {
    if (!entry.date) {
      undated.push(entry);
    } else if (entry.diff >= 0) {
      upcoming.push(entry);
    } else {
      past.push(entry);
    }
  });
  const localeOptions = { numeric: true, sensitivity: "base" };
  const byName = (a, b) => (a.appName || "").localeCompare(b.appName || "", undefined, localeOptions);
  upcoming.sort((a, b) => (a.date - b.date) || byName(a, b));
  undated.sort(byName);
  past.sort((a, b) => (b.date - a.date) || byName(a, b));
  return upcoming.concat(undated, past);
}
function renderCalendarDivider(label, options = {}){
  const { variant = "" } = options;
  const el = document.createElement("div");
  el.className = "calendar-timeline-month";
  if (variant) el.classList.add(`is-${variant}`);
  el.textContent = label;
  el.setAttribute("role", "presentation");
  return el;
}
function bindCalendarLink(anchor, href){
  if (!anchor || !href) return;
  const open = () => vt.shell.open(href);
  anchor.addEventListener("click", (event) => { event.preventDefault(); open(); });
  anchor.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open();
    }
  });
}
function renderCalendarEntry(entry){
  const item = document.createElement("article");
  item.className = `calendar-entry status-${entry.status} track-${entry.type}`;
  item.setAttribute("role", "listitem");
  item.dataset.key = entry.key;

  const dateCol = document.createElement("div");
  dateCol.className = "calendar-entry-date";
  const dayEl = document.createElement("span");
  dayEl.className = "calendar-entry-day";
  dayEl.textContent = entry.day;
  dateCol.append(dayEl);
  const monthEl = document.createElement("span");
  monthEl.className = "calendar-entry-month";
  monthEl.textContent = entry.month;
  dateCol.append(monthEl);
  if (entry.weekday) {
    const weekdayEl = document.createElement("span");
    weekdayEl.className = "calendar-entry-weekday";
    weekdayEl.textContent = entry.weekday;
    dateCol.append(weekdayEl);
  }
  const relEl = document.createElement("span");
  relEl.className = "calendar-entry-relative";
  relEl.textContent = entry.relative;
  dateCol.append(relEl);
  item.append(dateCol);

  const body = document.createElement("div");
  body.className = "calendar-entry-body";

  const header = document.createElement("div");
  header.className = "calendar-entry-header";

  const title = document.createElement("div");
  title.className = "calendar-entry-title";
  const appEl = document.createElement("span");
  appEl.className = "calendar-entry-app";
  appEl.textContent = entry.appName;
  title.append(appEl);
  const trackEl = document.createElement("span");
  trackEl.className = "calendar-entry-track";
  trackEl.textContent = entry.trackLabel;
  title.append(trackEl);
  header.append(title);

  const versionEl = document.createElement("span");
  versionEl.className = "calendar-entry-version";
  versionEl.textContent = entry.version || "Version pending";
  if (entry.version) versionEl.title = `Version ${entry.version}`;
  else versionEl.title = "Version not specified yet";
  header.append(versionEl);
  body.append(header);

  const meta = document.createElement("div");
  meta.className = "calendar-entry-meta";
  const statusEl = document.createElement("span");
  statusEl.className = `calendar-entry-status-label status-${entry.status}`;
  statusEl.textContent = entry.statusLabel;
  statusEl.title = entry.relative;
  meta.append(statusEl);
  if (Number.isFinite(entry.code)) {
    const codeEl = document.createElement("span");
    codeEl.textContent = `Code ${entry.code}`;
    meta.append(codeEl);
  }
  if (entry.rawDate) {
    const dateEl = document.createElement("span");
    dateEl.textContent = entry.rawDate;
    meta.append(dateEl);
  }
  entry.links.forEach((link) => {
    const linkEl = document.createElement("a");
    linkEl.href = "#";
    linkEl.className = "calendar-entry-link";
    linkEl.dataset.href = link.href;
    linkEl.textContent = link.label;
    linkEl.title = link.href;
    bindCalendarLink(linkEl, link.href);
    meta.append(linkEl);
  });
  body.append(meta);

  if (entry.notes) {
    const notesEl = document.createElement("p");
    notesEl.className = "calendar-entry-notes";
    notesEl.textContent = entry.notes;
    if (entry.notesFull && entry.notesFull !== entry.notes) notesEl.title = entry.notesFull;
    body.append(notesEl);
  }

  item.append(body);
  return item;
}
function renderReleaseCalendar(){
  const timeline = $("#calendarTimeline");
  const empty = $("#calendarEmpty");
  if (!timeline || !empty) return;

  state.calendar = state.calendar || {};
  if (!state.calendar.filters) state.calendar.filters = { stable: true, beta: true, history: false };
  if (typeof state.calendar.view !== "string") state.calendar.view = "all";
  if (typeof state.calendar.includeUndated !== "boolean") state.calendar.includeUndated = true;
  if (typeof state.calendar.search !== "string") state.calendar.search = "";

  const upcomingCountEl = $("#calendarUpcomingCount");
  const recentCountEl = $("#calendarRecentCount");
  const staleCountEl = $("#calendarStaleCount");
  const undatedCountEl = $("#calendarUndatedCount");
  const undatedSummaryEl = $("#calendarUndatedSummary");
  const undatedSummaryMetaEl = $("#calendarUndatedSummaryMeta");
  const nextValueEl = $("#calendarNextRelease");
  const nextMetaEl = $("#calendarNextReleaseMeta");
  const recentValueEl = $("#calendarRecentRelease");
  const recentMetaEl = $("#calendarRecentReleaseMeta");
  const staleValueEl = $("#calendarOldestStale");
  const staleMetaEl = $("#calendarOldestStaleMeta");
  const searchInput = $("#calendarSearch");
  const includeUndatedCheckbox = $("#calendarIncludeUndated");

  if (searchInput && searchInput.value !== (state.calendar.search || "")) {
    searchInput.value = state.calendar.search || "";
  }
  if (includeUndatedCheckbox) includeUndatedCheckbox.checked = state.calendar.includeUndated !== false;

  const entries = collectCalendarEntries();
  let upcomingSoonCount = 0;
  let recentCount = 0;
  let staleCount = 0;
  let undatedCount = 0;
  let nextUpcoming = null;
  let latestRecent = null;
  let oldestStale = null;
  entries.forEach((entry) => {
    if (entry.status === "upcoming-soon") upcomingSoonCount += 1;
    if (entry.status === "recent") recentCount += 1;
    if (entry.status === "stale") staleCount += 1;
    if (entry.status === "undated") undatedCount += 1;

    if ((entry.status === "upcoming-soon" || entry.status === "upcoming") && (!nextUpcoming || entry.diff < nextUpcoming.diff)) {
      nextUpcoming = entry;
    }
    if (entry.status === "recent") {
      if (!latestRecent || entry.diff > latestRecent.diff) latestRecent = entry;
    } else if (entry.status === "past") {
      if (!latestRecent || latestRecent.status !== "recent" && entry.diff > latestRecent.diff) latestRecent = entry;
    }
    if (entry.status === "stale") {
      if (!oldestStale || entry.diff < oldestStale.diff) oldestStale = entry;
    }
  });

  if (upcomingCountEl) upcomingCountEl.textContent = String(upcomingSoonCount);
  if (recentCountEl) recentCountEl.textContent = String(recentCount);
  if (staleCountEl) staleCountEl.textContent = String(staleCount);
  if (undatedCountEl) undatedCountEl.textContent = String(undatedCount);
  if (undatedSummaryEl) undatedSummaryEl.textContent = String(undatedCount);
  if (undatedSummaryMetaEl) {
    undatedSummaryMetaEl.textContent = undatedCount
      ? `Set ${undatedCount === 1 ? "this track" : "these tracks"} a target date to stay on schedule.`
      : "All tracked releases have target dates.";
  }

  const updateHighlight = (valueEl, metaEl, entry, emptyMeta) => {
    if (!valueEl || !metaEl) return;
    if (entry) {
      valueEl.textContent = entry.appName || "--";
      const parts = [entry.trackLabel];
      if (entry.rawDate) parts.push(entry.rawDate);
      if (entry.relative && entry.relative !== "No date") parts.push(entry.relative);
      metaEl.textContent = parts.filter(Boolean).join(" | ");
    } else {
      valueEl.textContent = "--";
      metaEl.textContent = emptyMeta;
    }
  };
  updateHighlight(nextValueEl, nextMetaEl, nextUpcoming, "No upcoming releases scheduled.");
  updateHighlight(recentValueEl, recentMetaEl, latestRecent, "No recent releases recorded.");
  updateHighlight(staleValueEl, staleMetaEl, oldestStale, "All tracks look healthy.");

  const filters = state.calendar.filters;
  const view = state.calendar.view || "all";
  const includeUndated = state.calendar.includeUndated !== false;
  const searchTerm = (state.calendar.search || "").trim().toLowerCase();

  const viewToggle = $("#calendarViewToggle");
  if (viewToggle) {
    viewToggle.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", (btn.dataset.view || "all") === view);
    });
  }
  [
    ["calendarFilterStable", "stable"],
    ["calendarFilterBeta", "beta"],
    ["calendarFilterHistory", "history"]
  ].forEach(([id, key]) => {
    const checkbox = $(`#${id}`);
    if (checkbox) checkbox.checked = Boolean(filters[key]);
  });

  const filtered = entries.filter((entry) => {
    if (!filters[entry.type]) return false;
    if (!includeUndated && entry.status === "undated") return false;
    if (view === "upcoming") return entry.status === "upcoming" || entry.status === "upcoming-soon";
    if (view === "recent") return entry.status === "recent";
    if (view === "stale") return entry.status === "stale";
    if (searchTerm) {
      const parts = [
        entry.appName,
        entry.trackLabel,
        entry.version,
        entry.statusLabel,
        entry.relative,
        entry.notesFull,
        entry.rawDate,
        Number.isFinite(entry.code) ? `code ${entry.code}` : ""
      ];
      entry.links.forEach((link) => parts.push(link.label, link.href));
      const haystack = parts.filter(Boolean).join(" | ").toLowerCase();
      if (!haystack.includes(searchTerm)) return false;
    }
    return true;
  });

  const sorted = sortCalendarEntries(filtered);
  timeline.replaceChildren();
  if (!sorted.length) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  const fragment = document.createDocumentFragment();
  let lastMonthKey = "";
  let lastBucket = "";
  sorted.forEach((entry) => {
    const bucket = entry.status === "undated" ? "undated" : entry.diff >= 0 ? "upcoming" : "history";
    if (bucket !== lastBucket) {
      lastBucket = bucket;
      lastMonthKey = "";
      if (bucket === "undated") fragment.append(renderCalendarDivider("Undated releases", { variant: "undated" }));
    }
    if (bucket !== "undated" && entry.date) {
      const monthKey = `${entry.date.getUTCFullYear()}-${String(entry.date.getUTCMonth() + 1).padStart(2, "0")}`;
      if (monthKey !== lastMonthKey) {
        fragment.append(renderCalendarDivider(entry.month, { variant: bucket }));
        lastMonthKey = monthKey;
      }
    }
    fragment.append(renderCalendarEntry(entry));
  });
  timeline.append(fragment);
}

function selectApp(idx){
  if (idx == null || idx < 0 || idx >= state.data.apps.length) {
    state.currentIndex = null; clearForm(); renderApps(); return;
  }
  if (state.currentIndex != null && state.formDirty) applyFormToApp(state.currentIndex);

  if (state.tab !== "tab-editor") {
    switchTab("tab-editor");
  }

  state.currentIndex = idx;
  populateForm(state.data.apps[idx]);
  renderApps({ skipReveal: false });
}

// -------- Form ops
function clearForm(){
  $("#edAppId").value = "";
  $("#edAppName").value = "";
  $("#stVersion").value = ""; $("#stCode").value = 0; $("#stDate").value = "";
  $("#stUrl").value = ""; $("#stDownload").value = ""; $("#stNotes").value = "";
  $("#btVersion").value = ""; $("#btCode").value = 0; $("#btDate").value = "";
  $("#btUrl").value = ""; $("#btDownload").value = ""; $("#btNotes").value = "";
  $("#betaEnabled").checked = true; $("#betaBlock").style.display = "";
  renderHistoryTable([]);
  historySelectionKey = null;
  pill($("#pillId"), "dim", "--"); pill($("#pillStVer"), "dim", "--"); pill($("#pillBtVer"), "dim", "--");
  setFormDirty(false);
  scheduleHistoryDiagnostics();
  updateSelectedAppPill();
}
function populateForm(app){
  $("#edAppId").value = app.id || "";
  $("#edAppName").value = app.name || "";

  const st = (app.tracks && app.tracks.stable) || {};
  $("#stVersion").value = st.version || "";
  $("#stCode").value = st.code || 0;
  $("#stDate").value = st.date || "";
  $("#stUrl").value = st.url || "";
  $("#stDownload").value = st.download || "";
  $("#stNotes").value = st.notes || "";

  const bt = (app.tracks && app.tracks.beta) || {};
  const hasBeta = !!(bt.version || bt.code || bt.url || bt.download || bt.notes);
  $("#betaEnabled").checked = hasBeta;
  $("#betaBlock").style.display = hasBeta ? "" : "none";
  $("#btVersion").value = bt.version || "";
  $("#btCode").value = bt.code || 0;
  $("#btDate").value = bt.date || "";
  $("#btUrl").value = bt.url || "";
  $("#btDownload").value = bt.download || "";
  $("#btNotes").value = bt.notes || "";

  const normalizedHistory = sanitizeHistory(app.history || [], st);
  renderHistoryTable(normalizedHistory);

  $("#edContact").value = state.data.contact || "";
  $("#edGenerated").value = state.data.generated || "";

  updateIdPill(); updateVerPills();
  setFormDirty(false);
  updateSelectedAppPill();
}
function collectTrack(prefix){
  const version = $(`#${prefix}Version`).value.trim();
  const code = parseInt($(`#${prefix}Code`).value || "0", 10);
  const date = $(`#${prefix}Date`).value || (version ? new Date().toISOString().slice(0,10) : "");
  const url = $(`#${prefix}Url`).value.trim();
  const download = $(`#${prefix}Download`).value.trim();
  const notes = $(`#${prefix}Notes`).value.trim();
  return { version, code, date, url, download, notes };
}
function collectHistory(options = {}){
  const stable = collectTrack("st");
  const raw = collectHistoryRows().map(({ row: _row, ...rest }) => rest);
  const normalized = sanitizeHistory(raw, stable);
  if (options.normalize) {
    const focusKey = historySelectionKey;
    renderHistoryTable(normalized, { focusKey });
  }
  return normalized;
}
function applyFormToApp(index){
  if (index < 0 || index >= state.data.apps.length) return;
  const a = state.data.apps[index];

  const id = $("#edAppId").value.trim() || a.id;
  const name = $("#edAppName").value.trim() || id;

  const stable = collectTrack("st");
  const tracks = {};
  if (stable.version || stable.code || stable.url || stable.download || stable.notes) tracks.stable = stable;

  if ($("#betaEnabled").checked) {
    const beta = collectTrack("bt");
    if (beta.version || beta.code || beta.url || beta.download || beta.notes) tracks.beta = beta;
  }

  const history = collectHistory({ normalize: true });

  a.id = id; a.name = name; a.tracks = tracks; a.history = history;

  state.data.contact = $("#edContact").value.trim();
  state.data.apps[index] = a;
  setFormDirty(false);
  setDirty(true);
  renderApps();
}
function applyPendingChanges(options = {}){
  const { silent = false, updatePreview = false } = options;
  let applied = false;
  if (state.formDirty) {
    state.data.contact = $("#edContact").value.trim();
    if (state.currentIndex != null && state.currentIndex < state.data.apps.length) {
      applyFormToApp(state.currentIndex);
    } else {
      setFormDirty(false);
      setDirty(true);
      renderApps();
    }
    applied = true;
  }
  if (updatePreview && (applied || state.dirty)) {
    $("#previewBox").value = buildJSON();
  }
  if (applied && !silent) {
    setStatus("Pending form changes applied.", 3000);
  }
  return applied;
}

// -------- Validation & JSON
function validate(){
  const issues = [];
  const ids = new Set();
  for (const app of state.data.apps) {
    if (!RX_SLUG.test(app.id || "")) issues.push(`Invalid app id '${app.id}'. Use lowercase letters, numbers, hyphens.`);
    if (ids.has(app.id)) issues.push(`Duplicate app id '${app.id}'.`);
    ids.add(app.id);

    const checkTrack = (label, t) => {
      if (!t) return;
      if (t.version && !RX_SEMVER.test(t.version)) issues.push(`${app.id}: ${label} version '${t.version}' looks odd.`);
      if (t.date && !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) issues.push(`${app.id}: ${label} date '${t.date}' must be YYYY-MM-DD.`);
      if (t.url && !RX_HTTP.test(t.url)) issues.push(`${app.id}: ${label} url must start with http(s)://.`);
      if (t.download && !RX_HTTP.test(t.download)) issues.push(`${app.id}: ${label} download must start with http(s)://.`);
    };
    checkTrack("stable", app.tracks?.stable);
    if (app.tracks?.beta) checkTrack("beta", app.tracks.beta);

    if (!app.tracks?.stable) issues.push(`${app.id}: stable track is required.`);
  }
  if (!state.data.apps.length) issues.push("No apps defined.");
  return issues;
}
function stampGenerated(){
  const ts = isoNow();
  state.data.generated = ts;
  $("#edGenerated").value = ts;
  setDirty(true);
  return ts;
}
function buildJSON(){ return JSON.stringify(state.data, null, 2); }
function updateIdPill(){
  const id = $("#edAppId").value.trim();
  if (!id) return pill($("#pillId"), "dim", "--");
  pill($("#pillId"), RX_SLUG.test(id) ? "ok" : "bad", RX_SLUG.test(id) ? "OK" : "Bad");
}
function updateVerPills(){
  const st = $("#stVersion").value.trim();
  const stStatus = !st ? "dim" : RX_SEMVER.test(st) ? "ok" : "warn";
  const stLabel = !st ? "--" : RX_SEMVER.test(st) ? "OK" : "Odd";
  pill($("#pillStVer"), stStatus, stLabel);

  const bt = $("#btVersion").value.trim();
  const btStatus = !bt ? "dim" : RX_SEMVER.test(bt) ? "ok" : "warn";
  const btLabel = !bt ? "--" : RX_SEMVER.test(bt) ? "OK" : "Odd";
  pill($("#pillBtVer"), btStatus, btLabel);
}

// -------- Repo ops
async function fetchFromGitHub(){
  if (fetchInFlight) return;
  fetchInFlight = true;
  const btn = $("#btnFetch");
  setButtonBusy(btn, true);
  setStatus("Fetching from GitHub...", 0);
  try{
    const { text, sha } = await vt.github.getFile(state.repo);
    const payload = JSON.parse(text);
    state.data = payload;
    state.sha = sha;
    setDirty(false);
    $("#edContact").value = state.data.contact || "";
    $("#edGenerated").value = state.data.generated || "";
    if (!Array.isArray(state.data.apps)) state.data.apps = [];
    state.currentIndex = state.data.apps.length ? 0 : null;
    renderApps();
    if (state.currentIndex != null) populateForm(state.data.apps[state.currentIndex]); else clearForm();
    $("#previewBox").value = buildJSON();
    resetWizardForm();
    const shortSha = sha.slice(0,8);
    setStatus(`Fetched repoversion.json @ ${shortSha}`, 6000);
    showToast("Repository refreshed", { variant: "info", meta: shortSha ? `SHA ${shortSha}` : "" });
  }catch(err){
    console.error(err);
    setStatus(String(err), 6000);
    alert(`GitHub fetch error:\n${err.message || err}`);
    showToast("Fetch failed", { variant: "error", meta: err.message || "Unable to reach GitHub." });
  }finally{
    fetchInFlight = false;
    setButtonBusy(btn, false);
  }
}
async function commitToGitHub(){
  if (commitInFlight) return;
  if (state.formDirty) {
    const applyNow = confirm("You have unapplied form changes. Apply them before committing to GitHub?");
    if (!applyNow) {
      setStatus("Commit cancelled. Apply changes first.", 5000);
      return;
    }
    applyPendingChanges({ silent: true, updatePreview: true });
  } else if (state.currentIndex != null) {
    applyFormToApp(state.currentIndex);
  }
  const issues = validate();
  if (issues.length){
    alert("Resolve these issues:\n\n" + issues.map((s) => "- " + s).join("\n"));
    return;
  }
  if (settingsPrefs.confirmBeforeCommit !== false) {
    const proceed = confirm("Commit changes to GitHub now?");
    if (!proceed) {
      setStatus("Commit cancelled.", 4000);
      return;
    }
  }
  commitInFlight = true;
  const btn = $("#btnCommit");
  setButtonBusy(btn, true);
  stampGenerated();
  const text = buildJSON();
  $("#previewBox").value = text;
  setStatus("Committing to GitHub...", 0);
  try{
    const res = await vt.github.putFile({ ...state.repo, text, baseSha: state.sha || "" });
    const newSha = (res?.content?.sha) || "";
    state.sha = newSha;
    setDirty(false);
    renderApps();
    const shortSha = newSha.slice(0,8);
    setStatus(`Committed repoversion.json @ ${shortSha}`, 7000);
    showToast("Manifest committed to GitHub", { variant: "success", meta: shortSha ? `SHA ${shortSha}` : "" });
  }catch(err){
    console.error(err);
    setStatus(String(err), 6000);
    alert(`Commit error:\n${err.message || err}`);
    showToast("Commit failed", { variant: "error", meta: err.message || "See console for details." });
  }finally{
    commitInFlight = false;
    setButtonBusy(btn, false);
  }
}
async function openLocal(){
  const res = await vt.file.openJSON();
  if (res?.canceled) return;
  try{
    const payload = JSON.parse(res.text);
    state.data = payload;
    state.sha = null;
    setDirty(false);
    state.currentIndex = state.data.apps?.length ? 0 : null;
    renderApps();
    if (state.currentIndex != null) populateForm(state.data.apps[state.currentIndex]); else clearForm();
    $("#previewBox").value = buildJSON();
    const fileName = res.path.split(/[\\/]/).pop();
    setStatus(`Loaded ${fileName}`, 5000);
    showToast("Local manifest loaded", { variant: "info", meta: fileName });
  }catch(e){
    alert("Invalid JSON:\n" + e);
    showToast("Load failed", { variant: "error", meta: e.message || String(e) });
  }
}
async function saveLocal(){
  if (state.currentIndex != null) applyFormToApp(state.currentIndex);
  const issues = validate();
  if (issues.length){
    alert("Resolve these issues:\n\n" + issues.map((s) => "- " + s).join("\n"));
    return;
  }
  stampGenerated();
  const text = buildJSON();
  $("#previewBox").value = text;
  const res = await vt.file.saveJSON(text);
  if (!res?.canceled) {
    const fileName = res.path.split(/[\\/]/).pop();
    setStatus(`Saved ${fileName}`, 5000);
    showToast("Manifest saved locally", { variant: "success", meta: fileName });
  }
}

// -------- Token dialog + Settings
function setTokenVisibility(visible){
  const input = $("#tokenInput");
  const toggle = $("#tokenReveal");
  if (!input) return;
  input.type = visible ? "text" : "password";
  if (toggle) {
    toggle.classList.toggle("is-active", visible);
    toggle.setAttribute("aria-pressed", visible ? "true" : "false");
    const show = toggle.querySelector(".toggle-show");
    const hide = toggle.querySelector(".toggle-hide");
    if (show) show.hidden = visible;
    if (hide) hide.hidden = !visible;
  }
}
function toggleTokenVisibility(){
  const input = $("#tokenInput");
  if (!input) return;
  const next = input.type === "password";
  setTokenVisibility(next);
  input.focus();
  if (next && typeof input.setSelectionRange === "function") {
    try { input.setSelectionRange(input.value.length, input.value.length); } catch {}
  }
}
async function openTokenDialog(){
  const dlg = $("#tokenDialog");
  const { token } = await vt.token.get();
  $("#tokenInput").value = token || "";
  setTokenVisibility(false);
  if (!dlg.open) dlg.showModal();
  window.setTimeout(() => {
    const input = $("#tokenInput");
    if (input) input.focus();
  }, 15);
}
function closeTokenDialog(){ $("#tokenDialog").close(); }
function getVerifyDialogContext(){
  const dialog = $("#tokenVerifyDialog");
  if (!dialog) return null;
  return {
    dialog,
    icon: $("#tokenVerifyIcon"),
    status: $("#tokenVerifyStatus"),
    loading: $("#tokenVerifyLoading"),
    message: $("#tokenVerifyMessage"),
    details: $("#tokenVerifyDetails")
  };
}
function setVerifyLoading(ctx, active){
  if (!ctx?.loading) return;
  ctx.loading.hidden = !active;
  ctx.loading.classList.toggle("is-hidden", !active);
}
function setVerifyIcon(el, state){
  if (!el) return;
  el.innerHTML = TOKEN_VERIFY_ICONS[state] || TOKEN_VERIFY_ICONS.loading;
}
function showVerifyMessage(ctx, text, modifier){
  if (!ctx?.message) return;
  const msg = ctx.message;
  msg.className = "verify-message";
  if (!text){
    msg.hidden = true;
    msg.textContent = "";
    return;
  }
  msg.hidden = false;
  if (modifier) msg.classList.add(modifier);
  msg.textContent = text;
}
function fillVerifyDetails(ctx, rows){
  if (!ctx?.details) return;
  const list = ctx.details;
  list.innerHTML = "";
  if (!rows || !rows.length){
    list.hidden = true;
    return;
  }
  rows.forEach((row) => {
    const li = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = row.label;
    const strong = document.createElement("strong");
    if (Array.isArray(row.code)) {
      if (!row.code.length) {
        strong.textContent = row.empty || "None reported";
      } else {
        row.code.forEach((token, index) => {
          if (index) strong.appendChild(document.createTextNode(", "));
          const codeEl = document.createElement("code");
          codeEl.textContent = token;
          strong.appendChild(codeEl);
        });
      }
    } else if ("value" in row) {
      strong.textContent = row.value ?? "";
    }
    if (row.sub) {
      const small = document.createElement("small");
      small.textContent = row.sub;
      strong.appendChild(small);
    }
    li.append(label, strong);
    list.append(li);
  });
  list.hidden = false;
}
function closeVerifyDialog(){
  const dlg = $("#tokenVerifyDialog");
  if (dlg?.open) dlg.close();
}
function getOnboardingStepIndex(step){
  const idx = ONBOARDING_STEPS.indexOf(step);
  return idx === -1 ? 0 : idx;
}
function renderStatusIconMarkup(status, fallback = ""){
  if (status && ONBOARDING_STATUS_ICONS[status]) return ONBOARDING_STATUS_ICONS[status];
  if (!fallback) return ONBOARDING_STATUS_ICONS.pending;
  return `<span class="status-fallback">${escapeHtml(fallback)}</span>`;
}
function renderStatusPill(status, label){
  return `<span class="pill-icon" aria-hidden="true">${renderStatusIconMarkup(status)}</span><span class="pill-text">${escapeHtml(label)}</span>`;
}
function capitalizeStep(step){
  if (!step) return "";
  return step.charAt(0).toUpperCase() + step.slice(1);
}
function loadSettingsPreferences(){
  try {
    const stored = localStorage.getItem(SETTINGS_PREF_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        settingsPrefs = { ...settingsPrefs, ...parsed };
      }
    }
  } catch (err) {
    console.error("Failed to load settings preferences:", err);
  }
}
function saveSettingsPreferences(){
  try {
    localStorage.setItem(SETTINGS_PREF_KEY, JSON.stringify(settingsPrefs));
  } catch (err) {
    console.error("Failed to persist settings preferences:", err);
  }
}
function applySettingsPreferences(options = {}){
  const { skipSave = false } = options;
  document.body.classList.toggle("compact", !!settingsPrefs.compactDensity);
  document.body.classList.toggle("tips-hidden", settingsPrefs.showHelperTips === false);
  updateSettingsToggleUI();
  if (!skipSave) saveSettingsPreferences();
}
function updateSettingsToggleUI(){
  $$(".settings-toggle").forEach((btn) => {
    const key = btn.dataset.pref;
    if (!key) return;
    const value = !!settingsPrefs[key];
    btn.dataset.state = value ? "on" : "off";
    btn.setAttribute("aria-pressed", value ? "true" : "false");
    const stateLabel = btn.querySelector(".settings-toggle-state");
    if (stateLabel) stateLabel.textContent = value ? "On" : "Off";
  });
}
const SETTINGS_TOGGLE_MESSAGES = {
  autoFetchOnLaunch: {
    on: "Auto fetch enabled. The latest manifest loads on launch.",
    off: "Auto fetch disabled. Fetch manually when you're ready."
  },
  confirmBeforeCommit: {
    on: "Commit confirmation enabled.",
    off: "Commit confirmation disabled."
  },
  compactDensity: {
    on: "Compact density enabled.",
    off: "Compact density disabled."
  },
  showHelperTips: {
    on: "Helper tips visible.",
    off: "Helper tips hidden."
  }
};
function toggleSettingsPreference(key){
  if (!(key in settingsPrefs)) return;
  settingsPrefs[key] = !settingsPrefs[key];
  applySettingsPreferences();
  const messages = SETTINGS_TOGGLE_MESSAGES[key];
  if (messages) {
    const variant = settingsPrefs[key] ? "on" : "off";
    setStatus(messages[variant] || "Preference updated.", 2600);
  } else {
    setStatus("Preference updated.", 2600);
  }
}
function friendlyTokenSource(source){
  const map = {
    keytar: "Secure keychain",
    store: "Local store",
    env: "Environment variable",
    none: "Not available"
  };
  return map[source] || (source ? source : "Unknown");
}
function refreshSettingsSnapshot(){
  const repo = `${state.repo.owner}/${state.repo.repo}`;
  const repoEl = $("#settingsSummaryRepo");
  if (repoEl) repoEl.textContent = repo;
  const repoMetaEl = $("#settingsSummaryRepoMeta");
  if (repoMetaEl) repoMetaEl.textContent = `Publishing to https://github.com/${state.repo.owner}/${state.repo.repo}`;
  const branchEl = $("#settingsSummaryBranch");
  if (branchEl) branchEl.textContent = state.repo.branch || "--";
  const pathEl = $("#settingsSummaryPath");
  if (pathEl) pathEl.textContent = state.repo.path || "repoversion.json";
  const shaEl = $("#settingsSummarySha");
  if (shaEl) shaEl.textContent = state.sha ? state.sha.slice(0, 8) : "--";

  const stored = onboarding.storedToken || null;
  const hasToken = !!stored?.token;
  const sourceLabel = friendlyTokenSource(stored?.source);
  const overviewBadge = $("#settingsTokenBadge");
  if (overviewBadge) {
    overviewBadge.dataset.state = hasToken ? "ok" : "warn";
    overviewBadge.textContent = hasToken ? "Token stored" : "No token stored";
  }
  const overviewSource = $("#settingsTokenSource");
  if (overviewSource) {
    overviewSource.textContent = hasToken
      ? `Stored via ${sourceLabel}.`
      : "Store a token to enable commits.";
  }

  const tokenStatusChip = $("#settingsTokenStatus");
  const tokenStatusMeta = $("#settingsTokenStatusMeta");
  const tokenStoredVia = $("#settingsTokenStoredVia");
  const tokenStoredMeta = $("#settingsTokenStoredMeta");
  const tokenAccount = $("#settingsTokenAccount");
  const tokenAccountMeta = $("#settingsTokenAccountMeta");
  const tokenVerified = $("#settingsTokenVerified");
  const tokenVerifiedMeta = $("#settingsTokenVerifiedMeta");
  const tokenScopesList = $("#settingsTokenScopes");

  const info = onboarding.tokenInfo || null;
  const hasVerification = !!(info && info.hasToken && !info.error);
  const verifiedAt = info?.checkedAt ? new Date(info.checkedAt) : null;
  const verifiedText = verifiedAt ? verifiedAt.toLocaleString() : (hasVerification ? "Just now" : "Never");
  const accountParts = [];
  if (info?.name && info.name !== info.login) accountParts.push(info.name);
  if (info?.type) accountParts.push(info.type);

  if (tokenStatusChip) {
    const state = info?.error ? "error" : hasToken ? "ok" : "warn";
    tokenStatusChip.dataset.state = state;
    tokenStatusChip.textContent = info?.error
      ? "Verification failed"
      : hasToken ? "Token stored" : "No token stored";
  }
  if (tokenStatusMeta) {
    if (info?.error) tokenStatusMeta.textContent = info.error;
    else tokenStatusMeta.textContent = hasToken
      ? `Stored via ${sourceLabel}.`
      : "Ready to connect once a token is stored.";
  }
  if (tokenStoredVia) tokenStoredVia.textContent = hasToken ? sourceLabel : "--";
  if (tokenStoredMeta) tokenStoredMeta.textContent = hasToken ? (stored?.source || "local") : "n/a";
  if (tokenAccount) tokenAccount.textContent = hasVerification ? (info.login || info.name || "--") : "--";
  if (tokenAccountMeta) tokenAccountMeta.textContent = hasVerification && accountParts.length ? accountParts.join(" | ") : "—";
  if (tokenVerified) tokenVerified.textContent = hasVerification ? verifiedText : (info?.error ? "Failed" : "Never");
  if (tokenVerifiedMeta) {
    if (info?.error) tokenVerifiedMeta.textContent = "Verification failed. Check token scopes.";
    else tokenVerifiedMeta.textContent = hasVerification
      ? `Latest check via ${friendlyTokenSource(info?.source)}.`
      : "Run verification to refresh details.";
  }
  if (tokenScopesList) {
    if (info?.scopes?.length) {
      tokenScopesList.innerHTML = info.scopes.map((scope) => `<code>${escapeHtml(scope)}</code>`).join("");
    } else {
      tokenScopesList.textContent = "None reported";
    }
  }
  const summaryVerified = $("#settingsSummaryVerified");
  const summaryVerifiedMeta = $("#settingsSummaryVerifiedMeta");
  if (summaryVerified) {
    if (info?.error) summaryVerified.textContent = "Verification failed";
    else summaryVerified.textContent = hasVerification ? "Verified" : (hasToken ? "Stored" : "Missing");
  }
  if (summaryVerifiedMeta) {
    if (info?.error) summaryVerifiedMeta.textContent = info.error;
    else summaryVerifiedMeta.textContent = hasVerification
      ? `Checked ${verifiedText}.`
      : hasToken ? "Token stored. Verify to confirm scopes." : "Store a token to enable commits.";
  }

  const dataStatus = onboarding.dataStatus || null;
  const workspacePath = $("#settingsPathWorkspace");
  if (workspacePath) workspacePath.textContent = dataStatus?.dir || "--";
  const settingsPath = $("#settingsPathSettings");
  if (settingsPath) settingsPath.textContent = dataStatus?.paths?.settings || "--";
  const tokenPath = $("#settingsPathToken");
  if (tokenPath) tokenPath.textContent = dataStatus?.paths?.tokenMeta || "--";
  const storePath = $("#settingsPathStore");
  if (storePath) storePath.textContent = dataStatus?.storePath || "--";
}
function renderTile(label, value, options = {}){
  const { rawValue = false, meta = null, rawMeta = false, className = "" } = options;
  const valueHtml = rawValue ? String(value ?? "") : escapeHtml(value ?? "");
  const metaHtml = meta == null ? "" : `<span class="tile-meta">${rawMeta ? String(meta) : escapeHtml(String(meta))}</span>`;
  const classes = ["tile"];
  if (className) classes.push(className);
  return `<div class="${classes.join(" ")}"><strong>${escapeHtml(label)}</strong><span>${valueHtml}</span>${metaHtml}</div>`;
}
function setOnboardingStepStatus(step, status, label){
  if (!ONBOARDING_STEPS.includes(step)) return;
  const state = onboarding.stepState[step] || { status: "pending", label: ONBOARDING_DEFAULT_LABELS[step] };
  if (status) state.status = status;
  if (label != null) state.label = label;
  onboarding.stepState[step] = state;

  const navButton = document.querySelector(`.onboarding-nav button[data-step="${step}"]`);
  if (navButton) {
    if (status) navButton.dataset.state = status;
    const badge = navButton.querySelector(".nav-badge");
    if (badge) {
      const fallback = navButton.dataset.index || String(getOnboardingStepIndex(step) + 1);
      badge.innerHTML = renderStatusIconMarkup(state.status, fallback);
      badge.setAttribute("aria-hidden", "true");
    }
    const helper = navButton.querySelector(".nav-label span");
    if (helper) {
      const base = navButton.dataset.helper || helper.textContent || "";
      helper.textContent = state.status === "pending" ? base : state.label;
    }
    const sr = navButton.querySelector(".nav-state");
    if (sr) {
      const readableLabel = state.label || ONBOARDING_DEFAULT_LABELS[step] || "";
      sr.textContent = `${capitalizeStep(step)} step: ${readableLabel}`;
    }
  }

  const panel = document.querySelector(`.onboarding-panel[data-step="${step}"]`);
  if (panel && status) panel.dataset.state = status;

  const pill = document.getElementById(`onboard${capitalizeStep(step)}Status`);
  if (pill) pill.innerHTML = renderStatusPill(state.status, state.label || ONBOARDING_DEFAULT_LABELS[step]);

  updateOnboardingProgress();
}
async function setOnboardingSkipStartup(skip){
  onboarding.preferences = onboarding.preferences || {};
  onboarding.preferences.skipOnboarding = !!skip;
  try {
    const result = await vt.setup.preferences.set({ skipOnboarding: onboarding.preferences.skipOnboarding });
    if (result && typeof result.skipOnboarding === "boolean") {
      onboarding.preferences.skipOnboarding = result.skipOnboarding;
    }
  } catch (err) {
    console.error(err);
  }
  const skipBox = $("#onboardSkipStartup");
  if (skipBox) skipBox.checked = onboarding.preferences.skipOnboarding;
}
async function loadOnboardingPreferences(){
  try{
    const prefs = await vt.setup.preferences.get();
    onboarding.preferences = {
      skipOnboarding: !!(prefs && typeof prefs.skipOnboarding === "boolean" ? prefs.skipOnboarding : false)
    };
  }catch(err){
    console.error(err);
    onboarding.preferences = { skipOnboarding: false };
  }
  const skipBox = $("#onboardSkipStartup");
  if (skipBox) skipBox.checked = !!(onboarding.preferences?.skipOnboarding);
}
function chooseNextOnboardingStep(){
  const pending = ONBOARDING_STEPS.find(step => (onboarding.stepState[step]?.status !== "done"));
  return pending || ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1];
}
function setActiveOnboardingStep(step){
  const target = ONBOARDING_STEPS.includes(step) ? step : "repo";
  onboarding.activeStep = target;
  ONBOARDING_STEPS.forEach((name, idx) => {
    const panel = document.querySelector(`.onboarding-panel[data-step="${name}"]`);
    if (panel) {
      const isActive = name === target;
      panel.hidden = !isActive;
      panel.setAttribute("aria-hidden", isActive ? "false" : "true");
      panel.tabIndex = isActive ? 0 : -1;
    }
    const btn = document.querySelector(`.onboarding-nav button[data-step="${name}"]`);
    if (btn) {
      const isActive = name === target;
      btn.dataset.current = isActive ? "1" : "0";
      btn.setAttribute("aria-selected", isActive ? "true" : "false");
    }
  });
  updateOnboardingProgress();
}
function updateOnboardingProgress(){
  const total = ONBOARDING_STEPS.length;
  const activeIdx = getOnboardingStepIndex(onboarding.activeStep);
  const pill = $("#onboardProgressPill");
  if (pill) pill.textContent = `Step ${Math.min(activeIdx + 1, total)} of ${total}`;
  const label = $("#onboardProgressLabel");
  if (label) label.textContent = ONBOARDING_STEP_TITLES[onboarding.activeStep] || ONBOARDING_STEP_TITLES.repo;
  const remaining = ONBOARDING_STEPS.filter(step => (onboarding.stepState[step]?.status !== "done")).length;
  const footer = $("#onboardFooterHint");
  if (footer) {
    footer.textContent = remaining === 0
      ? "All steps complete. You're ready to start editing."
      : `${remaining} ${remaining === 1 ? "step" : "steps"} remaining to finish setup.`;
  }
}
function updateOnboardingRepoSummary(){
  const summary = $("#onboardRepoSummary");
  const grid = $("#onboardRepoGrid");
  const { owner, repo, branch, path } = state.repo;
  const values = [owner, repo, branch, path];
  const filled = values.filter(Boolean).length;
  const ready = filled === values.length;
  const status = ready ? "done" : (filled > 0 ? "progress" : "pending");
  const label = ready ? "Repository configured" : (filled > 0 ? "Partially configured" : ONBOARDING_DEFAULT_LABELS.repo);

  if (summary) {
    summary.textContent = ready
      ? `Tracking ${owner}/${repo}@${branch} (${path})`
      : filled > 0
        ? "Almost there - fill in any remaining repository fields."
        : "Set the owner, repository, branch, and manifest path this editor manages.";
  }
  if (grid) {
    grid.innerHTML = `
      <div class="tile"><strong>Owner</strong><span>${escapeHtml(owner || "Not set")}</span></div>
      <div class="tile"><strong>Repository</strong><span>${escapeHtml(repo || "Not set")}</span></div>
      <div class="tile"><strong>Branch</strong><span>${escapeHtml(branch || "Not set")}</span></div>
      <div class="tile"><strong>Manifest path</strong><span>${escapeHtml(path || "Not set")}</span></div>
    `;
  }
  setOnboardingStepStatus("repo", status, label);
}
function applyStoredTokenStatus(stored){
  onboarding.storedToken = stored;
  const summary = $("#onboardTokenSummary");
  const callout = $("#onboardTokenCallout p:last-child");
  const grid = $("#onboardTokenGrid");
  const hasToken = !!stored?.token;
  const sourceLabels = {
    keytar: "Secure keychain",
    store: "Local store",
    env: "Environment variable",
    none: "Not available"
  };
  const friendly = sourceLabels[stored?.source] || (stored?.source ? stored.source : "Unknown");
  setOnboardingStepStatus("token", hasToken ? "done" : "pending", hasToken ? "Token stored" : "Token not stored");
  if (summary) {
    summary.textContent = hasToken
      ? `Stored via ${friendly}. You can rotate or replace it at any time.`
      : "Generate a fine-grained personal access token with Contents: read/write scope.";
  }
  if (grid) {
    if (hasToken) {
      const len = stored.token.length;
      const suffix = stored.token.slice(-4);
      const preview = `**** ${suffix || "????"}`;
      grid.innerHTML = `
        <div class="tile">
          <strong>Storage</strong>
          <span>${escapeHtml(friendly)}</span>
          <span class="tile-meta">${escapeHtml(stored?.source || "local")}</span>
        </div>
        <div class="tile">
          <strong>Token preview</strong>
          <span>${escapeHtml(preview)}</span>
          <span class="tile-meta">${len} characters</span>
        </div>
      `;
    } else {
      grid.innerHTML = `
        <div class="tile">
          <strong>Status</strong>
          <span>No token stored yet.</span>
        </div>
      `;
    }
  }
  if (callout) {
    callout.textContent = hasToken
      ? "Great! Keep a copy of your token somewhere safe in case you need to regenerate it."
      : "Create a token from GitHub > Settings > Developer settings > Fine-grained tokens, then paste it into the dialog.";
  }
  if (!hasToken) applyVerifiedTokenStatus(null);
  refreshSettingsSnapshot();
}
function applyVerifiedTokenStatus(info){
  if (info && !info.checkedAt) info.checkedAt = isoNow();
  onboarding.tokenInfo = info || null;
  const summary = $("#onboardVerifySummary");
  const details = $("#onboardVerifyDetails");
  const callout = $("#onboardVerifyCallout");
  const sourceLabels = {
    keytar: "Secure keychain",
    store: "Local store",
    env: "Environment variable",
    none: "Not available"
  };
  if (!info || !info.hasToken){
    setOnboardingStepStatus("verify", "pending", ONBOARDING_DEFAULT_LABELS.verify);
    if (summary) summary.textContent = "";
    if (callout) callout.innerHTML = `<strong>Latest check</strong><p>Run verification once you have stored a token.</p><p class="verify-status-detail">We'll display account details after the first successful check.</p>`;
    if (details) details.innerHTML = renderTile("Status", "Waiting for token");
    refreshSettingsSnapshot();
    return;
  }
  if (info.error){
    setOnboardingStepStatus("verify", "error", "Verification failed");
    if (summary) summary.textContent = "";
    if (callout) callout.innerHTML = `<strong>Latest check</strong><p>GitHub reported a problem while checking the stored token.</p><p class="verify-status-detail is-error">${escapeHtml(info.error || "Unknown error")}</p>`;
    if (details) {
      const friendlySource = sourceLabels[info.source] || (info.source ? info.source : "Unknown");
      details.innerHTML = [
        renderTile("Stored via", friendlySource, { meta: info.source || "local" }),
        renderTile("Scopes", info.scopes?.length ? info.scopes.join(" | ") : "None reported")
      ].join(" | ");
    }
    refreshSettingsSnapshot();
    return;
  }
  setOnboardingStepStatus("verify", "done", "Token verified");
  const name = info.login || info.name || "GitHub";
  if (summary) summary.textContent = "";
  if (callout) {
    callout.innerHTML = `<strong>Latest check</strong><p>Everything looks good. Your token can talk to GitHub with the scopes listed below.</p><p class="verify-status-detail">Token verified for ${escapeHtml(name)}.</p>`;
  }
  if (details){
    const accountMeta = [];
    if (info.name && info.name !== info.login) accountMeta.push(info.name);
    if (info.type) accountMeta.push(info.type);
    const friendlySource = sourceLabels[info.source] || (info.source ? info.source : "Unknown");
    const scopesHtml = info.scopes?.length
      ? info.scopes.map((scope) => `<code>${escapeHtml(scope)}</code>`).join(" | ")
      : "<span class=\"tile-meta\">None reported</span>";
    const acceptedHtml = info.acceptedScopes?.length
      ? info.acceptedScopes.map((scope) => `<code>${escapeHtml(scope)}</code>`).join(" | ")
      : "<span class=\"tile-meta\">None</span>";
    const metaTiles = [
      renderTile("Account", info.login || info.name || "Unknown", {
        meta: accountMeta.length ? accountMeta.join(" | ") : null
      }),
      renderTile("Stored via", friendlySource, {
        meta: info.source || "local"
      }),
      renderTile("Endpoint expects", acceptedHtml, {
        rawValue: true
      })
    ].join(" | ");
    const scopesTile = renderTile("Token scopes", scopesHtml, {
      rawValue: true,
      className: "tile-scopes"
    });
    details.innerHTML = `
      <div class="verify-column verify-column-meta">${metaTiles}</div>
      <div class="verify-column verify-column-scopes">${scopesTile}</div>
    `;
  }
  refreshSettingsSnapshot();
}
function applyDataStatusToOnboarding(status){
  onboarding.dataStatus = status || null;
  const summary = $("#onboardDataSummary");
  const callout = $("#onboardDataCallout p:last-child");
  const grid = $("#onboardDataPaths");
  if (!status){
    setOnboardingStepStatus("data", "pending", ONBOARDING_DEFAULT_LABELS.data);
    if (summary) summary.textContent = "Create the AppData folder and baseline files that keep settings and token metadata safe.";
    if (callout) callout.textContent = "We'll create the workspace folder the first time you run the setup action.";
    if (grid) grid.innerHTML = "";
    return;
  }
  const ready = !!(status.dirExists && status.settingsExists && status.tokenMetaExists);
  const partial = !!status.dirExists && !ready;
  const label = ready ? "Workspace ready" : partial ? "Folder created" : ONBOARDING_DEFAULT_LABELS.data;
  const state = ready ? "done" : (partial ? "progress" : "pending");
  setOnboardingStepStatus("data", state, label);

  if (summary) {
    summary.textContent = ready
      ? "Workspace storage is ready. Settings and token metadata will persist under AppData."
      : "Create the AppData folder and baseline files that keep settings and token metadata safe.";
  }
  if (callout) {
    callout.textContent = ready
      ? "Your workspace folder is set. You can open it anytime to inspect settings or token metadata."
      : partial
        ? "Folder created - generate the baseline files to finish the setup."
        : "Use the button below to create the workspace directory automatically.";
  }
  if (grid){
    grid.innerHTML = [
      status.dir ? renderTile("Workspace", status.dir) : "",
      status.paths?.settings ? renderTile("Settings JSON", status.paths.settings) : "",
      status.paths?.tokenMeta ? renderTile("Token metadata", status.paths.tokenMeta) : "",
      status.storePath ? renderTile("Electron store", status.storePath) : ""
    ].filter(Boolean).join(" | ");
  }
  refreshSettingsSnapshot();
}
async function refreshOnboardingStatus(options = {}){
  updateOnboardingRepoSummary();
  try{
    const stored = await vt.token.get();
    applyStoredTokenStatus(stored);
  }catch(err){
    console.error(err);
    setOnboardingStepStatus("token", "error", "Storage error");
    const summary = $("#onboardTokenSummary");
    if (summary) summary.textContent = err?.message || String(err);
    const callout = $("#onboardTokenCallout p:last-child");
    if (callout) callout.textContent = err?.message || String(err);
    const grid = $("#onboardTokenGrid");
    if (grid) grid.innerHTML = renderTile("Error", err?.message || String(err));
    refreshSettingsSnapshot();
  }
  const shouldVerify = options.includeVerify || (options.tokenInfo != null);
  if (options.tokenInfo){
    if (!options.tokenInfo.checkedAt) options.tokenInfo.checkedAt = isoNow();
    applyVerifiedTokenStatus(options.tokenInfo);
  } else if (shouldVerify){
    const hasToken = !!(onboarding.storedToken?.token);
    if (!hasToken){
      applyVerifiedTokenStatus(null);
    } else {
      setOnboardingStepStatus("verify", "progress", "Checking token");
      try{
        const info = await vt.token.info();
        info.checkedAt = isoNow();
        applyVerifiedTokenStatus(info);
      }catch(err){
        console.error(err);
        setOnboardingStepStatus("verify", "error", "Verification error");
        const details = $("#onboardVerifyDetails");
        if (details) details.innerHTML = renderTile("Error", err?.message || String(err));
        const summary = $("#onboardVerifySummary");
        if (summary) summary.textContent = "";
        const callout = $("#onboardVerifyCallout");
        if (callout) callout.innerHTML = `<strong>Latest check</strong><p>Token verification failed.</p><p class="verify-status-detail is-error">${escapeHtml(err?.message || String(err))}</p>`;
        refreshSettingsSnapshot();
      }
    }
  } else {
    applyVerifiedTokenStatus(onboarding.tokenInfo);
  }
  try{
    const status = await vt.setup.status();
    applyDataStatusToOnboarding(status);
  }catch(err){
    console.error(err);
    setOnboardingStepStatus("data", "error", "Setup error");
    const grid = $("#onboardDataPaths");
    if (grid) grid.innerHTML = renderTile("Error", err?.message || String(err));
    const summary = $("#onboardDataSummary");
    if (summary) summary.textContent = "Workspace status could not be read.";
    const callout = $("#onboardDataCallout p:last-child");
    if (callout) callout.textContent = err?.message || String(err);
    refreshSettingsSnapshot();
  }
  refreshSettingsSnapshot();
  const targetStep = options.focusStep
    ? options.focusStep
    : (options.preserveStep === false ? chooseNextOnboardingStep() : (onboarding.activeStep || chooseNextOnboardingStep()));
  setActiveOnboardingStep(targetStep);
}
async function openOnboardingDialog(){
  const dlg = $("#onboardingDialog");
  if (!dlg) return;
  updateOnboardingRepoSummary();
  const skipBox = $("#onboardSkipStartup");
  if (skipBox) skipBox.checked = !!(onboarding.preferences?.skipOnboarding);
  if (!dlg.open) dlg.showModal();
  await refreshOnboardingStatus({ includeVerify: true, preserveStep: false });
}
function closeOnboardingDialog(){
  const dlg = $("#onboardingDialog");
  if (dlg?.open) dlg.close();
}
async function ensureWorkspaceStorage(){
  setOnboardingStepStatus("data", "progress", "Creating workspace");
  try{
    const result = await vt.setup.ensure({ repo: state.repo });
    if (result?.status) applyDataStatusToOnboarding(result.status);
    else if (result) {
      applyDataStatusToOnboarding({
        dir: result.dir,
        dirExists: true,
        settingsExists: true,
        tokenMetaExists: true,
        storePath: result.paths?.store,
        paths: {
          settings: result.paths?.settings,
          tokenMeta: result.paths?.tokenMeta
        }
      });
    }
    setActiveOnboardingStep("data");
    showToast("Workspace folder ready", { variant: "success", meta: result?.dir || "" });
    setStatus("Workspace storage prepared.", 4000);
  }catch(err){
    console.error(err);
    setOnboardingStepStatus("data", "error", "Creation failed");
    const grid = $("#onboardDataPaths");
    if (grid) grid.innerHTML = renderTile("Error", err?.message || String(err));
    setStatus("Could not create workspace folder.", 5000);
    showToast("Workspace setup failed", { variant: "error", meta: err?.message || String(err) });
  }
}
async function saveToken(){
  const t = $("#tokenInput").value.trim();
  if (!t) { alert("Token cannot be empty."); return; }
  try {
    await vt.token.set(t);
    setStatus("Token saved.", 4000);
  } catch(e){
    alert("Could not save token:\n" + e);
    return;
  }
  applyVerifiedTokenStatus(null);
  refreshOnboardingStatus({ includeVerify: false }).catch(err => console.error(err));
  closeTokenDialog();
}
async function verifyToken(){
  setStatus("Verifying token...", 0);
  const ctx = getVerifyDialogContext();
  const buildErrorInfo = (err) => ({
    hasToken: !!(onboarding.storedToken?.token),
    source: onboarding.storedToken?.source || null,
    login: onboarding.tokenInfo?.login || null,
    name: onboarding.tokenInfo?.name || null,
    type: onboarding.tokenInfo?.type || null,
    scopes: onboarding.tokenInfo?.scopes || [],
    acceptedScopes: onboarding.tokenInfo?.acceptedScopes || [],
    error: err?.message || String(err || "Unknown error")
  });
  async function fallbackAlert(){
    let infoForOnboarding = null;
    try{
      const info = await vt.token.info();
      infoForOnboarding = info;
      if (!info?.hasToken){
        alert("No token is stored. Set a token first.");
        setStatus("No token stored.", 4000);
        return;
      }
      const lines = [];
      lines.push(`Source: ${info.source || "unknown"}`);
      if (info.login) lines.push(`Account: ${info.login}${info.name ? ` (${info.name})` : ""}`);
      if (info.scopes?.length) lines.push(`Token scopes: ${info.scopes.join(" | ")}`);
      else lines.push("Token scopes: none reported.");
      if (info.acceptedScopes?.length) lines.push(`Endpoint expects scopes (example /user): ${info.acceptedScopes.join(" | ")}`);
      if (info.error) lines.push(`Warning: ${info.error}`);
      alert(`Token check:\n\n${lines.join(" | ")}`);
      setStatus(info.error ? "Token check returned warnings." : `Token verified for ${info.login || "GitHub"}.`, 6000);
    }catch(err){
      console.error(err);
      infoForOnboarding = buildErrorInfo(err);
      alert(`Token check failed:\n${err.message || err}`);
      setStatus("Token check failed.", 5000);
    }finally{
      await refreshOnboardingStatus({ tokenInfo: infoForOnboarding });
    }
  }
  if (!ctx){
    await fallbackAlert();
    return;
  }
  const { dialog, status } = ctx;
  if (dialog) {
    dialog.dataset.state = "loading";
    setVerifyIcon(ctx.icon, "loading");
  }
  if (status) status.textContent = "Contacting GitHub...";
  setVerifyLoading(ctx, true);
  showVerifyMessage(ctx, "", null);
  fillVerifyDetails(ctx, []);
  if (dialog && !dialog.open) dialog.showModal();
  let infoForOnboarding = null;
  try{
    const info = await vt.token.info();
    infoForOnboarding = info;
    setVerifyLoading(ctx, false);
    if (!info?.hasToken){
      if (dialog) dialog.dataset.state = "empty";
      setVerifyIcon(ctx.icon, "empty");
      if (status) status.textContent = "No token stored yet.";
      const rows = [{ label: "Stored via", value: info?.source || "None" }];
      fillVerifyDetails(ctx, rows);
      showVerifyMessage(ctx, "No token is stored. Use the GitHub Token dialog to add one.", "is-empty");
      setStatus("No token stored.", 4000);
      return;
    }
    const srcLabels = {
      keytar: "Secure keychain",
      store: "Local store",
      env: "Environment variable",
      none: "Not available"
    };
    const friendlySource = srcLabels[info.source] || (info.source ? info.source : "Unknown");
    const accountLabel = info.login || info.name || "Not reported";
    const accountMeta = [];
    if (info.name && info.name !== info.login) accountMeta.push(info.name);
    if (info.type) accountMeta.push(info.type);
    const rows = [
      { label: "Account", value: accountLabel, sub: accountMeta.join(" | ") || null },
      { label: "Stored via", value: friendlySource, sub: info.source && friendlySource !== info.source ? info.source : null },
      { label: "Token scopes", code: info.scopes || [], empty: "No scopes reported" }
    ];
    if (info.acceptedScopes?.length) {
      rows.push({ label: "Endpoint expects", code: info.acceptedScopes, empty: "None" });
    }
    fillVerifyDetails(ctx, rows);
    const name = info.login || info.name || "GitHub";
    if (info.error){
      if (dialog) dialog.dataset.state = "error";
      setVerifyIcon(ctx.icon, "error");
      if (status) status.textContent = "Token check failed. Review details below.";
      showVerifyMessage(ctx, info.error, "is-error");
      setStatus("Token check failed.", 5000);
    }else{
      if (dialog) dialog.dataset.state = "ok";
      setVerifyIcon(ctx.icon, "ok");
      if (status) status.textContent = `Token verified for ${name}.`;
      showVerifyMessage(ctx, "GitHub confirmed the stored token is ready to use.", "is-success");
      setStatus(`Token verified for ${name}.`, 6000);
    }
  }catch(err){
    console.error(err);
    infoForOnboarding = buildErrorInfo(err);
    setVerifyLoading(ctx, false);
    if (dialog) dialog.dataset.state = "error";
    setVerifyIcon(ctx.icon, "error");
    if (status) status.textContent = "Token check failed.";
    showVerifyMessage(ctx, err?.message ? `Error: ${err.message}` : String(err || "Unknown error"), "is-error");
    fillVerifyDetails(ctx, []);
    setStatus("Token check failed.", 5000);
  }finally{
    await refreshOnboardingStatus({ tokenInfo: infoForOnboarding });
  }
}

// -------- Wizard (lightweight)
function getWizardValues(){
  const rawCode = $("#wzStCode").value.trim();
  const parsedCode = rawCode === "" ? NaN : Number.parseInt(rawCode, 10);
  return {
    name: $("#wzName").value.trim(),
    id: $("#wzId").value.trim(),
    stable: {
      version: $("#wzStVer").value.trim(),
      code: parsedCode,
      date: $("#wzStDate").value,
      url: $("#wzStUrl").value.trim(),
      download: $("#wzStDl").value.trim()
    }
  };
}
function validateWizard(values){
  const errors = { 1: [], 2: [], 3: [] };
  const warnings = [];

  if (!values.name) errors[1].push("Provide an app name.");
  if (!values.id) errors[1].push("Provide an app ID.");
  if (values.id && !RX_SLUG.test(values.id)) errors[1].push("App ID must use lowercase letters, numbers, or hyphen.");
  if (values.id) {
    const duplicateIndex = state.data.apps.findIndex((app) => app.id === values.id);
    if (duplicateIndex !== -1) errors[1].push(`App ID '${values.id}' already exists.`);
  }

  if (!values.stable.version) errors[2].push("Stable version is required.");
  else if (!RX_SEMVER.test(values.stable.version)) errors[2].push("Stable version should follow semantic versioning (1.2.3).");

  if (Number.isNaN(values.stable.code)) errors[2].push("Stable build code must be a whole number.");
  else if (values.stable.code < 0) errors[2].push("Stable build code cannot be negative.");

  if (values.stable.url && !RX_HTTP.test(values.stable.url)) errors[2].push("Stable URL must start with http:// or https://.");
  if (values.stable.download && !RX_HTTP.test(values.stable.download)) errors[2].push("Stable download link must start with http:// or https://.");
  if (!values.stable.download) warnings.push("Consider providing a download link so clients can fetch the release.");
  if (!values.stable.date) warnings.push("Stable release date is empty. Finishing will use today's date.");

  return { errors, warnings };
}
function buildWizardApp(values){
  const id = values.id || slugify(values.name);
  const name = values.name || id || "app";
  const code = Number.isNaN(values.stable.code) ? 0 : values.stable.code;
  const date = values.stable.date || new Date().toISOString().slice(0,10);
  const stable = {
    version: values.stable.version,
    code,
    date,
    url: values.stable.url,
    download: values.stable.download,
    notes: ""
  };
  const history = stable.version ? [{ version: stable.version, code, date, url: stable.url || "" }] : [];
  return { id, name, tracks: { stable }, history };
}
function renderWizardPreview(values){
  const dataset = {
    schemaVersion: state.data.schemaVersion || 2,
    generated: isoNow(),
    contact: state.data.contact || "",
    apps: [buildWizardApp(values)]
  };
  const preview = $("#wzPreview");
  if (preview) preview.value = JSON.stringify(dataset, null, 2);
}
function applyWizardStatus(page, validation){
  const status = $("#wizardStatus");
  if (!status) return;
  const blocking = [];
  for (let i = 1; i <= page; i += 1) blocking.push(...validation.errors[i]);
  const formatLines = (list) => list.map(msg => `- ${escapeHtml(msg)}`).join(" | ");

  if (blocking.length) {
    status.hidden = false;
    status.className = "notice notice-danger";
    status.dataset.icon = "!";
    status.innerHTML = `<strong>Fix before continuing</strong><p>${formatLines(blocking)}</p>`;
  } else if (page >= 2 && validation.warnings.length) {
    status.hidden = false;
    status.className = "notice notice-warn";
    status.dataset.icon = "?";
    status.innerHTML = `<strong>Looks almost ready</strong><p>${formatLines(validation.warnings)}</p>`;
  } else {
    status.hidden = true;
    status.className = "notice notice-muted";
    status.dataset.icon = "W";
    status.innerHTML = "";
  }

  const nextBtn = $("#wzNext");
  if (nextBtn) {
    if (page === 1) nextBtn.disabled = validation.errors[1].length > 0;
    else if (page === 2) nextBtn.disabled = (validation.errors[1].length + validation.errors[2].length) > 0;
    else nextBtn.disabled = false;
  }
  const finishBtn = $("#wzFinish");
  if (finishBtn) {
    finishBtn.disabled = (validation.errors[1].length + validation.errors[2].length + validation.errors[3].length) > 0;
  }
}
function updateWizardUI(){
  const values = getWizardValues();
  const validation = validateWizard(values);
  wizardState.lastValues = values;
  wizardState.validation = validation;
  renderWizardPreview(values);
  applyWizardStatus(state.wizardPage, validation);
}
function resetWizardForm(){
  wizardState.idTouched = false;
  $("#wzName").value = "";
  $("#wzId").value = "";
  $("#wzStVer").value = "";
  $("#wzStCode").value = String(Math.max(maxHistoryCode() + 1, 1));
  $("#wzStDate").value = "";
  $("#wzStUrl").value = "";
  $("#wzStDl").value = "";
  wizShow(1);
}
function loadWizardFromApp(app){
  if (!app) return;
  wizardState.idTouched = true;
  $("#wzName").value = app.name || "";
  $("#wzId").value = app.id || "";
  const stable = (app.tracks && app.tracks.stable) || {};
  $("#wzStVer").value = stable.version || "";
  $("#wzStCode").value = stable.code != null ? String(stable.code) : "";
  $("#wzStDate").value = stable.date || "";
  $("#wzStUrl").value = stable.url || "";
  $("#wzStDl").value = stable.download || "";
  wizShow(1);
}
function wizShow(page){
  state.wizardPage = page;
  $$(".step").forEach((s, i) => s.classList.toggle("active", i === page-1));
  $$(".wiz-page").forEach(p => p.hidden = (p.dataset.page|0) !== page);
  $("#wzBack").disabled = page === 1;
  $("#wzNext").hidden = page === 3;
  $("#wzFinish").hidden = page !== 3;
  updateWizardUI();
}

// -------- About dialog helpers
const ABOUT_DEFAULT_TAGLINE = "A focused workspace for auditing and publishing release manifests with GitHub-driven workflows.";
let lastAboutInfo = null;
let aboutStatusTimer = null;

function resolveActiveRepo(fallback){
  const repo = state?.repo;
  if (repo && repo.owner && repo.repo) return repo;
  if (fallback && fallback.owner && fallback.repo) return fallback;
  return null;
}
function formatPlatform(platform){
  if (!platform) return "Unknown platform";
  const map = { Windows_NT: "Windows", Darwin: "macOS" };
  const name = platform.os ? (map[platform.os] || platform.os) : "";
  const release = platform.release ? ` ${platform.release}` : "";
  const arch = platform.arch ? ` (${platform.arch})` : "";
  const label = `${name}${release}${arch}`.trim();
  return label || "Unknown platform";
}
function setAboutAnchor(selector, url, label){
  const anchor = $(selector);
  if (!anchor) return;
  if (!anchor.dataset.defaultLabel) anchor.dataset.defaultLabel = anchor.textContent.trim();
  anchor.onclick = null;
  if (url) {
    anchor.textContent = label || anchor.dataset.defaultLabel;
    anchor.classList.remove("disabled");
    anchor.setAttribute("href", url);
    anchor.onclick = (e) => { e.preventDefault(); vt.shell.open(url); };
  } else {
    anchor.textContent = label || anchor.dataset.defaultLabel;
    anchor.classList.add("disabled");
    anchor.removeAttribute("href");
    anchor.onclick = (e) => e.preventDefault();
  }
}
function setAboutStatus(message, timeout = 3200){
  const status = $("#aboutCopyStatus");
  if (!status) return;
  status.textContent = message || "";
  if (aboutStatusTimer) {
    clearTimeout(aboutStatusTimer);
    aboutStatusTimer = null;
  }
  if (message) {
    aboutStatusTimer = setTimeout(() => {
      if (status.textContent === message) status.textContent = "";
    }, timeout);
  }
}
function refreshAboutDialog(info){
  const data = info || lastAboutInfo || null;
  const name = data?.name || "Version Tracker";
  $("#aboutAppTitle").textContent = name;

  let versionValue = data?.version ?? "";
  if (versionValue == null) versionValue = "";
  versionValue = String(versionValue).trim();
  const version = versionValue || "n/a";
  $("#aboutVersionBadge").textContent = versionValue ? `v${versionValue}` : "v??";
  $("#aboutVersionText").textContent = version;

  const taglineValue = (data?.description || ABOUT_DEFAULT_TAGLINE || "").trim();
  $("#aboutTagline").textContent = taglineValue || ABOUT_DEFAULT_TAGLINE;

  const edition = data ? (data.isPackaged ? "Production build" : "Development build") : "Build information unavailable";
  $("#aboutEdition").textContent = edition;

  $("#aboutAuthor").textContent = data?.author || "Unknown author";

  const dataDir = data?.paths?.data || "Workspace folder will be created after setup runs.";
  $("#aboutDataDir").textContent = dataDir;

  $("#aboutElectronVersion").textContent = data?.environment?.electron || "n/a";
  $("#aboutChromiumVersion").textContent = data?.environment?.chrome || data?.environment?.chromium || "n/a";
  $("#aboutNodeVersion").textContent = data?.environment?.node || "n/a";
  $("#aboutV8Version").textContent = data?.environment?.v8 || "n/a";
  $("#aboutPlatform").textContent = formatPlatform(data?.platform);

  const homepage = data?.homepage && RX_HTTP.test(data.homepage) ? data.homepage : "";
  if (homepage) {
    setAboutAnchor("#aboutHomepageLink", homepage);
  } else {
    setAboutAnchor("#aboutHomepageLink", null, "Website unavailable");
  }

  const repo = resolveActiveRepo(data?.repo);
  if (repo) {
    const base = `https://github.com/${repo.owner}/${repo.repo}`;
    setAboutAnchor("#aboutRepoLink", base, `${repo.owner}/${repo.repo}`);
    setAboutAnchor("#aboutIssuesLink", `${base}/issues`);
    setAboutAnchor("#aboutReleasesLink", `${base}/releases`);
  } else {
    setAboutAnchor("#aboutRepoLink", null, "Repository unavailable");
    setAboutAnchor("#aboutIssuesLink", null);
    setAboutAnchor("#aboutReleasesLink", null);
  }
}
function buildAboutReport(info){
  const data = info || lastAboutInfo || {};
  const repo = resolveActiveRepo(data?.repo);
  const lines = [];
  const name = data?.name || "Version Tracker";
  const version = data?.version ? `v${data.version}` : "";
  lines.push([name, version].filter(Boolean).join(" | ").trim());
  if (data?.description) lines.push(data.description);
  lines.push("");
  lines.push("Application");
  lines.push(`  Edition: ${data ? (data.isPackaged ? "Production build" : "Development build") : "Unknown"}`);
  lines.push(`  Author: ${data?.author || "Unknown"}`);
  lines.push(`  Data directory: ${data?.paths?.data || "Workspace folder not initialized"}`);
  if (data?.paths?.settings) lines.push(`  Settings: ${data.paths.settings}`);
  if (data?.paths?.tokenMeta) lines.push(`  Token metadata: ${data.paths.tokenMeta}`);
  if (data?.paths?.store) lines.push(`  Store: ${data.paths.store}`);
  const homepage = data?.homepage && RX_HTTP.test(data.homepage) ? data.homepage : "";
  lines.push(`  Homepage: ${homepage || "n/a"}`);
  lines.push("");
  lines.push("Environment");
  lines.push(`  Electron: ${data?.environment?.electron || "n/a"}`);
  lines.push(`  Chromium: ${data?.environment?.chrome || data?.environment?.chromium || "n/a"}`);
  lines.push(`  Node.js: ${data?.environment?.node || "n/a"}`);
  lines.push(`  V8: ${data?.environment?.v8 || "n/a"}`);
  lines.push(`  Platform: ${formatPlatform(data?.platform)}`);
  if (repo) {
    lines.push("");
    lines.push("Repository");
    lines.push(`  Owner: ${repo.owner}`);
    lines.push(`  Name: ${repo.repo}`);
    if (repo.branch) lines.push(`  Branch: ${repo.branch}`);
    if (repo.path) lines.push(`  Path: ${repo.path}`);
    lines.push(`  URL: https://github.com/${repo.owner}/${repo.repo}`);
  }
  return lines.join(" | ").trim();
}
async function openAboutDialog(){
  const dlg = $("#aboutDialog");
  if (!dlg) return;
  setAboutStatus("");
  refreshAboutDialog(lastAboutInfo);
  if (!dlg.open) dlg.showModal();
  try {
    const info = await vt.app.info();
    lastAboutInfo = info || null;
    refreshAboutDialog(info);
    if (!info) setAboutStatus("Unable to load app metadata.", 5200);
  } catch (err) {
    console.error("Failed to fetch app info:", err);
    setAboutStatus("Unable to load app metadata.", 5200);
  }
}
async function copyAboutDetails(){
  let info = lastAboutInfo;
  if (!info) {
    info = await vt.app.info().catch(() => null);
    if (info) lastAboutInfo = info;
  }
  if (!navigator.clipboard || !navigator.clipboard.writeText) {
    setAboutStatus("Clipboard API is unavailable.", 5200);
    return;
  }
  try {
    await navigator.clipboard.writeText(buildAboutReport(info));
    setAboutStatus("Copied about details to clipboard.");
  } catch (err) {
    console.error("Failed to copy about details:", err);
    setAboutStatus("Copy failed. Try again.", 5200);
  }
}

// -------- Bind all
function bind(){
  bindTitlebar();
  bindTabs();
  switchEditorSection(state.editorSection || "section-dataset", { restore: true });
  bindSidebarResize();
  updateBreadcrumbsFromState();

  const shaBadge = $("#shaBadge");
  if (shaBadge) {
    shaBadge.addEventListener("click", () => {
      if (shaBadge.disabled) return;
      toggleShaPopover();
    });
    shaBadge.addEventListener("blur", () => {
      if (!shaPopoverOpen) return;
      window.setTimeout(() => {
        if (!shaPopoverOpen) return;
        closeShaPopover();
      }, 0);
    });
  }
  document.addEventListener("click", (event) => {
    if (!shaPopoverOpen) return;
    const badge = $("#shaBadge");
    const popover = $("#shaPopover");
    if (!badge || !popover) return;
    if (badge.contains(event.target) || popover.contains(event.target)) return;
    closeShaPopover();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && shaPopoverOpen) {
      event.preventDefault();
      closeShaPopover();
      const badge = $("#shaBadge");
      if (badge) badge.focus();
    }
  });

  // Toolbar
  $("#btnFetch").addEventListener("click", fetchFromGitHub);
  $("#btnCommit").addEventListener("click", commitToGitHub);
  $("#btnOpenLocal").addEventListener("click", openLocal);
  $("#btnSaveLocal").addEventListener("click", saveLocal);
  $("#btnOnboarding").addEventListener("click", openOnboardingDialog);
  $("#btnToken").addEventListener("click", openTokenDialog);
  $("#btnAbout").addEventListener("click", openAboutDialog);
  $("#aboutClose").addEventListener("click", () => $("#aboutDialog").close());
  $("#aboutOpenData").addEventListener("click", async () => {
    try {
      await vt.setup.openDir();
      setAboutStatus("Workspace folder opened in Explorer.");
    } catch (err) {
      console.error("Failed to reveal data directory:", err);
      setAboutStatus("Unable to open workspace folder.", 5200);
    }
  });
  $("#aboutCopyDetails").addEventListener("click", copyAboutDetails);
  const updateSkip = $("#updateSkip");
  if (updateSkip) updateSkip.addEventListener("click", () => {
    closeUpdateDialog();
  });
  const updateDownload = $("#updateDownload");
  if (updateDownload) updateDownload.addEventListener("click", () => {
    closeUpdateDialog();
  });
  const updateViewRelease = $("#updateViewRelease");
  if (updateViewRelease) {
    updateViewRelease.addEventListener("click", () => {
      const url = updateViewRelease.dataset.href;
      if (url) vt.shell.open(url);
    });
  }

  // Sidebar actions
  $("#btnAddApp").addEventListener("click", addNewApp);
  $("#btnDelApp").addEventListener("click", deleteApp);
  $("#btnDupApp").addEventListener("click", duplicateApp);

  // Calendar filters & view
  const calendarViewToggle = $("#calendarViewToggle");
  if (calendarViewToggle) {
    calendarViewToggle.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        const view = btn.dataset.view || "all";
        if (state.calendar.view === view) return;
        state.calendar.view = view;
        calendarViewToggle.querySelectorAll("button").forEach((other) => {
          other.classList.toggle("active", other === btn);
        });
        renderReleaseCalendar();
      });
    });
  }
  [
    ["calendarFilterStable", "stable"],
    ["calendarFilterBeta", "beta"],
    ["calendarFilterHistory", "history"]
  ].forEach(([id, key]) => {
    const checkbox = $(`#${id}`);
    if (!checkbox) return;
    checkbox.checked = Boolean(state.calendar.filters[key]);
    checkbox.addEventListener("change", () => {
      state.calendar.filters[key] = checkbox.checked;
      renderReleaseCalendar();
    });
  });

  const calendarIncludeUndated = $("#calendarIncludeUndated");
  if (calendarIncludeUndated) {
    calendarIncludeUndated.checked = state.calendar.includeUndated !== false;
    calendarIncludeUndated.addEventListener("change", () => {
      state.calendar.includeUndated = calendarIncludeUndated.checked;
      renderReleaseCalendar();
    });
  }
  const calendarSearchInput = $("#calendarSearch");
  if (calendarSearchInput) {
    calendarSearchInput.value = state.calendar.search || "";
    calendarSearchInput.addEventListener("input", () => {
      state.calendar.search = calendarSearchInput.value;
      renderReleaseCalendar();
    });
  }
  const calendarResetBtn = $("#calendarResetFilters");
  if (calendarResetBtn) {
    calendarResetBtn.addEventListener("click", () => {
      state.calendar.filters = { stable: true, beta: true, history: false };
      state.calendar.view = "all";
      state.calendar.includeUndated = true;
      state.calendar.search = "";
      renderReleaseCalendar();
    });
  }
  // Mark content edits as dirty
  $$("#content input, #content textarea, #content select").forEach(el => {
    el.addEventListener("input", () => setFormDirty(true));
  });

  // Id/version pills
  $("#btnAutoId").addEventListener("click", () => {
    const src = $("#edAppName").value || $("#edAppId").value;
    $("#edAppId").value = slugify(src);
    updateIdPill(); setFormDirty(true);
  });
  $("#edAppId").addEventListener("input", updateIdPill);
  $("#stVersion").addEventListener("input", updateVerPills);
  $("#btVersion").addEventListener("input", updateVerPills);

  // Version bumpers
  $("#stBumpBtn").addEventListener("click", () => { $("#stVersion").value = bumpVersion($("#stVersion").value, $("#stBumpKind").value); updateVerPills(); setFormDirty(true);});
  $("#btBumpBtn").addEventListener("click", () => { $("#btVersion").value = bumpVersion($("#btVersion").value, $("#btBumpKind").value); updateVerPills(); setFormDirty(true);});
  $("#stCodePlus").addEventListener("click", () => { $("#stCode").value = String(parseInt($("#stCode").value||"0",10)+1); setFormDirty(true);});
  $("#btCodePlus").addEventListener("click", () => { $("#btCode").value = String(parseInt($("#btCode").value||"0",10)+1); setFormDirty(true);});
  $("#stCodeSuggest").addEventListener("click", () => { $("#stCode").value = String(Math.max(parseInt($("#stCode").value||"0",10), maxHistoryCode()+1)); setFormDirty(true);});
  $("#btCodeSuggest").addEventListener("click", () => { $("#btCode").value = String(Math.max(parseInt($("#btCode").value||"0",10), maxHistoryCode()+1)); setFormDirty(true);});

  // Promote / Clone
  $("#btnPromote").addEventListener("click", () => {
    $("#stVersion").value = $("#btVersion").value;
    $("#stCode").value = String(Math.max(parseInt($("#stCode").value||"0",10), parseInt($("#btCode").value||"0",10)));
    $("#stDate").value = $("#btDate").value;
    $("#stUrl").value = $("#btUrl").value;
    $("#stDownload").value = $("#btDownload").value;
    $("#stNotes").value = $("#btNotes").value;
    updateVerPills(); setFormDirty(true);
  });
  $("#btnClone").addEventListener("click", () => {
    $("#btVersion").value = $("#stVersion").value;
    $("#btCode").value = $("#stCode").value;
    $("#btDate").value = $("#stDate").value;
    $("#btUrl").value = $("#stUrl").value;
    $("#btDownload").value = $("#stDownload").value;
    $("#btNotes").value = $("#stNotes").value;
    $("#betaEnabled").checked = true; $("#betaBlock").style.display = "";
    updateVerPills(); setFormDirty(true);
  });

  // Beta enable
  $("#betaEnabled").addEventListener("change", (e) => {
    $("#betaBlock").style.display = e.target.checked ? "" : "none";
    if (!e.target.checked) {
      $("#btVersion").value = ""; $("#btCode").value = 0; $("#btUrl").value = ""; $("#btDownload").value = ""; $("#btNotes").value = ""; $("#btDate").value = "";
      updateVerPills();
    }
    setFormDirty(true);
  });

  // History buttons/table
  $("#btnHistAdd").addEventListener("click", () => { addHistoryRow(); });
  $("#btnHistRemove").addEventListener("click", () => {
    const rows = $$("#historyTable tbody tr");
    if (!rows.length) return;
    const sel = rows.find(r => r.classList.contains("selected"));
    removeHistoryRow(sel || rows.at(-1));
  });
  $("#historyTable").addEventListener("click", (e) => {
    const tr = e.target.closest("tr"); if (!tr) return;
    selectHistoryRow(tr);
  });
  $("#historyTable").addEventListener("focusin", (e) => {
    const tr = e.target.closest("tr");
    if (tr) selectHistoryRow(tr);
  });

  // Apply/Reset
  $("#btnApply").addEventListener("click", () => {
    if (state.currentIndex == null) return;
    applyFormToApp(state.currentIndex);
    $("#previewBox").value = buildJSON();
    const app = state.data.apps[state.currentIndex];
    const label = app ? (app.name || app.id || "app") : "";
    setStatus("Applied form changes.", 3000);
    showToast("Changes applied to dataset", { variant: "success", meta: label });
  });
  $("#btnReset").addEventListener("click", () => {
    if (state.currentIndex == null) clearForm();
    else populateForm(state.data.apps[state.currentIndex]);
    setStatus("Form reset.", 3000);
    setFormDirty(false);
  });

  // Preview
  $("#btnCopyJson").addEventListener("click", () => {
    if (state.currentIndex != null) applyFormToApp(state.currentIndex);
    const t = buildJSON();
    $("#previewBox").value = t;
    navigator.clipboard.writeText(t).then(() => setStatus("JSON copied.", 3000));
  });
  $("#btnSaveJson").addEventListener("click", saveLocal);
  $("#btnValidate").addEventListener("click", () => {
    const issues = validate();
    if (issues.length) {
      alert("Issues:\n\n" + issues.map((s) => "- " + s).join("\n"));
    } else {
      alert("No issues found. :)");
    }
  });

  // Settings
  $("#btnCfgApply").addEventListener("click", () => {
    state.repo.owner = $("#cfgOwner").value.trim() || state.repo.owner;
    state.repo.repo = $("#cfgRepo").value.trim() || state.repo.repo;
    state.repo.branch = $("#cfgBranch").value.trim() || state.repo.branch;
    state.repo.path = $("#cfgPath").value.trim() || state.repo.path;
    state.sha = null;
    refreshShaBadge();
    $("#repoLabel").textContent = `${state.repo.owner}/${state.repo.repo}@${state.repo.branch}`;
    updateBreadcrumbsFromState();
    setStatus("Repo settings applied.", 3000);
    refreshSettingsSnapshot();
  });
  const settingsOpenRepo = $("#settingsOpenRepo");
  if (settingsOpenRepo) {
    settingsOpenRepo.addEventListener("click", () => {
      vt.shell.open(`https://github.com/${state.repo.owner}/${state.repo.repo}`);
    });
  }
  const settingsRefresh = $("#settingsRefresh");
  if (settingsRefresh) {
    settingsRefresh.addEventListener("click", async () => {
      if (settingsRefresh.disabled) return;
      setButtonBusy(settingsRefresh, true);
      try {
        await refreshOnboardingStatus({ includeVerify: true });
        setStatus("Workspace status refreshed.", 2600);
      } finally {
        setButtonBusy(settingsRefresh, false);
      }
    });
  }
  $("#btnTokenSettings").addEventListener("click", openTokenDialog);
  $("#btnTokenVerify").addEventListener("click", verifyToken);
  const settingsTokenDocs = $("#settingsViewTokenDocs");
  if (settingsTokenDocs) settingsTokenDocs.addEventListener("click", () => vt.shell.open("https://github.com/settings/tokens"));
  $$(".settings-toggle").forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const pref = toggle.dataset.pref;
      if (!pref) return;
      toggleSettingsPreference(pref);
    });
  });
  updateSettingsToggleUI();
  const settingsEnsureWorkspace = $("#settingsEnsureWorkspace");
  if (settingsEnsureWorkspace) settingsEnsureWorkspace.addEventListener("click", ensureWorkspaceStorage);
  const settingsOpenWorkspace = $("#settingsOpenWorkspace");
  if (settingsOpenWorkspace) {
    settingsOpenWorkspace.addEventListener("click", async () => {
      try {
        const res = await vt.setup.openDir();
        if (res?.dir) showToast("Workspace folder opened", { variant: "info", meta: res.dir });
        setStatus("Workspace folder opened.", 2600);
      } catch (err) {
        console.error(err);
        setStatus("Unable to open workspace folder.", 3200);
        showToast("Open folder failed", { variant: "error", meta: err?.message || String(err) });
      }
    });
  }
  $$(".settings-paths button[data-copy-path]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.copyPath;
      if (!targetId) return;
      const target = document.getElementById(targetId);
      const text = target?.textContent?.trim();
      if (!text || text === "--") {
        setStatus("Path not available yet.", 2400);
        return;
      }
      if (!navigator.clipboard?.writeText) {
        setStatus("Clipboard access unavailable.", 2400);
        return;
      }
      navigator.clipboard.writeText(text).then(() => setStatus("Path copied to clipboard.", 2400)).catch((err) => {
        console.error("Copy failed:", err);
        setStatus("Could not copy path.", 2400);
      });
    });
  });

  // Token dialog
  $("#tokenSave").addEventListener("click", saveToken);
  $("#tokenCancel").addEventListener("click", closeTokenDialog);
  const tokenReveal = $("#tokenReveal");
  if (tokenReveal) tokenReveal.addEventListener("click", toggleTokenVisibility);
  const tokenVerifyButton = $("#tokenVerifyButton");
  if (tokenVerifyButton) tokenVerifyButton.addEventListener("click", (e) => {
    e.preventDefault();
    verifyToken();
  });
  const tokenVerifyClose = $("#tokenVerifyClose");
  if (tokenVerifyClose) tokenVerifyClose.addEventListener("click", closeVerifyDialog);
  const tokenVerifyOpenGh = $("#tokenVerifyOpenGh");
  if (tokenVerifyOpenGh) tokenVerifyOpenGh.addEventListener("click", () => {
    vt.shell.open("https://github.com/settings/tokens");
  });
  const tokenDocsLink = $("#tokenDocsLink");
  if (tokenDocsLink) tokenDocsLink.addEventListener("click", (e) => {
    e.preventDefault();
    vt.shell.open("https://github.com/settings/tokens");
  });

  // Onboarding
  const onboardOpenSettings = $("#onboardOpenSettings");
  if (onboardOpenSettings) onboardOpenSettings.addEventListener("click", () => {
    closeOnboardingDialog();
    switchTab("tab-settings");
  });
  const onboardOpenToken = $("#onboardOpenToken");
  if (onboardOpenToken) onboardOpenToken.addEventListener("click", () => {
    closeOnboardingDialog();
    window.setTimeout(() => openTokenDialog(), 20);
  });
  const onboardTokenDocs = $("#onboardTokenDocs");
  if (onboardTokenDocs) onboardTokenDocs.addEventListener("click", () => {
    vt.shell.open("https://github.com/settings/tokens");
  });
  const onboardVerifyToken = $("#onboardVerifyToken");
  if (onboardVerifyToken) onboardVerifyToken.addEventListener("click", () => {
    closeOnboardingDialog();
    window.setTimeout(() => verifyToken(), 20);
  });
  const onboardEnsureData = $("#onboardEnsureData");
  if (onboardEnsureData) onboardEnsureData.addEventListener("click", ensureWorkspaceStorage);
  const onboardOpenDataDir = $("#onboardOpenDataDir");
  if (onboardOpenDataDir) onboardOpenDataDir.addEventListener("click", async () => {
    try{
      const res = await vt.setup.openDir();
      if (res?.dir) showToast("Workspace folder opened", { variant: "info", meta: res.dir });
    }catch(err){
      console.error(err);
      showToast("Open folder failed", { variant: "error", meta: err?.message || String(err) });
      setStatus("Could not open workspace folder.", 4000);
    }
  });
  const onboardRefresh = $("#onboardRefresh");
  if (onboardRefresh) onboardRefresh.addEventListener("click", () => {
    refreshOnboardingStatus({ includeVerify: true });
  });
  const onboardClose = $("#onboardClose");
  if (onboardClose) onboardClose.addEventListener("click", closeOnboardingDialog);
  const onboardFinish = $("#onboardFinish");
  if (onboardFinish) onboardFinish.addEventListener("click", () => {
    closeOnboardingDialog();
    switchTab("tab-editor");
  });
  const onboardSkipStartup = $("#onboardSkipStartup");
  if (onboardSkipStartup) onboardSkipStartup.addEventListener("change", (e) => {
    setOnboardingSkipStartup(e.target.checked).catch(err => console.error(err));
  });
  $$(".onboarding-nav button").forEach(btn => {
    btn.addEventListener("click", () => {
      setActiveOnboardingStep(btn.dataset.step);
    });
  });
  setActiveOnboardingStep(onboarding.activeStep);

  // Wizard
  $("#wzAuto").addEventListener("click", () => {
    const base = $("#wzName").value || $("#wzId").value;
    $("#wzId").value = slugify(base);
    wizardState.idTouched = false;
    updateWizardUI();
  });
  $("#wzName").addEventListener("input", () => {
    if (!wizardState.idTouched) {
      $("#wzId").value = slugify($("#wzName").value);
    }
    updateWizardUI();
  });
  $("#wzId").addEventListener("input", () => {
    wizardState.idTouched = true;
    updateWizardUI();
  });
  $("#wzStVer").addEventListener("input", () => {
    if (!$("#wzStCode").value.trim()) {
      $("#wzStCode").value = String(Math.max(maxHistoryCode() + 1, 1));
    }
    updateWizardUI();
  });
  ["#wzStCode", "#wzStDate", "#wzStUrl", "#wzStDl"].forEach(sel => {
    const el = $(sel);
    if (!el) return;
    el.addEventListener("input", updateWizardUI);
    if (sel === "#wzStDate") el.addEventListener("change", updateWizardUI);
  });
  $("#wzBack").addEventListener("click", () => wizShow(Math.max(1, state.wizardPage - 1)));
  $("#wzNext").addEventListener("click", () => {
    if ($("#wzNext").disabled) return;
    wizShow(Math.min(3, state.wizardPage + 1));
  });
  $("#wzFinish").addEventListener("click", () => {
    const validation = wizardState.validation || validateWizard(getWizardValues());
    const blocking = [...validation.errors[1], ...validation.errors[2], ...validation.errors[3]];
    if (blocking.length) {
      applyWizardStatus(3, validation);
      return;
    }
    const values = wizardState.lastValues || getWizardValues();
    const app = buildWizardApp(values);
    state.data.apps.push(app);
    state.currentIndex = state.data.apps.length - 1;
    renderApps({ skipReveal: false });
    populateForm(state.data.apps[state.currentIndex]);
    $("#previewBox").value = buildJSON();
    switchTab("tab-editor");
    setDirty(true);
    setStatus("Wizard created a new application.", 3000);
    showToast("Wizard output applied", { variant: "success", meta: app.name || app.id || "New app" });
    resetWizardForm();
  });
  $("#wzLoadCurrent").addEventListener("click", () => {
    if (state.currentIndex == null) {
      setStatus("Select an application before loading it into the wizard.", 4000);
      return;
    }
    loadWizardFromApp(state.data.apps[state.currentIndex]);
    setStatus("Current selection loaded into the wizard.", 3000);
  });
  $("#wzReset").addEventListener("click", () => {
    resetWizardForm();
    setStatus("Wizard reset.", 2500);
  });

  // Shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.key === "F5") { e.preventDefault(); fetchFromGitHub(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); commitToGitHub(); }
  });

  $("#repoLabel").textContent = `${state.repo.owner}/${state.repo.repo}@${state.repo.branch}`;
  switchTab(state.tab);
  refreshShaBadge();
}

function addNewApp(){
  const base = "new-app";
  const existing = new Set(state.data.apps.map(a => a.id));
  let id = base, n = 1;
  while (existing.has(id)) { n += 1; id = `${base}-${n}`; }
  state.data.apps.push({ id, name: "New App", tracks: { stable: {} }, history: [] });
  state.currentIndex = state.data.apps.length - 1;
  setDirty(true);
  renderApps();
  populateForm(state.data.apps[state.currentIndex]);
  setStatus("Added app.", 3000);
}
function deleteApp(){
  if (state.currentIndex == null) return;
  const a = state.data.apps[state.currentIndex];
  if (!confirm(`Delete '${a.name || a.id}'?`)) return;
  state.data.apps.splice(state.currentIndex, 1);
  state.currentIndex = state.data.apps.length ? 0 : null;
  setDirty(true);
  renderApps();
  if (state.currentIndex != null) populateForm(state.data.apps[state.currentIndex]); else clearForm();
  setStatus("Deleted app.", 3000);
}
function duplicateApp(){
  if (state.currentIndex == null) return;
  applyFormToApp(state.currentIndex);
  const src = JSON.parse(JSON.stringify(state.data.apps[state.currentIndex]));
  let id = `${src.id}-copy`, n = 1;
  const existing = new Set(state.data.apps.map(a => a.id));
  while (existing.has(id)) { n += 1; id = `${src.id}-copy-${n}`; }
  src.id = id; src.name = `${src.name || src.id} copy`;
  state.data.apps.push(src);
  state.currentIndex = state.data.apps.length - 1;
  setDirty(true);
  renderApps();
  populateForm(state.data.apps[state.currentIndex]);
  setStatus("Duplicated app.", 3000);
}

// -------- Init
function initBlank(){
  state.data = { schemaVersion: 2, generated: isoNow(), contact: "", apps: [] };
  state.currentIndex = null; renderApps(); clearForm(); resetWizardForm();
}

document.addEventListener("DOMContentLoaded", async () => {
  loadSettingsPreferences();
  applySettingsPreferences({ skipSave: true });
  bind();
  initBlank();
  refreshSettingsSnapshot();
  setUpdateStatus(updateState.status);
  await loadOnboardingPreferences();
  await refreshOnboardingStatus({ includeVerify: false });
  if (!onboarding.preferences?.skipOnboarding) {
    await openOnboardingDialog();
  }
  try {
    const { token } = await vt.token.get();
    if (token && settingsPrefs.autoFetchOnLaunch !== false) fetchFromGitHub();
  } catch {}
});
