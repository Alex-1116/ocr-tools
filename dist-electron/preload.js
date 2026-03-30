"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  selectImage: () => electron.ipcRenderer.invoke("select-image"),
  readImageFile: (filePath) => electron.ipcRenderer.invoke("read-image-file", filePath),
  copyToClipboard: (text) => electron.ipcRenderer.invoke("copy-to-clipboard", text),
  saveToFile: (text) => electron.ipcRenderer.invoke("save-to-file", text),
  getClipboardImage: () => electron.ipcRenderer.invoke("get-clipboard-image"),
  // 截图相关
  captureScreen: (displayId) => electron.ipcRenderer.invoke("capture-screen", displayId),
  screenshotCancel: () => electron.ipcRenderer.invoke("screenshot-cancel"),
  screenshotComplete: (imageData) => electron.ipcRenderer.invoke("screenshot-complete", imageData),
  // 设置相关
  getSettings: () => electron.ipcRenderer.invoke("get-settings"),
  updateSettings: (settings) => electron.ipcRenderer.invoke("update-settings", settings),
  // 事件监听
  onScreenshotImage: (callback) => {
    electron.ipcRenderer.on("screenshot-image", (_, imageData) => callback(imageData));
  },
  onOpenSettings: (callback) => {
    electron.ipcRenderer.on("open-settings", () => callback());
  },
  // 移除监听
  removeAllListeners: (channel) => {
    electron.ipcRenderer.removeAllListeners(channel);
  }
});
//# sourceMappingURL=preload.js.map
