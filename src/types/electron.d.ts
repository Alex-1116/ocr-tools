interface ElectronAPI {
  saveFile: (content: string) => Promise<{ success: boolean; path?: string }>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
