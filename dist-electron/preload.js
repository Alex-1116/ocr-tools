"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  selectImage: () => electron.ipcRenderer.invoke("select-image"),
  readImageFile: (filePath) => electron.ipcRenderer.invoke("read-image-file", filePath),
  copyToClipboard: (text) => electron.ipcRenderer.invoke("copy-to-clipboard", text),
  saveToFile: (text) => electron.ipcRenderer.invoke("save-to-file", text),
  getClipboardImage: () => electron.ipcRenderer.invoke("get-clipboard-image"),
  getSettings: () => electron.ipcRenderer.invoke("get-settings"),
  saveSettings: (settings) => electron.ipcRenderer.invoke("save-settings", settings),
  updateShortcut: (shortcut) => electron.ipcRenderer.invoke("update-shortcut", shortcut),
  showNotification: (title, body) => electron.ipcRenderer.invoke("show-notification", title, body),
  onScreenshotCaptured: (callback) => {
    electron.ipcRenderer.on("screenshot-captured", (_, imageData) => callback(imageData));
  },
  removeScreenshotCapturedListener: () => {
    electron.ipcRenderer.removeAllListeners("screenshot-captured");
  },
  onSettingsChanged: (callback) => {
    electron.ipcRenderer.on("settings-changed", (_, settings) => callback(settings));
  },
  removeSettingsChangedListener: () => {
    electron.ipcRenderer.removeAllListeners("settings-changed");
  }
});
//# sourceMappingURL=preload.js.map
