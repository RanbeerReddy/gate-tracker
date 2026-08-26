import { app, BrowserWindow, ipcMain, dialog, shell, Menu } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase, getDatabase } from './database/connection';
import { runMigrations } from './database/migrations';
import { seedData } from './database/seed';
import { registerAllHandlers } from './ipc/handlers';
import { log } from './utils/logger';
import { getAppDataPath } from './utils/paths';

let mainWindow: BrowserWindow | null = null;

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

function createWindow(): void {
  // Remove default application menu
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'GATE Tracker',
    icon: path.join(__dirname, '../resources/icon.ico'),
    backgroundColor: '#0f1117',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.removeMenu();

  // Show when ready to avoid flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Prevent external navigation
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Handle window close - warn if active session
  mainWindow.on('close', async (e) => {
    try {
      const db = getDatabase();
      if (db) {
        const activeSession = db.prepare('SELECT session_data FROM active_session WHERE id = 1').get() as any;
        if (activeSession?.session_data) {
          const parsed = JSON.parse(activeSession.session_data);
          if (parsed.isActive) {
            e.preventDefault();
            const result = dialog.showMessageBoxSync(mainWindow!, {
              type: 'warning',
              buttons: ['Save & Close', 'Cancel'],
              defaultId: 1,
              title: 'Active Study Session',
              message: 'You have an active study session. Closing will save the session automatically.',
            });
            if (result === 0) {
              // Save the session via IPC
              mainWindow?.webContents.send('force-save-session');
              setTimeout(() => {
                mainWindow?.destroy();
              }, 500);
            }
          }
        }
      }
    } catch (err) {
      log('Error checking active session on close', err);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    log('Starting GATE Tracker...');
    const dbPath = path.join(getAppDataPath(), 'gate-tracker.db');
    log(`Database path: ${dbPath}`);
    
    initDatabase(dbPath);
    runMigrations();
    seedData();
    registerAllHandlers();
    
    createWindow();
    
    log('GATE Tracker started successfully.');
  } catch (err) {
    log('Failed to start application', err);
    dialog.showErrorBox('Startup Error', 'GATE Tracker failed to start. Please check the log file for details.');
    app.quit();
  }
});

app.on('window-all-closed', () => {
  closeDatabase();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log('Uncaught exception', err);
});

process.on('unhandledRejection', (err) => {
  log('Unhandled rejection', err);
});
