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
const fs = require("node:fs");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __dirname$1 = path.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
const VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let screenshotWin;
let tray;
const CONFIG_DIR = path.join(electron.app.getPath("userData"), "config");
const CONFIG_FILE = path.join(CONFIG_DIR, "settings.json");
const defaultConfig = {
  screenshotShortcut: "CommandOrControl+Shift+A",
  autoRecognize: true,
  saveScreenshot: false,
  screenshotPath: path.join(electron.app.getPath("pictures"), "OCR-Screenshots")
};
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      const savedConfig = JSON.parse(data);
      return { ...defaultConfig, ...savedConfig };
    }
  } catch (error) {
    console.error("加载配置失败:", error);
  }
  return { ...defaultConfig };
}
function saveConfig(config) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (error) {
    console.error("保存配置失败:", error);
  }
}
let appConfig = loadConfig();
function getIconPath() {
  const possiblePaths = [
    path.join(VITE_PUBLIC, "logo.png"),
    path.join(VITE_PUBLIC, "logo.svg"),
    path.join(process.env.APP_ROOT || "", "public", "logo.png"),
    path.join(process.env.APP_ROOT || "", "public", "logo.svg")
  ];
  for (const iconPath of possiblePaths) {
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }
  }
  return "";
}
function createWindow() {
  const iconPath = getIconPath();
  win = new electron.BrowserWindow({
    width: 1e3,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: "OCR Tools - 图片文字识别",
    icon: iconPath || void 0,
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
  win.on("close", (event) => {
    if (!electron.app.isQuiting) {
      event.preventDefault();
      win == null ? void 0 : win.hide();
    }
  });
}
function createScreenshotWindow() {
  if (screenshotWin) {
    screenshotWin.close();
    screenshotWin = null;
    return;
  }
  const primaryDisplay = electron.screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  screenshotWin = new electron.BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    fullscreen: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  if (VITE_DEV_SERVER_URL) {
    screenshotWin.loadURL(`${VITE_DEV_SERVER_URL}#/screenshot`);
  } else {
    screenshotWin.loadFile(path.join(RENDERER_DIST, "index.html"), {
      hash: "#/screenshot"
    });
  }
  screenshotWin.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape") {
      event.preventDefault();
      if (screenshotWin) {
        screenshotWin.close();
        screenshotWin = null;
      }
    }
  });
  screenshotWin.on("closed", () => {
    screenshotWin = null;
  });
}
function createTray() {
  const iconPath = getIconPath();
  try {
    if (iconPath) {
      tray = new electron.Tray(iconPath);
    } else {
      const emptyIcon = electron.nativeImage.createEmpty();
      tray = new electron.Tray(emptyIcon);
    }
  } catch {
    const emptyIcon = electron.nativeImage.createEmpty();
    tray = new electron.Tray(emptyIcon);
  }
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: "显示主窗口",
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
      accelerator: appConfig.screenshotShortcut,
      click: () => {
        createScreenshotWindow();
      }
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        electron.app.isQuiting = true;
        electron.app.quit();
      }
    }
  ]);
  tray.setToolTip("OCR Tools - 图片文字识别");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (win) {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
        win.focus();
      }
    } else {
      createWindow();
    }
  });
}
function registerGlobalShortcuts() {
  const shortcutRegistered = electron.globalShortcut.register(appConfig.screenshotShortcut, () => {
    createScreenshotWindow();
  });
  if (!shortcutRegistered) {
    console.warn("无法注册全局快捷键:", appConfig.screenshotShortcut);
  }
}
function unregisterGlobalShortcuts() {
  electron.globalShortcut.unregisterAll();
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    win = null;
  }
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
electron.app.whenReady().then(() => {
  createWindow();
  createTray();
  registerGlobalShortcuts();
});
electron.app.on("will-quit", () => {
  unregisterGlobalShortcuts();
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
  try {
    electron.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("复制到剪贴板失败:", error);
    return false;
  }
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
electron.ipcMain.handle("capture-screen", async () => {
  try {
    const primaryDisplay = electron.screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.size;
    const { desktopCapturer } = await import("electron");
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width, height }
    });
    if (sources.length > 0) {
      return sources[0].thumbnail.toDataURL();
    }
    return null;
  } catch (error) {
    console.error("截图失败:", error);
    return null;
  }
});
electron.ipcMain.handle("close-screenshot-window", async () => {
  if (screenshotWin) {
    screenshotWin.close();
    screenshotWin = null;
  }
});
electron.ipcMain.handle("send-cropped-image", async (_, imageData) => {
  if (screenshotWin) {
    screenshotWin.close();
    screenshotWin = null;
  }
  if (win) {
    win.show();
    win.focus();
    win.webContents.send("screenshot-captured", imageData);
  }
});
electron.ipcMain.handle("save-screenshot-config", async (_, config) => {
  appConfig = { ...appConfig, ...config };
  saveConfig(appConfig);
  if (config.screenshotShortcut) {
    unregisterGlobalShortcuts();
    registerGlobalShortcuts();
    if (tray) {
      tray.destroy();
      createTray();
    }
  }
  return appConfig;
});
electron.ipcMain.handle("get-screenshot-config", async () => {
  return appConfig;
});
exports.MAIN_DIST = MAIN_DIST;
exports.RENDERER_DIST = RENDERER_DIST;
exports.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;
//# sourceMappingURL=main.js.map
