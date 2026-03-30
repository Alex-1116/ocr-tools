"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  selectImage: () => electron.ipcRenderer.invoke("select-image"),
  readImageFile: (filePath) => electron.ipcRenderer.invoke("read-image-file", filePath),
  copyToClipboard: (text) => electron.ipcRenderer.invoke("copy-to-clipboard", text),
  saveToFile: (text) => electron.ipcRenderer.invoke("save-to-file", text),
  getClipboardImage: () => electron.ipcRenderer.invoke("get-clipboard-image"),
  // 截图相关
  captureScreen: () => electron.ipcRenderer.invoke("capture-screen"),
  closeScreenshotWindow: () => electron.ipcRenderer.invoke("close-screenshot-window"),
  sendCroppedImage: (imageData) => electron.ipcRenderer.invoke("send-cropped-image", imageData),
  getScreenshotConfig: () => electron.ipcRenderer.invoke("get-screenshot-config"),
  saveScreenshotConfig: (config) => electron.ipcRenderer.invoke("save-screenshot-config", config),
  // 监听截图完成事件
  onScreenshotCaptured: (callback) => {
    electron.ipcRenderer.on("screenshot-captured", (_, imageData) => callback(imageData));
  },
  removeScreenshotCapturedListener: () => {
    electron.ipcRenderer.removeAllListeners("screenshot-captured");
  }
});
//# sourceMappingURL=preload.js.map
