export {};

declare global {
  interface Window {
    electronAPI: {
      saveFile: (content: string) => Promise<{ 
        success: boolean; 
        path?: string; 
        canceled?: boolean; 
        error?: string 
      }>;
      openFileDialog: () => Promise<{ 
        success: boolean; 
        dataUrl?: string; 
        canceled?: boolean; 
        error?: string 
      }>;
    };
  }
}