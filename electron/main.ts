import { app, BrowserWindow, shell, globalShortcut, Tray, Menu, nativeImage, ipcMain, dialog } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { isDev } from './utils';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    backgroundColor: '#00000000', // Ensure transparency
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(false);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  const startUrl = process.env.ELECTRON_START_URL;
  if (startUrl) {
    mainWindow.loadURL(startUrl);
  } else if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(join(__dirname, '../index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const fs = await import('fs/promises');
  const os = await import('os');

  ipcMain.handle('get-system-info', async () => ({
    platform: os.platform(),
    release: os.release(),
    arch: os.arch(),
    hostname: os.hostname(),
    totalMemory: os.totalmem(),
    freeMemory: os.freemem(),
    homeDir: os.homedir(),
    cpus: os.cpus().length,
    uptime: os.uptime(),
  }));

  ipcMain.handle('run-command', async (_, command: string) => {
    try {
      const { stdout, stderr } = await execAsync(command);
      return { success: true, output: stdout || stderr };
    } catch (err: any) {
      return { success: false, output: err.message };
    }
  });

  ipcMain.handle('list-home-files', async () => {
    try {
      const home = os.homedir();
      const files = await fs.readdir(home);
      return files.slice(0, 50).map(name => ({
        name,
        path: join(home, name),
        isDirectory: !name.includes('.')
      }));
    } catch (err) {
      return [];
    }
  });

  ipcMain.handle('select-directory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    });
    if (canceled) return null;
    return filePaths[0];
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function createTray() {
  // Using a dot or simple image for tray if icon not found
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show/Hide OS (Alt+Space)', click: () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow?.show();
      }
    }},
    { type: 'separator' },
    { label: 'Quit Lumi OS', click: () => app.quit() }
  ]);

  tray.setToolTip('Lumi Virtual Node OS');
  tray.setContextMenu(contextMenu);
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  globalShortcut.register('Alt+Space', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow?.show();
      mainWindow?.focus();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
