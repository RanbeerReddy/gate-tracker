import { build } from 'esbuild';

await build({
  entryPoints: ['electron/main.ts', 'electron/preload.ts'],
  bundle: true,
  platform: 'node',
  outdir: 'dist-electron',
  external: ['electron', 'better-sqlite3'],
  format: 'cjs',
  sourcemap: false,
  minify: true,
  target: 'node20',
});

console.log('Electron build complete.');
