import { useState, useCallback } from 'react'
import OcrEngine from '../utils/ocr'
import ImageUploader from './components/ImageUploader'
import LanguageSelector from './components/LanguageSelector'
import ResultDisplay from './components/ResultDisplay'
import ProgressBar from './components/ProgressBar'

export interface Language {
  code: string
  name: string
}

const languages: Language[] = [
  { code: 'chi_sim', name: '中文简体' },
  { code: 'chi_tra', name: '中文繁体' },
  { code: 'eng', name: '英文' },
  { code: 'jpn', name: '日文' },
  { code: 'kor', name: '韩文' },
  { code: 'chi_sim+eng', name: '中英混合' }
]

function App() {
  const [image, setImage] = useState<string | null>(null)
  const [result, setResult] = useState<string>('')
  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<string>('')
  const [language, setLanguage] = useState<string>('chi_sim')
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const handleImageSelect = useCallback((imageData: string) => {
    setImage(imageData)
    setResult('')
    setProgress(0)
    setStatus('')
  }, [])

  const handleRecognize = useCallback(async () => {
    if (!image) return

    setIsProcessing(true)
    setProgress(0)
    setStatus('正在初始化...')

    try {
      const text = await OcrEngine.recognize(image, language, (p, s) => {
        setProgress(p)
        setStatus(s)
      })
      setResult(text)
      setStatus('识别完成')
    } catch (error) {
      setStatus('识别失败: ' + (error as Error).message)
    } finally {
      setIsProcessing(false)
    }
  }, [image, language])

  const handleCopy = useCallback(async () => {
    if (result) {
      await navigator.clipboard.writeText(result)
      setStatus('已复制到剪贴板')
    }
  }, [result])

  const handleSave = useCallback(async () => {
    if (result && window.electronAPI) {
      const res = await window.electronAPI.saveFile(result)
      if (res.success) {
        setStatus('文件已保存')
      }
    }
  }, [result])

  const handleClear = useCallback(() => {
    setImage(null)
    setResult('')
    setProgress(0)
    setStatus('')
  }, [])

  return (
    <div className="app">
      <header className="header">
        <h1>OCR 文字识别工具</h1>
      </header>

      <main className="main">
        <div className="control-panel">
          <LanguageSelector
            languages={languages}
            selected={language}
            onChange={setLanguage}
            disabled={isProcessing}
          />
          <div className="button-group">
            <button
              className="btn btn-primary"
              onClick={handleRecognize}
              disabled={!image || isProcessing}
            >
              {isProcessing ? '识别中...' : '开始识别'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleCopy}
              disabled={!result}
            >
              复制结果
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleSave}
              disabled={!result}
            >
              保存文件
            </button>
            <button
              className="btn btn-danger"
              onClick={handleClear}
              disabled={isProcessing}
            >
              清空
            </button>
          </div>
        </div>

        {isProcessing && <ProgressBar progress={progress} status={status} />}

        <div className="content-area">
          <ImageUploader
            image={image}
            onImageSelect={handleImageSelect}
            disabled={isProcessing}
          />
          <ResultDisplay result={result} onChange={setResult} />
        </div>
      </main>

      <footer className="footer">
        <p>基于 Tesseract.js | 支持多语言OCR识别</p>
      </footer>
    </div>
  )
}

export default App
