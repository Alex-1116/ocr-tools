import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectImage: () => ipcRenderer.invoke('select-image'),
  readImageFile: (filePath: string) => ipcRenderer.invoke('read-image-file', filePath),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  saveToFile: (text: string) => ipcRenderer.invoke('save-to-file', text),
  getClipboardImage: () => ipcRenderer.invoke('get-clipboard-image'),
  startScreenshot: () => ipcRenderer.invoke('start-screenshot'),
  onScreenshotImage: (callback: (imageData: string) => void) => {
    ipcRenderer.on('screenshot-image', (_, imageData) => callback(imageData))
  },
  removeScreenshotListener: () => {
    ipcRenderer.removeAllListeners('screenshot-image')
  },
  getScreenshotShortcut: () => ipcRenderer.invoke('get-screenshot-shortcut'),
  setScreenshotShortcut: (shortcut: string) => ipcRenderer.invoke('set-screenshot-shortcut', shortcut),
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),
  saveScreenshot: (imageData: string) => ipcRenderer.invoke('save-screenshot', imageData),
})

declare global {
  interface Window {
    electronAPI: {
      selectImage: () => Promise<string | null>
      readImageFile: (filePath: string) => Promise<string | null>
      copyToClipboard: (text: string) => Promise<boolean>
      saveToFile: (text: string) => Promise<boolean>
      getClipboardImage: () => Promise<string | null>
      startScreenshot: () => Promise<boolean>
      onScreenshotImage: (callback: (imageData: string) => void) => void
      removeScreenshotListener: () => void
      getScreenshotShortcut: () => Promise<string>
      setScreenshotShortcut: (shortcut: string) => Promise<boolean>
      minimizeToTray: () => Promise<boolean>
      showNotification: (title: string, body: string) => Promise<boolean>
      saveScreenshot: (imageData: string) => Promise<string | null>
    }
  }
}
