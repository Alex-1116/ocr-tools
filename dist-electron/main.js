"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const electron = require("electron");
const node_url = require("node:url");
const path = require("node:path");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __dirname$1 = path.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let screenshotWin;
let tray;
let screenshotShortcut = "CommandOrControl+Shift+A";
function createWindow() {
  win = new electron.BrowserWindow({
    width: 1e3,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: "OCR Tools - 图片文字识别",
    icon: path.join(process.env.VITE_PUBLIC, "logo.png"),
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
}
function createScreenshotWindow() {
  if (screenshotWin) {
    screenshotWin.close();
    screenshotWin = null;
  }
  const primaryDisplay = electron.screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;
  screenshotWin = new electron.BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreen: true,
    focusable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  const screenshotPath = VITE_DEV_SERVER_URL ? path.join(process.env.VITE_PUBLIC, "screenshot.html") : path.join(RENDERER_DIST, "screenshot.html");
  screenshotWin.loadFile(screenshotPath);
  screenshotWin.on("closed", () => {
    screenshotWin = null;
  });
}
function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC, "logo.png");
  const icon = electron.nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) {
    const emptyIcon = electron.nativeImage.createEmpty();
    tray = new electron.Tray(emptyIcon);
  } else {
    tray = new electron.Tray(icon.resize({ width: 16, height: 16 }));
  }
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: "打开主窗口",
      click: () => {
        if (win) {
          win.show();
          win.focus();
        } else {
          createWindow();
        }
      }
    },
    {
      label: "截图识别",
      accelerator: screenshotShortcut,
      click: () => {
        startScreenshot();
      }
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        electron.app.quit();
      }
    }
  ]);
  tray.setToolTip("OCR Tools - 图片文字识别");
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    if (win) {
      win.show();
      win.focus();
    } else {
      createWindow();
    }
  });
}
function registerScreenshotShortcut() {
  if (electron.globalShortcut.isRegistered(screenshotShortcut)) {
    electron.globalShortcut.unregister(screenshotShortcut);
  }
  const success = electron.globalShortcut.register(screenshotShortcut, () => {
    startScreenshot();
  });
  if (!success) {
    console.error("快捷键注册失败:", screenshotShortcut);
  }
}
function startScreenshot() {
  if (win) {
    win.minimize();
  }
  createScreenshotWindow();
}
function showNotification(title, body) {
  if (electron.Notification.isSupported()) {
    const notification = new electron.Notification({
      title,
      body
    });
    notification.show();
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
electron.app.on("will-quit", () => {
  electron.globalShortcut.unregisterAll();
});
electron.app.whenReady().then(() => {
  createWindow();
  createTray();
  registerScreenshotShortcut();
});
electron.ipcMain.on("screenshot-selected", (_, imageData) => {
  if (screenshotWin) {
    screenshotWin.close();
    screenshotWin = null;
  }
  if (win) {
    win.restore();
    win.show();
    win.focus();
    win.webContents.send("screenshot-image", imageData);
  }
});
electron.ipcMain.on("screenshot-cancelled", () => {
  if (screenshotWin) {
    screenshotWin.close();
    screenshotWin = null;
  }
  if (win) {
    win.restore();
    win.show();
    win.focus();
  }
});
electron.ipcMain.handle("start-screenshot", async () => {
  startScreenshot();
  return true;
});
electron.ipcMain.handle("select-image", async () => {
  const parentWin = win || void 0;
  const result = await electron.dialog.showOpenDialog(parentWin, {
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
    const fs = await import("node:fs");
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
  const parentWin = win || void 0;
  const result = await electron.dialog.showSaveDialog(parentWin, {
    filters: [
      { name: "文本文件", extensions: ["txt"] },
      { name: "所有文件", extensions: ["*"] }
    ],
    defaultPath: "ocr-result.txt"
  });
  if (!result.canceled && result.filePath) {
    try {
      const fs = await import("node:fs");
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
electron.ipcMain.handle("get-screenshot-shortcut", async () => {
  return screenshotShortcut;
});
electron.ipcMain.handle("set-screenshot-shortcut", async (_, newShortcut) => {
  if (electron.globalShortcut.isRegistered(screenshotShortcut)) {
    electron.globalShortcut.unregister(screenshotShortcut);
  }
  const success = electron.globalShortcut.register(newShortcut, () => {
    startScreenshot();
  });
  if (success) {
    screenshotShortcut = newShortcut;
    createTray();
    return true;
  } else {
    registerScreenshotShortcut();
    return false;
  }
});
electron.ipcMain.handle("minimize-to-tray", async () => {
  if (win) {
    win.hide();
  }
  return true;
});
electron.ipcMain.handle("show-notification", async (_, title, body) => {
  showNotification(title, body);
  return true;
});
electron.ipcMain.handle("save-screenshot", async (_, imageData) => {
  const parentWin = win || void 0;
  const result = await electron.dialog.showSaveDialog(parentWin, {
    filters: [
      { name: "PNG 图片", extensions: ["png"] },
      { name: "所有文件", extensions: ["*"] }
    ],
    defaultPath: `screenshot-${Date.now()}.png`
  });
  if (!result.canceled && result.filePath) {
    try {
      const fs = await import("node:fs");
      const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(result.filePath, base64Data, "base64");
      return result.filePath;
    } catch (error) {
      console.error("保存截图失败:", error);
      return null;
    }
  }
  return null;
});
exports.MAIN_DIST = MAIN_DIST;
exports.RENDERER_DIST = RENDERER_DIST;
exports.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;
//# sourceMappingURL=main.js.map
