import { useState, useEffect, useCallback } from 'react'
import './SettingsPanel.css'

interface Config {
  screenshotShortcut: string
  autoRecognize: boolean
  saveScreenshot: boolean
  screenshotPath: string
}

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
}

const PRESET_SHORTCUTS = [
  { value: 'CommandOrControl+Shift+A', label: 'Ctrl+Shift+A' },
  { value: 'CommandOrControl+Shift+S', label: 'Ctrl+Shift+S' },
  { value: 'CommandOrControl+Alt+A', label: 'Ctrl+Alt+A' },
  { value: 'CommandOrControl+Alt+S', label: 'Ctrl+Alt+S' },
  { value: 'F1', label: 'F1' },
  { value: 'F2', label: 'F2' },
  { value: 'F3', label: 'F3' },
  { value: 'F4', label: 'F4' },
]

function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [config, setConfig] = useState<Config>({
    screenshotShortcut: 'CommandOrControl+Shift+A',
    autoRecognize: true,
    saveScreenshot: false,
    screenshotPath: ''
  })
  const [isLoading, setIsLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // 加载配置
  useEffect(() => {
    if (isOpen && window.electronAPI) {
      window.electronAPI.getScreenshotConfig().then(loadedConfig => {
        setConfig(loadedConfig)
        setIsLoading(false)
      }).catch(err => {
        console.error('加载配置失败:', err)
        setIsLoading(false)
      })
    }
  }, [isOpen])

  // 保存配置
  const handleSave = useCallback(async () => {
    if (!window.electronAPI) return

    setSaveStatus('saving')
    try {
      await window.electronAPI.saveScreenshotConfig(config)
      setSaveStatus('saved')
      setTimeout(() => {
        setSaveStatus('idle')
        onClose()
      }, 500)
    } catch (err) {
      console.error('保存配置失败:', err)
      setSaveStatus('error')
    }
  }, [config, onClose])

  // 处理快捷键变更
  const handleShortcutChange = useCallback((shortcut: string) => {
    setConfig(prev => ({ ...prev, screenshotShortcut: shortcut }))
  }, [])

  // 处理自动识别开关
  const handleAutoRecognizeChange = useCallback((checked: boolean) => {
    setConfig(prev => ({ ...prev, autoRecognize: checked }))
  }, [])

  // 处理保存截图开关
  const handleSaveScreenshotChange = useCallback((checked: boolean) => {
    setConfig(prev => ({ ...prev, saveScreenshot: checked }))
  }, [])

  if (!isOpen) return null

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>设置</h2>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="settings-loading">加载中...</div>
        ) : (
          <div className="settings-content">
            {/* 快捷键设置 */}
            <div className="setting-item">
              <label className="setting-label">截图快捷键</label>
              <div className="shortcut-options">
                {PRESET_SHORTCUTS.map(shortcut => (
                  <button
                    key={shortcut.value}
                    className={`shortcut-option ${config.screenshotShortcut === shortcut.value ? 'active' : ''}`}
                    onClick={() => handleShortcutChange(shortcut.value)}
                  >
                    {shortcut.label}
                  </button>
                ))}
              </div>
              <p className="setting-hint">修改快捷键后需要重启应用生效</p>
            </div>

            {/* 自动识别设置 */}
            <div className="setting-item">
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={config.autoRecognize}
                  onChange={(e) => handleAutoRecognizeChange(e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">截图后自动识别</span>
              </label>
              <p className="setting-hint">开启后，截图完成后自动开始文字识别</p>
            </div>

            {/* 保存截图设置 */}
            <div className="setting-item">
              <label className="setting-toggle">
                <input
                  type="checkbox"
                  checked={config.saveScreenshot}
                  onChange={(e) => handleSaveScreenshotChange(e.target.checked)}
                />
                <span className="toggle-slider"></span>
                <span className="toggle-label">保存截图到本地</span>
              </label>
              <p className="setting-hint">开启后，截图将自动保存到图片文件夹</p>
            </div>
          </div>
        )}

        <div className="settings-footer">
          <button className="cancel-btn" onClick={onClose}>取消</button>
          <button 
            className={`save-btn ${saveStatus}`}
            onClick={handleSave}
            disabled={isLoading || saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? '保存中...' : 
             saveStatus === 'saved' ? '已保存' : 
             saveStatus === 'error' ? '保存失败' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SettingsPanel
