import { useState, useRef, useEffect, useCallback } from 'react'
import './ScreenshotOverlay.css'

interface Selection {
  x: number
  y: number
  width: number
  height: number
}

interface ScreenshotOverlayProps {
  onCapture: (imageData: string, selection: Selection) => void
  onCancel: () => void
}

export default function ScreenshotOverlay({ onCapture, onCancel }: ScreenshotOverlayProps) {
  const [isSelecting, setIsSelecting] = useState(false)
  const [selection, setSelection] = useState<Selection | null>(null)
  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 获取屏幕尺寸
    setScreenSize({
      width: window.screen.width,
      height: window.screen.height
    })

    // ESC 键取消
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const x = e.clientX
    const y = e.clientY
    setStartPos({ x, y })
    setSelection({ x, y, width: 0, height: 0 })
    setIsSelecting(true)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isSelecting) return
    
    const currentX = e.clientX
    const currentY = e.clientY
    
    const x = Math.min(startPos.x, currentX)
    const y = Math.min(startPos.y, currentY)
    const width = Math.abs(currentX - startPos.x)
    const height = Math.abs(currentY - startPos.y)
    
    setSelection({ x, y, width, height })
  }, [isSelecting, startPos])

  const handleMouseUp = useCallback(async () => {
    if (!isSelecting || !selection) return
    
    setIsSelecting(false)
    
    // 确保选区足够大
    if (selection.width < 10 || selection.height < 10) {
      setSelection(null)
      return
    }
    
    try {
      // 调用主进程捕获屏幕区域
      const imageData = await window.electronAPI.captureScreen(selection)
      if (imageData) {
        onCapture(imageData, selection)
      } else {
        console.error('截图失败')
        onCancel()
      }
    } catch (error) {
      console.error('截图错误:', error)
      onCancel()
    }
  }, [isSelecting, selection, onCapture, onCancel])

  const handleDoubleClick = useCallback(() => {
    // 双击取消
    onCancel()
  }, [onCancel])

  return (
    <div
      ref={containerRef}
      className="screenshot-overlay"
      style={{
        width: screenSize.width,
        height: screenSize.height
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* 遮罩层 */}
      <div className="screenshot-mask" />
      
      {/* 选区 */}
      {selection && (
        <div
          className="screenshot-selection"
          style={{
            left: selection.x,
            top: selection.y,
            width: selection.width,
            height: selection.height
          }}
        >
          {/* 选区边框 */}
          <div className="selection-border" />
          
          {/* 尺寸显示 */}
          <div className="selection-size">
            {selection.width} × {selection.height}
          </div>
          
          {/* 操作提示 */}
          <div className="selection-hint">
            松开鼠标完成截图，ESC取消
          </div>
        </div>
      )}
      
      {/* 提示文字 */}
      {!selection && (
        <div className="screenshot-hint">
          <div className="hint-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" strokeDasharray="4 2" />
              <path d="M15 3v18" strokeDasharray="4 2" />
              <path d="M3 9h18" strokeDasharray="4 2" />
              <path d="M3 15h18" strokeDasharray="4 2" />
            </svg>
          </div>
          <div className="hint-text">
            拖拽鼠标选择识别区域
          </div>
          <div className="hint-subtext">
            按 ESC 取消截图
          </div>
        </div>
      )}
    </div>
  )
}
