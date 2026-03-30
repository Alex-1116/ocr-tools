import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectImage: () => ipcRenderer.invoke('select-image'),
  readImageFile: (filePath: string) => ipcRenderer.invoke('read-image-file', filePath),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  saveToFile: (text: string) => ipcRenderer.invoke('save-to-file', text),
  getClipboardImage: () => ipcRenderer.invoke('get-clipboard-image'),
  
  // 截图相关
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  closeScreenshotWindow: () => ipcRenderer.invoke('close-screenshot-window'),
  sendCroppedImage: (imageData: string) => ipcRenderer.invoke('send-cropped-image', imageData),
  getScreenshotConfig: () => ipcRenderer.invoke('get-screenshot-config'),
  saveScreenshotConfig: (config: Partial<{
    screenshotShortcut: string
    autoRecognize: boolean
    saveScreenshot: boolean
    screenshotPath: string
  }>) => ipcRenderer.invoke('save-screenshot-config', config),
  
  // 监听截图完成事件
  onScreenshotCaptured: (callback: (imageData: string) => void) => {
    ipcRenderer.on('screenshot-captured', (_, imageData: string) => callback(imageData))
  },
  removeScreenshotCapturedListener: () => {
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
      captureScreen: () => Promise<string | null>
      closeScreenshotWindow: () => Promise<void>
      sendCroppedImage: (imageData: string) => Promise<void>
      getScreenshotConfig: () => Promise<{
        screenshotShortcut: string
        autoRecognize: boolean
        saveScreenshot: boolean
        screenshotPath: string
      }>
      saveScreenshotConfig: (config: Partial<{
        screenshotShortcut: string
        autoRecognize: boolean
        saveScreenshot: boolean
        screenshotPath: string
      }>) => Promise<{
        screenshotShortcut: string
        autoRecognize: boolean
        saveScreenshot: boolean
        screenshotPath: string
      }>
      onScreenshotCaptured: (callback: (imageData: string) => void) => void
      removeScreenshotCapturedListener: () => void
    }
  }
}
