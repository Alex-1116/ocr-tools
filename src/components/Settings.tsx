import { useState, useEffect, useCallback, useRef } from 'react'
import './Settings.css'

interface SettingsProps {
  onClose: () => void
}

interface AppSettings {
  shortcut: string
  autoSaveScreenshot: boolean
  screenshotPath: string
}

const DEFAULT_SHORTCUTS = [
  { label: 'Ctrl/Cmd + Shift + A', value: 'CommandOrControl+Shift+A' },
  { label: 'Ctrl/Cmd + Shift + S', value: 'CommandOrControl+Shift+S' },
  { label: 'Ctrl/Cmd + Alt + A', value: 'CommandOrControl+Alt+A' },
  { label: 'Ctrl/Cmd + Alt + S', value: 'CommandOrControl+Alt+S' },
]

function Settings({ onClose }: SettingsProps) {
  const [settings, setSettings] = useState<AppSettings>({
    shortcut: 'CommandOrControl+Shift+A',
    autoSaveScreenshot: false,
    screenshotPath: ''
  })
  const [customShortcut, setCustomShortcut] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const settingsRef = useRef(settings)

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    if (window.electronAPI) {
      try {
        const loadedSettings = await window.electronAPI.getSettings()
        console.log('加载的设置:', loadedSettings)
        setSettings(loadedSettings)
      } catch (error) {
        console.error('加载设置失败:', error)
      }
    }
  }

  const saveSettingsToBackend = useCallback(async (newSettings: AppSettings) => {
    setSaveStatus('saving')
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.saveSettings(newSettings)
        console.log('保存结果:', result)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch (error) {
      console.error('保存设置失败:', error)
      setSaveStatus('error')
    }
  }, [])

  const handleShortcutChange = useCallback(async (shortcut: string) => {
    const newSettings = { ...settingsRef.current, shortcut }
    setSettings(newSettings)
    await saveSettingsToBackend(newSettings)
  }, [saveSettingsToBackend])

  const handleAutoSaveChange = useCallback(async (autoSaveScreenshot: boolean) => {
    const newSettings = { ...settingsRef.current, autoSaveScreenshot }
    setSettings(newSettings)
    await saveSettingsToBackend(newSettings)
  }, [saveSettingsToBackend])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isRecording) return
    
    e.preventDefault()
    e.stopPropagation()
    
    const modifiers: string[] = []
    if (e.ctrlKey || e.metaKey) modifiers.push('CommandOrControl')
    if (e.shiftKey) modifiers.push('Shift')
    if (e.altKey) modifiers.push('Alt')
    
    const key = e.key.toUpperCase()
    if (!['CONTROL', 'SHIFT', 'ALT', 'META'].includes(key) && modifiers.length > 0) {
      const shortcut = [...modifiers, key].join('+')
      setCustomShortcut(shortcut)
      handleShortcutChange(shortcut)
      setIsRecording(false)
    }
  }, [isRecording, handleShortcutChange])

  useEffect(() => {
    if (isRecording) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRecording, handleKeyDown])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const isCustomShortcut = settings.shortcut !== '' && !DEFAULT_SHORTCUTS.some(s => s.value === settings.shortcut)

  return (
    <div className="settings-overlay" onClick={handleOverlayClick}>
      <div className="settings-modal">
        <div className="settings-header">
          <h2>设置</h2>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>快捷键设置</h3>
            <p className="section-desc">设置截图识别的全局快捷键</p>
            
            <div className="shortcut-options">
              {DEFAULT_SHORTCUTS.map((shortcut) => (
                <label key={shortcut.value} className="shortcut-option">
                  <input
                    type="radio"
                    name="shortcut"
                    value={shortcut.value}
                    checked={settings.shortcut === shortcut.value}
                    onChange={() => handleShortcutChange(shortcut.value)}
                  />
                  <span className="shortcut-label">{shortcut.label}</span>
                </label>
              ))}
            </div>

            <div className="custom-shortcut">
              <label className="shortcut-option">
                <input
                  type="radio"
                  name="shortcut"
                  value={customShortcut}
                  checked={isCustomShortcut}
                  onChange={() => {}}
                />
                <span className="shortcut-label">
                  {isRecording ? '请按下快捷键组合...' : (isCustomShortcut ? settings.shortcut : '自定义快捷键')}
                </span>
              </label>
              <button
                className={`record-btn ${isRecording ? 'recording' : ''}`}
                onClick={() => setIsRecording(!isRecording)}
              >
                {isRecording ? '取消' : '录制'}
              </button>
            </div>
          </div>

          <div className="settings-section">
            <h3>截图保存</h3>
            <p className="section-desc">自动保存截图到本地</p>
            
            <label className="toggle-option">
              <input
                type="checkbox"
                checked={settings.autoSaveScreenshot}
                onChange={(e) => handleAutoSaveChange(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">自动保存截图</span>
            </label>

            {settings.autoSaveScreenshot && (
              <div className="screenshot-path">
                <span className="path-label">保存路径:</span>
                <span className="path-value">{settings.screenshotPath}</span>
              </div>
            )}
          </div>
        </div>

        <div className="settings-footer">
          {saveStatus === 'saving' && <span className="save-status saving">保存中...</span>}
          {saveStatus === 'saved' && <span className="save-status saved">✓ 已保存</span>}
          {saveStatus === 'error' && <span className="save-status error">保存失败</span>}
          <button className="done-btn" onClick={onClose}>完成</button>
        </div>
      </div>
    </div>
  )
}

export default Settings
