import { useState, useEffect } from 'react'
import './SettingsPanel.css'

interface Config {
  screenshotShortcut: string
  saveScreenshot: boolean
  screenshotSavePath: string
  autoRecognize: boolean
}

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<Config>({
    screenshotShortcut: 'CommandOrControl+Shift+A',
    saveScreenshot: false,
    screenshotSavePath: '',
    autoRecognize: true
  })
  const [isEditingShortcut, setIsEditingShortcut] = useState(false)

  useEffect(() => {
    if (isOpen) {
      window.electronAPI.getConfig().then(setConfig)
    }
  }, [isOpen])

  const handleSave = async () => {
    await window.electronAPI.setConfig(config)
    onClose()
  }

  const formatShortcut = (shortcut: string) => {
    return shortcut
      .replace('CommandOrControl', 'Ctrl')
      .replace('Command', '⌘')
      .replace('Control', 'Ctrl')
      .replace('Shift', 'Shift')
      .replace('Alt', 'Alt')
      .replace('+', ' + ')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditingShortcut) return

    e.preventDefault()

    const keys: string[] = []
    if (e.ctrlKey) keys.push('Control')
    if (e.metaKey) keys.push('Command')
    if (e.altKey) keys.push('Alt')
    if (e.shiftKey) keys.push('Shift')

    // 添加主键
    if (e.key && e.key.length === 1) {
      keys.push(e.key.toUpperCase())
    } else if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(e.key)) {
      keys.push(e.key)
    }

    if (keys.length >= 2) {
      const shortcut = keys.join('+')
      setConfig(prev => ({ ...prev, screenshotShortcut: shortcut }))
      setIsEditingShortcut(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h3>设置</h3>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="settings-content">
          <div className="setting-item">
            <label>截图快捷键</label>
            <div
              className={`shortcut-input ${isEditingShortcut ? 'editing' : ''}`}
              onClick={() => setIsEditingShortcut(true)}
              onKeyDown={handleKeyDown}
              tabIndex={0}
            >
              {isEditingShortcut ? (
                <span className="editing-hint">按下快捷键组合...</span>
              ) : (
                formatShortcut(config.screenshotShortcut)
              )}
            </div>
            <p className="setting-hint">点击上方区域修改快捷键</p>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.autoRecognize}
                onChange={e => setConfig(prev => ({ ...prev, autoRecognize: e.target.checked }))}
              />
              <span>截图后自动识别</span>
            </label>
          </div>

          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.saveScreenshot}
                onChange={e => setConfig(prev => ({ ...prev, saveScreenshot: e.target.checked }))}
              />
              <span>保存截图到本地</span>
            </label>
          </div>

          {config.saveScreenshot && (
            <div className="setting-item">
              <label>截图保存路径</label>
              <input
                type="text"
                value={config.screenshotSavePath}
                onChange={e => setConfig(prev => ({ ...prev, screenshotSavePath: e.target.value }))}
                placeholder="请输入保存路径"
              />
            </div>
          )}
        </div>

        <div className="settings-actions">
          <button className="btn-secondary" onClick={onClose}>
            取消
          </button>
          <button className="btn-primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
