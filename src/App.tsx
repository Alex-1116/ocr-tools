import { useState, useRef, useCallback, useEffect } from 'react'
import * as Tesseract from 'tesseract.js'
import ImageUploader from './components/ImageUploader'
import ResultPanel from './components/ResultPanel'
import LanguageSelector from './components/LanguageSelector'
import Settings from './components/Settings'
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
  const [showSettings, setShowSettings] = useState(false)
  const [currentShortcut, setCurrentShortcut] = useState('Ctrl/Cmd + Shift + A')
  const workerRef = useRef<Tesseract.Worker | null>(null)

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getSettings().then((settings) => {
        const shortcutDisplay = settings.shortcut
          .replace('CommandOrControl', 'Ctrl/Cmd')
          .replace(/\+/g, ' + ')
        setCurrentShortcut(shortcutDisplay)
      })

      window.electronAPI.onScreenshotCaptured((imageData: string) => {
        setImage(imageData)
        setResult('')
        setError('')
        setSuccess('')
        setProgress(0)
      })

      window.electronAPI.onSettingsChanged((settings) => {
        const shortcutDisplay = settings.shortcut
          .replace('CommandOrControl', 'Ctrl/Cmd')
          .replace(/\+/g, ' + ')
        setCurrentShortcut(shortcutDisplay)
      })
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeScreenshotCapturedListener()
        window.electronAPI.removeSettingsChangedListener()
      }
    }
  }, [])

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

      const result = await worker.recognize(image)
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
          <span className="shortcut-hint">截图快捷键: {currentShortcut}</span>
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

      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}

export default App
