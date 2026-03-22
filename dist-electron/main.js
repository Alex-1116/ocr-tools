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
const os = require("node:os");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const __dirname$1 = path.dirname(node_url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.js", document.baseURI).href));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let mainWindow = null;
let screenshotWindow = null;
let tray = null;
const configPath = path.join(os.homedir(), ".ocr-tools-config.json");
const defaultConfig = {
  screenshotShortcut: "CommandOrControl+Shift+A",
  saveScreenshot: false,
  screenshotSavePath: path.join(os.homedir(), "Pictures", "OCR-Screenshots"),
  autoRecognize: true
};
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const config2 = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return { ...defaultConfig, ...config2 };
    }
  } catch (error) {
    console.error("读取配置失败:", error);
  }
  return defaultConfig;
}
function saveConfig(config2) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config2, null, 2), "utf-8");
  } catch (error) {
    console.error("保存配置失败:", error);
  }
}
let config = loadConfig();
function createWindow() {
  const publicPath = process.env.VITE_PUBLIC || RENDERER_DIST;
  mainWindow = new electron.BrowserWindow({
    width: 1e3,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: "OCR Tools - 图片文字识别",
    icon: path.join(publicPath, "logo.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.webContents.on("did-finish-load", () => {
    console.log("Main window loaded");
    mainWindow == null ? void 0 : mainWindow.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error("Failed to load:", errorCode, errorDescription);
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    const indexPath = path.join(RENDERER_DIST, "index.html");
    console.log("Loading index from:", indexPath);
    mainWindow.loadFile(indexPath);
  }
  mainWindow.on("close", (event) => {
    if (!electron.app.isQuiting) {
      event.preventDefault();
      mainWindow == null ? void 0 : mainWindow.hide();
    }
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
function createScreenshotWindow() {
  if (screenshotWindow) {
    screenshotWindow.close();
    screenshotWindow = null;
  }
  const primaryDisplay = electron.screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;
  screenshotWindow = new electron.BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    fullscreen: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
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
    screenshotWindow.loadURL(`${VITE_DEV_SERVER_URL}#/screenshot`);
  } else {
    const indexPath = path.join(RENDERER_DIST, "index.html");
    screenshotWindow.loadURL(`file://${indexPath}#screenshot`);
  }
  screenshotWindow.on("closed", () => {
    screenshotWindow = null;
  });
}
function registerGlobalShortcuts() {
  electron.globalShortcut.unregisterAll();
  const shortcut = config.screenshotShortcut;
  const registered = electron.globalShortcut.register(shortcut, () => {
    startScreenshot();
  });
  if (!registered) {
    console.error(`无法注册快捷键: ${shortcut}`);
  } else {
    console.log(`已注册截图快捷键: ${shortcut}`);
  }
}
function startScreenshot() {
  if (mainWindow && !mainWindow.isMinimized()) {
    mainWindow.hide();
  }
  setTimeout(() => {
    createScreenshotWindow();
  }, 100);
}
function createTray() {
  const emptyIcon = electron.nativeImage.createEmpty();
  tray = new electron.Tray(emptyIcon);
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: "显示主窗口",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: "截图识别",
      accelerator: config.screenshotShortcut,
      click: () => {
        startScreenshot();
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
  tray.setToolTip("OCR Tools");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") ;
});
electron.app.on("activate", () => {
  if (electron.BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else if (mainWindow) {
    mainWindow.show();
  }
});
electron.app.whenReady().then(() => {
  console.log("App is ready, creating window...");
  createWindow();
  createTray();
  registerGlobalShortcuts();
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
electron.ipcMain.handle("get-screen-sources", async () => {
  try {
    const { desktopCapturer } = await import("electron");
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: { width: 1, height: 1 }
    });
    return sources;
  } catch (error) {
    console.error("获取屏幕源失败:", error);
    return [];
  }
});
electron.ipcMain.handle("capture-screen", async (_, bounds) => {
  try {
    const { desktopCapturer } = await import("electron");
    const sources = await desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: electron.screen.getPrimaryDisplay().size
    });
    if (sources.length === 0) {
      return null;
    }
    const primarySource = sources[0];
    const thumbnail = primarySource.thumbnail;
    const croppedImage = thumbnail.crop(bounds);
    return croppedImage.toDataURL();
  } catch (error) {
    console.error("截图失败:", error);
    return null;
  }
});
electron.ipcMain.handle("close-screenshot-window", async () => {
  if (screenshotWindow) {
    screenshotWindow.close();
    screenshotWindow = null;
  }
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
  return true;
});
electron.ipcMain.handle("show-main-window", async () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
  return true;
});
electron.ipcMain.handle("get-config", async () => {
  return config;
});
electron.ipcMain.handle("set-config", async (_, newConfig) => {
  config = { ...config, ...newConfig };
  saveConfig(config);
  if (newConfig.screenshotShortcut) {
    registerGlobalShortcuts();
    if (tray) {
      createTray();
    }
  }
  return config;
});
electron.ipcMain.handle("save-screenshot", async (_, imageData, filename) => {
  if (!config.saveScreenshot) {
    return true;
  }
  try {
    if (!fs.existsSync(config.screenshotSavePath)) {
      fs.mkdirSync(config.screenshotSavePath, { recursive: true });
    }
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const name = filename || `screenshot-${timestamp}.png`;
    const filePath = path.join(config.screenshotSavePath, name);
    const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    return true;
  } catch (error) {
    console.error("保存截图失败:", error);
    return false;
  }
});
exports.MAIN_DIST = MAIN_DIST;
exports.RENDERER_DIST = RENDERER_DIST;
exports.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;
//# sourceMappingURL=main.js.map
