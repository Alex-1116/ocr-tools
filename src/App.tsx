import { useState, useRef, useCallback, useEffect } from 'react'
import * as Tesseract from 'tesseract.js'
import ImageUploader from './components/ImageUploader'
import ResultPanel from './components/ResultPanel'
import LanguageSelector from './components/LanguageSelector'
import ScreenshotOverlay from './components/ScreenshotOverlay'
import SettingsPanel from './components/SettingsPanel'
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

// 判断是否为截图模式
const isScreenshotMode = window.location.hash === '#/screenshot'

function App() {
  const [image, setImage] = useState<string | null>(null)
  const [result, setResult] = useState('')
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('chi_sim')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoRecognize, setAutoRecognize] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const workerRef = useRef<Tesseract.Worker | null>(null)

  // 监听截图完成事件
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onScreenshotCaptured((imageData: string) => {
        handleImageSelected(imageData)
      })

      // 获取配置
      window.electronAPI.getScreenshotConfig().then(config => {
        setAutoRecognize(config.autoRecognize)
      })
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeScreenshotCapturedListener()
      }
    }
  }, [])

  // 自动识别（当图片改变且开启自动识别时）
  useEffect(() => {
    if (image && autoRecognize && !isRecognizing && !result) {
      handleRecognize()
    }
  }, [image, autoRecognize])

  const handleImageSelected = useCallback((imageData: string) => {
    setImage(imageData)
    setResult('')
    setError('')
    setSuccess('')
    setProgress(0)
  }, [])

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
    if (!result) {
      setError('没有可复制的内容')
      return
    }

    try {
      if (window.electronAPI) {
        const success = await window.electronAPI.copyToClipboard(result)
        if (success) {
          setSuccess('已复制到剪贴板')
          setTimeout(() => setSuccess(''), 2000)
        } else {
          setError('复制失败')
        }
      } else {
        // 降级方案：使用浏览器 API
        await navigator.clipboard.writeText(result)
        setSuccess('已复制到剪贴板')
        setTimeout(() => setSuccess(''), 2000)
      }
    } catch (err) {
      console.error('复制失败:', err)
      setError('复制失败')
    }
  }, [result])

  const handleSave = useCallback(async () => {
    if (!result) {
      setError('没有可保存的内容')
      return
    }

    try {
      if (window.electronAPI) {
        const saved = await window.electronAPI.saveToFile(result)
        if (saved) {
          setSuccess('保存成功')
          setTimeout(() => setSuccess(''), 2000)
        } else {
          setError('保存失败或已取消')
        }
      } else {
        // 降级方案：使用浏览器下载
        const blob = new Blob([result], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'ocr-result.txt'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        setSuccess('保存成功')
        setTimeout(() => setSuccess(''), 2000)
      }
    } catch (err) {
      console.error('保存失败:', err)
      setError('保存失败')
    }
  }, [result])

  const handleClear = useCallback(() => {
    setImage(null)
    setResult('')
    setError('')
    setSuccess('')
    setProgress(0)
  }, [])

  const handleScreenshot = useCallback(async () => {
    if (window.electronAPI) {
      try {
        await window.electronAPI.captureScreen()
      } catch (err) {
        console.error('截图失败:', err)
        setError('截图失败')
      }
    }
  }, [])

  const handleAutoRecognizeChange = useCallback(async (value: boolean) => {
    setAutoRecognize(value)
    if (window.electronAPI) {
      await window.electronAPI.saveScreenshotConfig({ autoRecognize: value })
    }
  }, [])

  // 截图模式直接返回遮罩层
  if (isScreenshotMode) {
    return <ScreenshotOverlay />
  }

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
        <div className="header-actions">
          <p className="subtitle">轻量级图片文字识别工具</p>
          <button 
            className="settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="设置"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
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
          />
          
          {/* 截图功能区域 */}
          <div className="screenshot-section">
            <h3>截图识别</h3>
            <div className="screenshot-actions">
              <button
                className="screenshot-btn"
                onClick={handleScreenshot}
                disabled={isRecognizing}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                  <line x1="15" y1="3" x2="15" y2="21"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="3" y1="15" x2="21" y2="15"/>
                </svg>
                <span>截图识别 (Ctrl+Shift+A)</span>
              </button>
            </div>
            <label className="auto-recognize-toggle">
              <input
                type="checkbox"
                checked={autoRecognize}
                onChange={(e) => handleAutoRecognizeChange(e.target.checked)}
              />
              <span>截图后自动识别</span>
            </label>
          </div>
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
          />
        </div>
      </main>

      {/* 设置面板 */}
      <SettingsPanel 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  )
}

export default App
