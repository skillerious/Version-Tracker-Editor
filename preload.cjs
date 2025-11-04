// CommonJS preload so Electron can require() it even with "type":"module"
const { contextBridge, ipcRenderer } = require("electron");

console.log("[preload] loaded");

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
    info: () => ipcRenderer.invoke("app:info")
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
  }
});
