"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("screenshotAPI", {
  getScreenSources: () => electron.ipcRenderer.invoke("get-screen-sources"),
  captureScreenArea: (bounds) => electron.ipcRenderer.invoke("capture-screen-area", bounds),
  closeScreenshotWindow: () => electron.ipcRenderer.invoke("close-screenshot-window"),
  sendScreenshotToMain: (imageData) => electron.ipcRenderer.invoke("send-screenshot-to-main", imageData),
  onScreenCaptureReady: (callback) => {
    electron.ipcRenderer.on("screen-capture-ready", (_, imageData) => callback(imageData));
  }
});
//# sourceMappingURL=screenshot-preload.js.map
