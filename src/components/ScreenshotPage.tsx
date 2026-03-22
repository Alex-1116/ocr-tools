import { useState, useCallback, useEffect, useRef } from 'react'
import ScreenshotOverlay from './ScreenshotOverlay'
import './ScreenshotPage.css'

interface Selection {
  x: number
  y: number
  width: number
  height: number
}

export default function ScreenshotPage() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [, setSelection] = useState<Selection | null>(null)
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [result, setResult] = useState('')
  const [config, setConfig] = useState<{
    screenshotShortcut: string
    saveScreenshot: boolean
    screenshotSavePath: string
    autoRecognize: boolean
  } | null>(null)
  const configRef = useRef(config)

  // 同步 config 到 ref
  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    // 加载配置
    window.electronAPI.getConfig().then(setConfig)
  }, [])

  const handleRecognize = useCallback(async (imageData: string) => {
    setIsRecognizing(true)
    setResult('')

    try {
      // 使用 Tesseract.js 进行识别
      const Tesseract = await import('tesseract.js')
      const worker = await Tesseract.createWorker('chi_sim+eng')

      const recognizeResult = await worker.recognize(imageData)
      const text = recognizeResult.data.text

      await worker.terminate()

      const trimmedText = text.trim()
      setResult(trimmedText)

      // 自动识别模式下，识别完成后直接返回结果
      if (configRef.current?.autoRecognize !== false) {
        // 延迟一下让用户看到结果
        setTimeout(async () => {
          // 关闭截图窗口并显示主窗口
          await window.electronAPI.closeScreenshotWindow()
          await window.electronAPI.showMainWindow()
        }, 500)
      }
    } catch (error) {
      console.error('识别失败:', error)
      setResult('识别失败，请重试')
    } finally {
      setIsRecognizing(false)
    }
  }, [])

  const handleCapture = useCallback(async (imageData: string, sel: Selection) => {
    setCapturedImage(imageData)
    setSelection(sel)

    // 保存截图（如果配置允许）
    if (configRef.current?.saveScreenshot) {
      await window.electronAPI.saveScreenshot(imageData)
    }

    // 自动识别
    if (configRef.current?.autoRecognize !== false) {
      await handleRecognize(imageData)
    }
  }, [handleRecognize])

  const handleCancel = useCallback(async () => {
    await window.electronAPI.closeScreenshotWindow()
    await window.electronAPI.showMainWindow()
  }, [])

  const handleConfirm = useCallback(async () => {
    if (capturedImage) {
      // 关闭截图窗口并显示主窗口
      await window.electronAPI.closeScreenshotWindow()
      await window.electronAPI.showMainWindow()
    }
  }, [capturedImage])

  const handleRetry = useCallback(() => {
    setCapturedImage(null)
    setSelection(null)
    setResult('')
  }, [])

  // 如果已经截图，显示预览和结果
  if (capturedImage) {
    return (
      <div className="screenshot-preview">
        <div className="preview-header">
          <h3>截图预览</h3>
          <button className="close-btn" onClick={handleCancel}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="preview-content">
          <div className="image-preview">
            <img src={capturedImage} alt="截图" />
          </div>

          {isRecognizing ? (
            <div className="recognizing">
              <div className="spinner" />
              <p>正在识别文字...</p>
            </div>
          ) : (
            <div className="result-section">
              <h4>识别结果</h4>
              <textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                rows={6}
                placeholder="识别结果将显示在这里..."
              />
            </div>
          )}
        </div>

        <div className="preview-actions">
          <button className="btn-secondary" onClick={handleRetry}>
            重新截图
          </button>
          <button
            className="btn-primary"
            onClick={handleConfirm}
            disabled={isRecognizing}
          >
            确认并返回
          </button>
        </div>
      </div>
    )
  }

  // 显示截图遮罩
  return <ScreenshotOverlay onCapture={handleCapture} onCancel={handleCancel} />
}
