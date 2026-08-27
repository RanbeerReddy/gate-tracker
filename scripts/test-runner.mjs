import { spawn } from 'node:child_process';
import path from 'node:path';
import electron from 'electron';

const testFile = path.resolve('tests/suite.test.mjs');

const child = spawn(electron, [testFile], {
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
  },
  stdio: 'inherit',
});

child.on('close', (code) => {
  process.exit(code || 0);
});
