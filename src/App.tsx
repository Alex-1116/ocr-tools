import { useState, useRef, useCallback, useEffect } from 'react'
import * as Tesseract from 'tesseract.js'
import ImageUploader from './components/ImageUploader'
import ResultPanel from './components/ResultPanel'
import LanguageSelector from './components/LanguageSelector'
import { Language, LANGUAGES } from './constants/languages'
import './App.css'

function App() {
  const [image, setImage] = useState<string | null>(null)
  const [result, setResult] = useState('')
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('chi_sim')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [screenshotShortcut, setScreenshotShortcut] = useState('Ctrl+Shift+A')
  const workerRef = useRef<Tesseract.Worker | null>(null)

  const handleImageSelected = useCallback((imageData: string) => {
    setImage(imageData)
    setResult('')
    setError('')
    setSuccess('')
    setProgress(0)
  }, [])

  const handleRecognize = useCallback(async (imageData?: string) => {
    const imageToRecognize = imageData || image
    if (!imageToRecognize) {
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

      const result = await worker.recognize(imageToRecognize)
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

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getScreenshotShortcut().then((shortcut) => {
        const displayShortcut = shortcut
          .replace('CommandOrControl', 'Ctrl')
          .replace(/\+/g, '+')
        setScreenshotShortcut(displayShortcut)
      })

      const onScreenshotImage = (imageData: string) => {
        handleImageSelected(imageData)
        setTimeout(() => {
          handleRecognize(imageData)
        }, 100)
      }

      window.electronAPI.onScreenshotImage(onScreenshotImage)

      return () => {
        window.electronAPI.removeScreenshotListener()
      }
    }
  }, [handleImageSelected, handleRecognize])

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

  const handleScreenshot = useCallback(async () => {
    if (window.electronAPI) {
      await window.electronAPI.startScreenshot()
    }
  }, [])

  const handleSaveScreenshot = useCallback(async () => {
    if (image && window.electronAPI) {
      try {
        const savedPath = await window.electronAPI.saveScreenshot(image)
        if (savedPath) {
          setSuccess(`截图已保存: ${savedPath}`)
          setTimeout(() => setSuccess(''), 3000)
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
        <p className="shortcut-hint">截图快捷键: {screenshotShortcut}</p>
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
          {image && (
            <button
              className="save-screenshot-btn"
              onClick={handleSaveScreenshot}
              disabled={isRecognizing}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              保存截图
            </button>
          )}
        </div>

        <div className="right-panel">
          <ResultPanel
            result={result}
            isRecognizing={isRecognizing}
            progress={progress}
            error={error}
            success={success}
            hasImage={!!image}
            onRecognize={() => handleRecognize()}
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
