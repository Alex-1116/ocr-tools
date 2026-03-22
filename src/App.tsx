import { useState, useCallback, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import {
  Header,
  LanguageSelector,
  ImageUploader,
  RecognizeButton,
  ResultPanel,
  Footer,
} from './components';
import { Language } from './types';

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [language, setLanguage] = useState<Language>('chi_sim');
  const [isDragging, setIsDragging] = useState<boolean>(false);

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

  const handleDragStateChange = useCallback((dragging: boolean) => {
    setIsDragging(dragging);
  }, []);

  const handleImageRemove = useCallback(() => {
    setImage(null);
    setResult('');
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

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const recognizeText = async () => {
    if (!image) return;

    setIsProcessing(true);
    setProgress(0);
    setResult('');

    try {
      const recognizeResult = await Tesseract.recognize(image, language, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      setResult(recognizeResult.data.text);
    } catch (error) {
      console.error('OCR Error:', error);
      alert('识别失败，请重试');
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

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        <Header
          title="OCR 文字识别工具"
          subtitle="上传图片或截图，快速提取文字"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">图片输入</h2>

            <LanguageSelector value={language} onChange={setLanguage} />

            <ImageUploader
              image={image}
              isDragging={isDragging}
              onImageUpload={handleFileUpload}
              onImageRemove={handleImageRemove}
              onElectronFileDialog={handleElectronFileDialog}
              onDragStateChange={handleDragStateChange}
            />

            <RecognizeButton
              disabled={!image || isProcessing}
              isProcessing={isProcessing}
              progress={progress}
              onClick={recognizeText}
            />
          </div>

          <ResultPanel
            result={result}
            onResultChange={setResult}
            onCopy={copyResult}
            onSave={saveToFile}
            onClear={clearAll}
          />
        </div>

        <Footer text="支持多语言识别 | 快速提取文字 | 一键复制导出" />
      </div>
    </div>
  );
}

export default App;
