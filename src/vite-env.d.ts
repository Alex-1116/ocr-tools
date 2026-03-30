/// <reference types="vite/client" />

interface AppSettings {
  shortcut: string
  autoSaveScreenshot: boolean
  screenshotPath: string
}

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
