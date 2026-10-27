import { app, BrowserWindow, ipcMain, dialog, shell, Menu, powerMonitor } from 'electron';
import path from 'path';
import { initDatabase, closeDatabase, getDatabase } from './database/connection';
import { runMigrations } from './database/migrations';
import { seedData } from './database/seed';
import { registerAllHandlers } from './ipc/handlers';
import { log } from './utils/logger';
import { getAppDataPath } from './utils/paths';

let mainWindow: BrowserWindow | null = null;
let suspendTimestamp: number | null = null;
let pendingDeepLinkUrl: string | null = null;

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const PROTOCOL = 'gatetracker';

// Register the custom protocol for OAuth deep links (must be before app.ready)
if (process.defaultApp) {
  // Dev mode: register with full path
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Single instance lock — ensures deep link opens the existing window
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    // On Windows/Linux the deep link URL is in argv
    const deepLinkUrl = argv.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (deepLinkUrl) {
      handleDeepLink(deepLinkUrl);
    }
    // Focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// macOS: handle protocol URL via open-url event
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

/**
 * Parse a deep link URL and forward auth tokens to the renderer.
 * Expected format: gatetracker://auth/callback#access_token=...&refresh_token=...
 * or: gatetracker://auth/callback?access_token=...&refresh_token=...
 */
function handleDeepLink(url: string): void {
  log(`Deep link received: ${url.substring(0, 80)}...`);

  try {
    // Extract fragment or query — Supabase puts tokens in the fragment (#)
    let paramString = '';
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      paramString = url.substring(hashIndex + 1);
    } else {
      const qIndex = url.indexOf('?');
      if (qIndex !== -1) {
        paramString = url.substring(qIndex + 1);
      }
    }

    if (!paramString) {
      log('Deep link had no parameters, ignoring.');
      return;
    }

    const params = new URLSearchParams(paramString);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      const payload = { access_token: accessToken, refresh_token: refreshToken };
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auth:deep-link', payload);
      } else {
        // Window not ready yet — store for later delivery
        pendingDeepLinkUrl = url;
      }
    } else {
      log('Deep link did not contain valid auth tokens.');
    }
  } catch (err) {
    log('Failed to parse deep link URL', err);
  }
}

function createWindow(): void {
  // Remove default application menu
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'GATE Tracker',
    icon: path.join(__dirname, '../resources/icon.svg'),
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
    // Deliver any pending deep link that arrived before window was ready
    if (pendingDeepLinkUrl) {
      handleDeepLink(pendingDeepLinkUrl);
      pendingDeepLinkUrl = null;
    }
  });

  // Prevent external navigation and safely open verified http(s) links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        shell.openExternal(url);
      }
    } catch (_) {}
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (VITE_DEV_SERVER_URL && url.startsWith(VITE_DEV_SERVER_URL)) {
      return;
    }
    const currentUrl = mainWindow?.webContents.getURL();
    if (url !== currentUrl && !url.startsWith('file://')) {
      event.preventDefault();
      try {
        const parsed = new URL(url);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          shell.openExternal(url);
        }
      } catch (_) {}
    }
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

// IPC: Open auth URL in default browser (for OAuth flows)
ipcMain.handle('auth:open-external', (_e, url: string) => {
  shell.openExternal(url);
});

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

    // Power monitor: Sleep & Suspend handling to prevent inflating timer study hours
    powerMonitor.on('suspend', () => {
      suspendTimestamp = Date.now();
      log('System sleep / suspend detected.');
      mainWindow?.webContents.send('power:suspend');
    });

    powerMonitor.on('resume', () => {
      const now = Date.now();
      const sleepDurationSeconds = suspendTimestamp ? Math.max(0, Math.floor((now - suspendTimestamp) / 1000)) : 0;
      suspendTimestamp = null;
      log(`System woke from sleep. Duration: ${sleepDurationSeconds}s`);
      mainWindow?.webContents.send('power:resume', sleepDurationSeconds);
    });
    
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
