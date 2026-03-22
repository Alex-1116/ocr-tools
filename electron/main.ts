import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
    },
    title: 'OCR 文字识别工具',
    show: false,
  });

  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('__dirname:', __dirname);
  
  // 等待页面加载完成后再显示窗口
  mainWindow.once('ready-to-show', () => {
    console.log('Window is ready to show');
    mainWindow?.show();
  });

  // 监听加载失败事件
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // 监听控制台消息
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Console ${level}] ${message} (${sourceId}:${line})`);
  });

  if (process.env.NODE_ENV === 'development') {
    const devUrl = 'http://localhost:5177';
    console.log('Loading development URL:', devUrl);
    mainWindow.loadURL(devUrl).catch(err => {
      console.error('Failed to load URL:', err);
    });
    mainWindow.webContents.openDevTools();
  } else {
    const distPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading production file:', distPath);
    mainWindow.loadFile(distPath).catch(err => {
      console.error('Failed to load file:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-gpu-sandbox');

app.whenReady().then(() => {
  console.log('App is ready');
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('save-file', async (_, content: string) => {
  try {
    const result = await dialog.showSaveDialog(mainWindow!, {
      title: '保存识别结果',
      defaultPath: `ocr-result-${Date.now()}.txt`,
      filters: [
        { name: '文本文件', extensions: ['txt'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content, 'utf-8');
      return { success: true, path: result.filePath };
    }

    return { success: false, canceled: true };
  } catch (error) {
    console.error('Save file error:', error);
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('open-file-dialog', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: '选择图片',
      filters: [
        { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'bmp'] },
      ],
      properties: ['openFile'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const filePath = result.filePaths[0];
      const fileContent = fs.readFileSync(filePath);
      const base64 = fileContent.toString('base64');
      const mimeType = getMimeType(filePath);
      return { success: true, dataUrl: `data:${mimeType};base64,${base64}` };
    }

    return { success: false, canceled: true };
  } catch (error) {
    console.error('Open file error:', error);
    return { success: false, error: (error as Error).message };
  }
});

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.bmp': 'image/bmp',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
