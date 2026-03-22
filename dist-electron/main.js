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
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
let screenshotWindow;
let tray = null;
let shortcutKey = "Ctrl+Shift+A";
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
  registerGlobalShortcut();
  createTray();
}
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    electron.app.quit();
    win = null;
    screenshotWindow = null;
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
electron.app.whenReady().then(createWindow);
function registerGlobalShortcut() {
  electron.globalShortcut.unregisterAll();
  const ret = electron.globalShortcut.register(shortcutKey, () => {
    startScreenshot();
  });
  if (!ret) {
    console.log("快捷键注册失败");
  }
}
function createTray() {
  const { Tray, Menu } = require("electron");
  tray = new Tray(path.join(process.env.VITE_PUBLIC, "logo.svg"));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "截图识别",
      click: () => startScreenshot()
    },
    {
      label: "显示窗口",
      click: () => win == null ? void 0 : win.show()
    },
    {
      label: "隐藏窗口",
      click: () => win == null ? void 0 : win.hide()
    },
    {
      type: "separator"
    },
    {
      label: "退出",
      click: () => electron.app.quit()
    }
  ]);
  tray.setToolTip("OCR Tools - 图片文字识别");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => {
    win == null ? void 0 : win.show();
  });
}
function startScreenshot() {
  if (screenshotWindow) {
    screenshotWindow.close();
    screenshotWindow = null;
    return;
  }
  electron.screen.getAllDisplays();
  const primaryDisplay = electron.screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.bounds;
  screenshotWindow = new electron.BrowserWindow({
    width,
    height,
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const screenshotHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; }
        body { 
          background: rgba(0, 0, 0, 0.5); 
          position: relative;
          cursor: crosshair;
        }
        .selection {
          position: absolute;
          border: 2px solid #409eff;
          background: rgba(64, 158, 255, 0.1);
          pointer-events: none;
        }
        .size-label {
          position: absolute;
          background: rgba(0, 0, 0, 0.7);
          color: #fff;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-family: system-ui;
          pointer-events: none;
          white-space: nowrap;
        }
        .toolbar {
          position: absolute;
          background: #fff;
          border-radius: 6px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15);
          padding: 8px;
          display: flex;
          gap: 8px;
          pointer-events: auto;
        }
        .toolbar button {
          padding: 6px 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .btn-confirm {
          background: #409eff;
          color: #fff;
        }
        .btn-confirm:hover {
          background: #66b1ff;
        }
        .btn-cancel {
          background: #f5f7fa;
          color: #606266;
        }
        .btn-cancel:hover {
          background: #ebeef5;
        }
        .tip {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          color: #fff;
          font-size: 14px;
          font-family: system-ui;
          background: rgba(0,0,0,0.6);
          padding: 8px 16px;
          border-radius: 20px;
        }
      </style>
    </head>
    <body>
      <div class="tip">拖拽选择区域 | ESC 取消 | 右键完成</div>
      <script>
        let isSelecting = false
        let startX = 0, startY = 0
        let selection = null
        let sizeLabel = null
        let toolbar = null
        let currentRect = null

        document.body.addEventListener('mousedown', (e) => {
          if (e.button !== 0) return
          
          isSelecting = true
          startX = e.clientX
          startY = e.clientY

          if (selection) selection.remove()
          if (sizeLabel) sizeLabel.remove()
          if (toolbar) toolbar.remove()

          selection = document.createElement('div')
          selection.className = 'selection'
          document.body.appendChild(selection)

          sizeLabel = document.createElement('div')
          sizeLabel.className = 'size-label'
          document.body.appendChild(sizeLabel)
        })

        document.body.addEventListener('mousemove', (e) => {
          if (!isSelecting || !selection) return

          const currentX = e.clientX
          const currentY = e.clientY

          const left = Math.min(startX, currentX)
          const top = Math.min(startY, currentY)
          const width = Math.abs(currentX - startX)
          const height = Math.abs(currentY - startY)

          selection.style.left = left + 'px'
          selection.style.top = top + 'px'
          selection.style.width = width + 'px'
          selection.style.height = height + 'px'

          sizeLabel.textContent = width + ' x ' + height
          sizeLabel.style.left = left + 'px'
          sizeLabel.style.top = (top - 30) + 'px'

          currentRect = { x: left, y: top, width, height }
        })

        document.body.addEventListener('mouseup', (e) => {
          if (!isSelecting) return
          isSelecting = false

          if (currentRect && currentRect.width > 10 && currentRect.height > 10) {
            showToolbar(currentRect)
          }
        })

        document.body.addEventListener('contextmenu', (e) => {
          e.preventDefault()
          if (currentRect && currentRect.width > 10 && currentRect.height > 10) {
            confirmSelection()
          }
        })

        function showToolbar(rect) {
          toolbar = document.createElement('div')
          toolbar.className = 'toolbar'
          toolbar.innerHTML = \`
            <button class="btn-cancel" onclick="cancelSelection()">取消</button>
            <button class="btn-confirm" onclick="confirmSelection()">识别文字</button>
          \`
          
          const toolbarWidth = 160
          const toolbarHeight = 40
          let toolbarX = rect.x + rect.width - toolbarWidth
          let toolbarY = rect.y + rect.height + 10

          if (toolbarX < 10) toolbarX = 10
          if (toolbarY + toolbarHeight > window.innerHeight) {
            toolbarY = rect.y - toolbarHeight - 10
          }

          toolbar.style.left = toolbarX + 'px'
          toolbar.style.top = toolbarY + 'px'
          document.body.appendChild(toolbar)
        }

        function cancelSelection() {
          window.electronAPI.cancelScreenshot()
        }

        function confirmSelection() {
          if (currentRect) {
            window.electronAPI.confirmScreenshot(currentRect)
          }
        }

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            cancelSelection()
          }
        })
      <\/script>
    </body>
    </html>
  `;
  screenshotWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(screenshotHTML));
  screenshotWindow.setFullScreen(true);
}
electron.ipcMain.handle("cancel-screenshot", async () => {
  if (screenshotWindow) {
    screenshotWindow.close();
    screenshotWindow = null;
  }
});
electron.ipcMain.handle("confirm-screenshot", async (_, rect) => {
  try {
    const sources = await electron.desktopCapturer.getSources({
      types: ["screen"],
      thumbnailSize: {
        width: electron.screen.getPrimaryDisplay().bounds.width,
        height: electron.screen.getPrimaryDisplay().bounds.height
      }
    });
    if (sources.length > 0) {
      const screenshot = sources[0].thumbnail;
      const croppedImage = screenshot.crop({
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      });
      const imageData = croppedImage.toDataURL();
      if (screenshotWindow) {
        screenshotWindow.close();
        screenshotWindow = null;
      }
      if (win) {
        win.show();
        win.focus();
        win.webContents.send("screenshot-captured", imageData);
      }
      return imageData;
    }
  } catch (error) {
    console.error("截图失败:", error);
    if (screenshotWindow) {
      screenshotWindow.close();
      screenshotWindow = null;
    }
  }
  return null;
});
electron.ipcMain.handle("start-screenshot", async () => {
  startScreenshot();
});
electron.ipcMain.handle("save-screenshot", async (_, imageData, fileName) => {
  try {
    const result = await electron.dialog.showSaveDialog({
      filters: [
        { name: "图片文件", extensions: ["png"] }
      ],
      defaultPath: fileName || "screenshot.png"
    });
    if (!result.canceled && result.filePath) {
      const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(result.filePath, Buffer.from(base64Data, "base64"));
      return true;
    }
  } catch (error) {
    console.error("保存截图失败:", error);
  }
  return false;
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
    const fs2 = await import("node:fs");
    const buffer = fs2.readFileSync(filePath);
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
      const fs2 = await import("node:fs");
      fs2.writeFileSync(result.filePath, text, "utf-8");
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
exports.MAIN_DIST = MAIN_DIST;
exports.RENDERER_DIST = RENDERER_DIST;
exports.VITE_DEV_SERVER_URL = VITE_DEV_SERVER_URL;
//# sourceMappingURL=main.js.map
