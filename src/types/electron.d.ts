export interface ConfigType {
  screenshotShortcut: string
  saveScreenshot: boolean
  screenshotSavePath: string
  autoRecognize: boolean
}

declare global {
  interface Window {
    electronAPI: {
      selectImage: () => Promise<string | null>
      readImageFile: (filePath: string) => Promise<string | null>
      copyToClipboard: (text: string) => Promise<boolean>
      saveToFile: (text: string) => Promise<boolean>
      getClipboardImage: () => Promise<string | null>
      getScreenSources: () => Promise<Array<{ id: string; name: string }>>
      captureScreen: (bounds: { x: number; y: number; width: number; height: number }) => Promise<string | null>
      closeScreenshotWindow: () => Promise<boolean>
      showMainWindow: () => Promise<boolean>
      getConfig: () => Promise<ConfigType>
      setConfig: (config: Partial<ConfigType>) => Promise<ConfigType>
      saveScreenshot: (imageData: string, filename?: string) => Promise<boolean>
    }
  }
}

export {}
