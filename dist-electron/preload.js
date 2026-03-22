"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  selectImage: () => electron.ipcRenderer.invoke("select-image"),
  readImageFile: (filePath) => electron.ipcRenderer.invoke("read-image-file", filePath),
  copyToClipboard: (text) => electron.ipcRenderer.invoke("copy-to-clipboard", text),
  saveToFile: (text) => electron.ipcRenderer.invoke("save-to-file", text),
  getClipboardImage: () => electron.ipcRenderer.invoke("get-clipboard-image"),
  // 截图相关 API
  startScreenshot: () => electron.ipcRenderer.invoke("start-screenshot"),
  cancelScreenshot: () => electron.ipcRenderer.invoke("cancel-screenshot"),
  confirmScreenshot: (rect) => electron.ipcRenderer.invoke("confirm-screenshot", rect),
  saveScreenshot: (imageData, fileName) => electron.ipcRenderer.invoke("save-screenshot", imageData, fileName),
  // 监听截图捕获事件
  onScreenshotCaptured: (callback) => {
    electron.ipcRenderer.on("screenshot-captured", (_, imageData) => callback(imageData));
  },
  // 移除监听
  removeScreenshotListener: () => {
    electron.ipcRenderer.removeAllListeners("screenshot-captured");
  }
});
//# sourceMappingURL=preload.js.map
