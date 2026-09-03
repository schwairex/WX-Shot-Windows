"use strict";

const { app, BrowserWindow, ClipboardItem, Menu, Tray, clipboard, desktopCapturer, dialog, globalShortcut, ipcMain, nativeImage, screen, shell } = require("electron");
const { spawn } = require("node:child_process");
const { promises: fs } = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const APP_ID = "com.wxshot.windows";
const MAX_DATA_URL_LENGTH = 45_000_000;
const MAX_HISTORY_ITEMS = 6;
const HISTORY_FILE = "history.json";

let launcherWindow = null;
let selectorWindow = null;
let editorWindow = null;
let tray = null;
let captureBusy = false;
let shortcutStatus = { printScreen: false, area: false, display: false };

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => showLauncher());
}

app.setAppUserModelId(APP_ID);

function secureWindowOptions(extra = {}) {
  return {
    show: false,
    icon: assetPath("icon-128.png"),
    backgroundColor: "#0b0e14",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    },
    ...extra
  };
}

function hardenWindow(window) {
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  window.webContents.on("will-navigate", (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault();
  });
}

function createLauncher() {
  if (launcherWindow && !launcherWindow.isDestroyed()) return launcherWindow;
  launcherWindow = new BrowserWindow(secureWindowOptions({
    width: 520,
    height: 460,
    minWidth: 480,
    minHeight: 420,
    title: "WX Shot",
    autoHideMenuBar: true
  }));
  hardenWindow(launcherWindow);
  launcherWindow.loadFile(path.join(__dirname, "renderer", "launcher.html"));
  launcherWindow.once("ready-to-show", () => launcherWindow.show());
  launcherWindow.webContents.on("did-finish-load", sendAppState);
  launcherWindow.on("closed", () => { launcherWindow = null; });
  return launcherWindow;
}

function showLauncher() {
  const window = createLauncher();
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

async function captureCurrentDisplay(mode = "area") {
  if (captureBusy) return { ok: false, reason: "busy" };
  captureBusy = true;
  try {
    hideCaptureSensitiveWindows();
    await delay(180);
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
    const width = Math.max(1, Math.round(display.size.width * display.scaleFactor));
    const height = Math.max(1, Math.round(display.size.height * display.scaleFactor));
    const sources = await desktopCapturer.getSources({ types: ["screen"], thumbnailSize: { width, height }, fetchWindowIcons: false });
    const source = sources.find((item) => item.display_id === String(display.id)) ?? sources[0];
    if (!source || source.thumbnail.isEmpty()) throw new Error("Ekran görüntüsü alınamadı.");
    const dataUrl = source.thumbnail.toDataURL();
    if (mode === "display") {
      await openEditor(dataUrl, { source: "display", displayId: display.id });
      return { ok: true };
    }
    await openSelector(dataUrl, display);
    return { ok: true };
  } catch (error) {
    captureBusy = false;
    showLauncher();
    await dialog.showMessageBox({ type: "error", title: "WX Shot", message: "Ekran görüntüsü alınamadı", detail: error.message });
    return { ok: false, reason: error.message };
  }
}

function hideCaptureSensitiveWindows() {
  for (const window of [launcherWindow, selectorWindow, editorWindow]) {
    if (window && !window.isDestroyed()) window.hide();
  }
}

async function openSelector(dataUrl, display) {
  if (selectorWindow && !selectorWindow.isDestroyed()) selectorWindow.destroy();
  selectorWindow = new BrowserWindow(secureWindowOptions({
    ...display.bounds,
    frame: false,
    useContentSize: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: "WX Shot — Alan seç"
  }));
  selectorWindow.setAlwaysOnTop(true, "screen-saver");
  hardenWindow(selectorWindow);
  await selectorWindow.loadFile(path.join(__dirname, "renderer", "selector.html"));
  selectorWindow.setBounds(display.bounds, false);
  const enteredFullScreen = new Promise((resolve) => {
    const timer = setTimeout(resolve, 600);
    selectorWindow.once("enter-full-screen", () => { clearTimeout(timer); resolve(); });
  });
  selectorWindow.setFullScreen(true);
  await enteredFullScreen;
  selectorWindow.webContents.send("selection:data", { dataUrl, display: { id: display.id, bounds: display.bounds, scaleFactor: display.scaleFactor } });
  selectorWindow.show();
  selectorWindow.focus();
  selectorWindow.on("closed", () => {
    selectorWindow = null;
    if (captureBusy) {
      captureBusy = false;
      showLauncher();
    }
  });
}

async function openEditor(dataUrl, metadata = {}) {
  assertImageDataUrl(dataUrl);
  if (selectorWindow && !selectorWindow.isDestroyed()) {
    selectorWindow.removeAllListeners("closed");
    selectorWindow.destroy();
    selectorWindow = null;
  }
  if (editorWindow && !editorWindow.isDestroyed()) editorWindow.destroy();
  editorWindow = new BrowserWindow(secureWindowOptions({
    width: 1380,
    height: 880,
    minWidth: 940,
    minHeight: 620,
    title: "WX Shot — Düzenleyici",
    autoHideMenuBar: true
  }));
  hardenWindow(editorWindow);
  await editorWindow.loadFile(path.join(__dirname, "renderer", "editor.html"));
  editorWindow.webContents.send("editor:data", { dataUrl, metadata });
  editorWindow.show();
  editorWindow.focus();
  captureBusy = false;
  editorWindow.on("closed", () => { editorWindow = null; });
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(assetPath("icon-32.png")));
  tray.setToolTip("WX Shot");
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Alan yakala", accelerator: "Alt+Shift+S", click: () => void captureCurrentDisplay("area") },
    { label: "Ekranın tamamını yakala", accelerator: "Alt+Shift+F", click: () => void captureCurrentDisplay("display") },
    { type: "separator" },
    { label: "WX Shot'u aç", click: showLauncher },
    { type: "separator" },
    { label: "Çıkış", click: () => app.quit() }
  ]));
  tray.on("double-click", showLauncher);
}

