/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

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
