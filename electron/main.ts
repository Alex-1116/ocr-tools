import { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage, globalShortcut, screen, Tray, Menu } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

// 扩展 App 类型
declare global {
  namespace Electron {
    interface App {
      isQuiting?: boolean
    }
  }
}

let mainWindow: BrowserWindow | null = null
let screenshotWindow: BrowserWindow | null = null
let tray: Tray | null = null

// 配置文件路径
const configPath = path.join(os.homedir(), '.ocr-tools-config.json')

// 默认配置
const defaultConfig = {
  screenshotShortcut: 'CommandOrControl+Shift+A',
  saveScreenshot: false,
  screenshotSavePath: path.join(os.homedir(), 'Pictures', 'OCR-Screenshots'),
  autoRecognize: true
}

// 读取配置
function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return { ...defaultConfig, ...config }
    }
  } catch (error) {
    console.error('读取配置失败:', error)
  }
  return defaultConfig
}

// 保存配置
function saveConfig(config: typeof defaultConfig) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    console.error('保存配置失败:', error)
  }
}

let config = loadConfig()

function createWindow() {
  const publicPath = process.env.VITE_PUBLIC || RENDERER_DIST
  
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'OCR Tools - 图片文字识别',
    icon: path.join(publicPath, 'logo.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Main window loaded')
    mainWindow?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription)
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    const indexPath = path.join(RENDERER_DIST, 'index.html')
    console.log('Loading index from:', indexPath)
    mainWindow.loadFile(indexPath)
  }

  // 窗口关闭时最小化到托盘
  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 创建截图窗口
function createScreenshotWindow() {
  if (screenshotWindow) {
    screenshotWindow.close()
    screenshotWindow = null
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.size

  screenshotWindow = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    fullscreen: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // 加载截图选择页面
  if (VITE_DEV_SERVER_URL) {
    screenshotWindow.loadURL(`${VITE_DEV_SERVER_URL}#/screenshot`)
  } else {
    const indexPath = path.join(RENDERER_DIST, 'index.html')
    screenshotWindow.loadURL(`file://${indexPath}#screenshot`)
  }

  screenshotWindow.on('closed', () => {
    screenshotWindow = null
  })
}

// 注册全局快捷键
function registerGlobalShortcuts() {
  // 注销所有快捷键
  globalShortcut.unregisterAll()
  
  // 注册截图快捷键
  const shortcut = config.screenshotShortcut
  const registered = globalShortcut.register(shortcut, () => {
    startScreenshot()
  })
  
  if (!registered) {
    console.error(`无法注册快捷键: ${shortcut}`)
  } else {
    console.log(`已注册截图快捷键: ${shortcut}`)
  }
}

// 开始截图
function startScreenshot() {
  // 先隐藏主窗口
  if (mainWindow && !mainWindow.isMinimized()) {
    mainWindow.hide()
  }
  
  // 延迟一下确保窗口隐藏后再截图
  setTimeout(() => {
    createScreenshotWindow()
  }, 100)
}

// 创建系统托盘
function createTray() {
  // 创建一个简单的透明图标作为占位
  const emptyIcon = nativeImage.createEmpty()
  tray = new Tray(emptyIcon)
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: '截图识别',
      accelerator: config.screenshotShortcut,
      click: () => {
        startScreenshot()
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
  
  tray.setToolTip('OCR Tools')
  tray.setContextMenu(contextMenu)
  
  // 点击托盘图标显示主窗口
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 不要退出，保持托盘运行
    // app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else if (mainWindow) {
    mainWindow.show()
  }
})

app.whenReady().then(() => {
  console.log('App is ready, creating window...')
  createWindow()
  createTray()
  registerGlobalShortcuts()
})

app.on('will-quit', () => {
  // 注销所有全局快捷键
  globalShortcut.unregisterAll()
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
  clipboard.writeText(text)
  return true
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
ipcMain.handle('get-screen-sources', async () => {
  try {
    const { desktopCapturer } = await import('electron')
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1, height: 1 }
    })
    return sources
  } catch (error) {
    console.error('获取屏幕源失败:', error)
    return []
  }
})

ipcMain.handle('capture-screen', async (_, bounds: { x: number, y: number, width: number, height: number }) => {
  try {
    const { desktopCapturer } = await import('electron')
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: screen.getPrimaryDisplay().size
    })
    
    if (sources.length === 0) {
      return null
    }
    
    // 获取主屏幕的缩略图
    const primarySource = sources[0]
    const thumbnail = primarySource.thumbnail
    
    // 裁剪指定区域
    const croppedImage = thumbnail.crop(bounds)
    return croppedImage.toDataURL()
  } catch (error) {
    console.error('截图失败:', error)
    return null
  }
})

ipcMain.handle('close-screenshot-window', async () => {
  if (screenshotWindow) {
    screenshotWindow.close()
    screenshotWindow = null
  }
  // 显示主窗口
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
  return true
})

ipcMain.handle('show-main-window', async () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  }
  return true
})

// 配置相关 IPC
ipcMain.handle('get-config', async () => {
  return config
})

ipcMain.handle('set-config', async (_, newConfig: Partial<typeof defaultConfig>) => {
  config = { ...config, ...newConfig }
  saveConfig(config)
  
  // 如果快捷键改变，重新注册
  if (newConfig.screenshotShortcut) {
    registerGlobalShortcuts()
    // 更新托盘菜单
    if (tray) {
      createTray()
    }
  }
  
  return config
})

ipcMain.handle('save-screenshot', async (_, imageData: string, filename?: string) => {
  if (!config.saveScreenshot) {
    return true
  }
  
  try {
    // 确保保存目录存在
    if (!fs.existsSync(config.screenshotSavePath)) {
      fs.mkdirSync(config.screenshotSavePath, { recursive: true })
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const name = filename || `screenshot-${timestamp}.png`
    const filePath = path.join(config.screenshotSavePath, name)
    
    // 从 data URL 中提取 base64 数据
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '')
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'))
    
    return true
  } catch (error) {
    console.error('保存截图失败:', error)
    return false
  }
})
