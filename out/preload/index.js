"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  saveFile: (content) => electron.ipcRenderer.invoke("save-file", content)
});
