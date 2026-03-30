import { useState, useRef, useCallback, useEffect } from 'react'
import * as Tesseract from 'tesseract.js'
import ImageUploader from './components/ImageUploader'
import ResultPanel from './components/ResultPanel'
import LanguageSelector from './components/LanguageSelector'
import ScreenshotSelector from './components/ScreenshotSelector'
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

interface Settings {
  shortcut: string
  autoSaveScreenshot: boolean
  savePath: string
}

function App() {
  const [image, setImage] = useState<string | null>(null)
  const [result, setResult] = useState('')
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('chi_sim')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isScreenshotMode, setIsScreenshotMode] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    shortcut: 'Ctrl+Shift+A',
    autoSaveScreenshot: false,
    savePath: ''
  })
  const workerRef = useRef<Tesseract.Worker | null>(null)

  // 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      if ((window as any).electronAPI) {
        const savedSettings = await (window as any).electronAPI.getSettings()
        if (savedSettings) {
          setSettings(savedSettings)
        }
      }
    }
    loadSettings()
  }, [])

  // 检查是否为截图模式
  useEffect(() => {
    const checkScreenshotMode = () => {
      const hash = window.location.hash
      setIsScreenshotMode(hash === '#/screenshot')
    }

    checkScreenshotMode()
    window.addEventListener('hashchange', checkScreenshotMode)
    return () => window.removeEventListener('hashchange', checkScreenshotMode)
  }, [])

  // 监听截图完成事件
  useEffect(() => {
    if (!(window as any).electronAPI) return

    const handleScreenshotImage = (imageData: string) => {
      setImage(imageData)
      setResult('')
      setError('')
      setSuccess('')
      setProgress(0)
      
      // 自动开始识别
      setTimeout(() => {
        handleRecognizeWithImage(imageData)
      }, 100)
    }

    ;(window as any).electronAPI.onScreenshotImage(handleScreenshotImage)
    return () => {
      ;(window as any).electronAPI?.removeAllListeners('screenshot-image')
    }
  }, [])

  // 监听打开设置事件
  useEffect(() => {
    if (!(window as any).electronAPI) return

    const handleOpenSettings = () => {
      setShowSettings(true)
    }

    ;(window as any).electronAPI.onOpenSettings(handleOpenSettings)
    return () => {
      ;(window as any).electronAPI?.removeAllListeners('open-settings')
    }
  }, [])

  const handleImageSelected = useCallback((imageData: string) => {
    setImage(imageData)
    setResult('')
    setError('')
    setSuccess('')
    setProgress(0)
  }, [])

  // 截图按钮点击
  const handleScreenshot = useCallback(() => {
    // 通知主进程开始截图
    ;(window as any).electronAPI?.screenshotCancel()
    setTimeout(() => {
      window.location.href = '#/screenshot'
    }, 100)
  }, [])

  // 保存设置
  const handleSaveSettings = useCallback(async (newSettings: Settings) => {
    if ((window as any).electronAPI) {
      await (window as any).electronAPI.updateSettings(newSettings)
      setSettings(newSettings)
      setShowSettings(false)
      setSuccess('设置已保存')
      setTimeout(() => setSuccess(''), 2000)
    }
  }, [])

  // 使用指定图片进行识别
  const handleRecognizeWithImage = useCallback(async (imageData: string) => {
    setIsRecognizing(true)
    setError('')
    setSuccess('')
    setProgress(0)

    try {
      const worker = await Tesseract.createWorker(
        selectedLanguage,
        1,
        {
          logger: (m: Tesseract.LoggerMessage) => {
            console.log('Tesseract:', m.status, m.progress)
            if (m.status === 'recognizing text') {
              setProgress(Math.round(m.progress * 100))
            } else if (m.status === 'loading language traineddata') {
              setProgress(Math.round(m.progress * 30))
            } else if (m.status === 'initializing api') {
              setProgress(30 + Math.round(m.progress * 10))
            }
          },
          errorHandler: (err: Error) => {
            console.error('Tesseract Error:', err)
            setError(`识别错误: ${err.message}`)
          }
        }
      )
      workerRef.current = worker

      const result = await worker.recognize(imageData)
      const text = result.data.text

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
  }, [selectedLanguage])

  const handleRecognize = useCallback(async () => {
    if (!image) {
      setError('请先选择图片')
      return
    }
    handleRecognizeWithImage(image)
  }, [image, handleRecognizeWithImage])

  const handleCancel = useCallback(async () => {
    if (workerRef.current) {
      await workerRef.current.terminate()
      workerRef.current = null
    }
    setIsRecognizing(false)
    setProgress(0)
  }, [])

  const handleCopy = useCallback(async () => {
    if (result && (window as any).electronAPI) {
      try {
        await (window as any).electronAPI.copyToClipboard(result)
        setSuccess('已复制到剪贴板')
        setTimeout(() => setSuccess(''), 2000)
      } catch (err) {
        console.error('复制失败:', err)
        setError('复制失败')
      }
    }
  }, [result])

  const handleSave = useCallback(async () => {
    if (result && (window as any).electronAPI) {
      try {
        const saved = await (window as any).electronAPI.saveToFile(result)
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

  // 截图模式
  if (isScreenshotMode) {
    return <ScreenshotSelector />
  }

  return (
    <div className="app">
      {/* 设置面板 */}
      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
          currentSettings={settings}
        />
      )}
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
        <button
          className="screenshot-btn"
          onClick={handleScreenshot}
          disabled={isRecognizing}
          title={`截图识别 (${settings.shortcut})`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          截图识别
        </button>
        <button
          className="settings-btn"
          onClick={() => setShowSettings(true)}
          title="设置"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
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
    </div>
  )
}

export default App
