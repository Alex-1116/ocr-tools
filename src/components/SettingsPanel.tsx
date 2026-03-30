import { useState, useEffect, useCallback } from 'react'
import './SettingsPanel.css'

interface Settings {
  shortcut: string
  autoSaveScreenshot: boolean
  savePath: string
}

interface SettingsPanelProps {
  onClose: () => void
  onSave: (settings: Settings) => void
  currentSettings: Settings
}

function SettingsPanel({ onClose, onSave, currentSettings }: SettingsPanelProps) {
  const [shortcut, setShortcut] = useState(currentSettings.shortcut)
  const [autoSaveScreenshot, setAutoSaveScreenshot] = useState(currentSettings.autoSaveScreenshot)
  const [isRecording, setIsRecording] = useState(false)
  const [tempShortcut, setTempShortcut] = useState<string[]>([])

  // 记录快捷键
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isRecording) return

    e.preventDefault()
    e.stopPropagation()

    const keys: string[] = []
    
    if (e.ctrlKey) keys.push('Ctrl')
    if (e.shiftKey) keys.push('Shift')
    if (e.altKey) keys.push('Alt')
    if (e.metaKey) keys.push('Cmd')

    // 排除修饰键本身
    const keyMap: Record<string, string> = {
      'Control': '',
      'Shift': '',
      'Alt': '',
      'Meta': '',
      ' ': 'Space'
    }

    const key = keyMap[e.key] !== undefined ? keyMap[e.key] : e.key
    if (key && !keys.includes(key) && key.length <= 10) {
      keys.push(key.length === 1 ? key.toUpperCase() : key)
    }

    if (keys.length > 0) {
      setTempShortcut(keys)
      const shortcutStr = keys.join('+')
      setShortcut(shortcutStr)
    }
  }, [isRecording])

  const handleKeyUp = useCallback(() => {
    if (isRecording && tempShortcut.length > 0) {
      setIsRecording(false)
      setTempShortcut([])
    }
  }, [isRecording, tempShortcut])

  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown)
      window.addEventListener('keyup', handleKeyUp)
      return () => {
        window.removeEventListener('keydown', handleKeyDown)
        window.removeEventListener('keyup', handleKeyUp)
      }
    }
  }, [isRecording, handleKeyDown, handleKeyUp])

  const startRecording = () => {
    setIsRecording(true)
    setTempShortcut([])
    setShortcut('')
  }

  const resetShortcut = () => {
    setShortcut('Ctrl+Shift+A')
    setIsRecording(false)
    setTempShortcut([])
  }

  const handleSave = () => {
    onSave({
      shortcut,
      autoSaveScreenshot,
      savePath: currentSettings.savePath
    })
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            设置
          </h2>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="settings-content">
          <div className="setting-item">
            <label className="setting-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              截图快捷键
            </label>
            <div className="shortcut-input-wrapper">
              <input
                type="text"
                className={`shortcut-input ${isRecording ? 'recording' : ''}`}
                value={isRecording ? (tempShortcut.length > 0 ? tempShortcut.join('+') : '按下快捷键...') : shortcut}
                onClick={startRecording}
                readOnly
                placeholder="点击设置快捷键"
              />
              <button className="reset-btn" onClick={resetShortcut}>
                重置
              </button>
            </div>
            <p className="setting-hint">
              点击输入框后按下新的快捷键组合，支持 Ctrl、Shift、Alt、Cmd 组合
            </p>
          </div>

          <div className="setting-item">
            <div className="toggle-wrapper">
              <label className="setting-label">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                  <polyline points="17 21 17 13 7 13 7 21"/>
                  <polyline points="7 3 7 8 15 8"/>
                </svg>
                自动保存截图
              </label>
              <div
                className={`toggle-switch ${autoSaveScreenshot ? 'active' : ''}`}
                onClick={() => setAutoSaveScreenshot(!autoSaveScreenshot)}
              />
            </div>
            <p className="setting-hint">
              开启后截图将自动保存到系统图片文件夹
            </p>
          </div>
        </div>

        <div className="settings-footer">
          <button className="cancel-btn" onClick={onClose}>
            取消
          </button>
          <button className="save-btn" onClick={handleSave} disabled={!shortcut || shortcut.trim() === ''}>
            保存设置
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel