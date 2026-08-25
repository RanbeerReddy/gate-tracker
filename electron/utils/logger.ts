import fs from 'fs';
import path from 'path';
import { getLogPath } from './paths';

let logStream: fs.WriteStream | null = null;

function getLogStream(): fs.WriteStream {
  if (!logStream) {
    const logDir = getLogPath();
    const logFile = path.join(logDir, `gate-tracker-${new Date().toISOString().slice(0, 10)}.log`);
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
  }
  return logStream;
}

export function log(message: string, error?: any): void {
  const timestamp = new Date().toISOString();
  const logLine = error
    ? `[${timestamp}] ${message}: ${error?.message || error}\n${error?.stack || ''}\n`
    : `[${timestamp}] ${message}\n`;
  
  try {
    getLogStream().write(logLine);
  } catch {
    // If we can't write to log file, at least output to console
    console.log(logLine);
  }
  
  if (process.env.NODE_ENV === 'development') {
    console.log(logLine);
  }
}

export function closeLogger(): void {
  if (logStream) {
    logStream.end();
    logStream = null;
  }
}
