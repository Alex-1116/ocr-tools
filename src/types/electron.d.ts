type Language = 'chi_sim' | 'chi_tra' | 'eng' | 'jpn' | 'kor' | 'chi_sim+eng';

declare global {
  interface Window {
    electronAPI: {
      saveFile: (content: string) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
      openFileDialog: () => Promise<{ success: boolean; dataUrl?: string; canceled?: boolean; error?: string }>;
    };
  }
}

export {};
