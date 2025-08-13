const { spawnSync } = require('child_process');
const path = require('path');
require('dotenv').config();

// This script is now only called by the `npm run publish` command.
// The recursion guards are no longer needed.

const forgeExecutable = path.join(process.cwd(), 'node_modules', '.bin', 'electron-forge.cmd');

// The --skip-package flag is used because `npm run make` has already built the app.
const result = spawnSync(`"${forgeExecutable}"`, ['publish', '--skip-package'], {
  stdio: 'inherit',
  env: { ...process.env },
  shell: true,
});

if (result.status !== 0) {
  process.exit(result.status);
}
