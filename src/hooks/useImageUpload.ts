import { useRef, useCallback, useState, useEffect } from 'react';

interface UseImageUploadOptions {
  onImageSelect?: (dataUrl: string) => void;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const { onImageSelect } = options;
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImage(dataUrl);
      onImageSelect?.(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  const handleElectronFileDialog = useCallback(async () => {
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.openFileDialog();
        if (res.success && res.dataUrl) {
          setImage(res.dataUrl);
          onImageSelect?.(res.dataUrl);
        }
      } catch (err) {
        console.error('File dialog error:', err);
      }
    }
  }, [onImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleFileUpload(file);
        }
        break;
      }
    }
  }, [handleFileUpload]);

  const clearImage = useCallback(() => {
    setImage(null);
  }, []);

  const openFileDialog = useCallback(() => {
    if (window.electronAPI) {
      handleElectronFileDialog();
    } else {
      fileInputRef.current?.click();
    }
  }, [handleElectronFileDialog]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  return {
    image,
    setImage,
    isDragging,
    fileInputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleFileUpload,
    clearImage,
    openFileDialog,
  };
}
