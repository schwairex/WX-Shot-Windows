"use strict";

const { contextBridge, ipcRenderer } = require("electron");

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld("wxDesktop", Object.freeze({
  platform: process.platform,
  captureArea: () => ipcRenderer.invoke("capture:start", "area"),
  captureDisplay: () => ipcRenderer.invoke("capture:start", "display"),
  selectionComplete: (dataUrl) => ipcRenderer.invoke("selection:complete", dataUrl),
  selectionCancel: () => ipcRenderer.invoke("selection:cancel"),
  copyImage: (dataUrl) => ipcRenderer.invoke("image:copy", dataUrl),
  saveImage: (payload) => ipcRenderer.invoke("image:save", payload),
  addHistory: (item) => ipcRenderer.invoke("history:add", item),
  listHistory: () => ipcRenderer.invoke("history:list"),
  clearHistory: () => ipcRenderer.invoke("history:clear"),
  openHistoryItem: (id) => ipcRenderer.invoke("history:open", id),
  recognizeText: (dataUrl) => ipcRenderer.invoke("ocr:recognize", dataUrl),
  closeWindow: () => ipcRenderer.invoke("window:close"),
  minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
  quitApp: () => ipcRenderer.invoke("app:quit"),
  onSelectionData: (callback) => subscribe("selection:data", callback),
  onEditorData: (callback) => subscribe("editor:data", callback),
  onAppState: (callback) => subscribe("app:state", callback)
}));
