// preload.cjs
// CommonJS preload so Electron can require() it even with "type":"module"
const { contextBridge, ipcRenderer } = require("electron");

console.log("[preload] loaded");

// ---------------------------------------------------------------------------
// Splash bridge
// ---------------------------------------------------------------------------
// We allow the main process to send splash updates *into* the renderer, and
// we also expose a small API to the renderer so it can tell main what's going on.
const splashQueue = [];

/**
 * Try to forward a payload to the splash script on the page.
 * If window.splash isn't ready yet, we queue it.
 */
function forwardToSplash(payload) {
  try {
    if (window && window.splash && typeof window.splash.setStatus === "function") {
      window.splash.setStatus(payload.text, payload.progress, payload.step);
    } else {
      splashQueue.push(payload);
    }
  } catch (err) {
    console.warn("[preload] splash forward failed, queueing", err);
    splashQueue.push(payload);
  }
}

/**
 * Try to call splash.finish(...) if available, otherwise queue it as a "finish" action.
 */
function forwardFinishToSplash(message) {
  try {
    if (window && window.splash && typeof window.splash.finish === "function") {
      window.splash.finish(message);
    } else {
      splashQueue.push({ __finish: true, message });
    }
  } catch (err) {
    console.warn("[preload] splash finish forward failed, queueing", err);
    splashQueue.push({ __finish: true, message });
  }
}

// listen for messages from MAIN -> this preload -> splash DOM
ipcRenderer.on("splash:set-status", (_event, payload) => {
  // payload: { text?: string, progress?: number, step?: number }
  forwardToSplash(payload || {});
});

ipcRenderer.on("splash:finish", (_event, message) => {
  forwardFinishToSplash(message || "Ready.");
});

// once DOM is ready, flush anything main sent before splash JS was on window
window.addEventListener("DOMContentLoaded", () => {
  if (!splashQueue.length) return;
  const copy = splashQueue.splice(0, splashQueue.length);
  copy.forEach((item) => {
    if (item && item.__finish) {
      if (window.splash && typeof window.splash.finish === "function") {
        window.splash.finish(item.message || "Ready.");
      }
      return;
    }
    if (window.splash && typeof window.splash.setStatus === "function") {
      window.splash.setStatus(item.text, item.progress, item.step);
    }
  });
});

// ---------------------------------------------------------------------------
// Main app APIs (your original ones + splash)
// ---------------------------------------------------------------------------
contextBridge.exposeInMainWorld("vt", {
  token: {
    get: () => ipcRenderer.invoke("token:get"),
    set: (token) => ipcRenderer.invoke("token:set", token),
    remove: () => ipcRenderer.invoke("token:remove"),
    info: () => ipcRenderer.invoke("token:info")
  },
  github: {
    getFile: (cfg) => ipcRenderer.invoke("github:getFile", cfg),
    putFile: (cfg) => ipcRenderer.invoke("github:putFile", cfg)
  },
  file: {
    openJSON: () => ipcRenderer.invoke("file:openJSON"),
    saveJSON: (text) => ipcRenderer.invoke("file:saveJSON", text),
    // Convenience read/write by relative path from app directory
    readJSON: (relPath) => ipcRenderer.invoke("file:readJSON", relPath),
    writeJSON: (relPath, obj) => ipcRenderer.invoke("file:writeJSON", relPath, obj)
  },
  shell: {
    open: (url) => ipcRenderer.invoke("shell:openExternal", url)
  },
  app: {
    info: () => ipcRenderer.invoke("app:info"),
    ready: () => ipcRenderer.send("app:renderer-ready")
  },
  setup: {
    status: () => ipcRenderer.invoke("setup:status"),
    ensure: (payload) => ipcRenderer.invoke("setup:ensure", payload),
    openDir: () => ipcRenderer.invoke("setup:openDir"),
    preferences: {
      get: () => ipcRenderer.invoke("setup:prefs:get"),
      set: (prefs) => ipcRenderer.invoke("setup:prefs:set", prefs)
    }
  },
  win: {
    minimize: () => ipcRenderer.send("win:minimize"),
    maximizeToggle: () => ipcRenderer.invoke("win:maximizeToggle"),
    isMaximized: () => ipcRenderer.invoke("win:isMaximized"),
    close: () => ipcRenderer.send("win:close"),
    forceClose: () => ipcRenderer.send("win:force-close"),
    onBeforeClose: (callback) => {
      if (typeof callback !== "function") return () => {};
      const listener = () => callback();
      ipcRenderer.on("app:before-close", listener);
      return () => ipcRenderer.removeListener("app:before-close", listener);
    }
  },
  // -----------------------------------------------------------------------
  // NEW: splash bridge exposed to renderer
  // -----------------------------------------------------------------------
  splash: {
    /**
     * Renderer -> main: tell main "I changed splash status".
     * Main can then broadcast to other windows or log it.
     */
    status: (text, progress, step) =>
      ipcRenderer.send("splash:status", {
        text,
        progress,
        step
      }),

    /**
     * Renderer -> main: tell main "I'm done, close splash".
     */
    finish: (message) => ipcRenderer.send("splash:finish", message),

    /**
     * Renderer -> main: ask main for a computed/merged splash config
     * (if you want main to build it instead of the renderer fetching JSON).
     */
    getConfig: () => ipcRenderer.invoke("splash:get-config")
  }
});
