import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectImage: () => ipcRenderer.invoke('select-image'),
  readImageFile: (filePath: string) => ipcRenderer.invoke('read-image-file', filePath),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  saveToFile: (text: string) => ipcRenderer.invoke('save-to-file', text),
  getClipboardImage: () => ipcRenderer.invoke('get-clipboard-image'),
  // 截图相关
  captureScreen: (displayId: number) => ipcRenderer.invoke('capture-screen', displayId),
  screenshotCancel: () => ipcRenderer.invoke('screenshot-cancel'),
  screenshotComplete: (imageData: string) => ipcRenderer.invoke('screenshot-complete', imageData),
  // 设置相关
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('update-settings', settings),
  // 事件监听
  onScreenshotImage: (callback: (imageData: string) => void) => {
    ipcRenderer.on('screenshot-image', (_, imageData) => callback(imageData))
  },
  onOpenSettings: (callback: () => void) => {
    ipcRenderer.on('open-settings', () => callback())
  },
  // 移除监听
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// 类型声明已移至 src/types/global.d.ts