function registerShortcuts() {
  shortcutStatus.printScreen = globalShortcut.register("PrintScreen", () => void captureCurrentDisplay("area"));
  shortcutStatus.area = globalShortcut.register("Alt+Shift+S", () => void captureCurrentDisplay("area"));
  shortcutStatus.display = globalShortcut.register("Alt+Shift+F", () => void captureCurrentDisplay("display"));
  sendAppState();
}

function sendAppState() {
  if (launcherWindow && !launcherWindow.isDestroyed()) {
    launcherWindow.webContents.send("app:state", { shortcuts: shortcutStatus, version: app.getVersion() });
  }
}

function assetPath(name) {
  return path.join(__dirname, "..", "assets", name);
}

function assertImageDataUrl(dataUrl) {
  if (typeof dataUrl !== "string" || dataUrl.length > MAX_DATA_URL_LENGTH || !/^data:image\/(png|jpeg|webp);base64,/i.test(dataUrl)) {
    throw new Error("Geçersiz görüntü verisi.");
  }
}

function dataUrlBuffer(dataUrl) {
  assertImageDataUrl(dataUrl);
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
}

function extensionForMime(mime) {
  return mime === "image/jpeg" ? "jpg" : mime === "image/webp" ? "webp" : "png";
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
}

async function historyPath() {
  const directory = path.join(app.getPath("userData"), "data");
  await fs.mkdir(directory, { recursive: true });
  return path.join(directory, HISTORY_FILE);
}

async function readHistory() {
  try {
    const content = await fs.readFile(await historyPath(), "utf8");
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY_ITEMS) : [];
  } catch (error) {
    if (error.code !== "ENOENT") console.warn("WX Shot history read error:", error.message);
    return [];
  }
}

