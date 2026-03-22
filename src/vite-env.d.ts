/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    selectImage: () => Promise<string | null>
    readImageFile: (filePath: string) => Promise<string | null>
    copyToClipboard: (text: string) => Promise<boolean>
    saveToFile: (text: string) => Promise<boolean>
    getClipboardImage: () => Promise<string | null>
    // 截图相关 API
    startScreenshot: () => Promise<void>
    cancelScreenshot: () => Promise<void>
    confirmScreenshot: (rect: any) => Promise<string | null>
    saveScreenshot: (imageData: string, fileName?: string) => Promise<boolean>
    onScreenshotCaptured: (callback: (imageData: string) => void) => void
    removeScreenshotListener: () => void
  }
}
