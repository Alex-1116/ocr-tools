import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('screenshotAPI', {
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  captureScreenArea: (bounds: { x: number; y: number; width: number; height: number }) => 
    ipcRenderer.invoke('capture-screen-area', bounds),
  closeScreenshotWindow: () => ipcRenderer.invoke('close-screenshot-window'),
  sendScreenshotToMain: (imageData: string) => ipcRenderer.invoke('send-screenshot-to-main', imageData),
  onScreenCaptureReady: (callback: (imageData: string) => void) => {
    ipcRenderer.on('screen-capture-ready', (_, imageData: string) => callback(imageData))
  }
})

declare global {
  interface Window {
    screenshotAPI: {
      getScreenSources: () => Promise<Array<{
        id: string
        bounds: { x: number; y: number; width: number; height: number }
        scaleFactor: number
        workArea: { x: number; y: number; width: number; height: number }
        thumbnail: string
      }>>
      captureScreenArea: (bounds: { x: number; y: number; width: number; height: number }) => Promise<string | null>
      closeScreenshotWindow: () => Promise<void>
      sendScreenshotToMain: (imageData: string) => Promise<void>
      onScreenCaptureReady: (callback: (imageData: string) => void) => void
    }
  }
}
