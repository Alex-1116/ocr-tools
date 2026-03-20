import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'

if (process.env.NODE_ENV !== 'production') {
  app.commandLine.appendSwitch('no-sandbox')
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 700,
    minHeight: 500,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    title: 'OCR Tools',
    show: false
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('save-file', async (_, content: string) => {
  const result = await dialog.showSaveDialog({
    title: '保存识别结果',
    defaultPath: 'ocr-result.txt',
    filters: [{ name: 'Text Files', extensions: ['txt'] }]
  })

  if (result.filePath) {
    const fs = await import('fs')
    fs.writeFileSync(result.filePath, content, 'utf-8')
    return { success: true, path: result.filePath }
  }
  return { success: false }
})
