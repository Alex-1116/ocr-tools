import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // 原有功能
  selectImage: () => ipcRenderer.invoke('select-image'),
  readImageFile: (filePath: string) => ipcRenderer.invoke('read-image-file', filePath),
  copyToClipboard: (text: string) => ipcRenderer.invoke('copy-to-clipboard', text),
  saveToFile: (text: string) => ipcRenderer.invoke('save-to-file', text),
  getClipboardImage: () => ipcRenderer.invoke('get-clipboard-image'),
  
  // 截图相关
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  captureScreen: (bounds: { x: number, y: number, width: number, height: number }) => 
    ipcRenderer.invoke('capture-screen', bounds),
  closeScreenshotWindow: () => ipcRenderer.invoke('close-screenshot-window'),
  showMainWindow: () => ipcRenderer.invoke('show-main-window'),
  
  // 配置相关
  getConfig: () => ipcRenderer.invoke('get-config'),
  setConfig: (config: Partial<ConfigType>) => ipcRenderer.invoke('set-config', config),
  saveScreenshot: (imageData: string, filename?: string) => ipcRenderer.invoke('save-screenshot', imageData, filename),
})

// 类型定义
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
