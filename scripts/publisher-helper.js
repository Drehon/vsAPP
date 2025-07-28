const { spawn } = require('child_process');
const path = require('path');
require('dotenv').config(); // Ensure this is at the very top

// Add this line for debugging:
console.log('DEBUG: GITHUB_TOKEN from .env:', process.env.GITHUB_TOKEN ? 'Loaded' : 'NOT Loaded');
// If you want to see the actual token value (be careful with logs):
// console.log('DEBUG: GITHUB_TOKEN value:', process.env.GITHUB_TOKEN);

const forgeExecutable = path.join(process.cwd(), 'node_modules', '.bin', 'electron-forge.cmd');
console.log('DEBUG: Resolved electron-forge executable path:', forgeExecutable);

// Ensure the GITHUB_TOKEN is available in the environment for the spawned process
const env = { ...process.env, GITHUB_TOKEN: process.env.GITHUB_TOKEN };

const child = spawn(forgeExecutable, ['publish'], {
  stdio: 'inherit', // This makes the child process's output appear in the parent process
  env: env,
  shell: true // Use shell to ensure .cmd files are executed correctly on Windows
});

child.on('close', (code) => {
  if (code !== 0) {
    console.error(`electron-forge publish process exited with code ${code}`);
    process.exit(code);
  } else {
    console.log('electron-forge publish process completed successfully.');
  }
});

child.on('error', (err) => {
  console.error('Failed to start electron-forge publish process:', err);
  process.exit(1);
});