async function writeHistory(history) {
  const target = await historyPath();
  const temporary = `${target}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(history), "utf8");
  await fs.rename(temporary, target);
}

async function addHistory(item) {
  if (!item || typeof item.id !== "string" || typeof item.createdAt !== "number") throw new Error("Geçersiz geçmiş kaydı.");
  assertImageDataUrl(item.dataUrl);
  if (item.dataUrl.length > 2_500_000) throw new Error("Geçmiş önizlemesi çok büyük.");
  const history = await readHistory();
  const next = [item, ...history.filter((entry) => entry.id !== item.id)].slice(0, MAX_HISTORY_ITEMS);
  await writeHistory(next);
  return next;
}

function ocrScriptPath() {
  if (app.isPackaged) return path.join(process.resourcesPath, "app.asar.unpacked", "scripts", "windows-ocr.ps1");
  return path.join(__dirname, "..", "scripts", "windows-ocr.ps1");
}

async function recognizeWithWindowsOcr(dataUrl) {
  assertImageDataUrl(dataUrl);
  const input = path.join(app.getPath("temp"), `wx-shot-ocr-${crypto.randomUUID()}.png`);
  await fs.writeFile(input, dataUrlBuffer(dataUrl));
  try {
    const output = await runProcess("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", ocrScriptPath(), "-ImagePath", input], 30_000);
    const parsed = JSON.parse(output.trim() || "[]");
    return { available: true, regions: Array.isArray(parsed) ? parsed : [] };
  } catch (error) {
    console.warn("WX Shot Windows OCR unavailable:", error.message);
    return { available: false, regions: [] };
  } finally {
    await fs.unlink(input).catch(() => {});
  }
}

function runProcess(file, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("OCR zaman aşımına uğradı.")); }, timeoutMs);
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout); else reject(new Error(stderr.trim() || `OCR işlemi ${code} koduyla kapandı.`));
    });
  });
}

ipcMain.handle("capture:start", (_event, mode) => captureCurrentDisplay(mode === "display" ? "display" : "area"));
ipcMain.handle("selection:complete", async (_event, dataUrl) => { await openEditor(dataUrl, { source: "selection" }); return { ok: true }; });
ipcMain.handle("selection:cancel", () => {
  captureBusy = false;
  if (selectorWindow && !selectorWindow.isDestroyed()) selectorWindow.destroy();
  showLauncher();
  return { ok: true };
});
ipcMain.handle("image:copy", async (_event, dataUrl) => {
  assertImageDataUrl(dataUrl);
  const image = nativeImage.createFromDataURL(dataUrl);
  if (image.isEmpty()) throw new Error("Panoya gönderilecek görüntü oluşturulamadı.");

  if (typeof ClipboardItem === "function" && typeof clipboard.write === "function") {
    const png = image.toPNG();
    await clipboard.write([
      new ClipboardItem({
        "image/png": new Blob([png], { type: "image/png" })
      })
    ]);
  } else if (typeof clipboard.writeImage === "function") {
    clipboard.writeImage(image);
  } else {
    throw new Error("Bu Electron sürümünde görüntü panosu kullanılamıyor.");
  }
  return { ok: true };
});
ipcMain.handle("image:save", async (_event, payload) => {
  const dataUrl = payload?.dataUrl;
  const mime = ["image/png", "image/jpeg", "image/webp"].includes(payload?.mime) ? payload.mime : "image/png";
  assertImageDataUrl(dataUrl);
  const extension = extensionForMime(mime);
  const owner = BrowserWindow.fromWebContents(_event.sender);
  const result = await dialog.showSaveDialog(owner, {
    title: "WX Shot — Farklı kaydet",
    defaultPath: path.join(app.getPath("pictures"), `WX-Shot-${timestamp()}.${extension}`),
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }]
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  await fs.writeFile(result.filePath, dataUrlBuffer(dataUrl));
  return { ok: true, filePath: result.filePath };
});
ipcMain.handle("history:add", (_event, item) => addHistory(item));
ipcMain.handle("history:list", () => readHistory());
ipcMain.handle("history:clear", async () => { await writeHistory([]); return []; });
ipcMain.handle("history:open", async (_event, id) => {
  const item = (await readHistory()).find((entry) => entry.id === id);
  if (!item) return { ok: false };
  await openEditor(item.dataUrl, { source: "history" });
  return { ok: true };
});
ipcMain.handle("ocr:recognize", (_event, dataUrl) => recognizeWithWindowsOcr(dataUrl));
ipcMain.handle("window:close", (event) => { BrowserWindow.fromWebContents(event.sender)?.close(); });
ipcMain.handle("window:minimize", (event) => { BrowserWindow.fromWebContents(event.sender)?.minimize(); });
ipcMain.handle("app:quit", () => { app.quit(); return { ok: true }; });

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createTray();
  createLauncher();
  registerShortcuts();
});

app.on("activate", showLauncher);
app.on("window-all-closed", () => {});
app.on("will-quit", () => globalShortcut.unregisterAll());

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
