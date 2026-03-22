import { useState, useRef, useCallback, useEffect } from 'react'
import * as Tesseract from 'tesseract.js'
import ImageUploader from './components/ImageUploader'
import ResultPanel from './components/ResultPanel'
import LanguageSelector from './components/LanguageSelector'
import './App.css'

export type Language = 'chi_sim' | 'chi_tra' | 'eng' | 'jpn' | 'kor' | 'chi_sim+eng'

export interface LanguageOption {
  value: Language
  label: string
}

export const LANGUAGES: LanguageOption[] = [
  { value: 'chi_sim', label: '中文简体' },
  { value: 'chi_tra', label: '中文繁体' },
  { value: 'eng', label: '英文' },
  { value: 'jpn', label: '日文' },
  { value: 'kor', label: '韩文' },
  { value: 'chi_sim+eng', label: '中英混合' },
]

function App() {
  const [image, setImage] = useState<string | null>(null)
  const [result, setResult] = useState('')
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('chi_sim')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const workerRef = useRef<Tesseract.Worker | null>(null)

  // 处理截图
  const handleScreenshot = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.startScreenshot()
    }
  }, [])

  // 处理图片选中（包括截图）
  const handleImageSelected = useCallback((imageData: string) => {
    setImage(imageData)
    setResult('')
    setError('')
    setSuccess('')
    setProgress(0)
  }, [])

  // 监听截图捕获事件
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onScreenshotCaptured((imageData: string) => {
        handleImageSelected(imageData)
        // 自动开始识别
        setTimeout(() => {
          // 可以选择自动识别或者让用户点击
        }, 100)
      })
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeScreenshotListener()
      }
    }
  }, [handleImageSelected])

  const handleRecognize = useCallback(async () => {
    if (!image) {
      setError('请先选择图片')
      return
    }

    setIsRecognizing(true)
    setError('')
    setSuccess('')
    setProgress(0)

    try {
      // 创建 worker 并配置选项
      const worker = await Tesseract.createWorker(
        selectedLanguage,
        1, // LSTM_ONLY mode for better accuracy
        {
          logger: (m: Tesseract.LoggerMessage) => {
            console.log('Tesseract:', m.status, m.progress)
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100))
            } else if (m.status === 'loading language traineddata') {
              setProgress(Math.round(m.progress * 30)) // 语言包加载占 30%
            } else if (m.status === 'initializing api') {
              setProgress(30 + Math.round(m.progress * 10)) // 初始化占 10%
            }
          },
          errorHandler: (err: Error) => {
            console.error('Tesseract Error:', err)
            setError(`识别错误: ${err.message}`)
          }
        }
      )
      workerRef.current = worker

      // 执行识别
      const result = await worker.recognize(image)
      const text = result.data.text

      // 终止 worker
      await worker.terminate()
      workerRef.current = null

      if (!text || text.trim().length === 0) {
        setError('未识别到文字，请尝试更换图片或语言')
        setResult('')
      } else {
        setResult(text.trim())
      }
      setProgress(100)
    } catch (err) {
      console.error('OCR 识别失败:', err)
      const errorMessage = err instanceof Error ? err.message : '未知错误'
      setError(`识别失败: ${errorMessage}`)
      setProgress(0)
    } finally {
      setIsRecognizing(false)
    }
  }, [image, selectedLanguage])

  const handleCancel = useCallback(async () => {
    if (workerRef.current) {
      await workerRef.current.terminate()
      workerRef.current = null
    }
    setIsRecognizing(false)
    setProgress(0)
  }, [])

  const handleCopy = useCallback(async () => {
    if (result && window.electronAPI) {
      try {
        await window.electronAPI.copyToClipboard(result)
        setSuccess('已复制到剪贴板')
        setTimeout(() => setSuccess(''), 2000)
      } catch (err) {
        console.error('复制失败:', err)
        setError('复制失败')
      }
    }
  }, [result])

  const handleSave = useCallback(async () => {
    if (result && window.electronAPI) {
      try {
        const saved = await window.electronAPI.saveToFile(result)
        if (saved) {
          setSuccess('保存成功')
          setTimeout(() => setSuccess(''), 2000)
        }
      } catch (err) {
        console.error('保存失败:', err)
        setError('保存失败')
      }
    }
  }, [result])

  const handleClear = useCallback(() => {
    setImage(null)
    setResult('')
    setError('')
    setSuccess('')
    setProgress(0)
  }, [])

  // 保存截图到本地
  const handleSaveScreenshot = useCallback(async () => {
    if (image && window.electronAPI) {
      try {
        const now = new Date()
        const fileName = `ocr-screenshot-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.png`
        
        const saved = await window.electronAPI.saveScreenshot(image, fileName)
        if (saved) {
          setSuccess('截图已保存')
          setTimeout(() => setSuccess(''), 2000)
        }
      } catch (err) {
        console.error('保存截图失败:', err)
        setError('保存截图失败')
      }
    }
  }, [image])

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="9" x2="15" y2="9"/>
            <line x1="9" y1="12" x2="15" y2="12"/>
            <line x1="9" y1="15" x2="11" y2="15"/>
          </svg>
          <h1>OCR Tools</h1>
        </div>
        <p className="subtitle">轻量级图片文字识别工具</p>
      </header>

      <main className="app-main">
        <div className="left-panel">
          <LanguageSelector
            languages={LANGUAGES}
            selected={selectedLanguage}
            onChange={setSelectedLanguage}
            disabled={isRecognizing}
          />
          <ImageUploader
            image={image}
            onImageSelected={handleImageSelected}
            isRecognizing={isRecognizing}
            onScreenshot={handleScreenshot}
          />
        </div>

        <div className="right-panel">
          <ResultPanel
            result={result}
            isRecognizing={isRecognizing}
            progress={progress}
            error={error}
            success={success}
            hasImage={!!image}
            onRecognize={handleRecognize}
            onCancel={handleCancel}
            onCopy={handleCopy}
            onSave={handleSave}
            onClear={handleClear}
            onChange={setResult}
            onSaveScreenshot={handleSaveScreenshot}
          />
        </div>
      </main>
    </div>
  )
}

export default App
