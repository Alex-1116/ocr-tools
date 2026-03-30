import { useState, useEffect, useRef, useCallback } from 'react'
import './ScreenshotSelector.css'

interface Selection {
  x: number
  y: number
  width: number
  height: number
}

type ResizeDirection = 'move' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top' | 'bottom' | 'left' | 'right' | null

function ScreenshotSelector() {
  const [screenImage, setScreenImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null)
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 })
  const [initialSelection, setInitialSelection] = useState<Selection | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 裁剪选中区域
  const cropSelection = useCallback(async () => {
    if (!selection || !screenImage || !containerRef.current) return

    try {
      setIsLoading(true)
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.src = screenImage
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
      })

      // 获取屏幕缩放比例
      const scaleX = img.naturalWidth / window.screen.width
      const scaleY = img.naturalHeight / window.screen.height

      canvas.width = selection.width * scaleX
      canvas.height = selection.height * scaleY

      ctx?.drawImage(
        img,
        selection.x * scaleX,
        selection.y * scaleY,
        selection.width * scaleX,
        selection.height * scaleY,
        0,
        0,
        selection.width * scaleX,
        selection.height * scaleY
      )

      const croppedImage = canvas.toDataURL('image/png')
      await (window as any).electronAPI?.screenshotComplete(croppedImage)
    } catch (error) {
      console.error('裁剪图片失败:', error)
      setIsLoading(false)
    }
  }, [selection, screenImage])

  // 捕获屏幕
  useEffect(() => {
    const captureScreen = async () => {
      try {
        if ((window as any).electronAPI) {
          const imageData = await (window as any).electronAPI.captureScreen(0)
          setScreenImage(imageData)
        }
      } catch (error) {
        console.error('截图失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
    captureScreen()
  }, [])

  // ESC 取消 / Enter 确认
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ;(window as any).electronAPI?.screenshotCancel()
      } else if (e.key === 'Enter') {
        cropSelection()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cropSelection])

  // 计算选择区域
  const calculateSelection = useCallback((clientX: number, clientY: number) => {
    const x = Math.min(startPoint.x, clientX)
    const y = Math.min(startPoint.y, clientY)
    const width = Math.abs(clientX - startPoint.x)
    const height = Math.abs(clientY - startPoint.y)
    return { x, y, width, height }
  }, [startPoint])

  // 调整选择区域
  const resizeSelection = useCallback((clientX: number, clientY: number) => {
    if (!initialSelection || !resizeDirection) return null

    let { x, y, width, height } = initialSelection

    switch (resizeDirection) {
      case 'move':
        const dx = clientX - startPoint.x
        const dy = clientY - startPoint.y
        x = initialSelection.x + dx
        y = initialSelection.y + dy
        break
      case 'top-left':
        x = clientX
        y = clientY
        width = initialSelection.x + initialSelection.width - clientX
        height = initialSelection.y + initialSelection.height - clientY
        break
      case 'top-right':
        y = clientY
        width = clientX - initialSelection.x
        height = initialSelection.y + initialSelection.height - clientY
        break
      case 'bottom-left':
        x = clientX
        width = initialSelection.x + initialSelection.width - clientX
        height = clientY - initialSelection.y
        break
      case 'bottom-right':
        width = clientX - initialSelection.x
        height = clientY - initialSelection.y
        break
      case 'top':
        y = clientY
        height = initialSelection.y + initialSelection.height - clientY
        break
      case 'bottom':
        height = clientY - initialSelection.y
        break
      case 'left':
        x = clientX
        width = initialSelection.x + initialSelection.width - clientX
        break
      case 'right':
        width = clientX - initialSelection.x
        break
    }

    // 确保宽高为正
    if (width < 0) {
      x = x + width
      width = Math.abs(width)
    }
    if (height < 0) {
      y = y + height
      height = Math.abs(height)
    }

    return { x, y, width, height }
  }, [initialSelection, resizeDirection, startPoint])

  const handleMouseDown = useCallback((e: React.MouseEvent, direction: ResizeDirection = null) => {
    e.preventDefault()
    const clientX = e.clientX
    const clientY = e.clientY

    if (direction) {
      // 调整大小或移动
      setResizeDirection(direction)
      setStartPoint({ x: clientX, y: clientY })
      setInitialSelection(selection)
    } else {
      // 开始新选择
      setIsSelecting(true)
      setStartPoint({ x: clientX, y: clientY })
      setSelection({ x: clientX, y: clientY, width: 0, height: 0 })
    }
  }, [selection])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting && !resizeDirection) return

    const clientX = e.clientX
    const clientY = e.clientY

    if (resizeDirection) {
      const newSelection = resizeSelection(clientX, clientY)
      if (newSelection) {
        setSelection(newSelection)
      }
    } else if (isSelecting) {
      setSelection(calculateSelection(clientX, clientY))
    }
  }, [isSelecting, resizeDirection, calculateSelection, resizeSelection])

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false)
    setResizeDirection(null)
    setInitialSelection(null)
  }, [])

  const handleCancel = useCallback(() => {
    ;(window as any).electronAPI?.screenshotCancel()
  }, [])

  if (isLoading) {
    return (
      <div className="screenshot-selector">
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <span>正在准备截图...</span>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="screenshot-selector"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {screenImage && (
        <img
          src={screenImage}
          alt="screen"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            pointerEvents: 'none'
          }}
        />
      )}
      
      <div className="screenshot-overlay" style={{ pointerEvents: 'none' }}></div>

      {selection && selection.width > 0 && selection.height > 0 && (
        <>
          <div
            className="screenshot-selection"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height,
            }}
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'move'); }}
          >
            {/* 调整手柄 */}
            <div className="selection-handle top-left" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'top-left'); }}></div>
            <div className="selection-handle top-right" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'top-right'); }}></div>
            <div className="selection-handle bottom-left" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'bottom-left'); }}></div>
            <div className="selection-handle bottom-right" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'bottom-right'); }}></div>
            <div className="selection-handle top" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'top'); }}></div>
            <div className="selection-handle bottom" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'bottom'); }}></div>
            <div className="selection-handle left" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'left'); }}></div>
            <div className="selection-handle right" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'right'); }}></div>

            {/* 尺寸显示 */}
            <div className="screenshot-size">
              {Math.round(selection.width)} × {Math.round(selection.height)}
            </div>
          </div>

          {/* 工具栏 */}
          <div className="screenshot-toolbar" onMouseDown={e => e.stopPropagation()}>
            <button onClick={(e) => { e.stopPropagation(); handleCancel(); }}>取消 (ESC)</button>
            <button className="primary" onClick={(e) => { e.stopPropagation(); cropSelection(); }}>
              识别文字 (Enter)
            </button>
          </div>
        </>
      )}

      {/* 提示信息 */}
      <div className="screenshot-info">
        <span>
          <kbd>拖拽</kbd> 选择区域
        </span>
        <span>
          <kbd>ESC</kbd> 取消
        </span>
        <span>
          <kbd>Enter</kbd> 确认识别
        </span>
      </div>
    </div>
  )
}

export default ScreenshotSelector