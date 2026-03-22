import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectImage: () => ipcRenderer.invoke('select-image'),
  readImageFile: (filePath: string) => ipcRenderer.invoke('read-image-file', filePath),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  saveToFile: (text: string) => ipcRenderer.invoke('save-to-file', text),
  getClipboardImage: () => ipcRenderer.invoke('get-clipboard-image'),
  // 截图相关 API
  startScreenshot: () => ipcRenderer.invoke('start-screenshot'),
  cancelScreenshot: () => ipcRenderer.invoke('cancel-screenshot'),
  confirmScreenshot: (rect: any) => ipcRenderer.invoke('confirm-screenshot', rect),
  saveScreenshot: (imageData: string, fileName?: string) => ipcRenderer.invoke('save-screenshot', imageData, fileName),
  // 监听截图捕获事件
  onScreenshotCaptured: (callback: (imageData: string) => void) => {
    ipcRenderer.on('screenshot-captured', (_, imageData) => callback(imageData))
  },
  // 移除监听
  removeScreenshotListener: () => {
    ipcRenderer.removeAllListeners('screenshot-captured')
  }
})

declare global {
  interface Window {
    electronAPI: {
      selectImage: () => Promise<string | null>
      readImageFile: (filePath: string) => Promise<string | null>
      copyToClipboard: (text: string) => Promise<boolean>
      saveToFile: (text: string) => Promise<boolean>
      getClipboardImage: () => Promise<string | null>
      startScreenshot: () => Promise<void>
      cancelScreenshot: () => Promise<void>
      confirmScreenshot: (rect: any) => Promise<string | null>
      saveScreenshot: (imageData: string, fileName?: string) => Promise<boolean>
      onScreenshotCaptured: (callback: (imageData: string) => void) => void
      removeScreenshotListener: () => void
    }
  }
}
