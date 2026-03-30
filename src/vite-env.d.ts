/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    selectImage: () => Promise<string | null>
    readImageFile: (filePath: string) => Promise<string | null>
    copyToClipboard: (text: string) => Promise<boolean>
    saveToFile: (text: string) => Promise<boolean>
    getClipboardImage: () => Promise<string | null>
  }
}
