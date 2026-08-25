import { build } from 'esbuild';
import { spawn } from 'child_process';

// Build electron files
await build({
  entryPoints: ['electron/main.ts', 'electron/preload.ts'],
  bundle: true,
  platform: 'node',
  outdir: 'dist-electron',
  external: ['electron', 'better-sqlite3'],
  format: 'cjs',
  sourcemap: true,
  target: 'node20',
});

console.log('Electron build complete. Starting Vite...');

// Start Vite dev server
const vite = spawn('npx', ['vite', '--port', '5173'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
});

// Wait for Vite to start
await new Promise(resolve => setTimeout(resolve, 4000));

console.log('Starting Electron...');

// Start Electron with dev server URL
const electronProc = spawn('npx', ['electron', '.'], {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: 'development',
    VITE_DEV_SERVER_URL: 'http://localhost:5173',
  },
});

electronProc.on('close', (code) => {
  vite.kill();
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  electronProc.kill();
  vite.kill();
  process.exit();
});
