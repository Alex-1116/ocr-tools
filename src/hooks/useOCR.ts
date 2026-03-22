import { useState, useCallback, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import { Language } from '../types';

export function useOCR() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [language, setLanguage] = useState<Language>('chi_sim');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const workerRef = useRef<any>(null);

  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      setResult('');
      setProgress(0);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleElectronFileDialog = async () => {
    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.openFileDialog();
        if (res.success && res.dataUrl) {
          setImage(res.dataUrl);
          setResult('');
          setProgress(0);
        }
      } catch (err) {
        console.error('File dialog error:', err);
      }
    }
  };

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

  // CDN 备选列表
  const CDN_LIST = [
    {
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.1.1/dist/worker.min.js',
      langPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v5.1.1/lang',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5.1.0/tesseract-core.wasm.js',
    },
    {
      workerPath: 'https://unpkg.com/tesseract.js@v5.1.1/dist/worker.min.js',
      langPath: 'https://unpkg.com/tesseract.js@v5.1.1/lang',
      corePath: 'https://unpkg.com/tesseract.js-core@v5.1.0/tesseract-core.wasm.js',
    },
    {
      workerPath: 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/worker.min.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      corePath: 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js-core/5.1.0/tesseract-core.wasm.js',
    },
  ];

  const recognizeText = async () => {
    if (!image) return;

    setIsProcessing(true);
    setProgress(0);
    setResult('');
    setErrorMessage('');

    const createWorkerWithRetry = async (cdnIndex = 0): Promise<any> => {
      if (cdnIndex >= CDN_LIST.length) {
        throw new Error('所有CDN源都无法访问');
      }

      const cdn = CDN_LIST[cdnIndex];
      console.log(`尝试使用 CDN ${cdnIndex + 1}:`, cdn.workerPath);

      try {
        const worker = await createWorker(language, 1, {
          workerPath: cdn.workerPath,
          langPath: cdn.langPath,
          corePath: cdn.corePath,
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100));
            }
          },
        });
        return worker;
      } catch (error: any) {
        console.warn(`CDN ${cdnIndex + 1} 失败:`, error.message);
        // 尝试下一个 CDN
        return createWorkerWithRetry(cdnIndex + 1);
      }
    };

    try {
      console.log('开始初始化 OCR worker...');
      const worker = await createWorkerWithRetry();
      
      workerRef.current = worker;
      
      console.log('加载语言数据...');
      await worker.loadLanguage(language);
      
      console.log('初始化 OCR 引擎...');
      await worker.initialize(language);
      
      console.log('开始识别图片...');
      const result = await worker.recognize(image);
      
      setResult(result.data.text);
      console.log('识别完成');
      
      await worker.terminate();
      workerRef.current = null;
    } catch (error: any) {
      console.error('OCR Error:', error);
      
      let errorMsg = '识别失败，请重试';
      
      if (error.message?.includes('importScripts') || error.message?.includes('network') || error.message?.includes('load') || error.message?.includes('CDN')) {
        errorMsg = '网络连接问题，无法加载识别引擎。请检查网络连接或使用VPN后重试。';
      } else if (error.message?.includes('language')) {
        errorMsg = '语言数据加载失败，请尝试选择其他语言。';
      }
      
      setErrorMessage(errorMsg);
      alert(errorMsg);
      
      if (workerRef.current) {
        try {
          await workerRef.current.terminate();
        } catch (e) {
          console.error('Terminate error:', e);
        }
        workerRef.current = null;
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const copyResult = async () => {
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(result);
      alert('已复制到剪贴板');
    } catch (error) {
      console.error('Copy Error:', error);
      alert('复制失败，请重试');
    }
  };

  const saveToFile = async () => {
    if (!result) return;

    if (window.electronAPI) {
      try {
        const res = await window.electronAPI.saveFile(result);
        if (res.success) {
          alert('文件保存成功');
        }
      } catch (err) {
        console.error('Save file error:', err);
        alert('保存失败，请重试');
      }
    } else {
      const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ocr-result-${Date.now()}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const clearAll = () => {
    setImage(null);
    setResult('');
    setProgress(0);
  };

  const removeImage = () => {
    setImage(null);
    setResult('');
  };

  return {
    image,
    result,
    isProcessing,
    progress,
    language,
    isDragging,
    errorMessage,
    setLanguage,
    setResult,
    handleFileUpload,
    handleElectronFileDialog,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    recognizeText,
    copyResult,
    saveToFile,
    clearAll,
    removeImage,
  };
}
