import { app, BrowserWindow, ipcMain, dialog, clipboard, nativeImage, globalShortcut, Tray, Menu, Notification, screen } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let screenshotWin: BrowserWindow | null
let tray: Tray | null
let screenshotShortcut: string = 'CommandOrControl+Shift+A'

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'OCR Tools - 图片文字识别',
    icon: path.join(process.env.VITE_PUBLIC, 'logo.png'),
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
}

function createScreenshotWindow() {
  if (screenshotWin) {
    screenshotWin.close()
    screenshotWin = null
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.bounds

  screenshotWin = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    fullscreen: true,
    focusable: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  const screenshotPath = VITE_DEV_SERVER_URL
    ? path.join(process.env.VITE_PUBLIC, 'screenshot.html')
    : path.join(RENDERER_DIST, 'screenshot.html')

  screenshotWin.loadFile(screenshotPath)

  screenshotWin.on('closed', () => {
    screenshotWin = null
  })
}

function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC, 'logo.png')
  const icon = nativeImage.createFromPath(iconPath)

  if (icon.isEmpty()) {
    const emptyIcon = nativeImage.createEmpty()
    tray = new Tray(emptyIcon)
  } else {
    tray = new Tray(icon.resize({ width: 16, height: 16 }))
  }

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
      },
    },
    {
      label: '截图识别',
      accelerator: screenshotShortcut,
      click: () => {
        startScreenshot()
      },
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setToolTip('OCR Tools - 图片文字识别')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (win) {
      win.show()
      win.focus()
    } else {
      createWindow()
    }
  })
}

function registerScreenshotShortcut() {
  if (globalShortcut.isRegistered(screenshotShortcut)) {
    globalShortcut.unregister(screenshotShortcut)
  }

  const success = globalShortcut.register(screenshotShortcut, () => {
    startScreenshot()
  })

  if (!success) {
    console.error('快捷键注册失败:', screenshotShortcut)
  }
}

function startScreenshot() {
  if (win) {
    win.minimize()
  }
  createScreenshotWindow()
}

function showNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
    })
    notification.show()
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

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.whenReady().then(() => {
  createWindow()
  createTray()
  registerScreenshotShortcut()
})

ipcMain.on('screenshot-selected', (_, imageData: string) => {
  if (screenshotWin) {
    screenshotWin.close()
    screenshotWin = null
  }

  if (win) {
    win.restore()
    win.show()
    win.focus()
    win.webContents.send('screenshot-image', imageData)
  }
})

ipcMain.on('screenshot-cancelled', () => {
  if (screenshotWin) {
    screenshotWin.close()
    screenshotWin = null
  }

  if (win) {
    win.restore()
    win.show()
    win.focus()
  }
})

ipcMain.handle('start-screenshot', async () => {
  startScreenshot()
  return true
})

ipcMain.handle('select-image', async () => {
  const parentWin = win || undefined
  const result = await dialog.showOpenDialog(parentWin, {
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
    const fs = await import('node:fs')
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
  const parentWin = win || undefined
  const result = await dialog.showSaveDialog(parentWin, {
    filters: [
      { name: '文本文件', extensions: ['txt'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    defaultPath: 'ocr-result.txt'
  })

  if (!result.canceled && result.filePath) {
    try {
      const fs = await import('node:fs')
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

ipcMain.handle('get-screenshot-shortcut', async () => {
  return screenshotShortcut
})

ipcMain.handle('set-screenshot-shortcut', async (_, newShortcut: string) => {
  if (globalShortcut.isRegistered(screenshotShortcut)) {
    globalShortcut.unregister(screenshotShortcut)
  }

  const success = globalShortcut.register(newShortcut, () => {
    startScreenshot()
  })

  if (success) {
    screenshotShortcut = newShortcut
    createTray()
    return true
  } else {
    registerScreenshotShortcut()
    return false
  }
})

ipcMain.handle('minimize-to-tray', async () => {
  if (win) {
    win.hide()
  }
  return true
})

ipcMain.handle('show-notification', async (_, title: string, body: string) => {
  showNotification(title, body)
  return true
})

ipcMain.handle('save-screenshot', async (_, imageData: string) => {
  const parentWin = win || undefined
  const result = await dialog.showSaveDialog(parentWin, {
    filters: [
      { name: 'PNG 图片', extensions: ['png'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    defaultPath: `screenshot-${Date.now()}.png`
  })

  if (!result.canceled && result.filePath) {
    try {
      const fs = await import('node:fs')
      const base64Data = imageData.replace(/^data:image\/png;base64,/, '')
      fs.writeFileSync(result.filePath, base64Data, 'base64')
      return result.filePath
    } catch (error) {
      console.error('保存截图失败:', error)
      return null
    }
  }
  return null
})
