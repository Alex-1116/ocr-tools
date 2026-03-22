"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // 原有功能
  selectImage: () => electron.ipcRenderer.invoke("select-image"),
  readImageFile: (filePath) => electron.ipcRenderer.invoke("read-image-file", filePath),
  copyToClipboard: (text) => electron.ipcRenderer.invoke("copy-to-clipboard", text),
  saveToFile: (text) => electron.ipcRenderer.invoke("save-to-file", text),
  getClipboardImage: () => electron.ipcRenderer.invoke("get-clipboard-image"),
  // 截图相关
  getScreenSources: () => electron.ipcRenderer.invoke("get-screen-sources"),
  captureScreen: (bounds) => electron.ipcRenderer.invoke("capture-screen", bounds),
  closeScreenshotWindow: () => electron.ipcRenderer.invoke("close-screenshot-window"),
  showMainWindow: () => electron.ipcRenderer.invoke("show-main-window"),
  // 配置相关
  getConfig: () => electron.ipcRenderer.invoke("get-config"),
  setConfig: (config) => electron.ipcRenderer.invoke("set-config", config),
  saveScreenshot: (imageData, filename) => electron.ipcRenderer.invoke("save-screenshot", imageData, filename)
});
//# sourceMappingURL=preload.js.map
