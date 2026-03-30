import { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage, globalShortcut, Tray, Menu, desktopCapturer, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let tray: Tray | null = null
let screenshotWindow: BrowserWindow | null = null
let settings = {
  shortcut: 'Ctrl+Shift+A',
  autoSaveScreenshot: false,
  savePath: app.getPath('pictures')
}

// 加载设置
function loadSettings() {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json')
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8')
      settings = { ...settings, ...JSON.parse(data) }
    }
  } catch (error) {
    console.log('使用默认设置')
  }
}

// 保存设置
function saveSettings() {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json')
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  } catch (error) {
    console.error('保存设置失败:', error)
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'OCR Tools - 图片文字识别',
    icon: path.join(process.env.VITE_PUBLIC!, 'logo.svg'),
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

  // 最小化到托盘
  win.on('minimize', (event: Event) => {
    event.preventDefault()
    win?.hide()
    // macOS: 隐藏Dock图标
    if (process.platform === 'darwin') {
      app.dock.hide()
    }
  })

  win.on('close', (event) => {
    if (!(app as any).isQuiting) {
      event.preventDefault()
      win?.hide()
      // macOS: 隐藏Dock图标
      if (process.platform === 'darwin') {
        app.dock.hide()
      }
    }
  })
}

// 创建系统托盘
function createTray() {
  // 使用默认图标，避免路径问题
  const iconPath = path.join(__dirname, '../public/logo.svg')
  const fallbackIcon = nativeImage.createEmpty()
  try {
    tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }))
  } catch (e) {
    tray = new Tray(fallbackIcon.resize({ width: 16, height: 16 }))
  }
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '打开主窗口', click: () => {
      win?.show()
      // macOS: 显示Dock图标
      if (process.platform === 'darwin') {
        app.dock.show()
      }
    }},
    { label: '截图识别', click: () => startScreenshot() },
    { label: '设置', click: () => {
      win?.show()
      // macOS: 显示Dock图标
      if (process.platform === 'darwin') {
        app.dock.show()
      }
      win?.webContents.send('open-settings')
    }},
    { type: 'separator' },
    { label: '退出', click: () => {
      (app as any).isQuiting = true
      app.quit()
    }}
  ])
  
  tray.setToolTip('OCR Tools - 截图识别')
  tray.setContextMenu(contextMenu)
  
  tray.on('click', () => {
    win?.show()
    // macOS: 显示Dock图标
    if (process.platform === 'darwin') {
      app.dock.show()
    }
  })
}

// 注册全局快捷键
function registerGlobalShortcut() {
  globalShortcut.unregisterAll()
  
  try {
    globalShortcut.register(settings.shortcut, () => {
      startScreenshot()
    })
    console.log(`快捷键已注册: ${settings.shortcut}`)
  } catch (error) {
    console.error('快捷键注册失败:', error)
  }
}

// 开始截图
function startScreenshot() {
  if (screenshotWindow) {
    screenshotWindow.close()
    screenshotWindow = null
    return
  }

  const displays = screen.getAllDisplays()
  let bounds = { x: 0, y: 0, width: 0, height: 0 }
  
  displays.forEach(display => {
    const x = display.bounds.x
    const y = display.bounds.y
    const width = display.bounds.width
    const height = display.bounds.height
    
    bounds.x = Math.min(bounds.x, x)
    bounds.y = Math.min(bounds.y, y)
    bounds.width = Math.max(bounds.width, x + width - bounds.x)
    bounds.height = Math.max(bounds.height, y + height - bounds.y)
  })

  screenshotWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    movable: false,
    resizable: false,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  screenshotWindow.setFullScreen(true)
  screenshotWindow.setIgnoreMouseEvents(false)
  
  const screenshotUrl = VITE_DEV_SERVER_URL 
    ? `${VITE_DEV_SERVER_URL}#/screenshot`
    : `file://${path.join(RENDERER_DIST, 'index.html')}#/screenshot`
  
  screenshotWindow.loadURL(screenshotUrl)
  
  screenshotWindow.on('closed', () => {
    screenshotWindow = null
  })
}

// 捕获屏幕
async function captureScreen(displayId: number) {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    })
    
    const source = sources[displayId] || sources[0]
    if (source) {
      return source.thumbnail.toDataURL()
    }
    return null
  } catch (error) {
    console.error('截图失败:', error)
    return null
  }
}

// 保存截图
function saveScreenshot(imageData: string) {
  if (!settings.autoSaveScreenshot) return
  
  const fileName = `ocr-screenshot-${Date.now()}.png`
  const filePath = path.join(settings.savePath, fileName)
  
  try {
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '')
    fs.writeFileSync(filePath, base64Data, 'base64')
    console.log('截图已保存到:', filePath)
  } catch (error) {
    console.error('保存截图失败:', error)
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  loadSettings()
  createWindow()
  createTray()
  registerGlobalShortcut()
})

app.on('will-quit', () => {
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
ipcMain.handle('capture-screen', async (_, displayId: number) => {
  return await captureScreen(displayId)
})

ipcMain.handle('screenshot-cancel', () => {
  if (screenshotWindow) {
    screenshotWindow.close()
    screenshotWindow = null
  }
})

ipcMain.handle('screenshot-complete', async (_, imageData: string) => {
  // 保存截图（如果开启自动保存）
  saveScreenshot(imageData)
  
  // 关闭截图窗口
  if (screenshotWindow) {
    screenshotWindow.close()
    screenshotWindow = null
  }
  
  // 显示主窗口
  win?.show()
  
  // 发送截图数据到主窗口
  win?.webContents.send('screenshot-image', imageData)
})

ipcMain.handle('get-settings', () => {
  return settings
})

ipcMain.handle('update-settings', async (_, newSettings: typeof settings) => {
  settings = { ...settings, ...newSettings }
  saveSettings()
  registerGlobalShortcut()
  return true
})

// 使用 (app as any).isQuiting 进行类型断言，避免接口重复声明问题
