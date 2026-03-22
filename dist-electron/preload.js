"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  selectImage: () => electron.ipcRenderer.invoke("select-image"),
  readImageFile: (filePath) => electron.ipcRenderer.invoke("read-image-file", filePath),
  copyToClipboard: (text) => electron.ipcRenderer.invoke("copy-to-clipboard", text),
  saveToFile: (text) => electron.ipcRenderer.invoke("save-to-file", text),
  getClipboardImage: () => electron.ipcRenderer.invoke("get-clipboard-image"),
  startScreenshot: () => electron.ipcRenderer.invoke("start-screenshot"),
  onScreenshotImage: (callback) => {
    electron.ipcRenderer.on("screenshot-image", (_, imageData) => callback(imageData));
  },
  removeScreenshotListener: () => {
    electron.ipcRenderer.removeAllListeners("screenshot-image");
  },
  getScreenshotShortcut: () => electron.ipcRenderer.invoke("get-screenshot-shortcut"),
  setScreenshotShortcut: (shortcut) => electron.ipcRenderer.invoke("set-screenshot-shortcut", shortcut),
  minimizeToTray: () => electron.ipcRenderer.invoke("minimize-to-tray"),
  showNotification: (title, body) => electron.ipcRenderer.invoke("show-notification", title, body),
  saveScreenshot: (imageData) => electron.ipcRenderer.invoke("save-screenshot", imageData)
});
//# sourceMappingURL=preload.js.map
