"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const node_url = require("node:url");
const path = require("node:path");
const fs = require("node:fs");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __dirname$1 = path.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let tray = null;
let screenshotWindow = null;
let settings = {
  shortcut: "Ctrl+Shift+A",
  autoSaveScreenshot: false,
  savePath: electron.app.getPath("pictures")
};
function loadSettings() {
  const settingsPath = path.join(electron.app.getPath("userData"), "settings.json");
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, "utf-8");
      settings = { ...settings, ...JSON.parse(data) };
    }
  } catch (error) {
    console.log("使用默认设置");
  }
}
function saveSettings() {
  const settingsPath = path.join(electron.app.getPath("userData"), "settings.json");
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("保存设置失败:", error);
  }
}
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1e3,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: "OCR Tools - 图片文字识别",
    icon: path.join(process.env.VITE_PUBLIC, "logo.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  win.on("minimize", (event) => {
    event.preventDefault();
    win == null ? void 0 : win.hide();
    if (process.platform === "darwin") {
      electron.app.dock.hide();
    }
  });
  win.on("close", (event) => {
    if (!electron.app.isQuiting) {
      event.preventDefault();
      win == null ? void 0 : win.hide();
      if (process.platform === "darwin") {
        electron.app.dock.hide();
      }
    }
  });
}
function createTray() {
  const iconPath = path.join(__dirname$1, "../public/logo.svg");
  const fallbackIcon = electron.nativeImage.createEmpty();
  try {
    tray = new electron.Tray(electron.nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }));
  } catch (e) {
    tray = new electron.Tray(fallbackIcon.resize({ width: 16, height: 16 }));
  }
  const contextMenu = electron.Menu.buildFromTemplate([
    { label: "打开主窗口", click: () => {
      win == null ? void 0 : win.show();
      if (process.platform === "darwin") {
        electron.app.dock.show();
      }
    } },
    { label: "截图识别", click: () => startScreenshot() },
    { label: "设置", click: () => {
      win == null ? void 0 : win.show();
      if (process.platform === "darwin") {
        electron.app.dock.show();
      }
      win == null ? void 0 : win.webContents.send("open-settings");
    } },
    { type: "separator" },
    { label: "退出", click: () => {
      electron.app.isQuiting = true;
      electron.app.quit();
    } }
  ]);
  tray.setToolTip("OCR Tools - 截图识别");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    win == null ? void 0 : win.show();
    if (process.platform === "darwin") {
      electron.app.dock.show();
    }
  });
}
function registerGlobalShortcut() {
  electron.globalShortcut.unregisterAll();
  try {
    electron.globalShortcut.register(settings.shortcut, () => {
      startScreenshot();
    });
    console.log(`快捷键已注册: ${settings.shortcut}`);
  } catch (error) {
    console.error("快捷键注册失败:", error);
  }
}
function startScreenshot() {
  if (screenshotWindow) {
    screenshotWindow.close();
    screenshotWindow = null;
    return;
  }
  const displays = electron.screen.getAllDisplays();
  let bounds = { x: 0, y: 0, width: 0, height: 0 };
  displays.forEach((display) => {
    const x = display.bounds.x;
    const y = display.bounds.y;
    const width = display.bounds.width;
    const height = display.bounds.height;
    bounds.x = Math.min(bounds.x, x);
    bounds.y = Math.min(bounds.y, y);
    bounds.width = Math.max(bounds.width, x + width - bounds.x);
    bounds.height = Math.max(bounds.height, y + height - bounds.y);
  });
  screenshotWindow = new electron.BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    movable: false,
    resizable: false,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  screenshotWindow.setFullScreen(true);
  screenshotWindow.setIgnoreMouseEvents(false);
  const screenshotUrl = VITE_DEV_SERVER_URL ? `${VITE_DEV_SERVER_URL}#/screenshot` : `file://${path.join(RENDERER_DIST, "index.html")}#/screenshot`;
  screenshotWindow.loadURL(screenshotUrl);
  screenshotWindow.on("closed", () => {
    screenshotWindow = null;
  });
}
async function captureScreen(displayId) {
  try {
    const sources = await electron.desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    const source = sources[displayId] || sources[0];
    if (source) {
      return source.thumbnail.toDataURL();
    }
    return null;
  } catch (error) {
    console.error("截图失败:", error);
    return null;
  }
}
function saveScreenshot(imageData) {
  if (!settings.autoSaveScreenshot) return;
  const fileName = `ocr-screenshot-${Date.now()}.png`;
  const filePath = path.join(settings.savePath, fileName);
  try {
    const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(filePath, base64Data, "base64");
    console.log("截图已保存到:", filePath);
  } catch (error) {
    console.error("保存截图失败:", error);
  }
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
    win = null;
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.app.whenReady().then(() => {
  loadSettings();
  createWindow();
  createTray();
  registerGlobalShortcut();
});
electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
});
electron.ipcMain.handle("select-image", async () => {
  const result = await electron.dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "图片文件", extensions: ["png", "jpg", "jpeg", "bmp", "gif", "webp"] },
      { name: "所有文件", extensions: ["*"] }
    ]
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});
electron.ipcMain.handle("read-image-file", async (_, filePath) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return buffer.toString("base64");
  } catch (error) {
    console.error("读取图片文件失败:", error);
    return null;
  }
});
electron.ipcMain.handle("copy-to-clipboard", async (_, text) => {
  electron.clipboard.writeText(text);
  return true;
});
electron.ipcMain.handle("save-to-file", async (_, text) => {
  const result = await electron.dialog.showSaveDialog({
    filters: [
      { name: "文本文件", extensions: ["txt"] },
      { name: "所有文件", extensions: ["*"] }
    ],
    defaultPath: "ocr-result.txt"
  });
  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, text, "utf-8");
      return true;
    } catch (error) {
      console.error("保存文件失败:", error);
      return false;
    }
  }
  return false;
});
electron.ipcMain.handle("get-clipboard-image", async () => {
  const image = electron.clipboard.readImage();
  if (image.isEmpty()) {
    return null;
  }
  return image.toDataURL();
});
electron.ipcMain.handle("capture-screen", async (_, displayId) => {
  return await captureScreen(displayId);
});
electron.ipcMain.handle("screenshot-cancel", () => {
  if (screenshotWindow) {
    screenshotWindow.close();
    screenshotWindow = null;
  }
});
electron.ipcMain.handle("screenshot-complete", async (_, imageData) => {
  saveScreenshot(imageData);
  if (screenshotWindow) {
    screenshotWindow.close();
    screenshotWindow = null;
  }
  win == null ? void 0 : win.show();
  win == null ? void 0 : win.webContents.send("screenshot-image", imageData);
});
electron.ipcMain.handle("get-settings", () => {
  return settings;
});
electron.ipcMain.handle("update-settings", async (_, newSettings) => {
  settings = { ...settings, ...newSettings };
  saveSettings();
  registerGlobalShortcut();
  return true;
});
exports.MAIN_DIST = MAIN_DIST;
exports.RENDERER_DIST = RENDERER_DIST;
exports.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;
//# sourceMappingURL=main.js.map
