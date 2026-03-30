import { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage, globalShortcut, Tray, Menu, screen, desktopCapturer, Notification } from 'electron'
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
let screenshotWin: BrowserWindow | null
let tray: Tray | null
let currentShortcut: string = 'CommandOrControl+Shift+A'
let isQuitting: boolean = false
let screenCaptureData: string = ''

const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json')

interface AppSettings {
  shortcut: string
  autoSaveScreenshot: boolean
  screenshotPath: string
}

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8')
      const settings = JSON.parse(data)
      return settings
    }
  } catch (error) {
    console.error('加载设置失败:', error)
  }
  return {
    shortcut: 'CommandOrControl+Shift+A',
    autoSaveScreenshot: false,
    screenshotPath: path.join(app.getPath('pictures'), 'ocr-screenshots')
  }
}

function saveSettingsToFile(settings: AppSettings) {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
    console.log('设置已保存:', settings)
  } catch (error) {
    console.error('保存设置失败:', error)
  }
}

function getIconPath(): string {
  const publicPath = process.env.VITE_PUBLIC || ''
  return path.join(publicPath, 'logo.png')
}

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'OCR Tools - 图片文字识别',
    icon: getIconPath(),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
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
}

function createTray() {
  const iconPath = getIconPath()
  const trayIcon = nativeImage.createFromPath(iconPath)
  
  if (trayIcon.isEmpty()) {
    const defaultIcon = nativeImage.createEmpty()
    tray = new Tray(defaultIcon)
  } else {
    tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))
  }

  updateTrayMenu()

  tray.setToolTip('OCR Tools')

  tray.on('double-click', () => {
    if (win) {
      win.show()
      win.focus()
    } else {
      createWindow()
    }
  })
}

function updateTrayMenu() {
  if (!tray) return
  
  const shortcutDisplay = currentShortcut
    .replace('CommandOrControl', 'Ctrl/Cmd')
    .replace(/\+/g, ' + ')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开主窗口',
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
      label: `截图识别 (${shortcutDisplay})`,
      click: () => startScreenshot()
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
}

async function createScreenshotWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height, x, y } = primaryDisplay.bounds

  screenshotWin = new BrowserWindow({
    width: width,
    height: height,
    x: x,
    y: y,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'screenshot-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  screenshotWin.setAlwaysOnTop(true, 'screen-saver', 1)

  if (VITE_DEV_SERVER_URL) {
    await screenshotWin.loadURL(VITE_DEV_SERVER_URL + '/screenshot.html')
  } else {
    await screenshotWin.loadFile(path.join(RENDERER_DIST, 'screenshot.html'))
  }

  screenshotWin.webContents.on('did-finish-load', () => {
    if (screenCaptureData && screenshotWin) {
      screenshotWin.webContents.send('screen-capture-ready', screenCaptureData)
    }
  })

  screenshotWin.on('closed', () => {
    screenshotWin = null
    screenCaptureData = ''
  })
}

async function startScreenshot() {
  try {
    if (screenshotWin) {
      screenshotWin.close()
      screenshotWin = null
    }

    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.bounds
    
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: width * 2, height: height * 2 }
    })

    if (sources.length === 0) {
      new Notification({
        title: 'OCR Tools',
        body: '无法获取屏幕信息'
      }).show()
      return
    }

    screenCaptureData = sources[0].thumbnail.toDataURL()

    await createScreenshotWindow()
  } catch (error) {
    console.error('截图失败:', error)
    new Notification({
      title: 'OCR Tools',
      body: '截图失败，请重试'
    }).show()
  }
}

function registerShortcut(shortcut: string): boolean {
  globalShortcut.unregisterAll()
  
  try {
    const ret = globalShortcut.register(shortcut, () => {
      startScreenshot()
    })
    
    if (ret) {
      currentShortcut = shortcut
      console.log('快捷键注册成功:', shortcut)
      updateTrayMenu()
      return true
    }
  } catch (error) {
    console.error('快捷键注册失败:', error)
  }
  
  return false
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (tray) {
      win = null
    } else {
      app.quit()
    }
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  isQuitting = true
})

app.whenReady().then(() => {
  const settings = loadSettings()
  currentShortcut = settings.shortcut
  
  createWindow()
  createTray()
  registerShortcut(currentShortcut)
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

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
    console.log('已复制到剪贴板:', text.substring(0, 50) + '...')
    return true
  } catch (error) {
    console.error('复制失败:', error)
    return false
  }
})

ipcMain.handle('save-to-file', async (_, text: string) => {
  const result = await dialog.showSaveDialog(win!, {
    filters: [
      { name: '文本文件', extensions: ['txt'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    defaultPath: 'ocr-result.txt'
  })
  
  if (!result.canceled && result.filePath) {
    try {
      fs.writeFileSync(result.filePath, text, 'utf-8')
      console.log('文件已保存:', result.filePath)
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

ipcMain.handle('get-screen-sources', async () => {
  return []
})

ipcMain.handle('capture-screen-area', async (_, bounds: { x: number; y: number; width: number; height: number }) => {
  try {
    if (!screenCaptureData) {
      return null
    }

    const image = nativeImage.createFromDataURL(screenCaptureData)
    const primaryDisplay = screen.getPrimaryDisplay()
    const { scaleFactor } = primaryDisplay
    const displayBounds = primaryDisplay.bounds
    
    const cropX = Math.round(bounds.x * scaleFactor)
    const cropY = Math.round(bounds.y * scaleFactor)
    const cropWidth = Math.round(bounds.width * scaleFactor)
    const cropHeight = Math.round(bounds.height * scaleFactor)
    
    const croppedImage = image.crop({
      x: cropX,
      y: cropY,
      width: cropWidth,
      height: cropHeight
    })

    const settings = loadSettings()
    
    if (settings.autoSaveScreenshot) {
      const screenshotDir = settings.screenshotPath
      if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir, { recursive: true })
      }
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const screenshotPath = path.join(screenshotDir, `screenshot-${timestamp}.png`)
      fs.writeFileSync(screenshotPath, croppedImage.toPNG())
    }

    return croppedImage.toDataURL()
  } catch (error) {
    console.error('截取区域失败:', error)
    return null
  }
})

ipcMain.handle('close-screenshot-window', async () => {
  if (screenshotWin) {
    screenshotWin.close()
    screenshotWin = null
  }
  screenCaptureData = ''
})

ipcMain.handle('send-screenshot-to-main', async (_, imageData: string) => {
  if (win) {
    win.webContents.send('screenshot-captured', imageData)
    if (!win.isVisible()) {
      win.show()
    }
    win.focus()
  }
  
  if (screenshotWin) {
    screenshotWin.close()
    screenshotWin = null
  }
  screenCaptureData = ''
})

ipcMain.handle('get-settings', async () => {
  const settings = loadSettings()
  console.log('获取设置:', settings)
  return settings
})

ipcMain.handle('save-settings', async (_, settings: AppSettings) => {
  saveSettingsToFile(settings)
  
  if (settings.shortcut !== currentShortcut) {
    registerShortcut(settings.shortcut)
  }
  
  if (win) {
    win.webContents.send('settings-changed', settings)
  }
  
  return true
})

ipcMain.handle('update-shortcut', async (_, shortcut: string) => {
  return registerShortcut(shortcut)
})

ipcMain.handle('show-notification', async (_, title: string, body: string) => {
  new Notification({ title, body }).show()
  return true
})
