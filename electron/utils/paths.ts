import path from 'path';
import { app } from 'electron';
import fs from 'fs';

export function getAppDataPath(): string {
  const appDataPath = path.join(app.getPath('userData'));
  if (!fs.existsSync(appDataPath)) {
    fs.mkdirSync(appDataPath, { recursive: true });
  }
  return appDataPath;
}

export function getBackupPath(): string {
  const backupPath = path.join(getAppDataPath(), 'backups');
  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }
  return backupPath;
}

export function getLogPath(): string {
  const logPath = path.join(getAppDataPath(), 'logs');
  if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
  }
  return logPath;
}
