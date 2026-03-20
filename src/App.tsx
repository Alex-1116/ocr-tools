import { useState, useCallback, useEffect, useRef } from 'react';
import Tesseract from 'tesseract.js';

type Language = 'chi_sim' | 'chi_tra' | 'eng' | 'jpn' | 'kor' | 'chi_sim+eng';

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'chi_sim', label: '中文简体' },
  { value: 'chi_tra', label: '中文繁体' },
  { value: 'eng', label: '英文' },
  { value: 'jpn', label: '日文' },
  { value: 'kor', label: '韩文' },
  { value: 'chi_sim+eng', label: '中英混合' },
];

function App() {
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [language, setLanguage] = useState<Language>('chi_sim');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);

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
      const result = await Tesseract.recognize(image, language, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      setResult(result.data.text);
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
    <div className="min-h-screen bg-background text-text">
      <div className="max-w-6xl mx-auto p-6">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">OCR 文字识别工具</h1>
          <p className="text-text-muted">上传图片或截图，快速提取文字</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">图片输入</h2>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">选择语言</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="w-full p-3 border border-border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              onClick={() => {
                if (window.electronAPI) {
                  handleElectronFileDialog();
                } else {
                  fileInputRef.current?.click();
                }
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary hover:bg-primary/5'
              }`}
            >
              {image ? (
                <div className="relative">
                  <img
                    src={image}
                    alt="Uploaded"
                    className="max-w-full max-h-64 mx-auto rounded-lg object-contain"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setImage(null);
                      setResult('');
                    }}
                    className="absolute top-2 right-2 bg-error text-white px-3 py-1 rounded-full text-sm hover:bg-red-600 transition-colors"
                  >
                    移除
                  </button>
                </div>
              ) : (
                <div>
                  <div className="text-5xl mb-4">📷</div>
                  <p className="text-lg mb-2">点击上传或拖拽图片到此处</p>
                  <p className="text-sm text-text-muted">支持 PNG、JPG、JPEG、BMP 格式</p>
                  <p className="text-sm text-text-muted mt-2">或使用 Ctrl+V 粘贴图片</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpg,image/jpeg,image/bmp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
              />
            </div>

            <button
              onClick={recognizeText}
              disabled={!image || isProcessing}
              className={`w-full mt-4 py-3 rounded-lg font-semibold transition-all ${
                !image || isProcessing
                  ? 'bg-secondary text-white cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {isProcessing ? `识别中... ${progress}%` : '一键识别'}
            </button>

            {isProcessing && (
              <div className="mt-4">
                <div className="w-full bg-border rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-center text-sm text-text-muted mt-2">正在识别，请稍候...</p>
              </div>
            )}
          </div>

          <div className="bg-surface rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">识别结果</h2>
              <div className="flex gap-2">
                <button
                  onClick={copyResult}
                  disabled={!result}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:bg-secondary disabled:cursor-not-allowed transition-colors text-sm"
                >
                  复制
                </button>
                <button
                  onClick={saveToFile}
                  disabled={!result}
                  className="px-4 py-2 bg-success text-white rounded-lg hover:bg-green-600 disabled:bg-secondary disabled:cursor-not-allowed transition-colors text-sm"
                >
                  保存
                </button>
                <button
                  onClick={clearAll}
                  className="px-4 py-2 bg-error text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                >
                  清空
                </button>
              </div>
            </div>

            <textarea
              ref={resultRef}
              value={result}
              onChange={(e) => setResult(e.target.value)}
              placeholder="识别结果将显示在这里..."
              className="w-full h-80 p-4 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-surface"
            />

            <div className="mt-4 flex justify-between items-center text-sm text-text-muted">
              <span>字符数: {result.length}</span>
              <span>行数: {result ? result.split('\n').filter(line => line.trim()).length : 0}</span>
            </div>
          </div>
        </div>

        <footer className="mt-8 text-center text-text-muted text-sm">
          <p>支持多语言识别 | 快速提取文字 | 一键复制导出</p>
        </footer>
      </div>
    </div>
  );
}

export default App;