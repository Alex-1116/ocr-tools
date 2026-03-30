import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  selectImage: () => ipcRenderer.invoke('select-image'),
  readImageFile: (filePath: string) => ipcRenderer.invoke('read-image-file', filePath),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  saveToFile: (text: string) => ipcRenderer.invoke('save-to-file', text),
  getClipboardImage: () => ipcRenderer.invoke('get-clipboard-image'),
  
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke('save-settings', settings),
  updateShortcut: (shortcut: string) => ipcRenderer.invoke('update-shortcut', shortcut),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),
  
  onScreenshotCaptured: (callback: (imageData: string) => void) => {
    ipcRenderer.on('screenshot-captured', (_, imageData: string) => callback(imageData))
  },
  removeScreenshotCapturedListener: () => {
    ipcRenderer.removeAllListeners('screenshot-captured')
  },
  onSettingsChanged: (callback: (settings: AppSettings) => void) => {
    ipcRenderer.on('settings-changed', (_, settings: AppSettings) => callback(settings))
  },
  removeSettingsChangedListener: () => {
    ipcRenderer.removeAllListeners('settings-changed')
  }
})

export interface AppSettings {
  shortcut: string
  autoSaveScreenshot: boolean
  screenshotPath: string
}

declare global {
  interface Window {
    electronAPI: {
      selectImage: () => Promise<string | null>
      readImageFile: (filePath: string) => Promise<string | null>
      copyToClipboard: (text: string) => Promise<boolean>
      saveToFile: (text: string) => Promise<boolean>
      getClipboardImage: () => Promise<string | null>
      getSettings: () => Promise<AppSettings>
      saveSettings: (settings: AppSettings) => Promise<boolean>
      updateShortcut: (shortcut: string) => Promise<boolean>
      showNotification: (title: string, body: string) => Promise<boolean>
      onScreenshotCaptured: (callback: (imageData: string) => void) => void
      removeScreenshotCapturedListener: () => void
      onSettingsChanged: (callback: (settings: AppSettings) => void) => void
      removeSettingsChangedListener: () => void
    }
  }
}
