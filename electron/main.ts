import { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage, globalShortcut, Tray, Menu, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

const VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let screenshotWin: BrowserWindow | null
let tray: Tray | null

// 配置文件路径
const CONFIG_DIR = path.join(app.getPath('userData'), 'config')
const CONFIG_FILE = path.join(CONFIG_DIR, 'settings.json')

// 配置管理
interface AppConfig {
  screenshotShortcut: string
  autoRecognize: boolean
  saveScreenshot: boolean
  screenshotPath: string
}

const defaultConfig: AppConfig = {
  screenshotShortcut: 'CommandOrControl+Shift+A',
  autoRecognize: true,
  saveScreenshot: false,
  screenshotPath: path.join(app.getPath('pictures'), 'OCR-Screenshots')
}

// 加载配置
function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
      const savedConfig = JSON.parse(data)
      return { ...defaultConfig, ...savedConfig }
    }
  } catch (error) {
    console.error('加载配置失败:', error)
  }
  return { ...defaultConfig }
}

// 保存配置
function saveConfig(config: AppConfig): void {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    console.error('保存配置失败:', error)
  }
}

let appConfig: AppConfig = loadConfig()

// 获取图标路径
function getIconPath(): string {
  const possiblePaths = [
    path.join(VITE_PUBLIC, 'logo.png'),
    path.join(VITE_PUBLIC, 'logo.svg'),
    path.join(process.env.APP_ROOT || '', 'public', 'logo.png'),
    path.join(process.env.APP_ROOT || '', 'public', 'logo.svg'),
  ]
  
  for (const iconPath of possiblePaths) {
    if (fs.existsSync(iconPath)) {
      return iconPath
    }
  }
  
  return ''
}

function createWindow() {
  const iconPath = getIconPath()
  
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'OCR Tools - 图片文字识别',
    icon: iconPath || undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault()
      win?.hide()
    }
  })
}

// 创建截图窗口
function createScreenshotWindow() {
  if (screenshotWin) {
    screenshotWin.close()
    screenshotWin = null
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  screenshotWin = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    fullscreen: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    screenshotWin.loadURL(`${VITE_DEV_SERVER_URL}#/screenshot`)
  } else {
    screenshotWin.loadFile(path.join(RENDERER_DIST, 'index.html'), {
      hash: '#/screenshot'
    })
  }

  screenshotWin.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape') {
      event.preventDefault()
      if (screenshotWin) {
        screenshotWin.close()
        screenshotWin = null
      }
    }
  })

  screenshotWin.on('closed', () => {
    screenshotWin = null
  })
}

// 创建系统托盘
function createTray() {
  const iconPath = getIconPath()
  
  try {
    if (iconPath) {
      tray = new Tray(iconPath)
    } else {
      const emptyIcon = nativeImage.createEmpty()
      tray = new Tray(emptyIcon)
    }
  } catch {
    const emptyIcon = nativeImage.createEmpty()
    tray = new Tray(emptyIcon)
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (win) {
          win.show()
          win.focus()
        } else {
          createWindow()
        }
      }
    },
    {
      label: '截图识别',
      accelerator: appConfig.screenshotShortcut,
      click: () => {
        createScreenshotWindow()
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuiting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('OCR Tools - 图片文字识别')
  tray.setContextMenu(contextMenu)

  tray.on('click', () => {
    if (win) {
      if (win.isVisible()) {
        win.hide()
      } else {
        win.show()
        win.focus()
      }
    } else {
      createWindow()
    }
  })
}

// 注册全局快捷键
function registerGlobalShortcuts() {
  const shortcutRegistered = globalShortcut.register(appConfig.screenshotShortcut, () => {
    createScreenshotWindow()
  })

  if (!shortcutRegistered) {
    console.warn('无法注册全局快捷键:', appConfig.screenshotShortcut)
  }
}

// 注销全局快捷键
function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll()
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  registerGlobalShortcuts()
})

app.on('will-quit', () => {
  unregisterGlobalShortcuts()
})

// IPC 处理
ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('read-image-file', async (_, filePath: string) => {
  try {
    const buffer = fs.readFileSync(filePath)
    return buffer.toString('base64')
  } catch (error) {
    console.error('读取图片文件失败:', error)
    return null
  }
})

ipcMain.handle('copy-to-clipboard', async (_, text: string) => {
  try {
    clipboard.writeText(text)
    return true
  } catch (error) {
    console.error('复制到剪贴板失败:', error)
    return false
  }
})

ipcMain.handle('save-to-file', async (_, text: string) => {
  const result = await dialog.showSaveDialog({
    filters: [
      { name: '文本文件', extensions: ['txt'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    defaultPath: 'ocr-result.txt'
  })
  
  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, text, 'utf-8')
      return true
    } catch (error) {
      console.error('保存文件失败:', error)
      return false
    }
  }
  return false
})

ipcMain.handle('get-clipboard-image', async () => {
  const image = clipboard.readImage()
  if (image.isEmpty()) {
    return null
  }
  return image.toDataURL()
})

// 截图相关 IPC
ipcMain.handle('capture-screen', async () => {
  try {
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size

    const { desktopCapturer } = await import('electron')
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width, height }
    })

    if (sources.length > 0) {
      return sources[0].thumbnail.toDataURL()
    }
    return null
  } catch (error) {
    console.error('截图失败:', error)
    return null
  }
})

ipcMain.handle('close-screenshot-window', async () => {
  if (screenshotWin) {
    screenshotWin.close()
    screenshotWin = null
  }
})

ipcMain.handle('send-cropped-image', async (_, imageData: string) => {
  if (screenshotWin) {
    screenshotWin.close()
    screenshotWin = null
  }

  if (win) {
    win.show()
    win.focus()
    win.webContents.send('screenshot-captured', imageData)
  }
})

ipcMain.handle('save-screenshot-config', async (_, config: Partial<AppConfig>) => {
  appConfig = { ...appConfig, ...config }
  
  // 保存到文件
  saveConfig(appConfig)
  
  // 如果快捷键改变，重新注册
  if (config.screenshotShortcut) {
    unregisterGlobalShortcuts()
    registerGlobalShortcuts()
    
    // 更新托盘菜单
    if (tray) {
      tray.destroy()
      createTray()
    }
  }
  
  return appConfig
})

ipcMain.handle('get-screenshot-config', async () => {
  // 重新加载配置确保获取最新值
  return appConfig
})

declare global {
  namespace Electron {
    interface App {
      isQuiting?: boolean
    }
  }
}
