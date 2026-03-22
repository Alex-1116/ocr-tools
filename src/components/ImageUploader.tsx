import { useState, useRef, useCallback, useEffect } from 'react'
import './ImageUploader.css'

interface ImageUploaderProps {
  image: string | null
  onImageSelected: (imageData: string) => void
  isRecognizing: boolean
  onScreenshot?: () => void
}

function ImageUploader({ image, onImageSelected, isRecognizing, onScreenshot }: ImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      onImageSelected(result)
    }
    reader.readAsDataURL(file)
  }, [onImageSelected])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (isRecognizing) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect, isRecognizing])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!isRecognizing) {
      setIsDragOver(true)
    }
  }, [isRecognizing])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleClick = useCallback(() => {
    if (!isRecognizing) {
      fileInputRef.current?.click()
    }
  }, [isRecognizing])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleScreenshotClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isRecognizing && onScreenshot) {
      onScreenshot()
    }
  }, [isRecognizing, onScreenshot])

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (isRecognizing) return

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            handleFileSelect(file)
          }
          return
        }
      }

      try {
        if (window.electronAPI) {
          const imageData = await window.electronAPI.getClipboardImage()
          if (imageData) {
            onImageSelected(imageData)
          }
        }
      } catch (err) {
        console.error('获取剪贴板图片失败:', err)
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handleFileSelect, onImageSelected, isRecognizing])

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'o') {
        e.preventDefault()
        if (isRecognizing || !window.electronAPI) return

        const filePath = await window.electronAPI.selectImage()
        if (filePath) {
          const imageData = await window.electronAPI.readImageFile(filePath)
          if (imageData) {
            onImageSelected(`data:image/png;base64,${imageData}`)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onImageSelected, isRecognizing])

  return (
    <div className="image-uploader">
      <div className="uploader-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        <h3>图片输入</h3>
      </div>

      <div
        className={`drop-zone ${isDragOver ? 'drag-over' : ''} ${image ? 'has-image' : ''} ${isRecognizing ? 'disabled' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        {image ? (
          <div className="image-preview">
            <img src={image} alt="预览" />
            <button
              className="change-image-btn"
              onClick={(e) => {
                e.stopPropagation()
                handleClick()
              }}
              disabled={isRecognizing}
            >
              更换图片
            </button>
          </div>
        ) : (
          <>
            <svg className="drop-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p className="drop-text">点击或拖拽图片到此处</p>
            <p className="drop-hint">支持 PNG、JPG、JPEG、BMP 格式</p>
            <p className="drop-hint">Ctrl+O 打开文件选择器 | Ctrl+V 粘贴图片</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          className="file-input"
          accept="image/png,image/jpeg,image/jpg,image/bmp,image/webp"
          onChange={handleFileInputChange}
        />
      </div>

      {onScreenshot && (
        <button
          className="screenshot-btn"
          onClick={handleScreenshotClick}
          disabled={isRecognizing}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
          截图识别
        </button>
      )}
    </div>
  )
}

export default ImageUploader
