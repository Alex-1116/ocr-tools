import { useState, useRef, useEffect, useCallback } from 'react'
import './ScreenshotOverlay.css'

interface Selection {
  startX: number
  startY: number
  endX: number
  endY: number
}

function ScreenshotOverlay() {
  const [isSelecting, setIsSelecting] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [screenImage, setScreenImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const selectionRef = useRef<Selection | null>(null)
  const isCancelledRef = useRef(false)

  // 获取屏幕截图
  useEffect(() => {
    const captureScreen = async () => {
      try {
        if (window.electronAPI) {
          const imageData = await window.electronAPI.captureScreen()
          if (imageData) {
            setScreenImage(imageData)
          }
        }
      } catch (error) {
        console.error('获取屏幕截图失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    captureScreen()
  }, [])

  // 关闭窗口的函数
  const closeWindow = useCallback(async () => {
    if (isCancelledRef.current) return
    isCancelledRef.current = true
    
    if (window.electronAPI) {
      await window.electronAPI.closeScreenshotWindow()
    }
  }, [])

  // 处理鼠标按下
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return // 只处理左键

    const startX = e.clientX
    const startY = e.clientY

    selectionRef.current = {
      startX,
      startY,
      endX: startX,
      endY: startY
    }

    setIsSelecting(true)
    setSelection(selectionRef.current)
  }, [])

  // 处理鼠标移动
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting || !selectionRef.current) return

    selectionRef.current = {
      ...selectionRef.current,
      endX: e.clientX,
      endY: e.clientY
    }

    setSelection({ ...selectionRef.current })
  }, [isSelecting])

  // 裁剪图片
  const cropImage = useCallback(async (selectionData: Selection) => {
    if (!screenImage || isCancelledRef.current) return

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.src = screenImage
    })

    // 计算裁剪区域
    const x = Math.min(selectionData.startX, selectionData.endX)
    const y = Math.min(selectionData.startY, selectionData.endY)
    const width = Math.abs(selectionData.endX - selectionData.startX)
    const height = Math.abs(selectionData.endY - selectionData.startY)

    if (width < 10 || height < 10) {
      // 选区太小，取消截图
      await closeWindow()
      return
    }

    // 设置画布尺寸
    canvas.width = width
    canvas.height = height

    // 绘制裁剪区域
    ctx.drawImage(img, x, y, width, height, 0, 0, width, height)

    // 获取裁剪后的图片数据
    const croppedImageData = canvas.toDataURL('image/png')

    // 发送裁剪后的图片到主窗口
    if (window.electronAPI && !isCancelledRef.current) {
      await window.electronAPI.sendCroppedImage(croppedImageData)
    }
  }, [screenImage, closeWindow])

  // 处理鼠标松开
  const handleMouseUp = useCallback(async () => {
    if (!isSelecting || !selectionRef.current) return

    setIsSelecting(false)
    const finalSelection = selectionRef.current
    selectionRef.current = null
    setSelection(null)

    // 执行裁剪
    await cropImage(finalSelection)
  }, [isSelecting, cropImage])

  // 处理键盘事件 - 使用 window 监听
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        await closeWindow()
      }
    }

    // 捕获阶段监听，确保能拦截到 ESC
    window.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('keydown', handleKeyDown, true)
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [closeWindow])

  // 计算选区样式
  const getSelectionStyle = () => {
    if (!selection) return {}

    const left = Math.min(selection.startX, selection.endX)
    const top = Math.min(selection.startY, selection.endY)
    const width = Math.abs(selection.endX - selection.startX)
    const height = Math.abs(selection.endY - selection.startY)

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    }
  }

  // 计算选区信息
  const getSelectionInfo = () => {
    if (!selection) return null

    const width = Math.abs(selection.endX - selection.startX)
    const height = Math.abs(selection.endY - selection.startY)

    return { width, height }
  }

  const selectionInfo = getSelectionInfo()

  return (
    <div
      ref={containerRef}
      className="screenshot-overlay"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 背景遮罩 */}
      <div className="screenshot-mask" />

      {/* 屏幕截图背景 */}
      {screenImage && (
        <img
          src={screenImage}
          alt="screen"
          className="screenshot-background"
          draggable={false}
        />
      )}

      {/* 选区高亮 */}
      {selection && (
        <div
          className="screenshot-selection"
          style={getSelectionStyle()}
        >
          {/* 选区边框 */}
          <div className="selection-border" />

          {/* 尺寸信息 */}
          {selectionInfo && selectionInfo.width > 20 && selectionInfo.height > 20 && (
            <div className="selection-info">
              {selectionInfo.width} × {selectionInfo.height}
            </div>
          )}

          {/* 四角标记 */}
          <div className="corner corner-tl" />
          <div className="corner corner-tr" />
          <div className="corner corner-bl" />
          <div className="corner corner-br" />
        </div>
      )}

      {/* 提示信息 */}
      <div className="screenshot-hint">
        <div className="hint-content">
          <div className="hint-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
              <line x1="15" y1="3" x2="15" y2="21"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="3" y1="15" x2="21" y2="15"/>
            </svg>
          </div>
          <div className="hint-text">
            <p>拖拽鼠标选择识别区域</p>
            <p className="hint-sub">按 ESC 取消截图</p>
          </div>
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="screenshot-loading">
          <div className="loading-spinner" />
          <p>正在准备截图...</p>
        </div>
      )}
    </div>
  )
}

export default ScreenshotOverlay
