import { useState, useCallback } from 'react';
import {
  LanguageSelector,
  ImageUploader,
  RecognitionResult,
  ProgressBar,
  RecognizeButton,
} from './components';
import { useImageUpload, useOCR } from './hooks';
import { Language } from './types';

function App() {
  const [language, setLanguage] = useState<Language>('chi_sim');
  const [result, setResult] = useState<string>('');

  const {
    image,
    isDragging,
    fileInputRef,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleFileUpload,
    clearImage,
    openFileDialog,
  } = useImageUpload();

  const { isProcessing, progress, recognizeText } = useOCR({
    language,
    onSuccess: (text) => setResult(text),
    onError: (error) => {
      console.error('OCR Error:', error);
      alert('识别失败，请重试');
    },
  });

  const handleRecognize = useCallback(async () => {
    if (!image) return;
    await recognizeText(image);
  }, [image, recognizeText]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(result);
      alert('已复制到剪贴板');
    } catch (error) {
      console.error('Copy Error:', error);
      alert('复制失败，请重试');
    }
  }, [result]);

  const handleSave = useCallback(async () => {
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
  }, [result]);

  const handleClearAll = useCallback(() => {
    clearImage();
    setResult('');
  }, [clearImage]);

  const handleClearImage = useCallback(() => {
    clearImage();
    setResult('');
  }, [clearImage]);

  return (
    <div className="min-h-screen bg-background text-text">
      <div className="max-w-6xl mx-auto p-6">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">OCR 文字识别工具</h1>
          <p className="text-text-muted">上传图片或截图，快速提取文字</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">图片输入</h2>
            
            <LanguageSelector value={language} onChange={setLanguage} />

            <ImageUploader
              image={image}
              isDragging={isDragging}
              fileInputRef={fileInputRef}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onFileSelect={handleFileUpload}
              onClear={handleClearImage}
              onClick={openFileDialog}
            />

            <RecognizeButton
              onClick={handleRecognize}
              disabled={!image || isProcessing}
              isProcessing={isProcessing}
              progress={progress}
            />

            {isProcessing && <ProgressBar progress={progress} />}
          </div>

          <RecognitionResult
            result={result}
            onChange={setResult}
            onCopy={handleCopy}
            onSave={handleSave}
            onClear={handleClearAll}
          />
        </div>

        <footer className="mt-8 text-center text-text-muted text-sm">
          <p>支持多语言识别 | 快速提取文字 | 一键复制导出</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
