import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  saveFile: (content: string) => ipcRenderer.invoke('save-file', content),
  openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
});

declare global {
  interface Window {
    electronAPI: {
      saveFile: (content: string) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
      openFileDialog: () => Promise<{ success: boolean; dataUrl?: string; canceled?: boolean; error?: string }>;
    };
  }
}