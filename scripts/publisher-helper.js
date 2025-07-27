// scripts/publish-helper.js

// Load environment variables from the .env file
// This must be at the very top of the script to ensure variables are available
require('dotenv').config();

const { spawn } = require('child_process');
const path = require('path');

// Determine the correct path to the electron-forge CLI executable
// This handles both Windows (.cmd) and Unix-like environments (no extension)
const forgeExecutable = process.platform === 'win32'
  ? path.join(__dirname, '..', 'node_modules', '.bin', 'electron-forge.cmd')
  : path.join(__dirname, '..', 'node_modules', '.bin', 'electron-forge');

console.log('DEBUG: Resolved electron-forge executable path:', forgeExecutable);

// Arguments to pass to electron-forge (in this case, 'publish')
const args = ['publish'];

let command;
let commandArgs;

if (process.platform === 'win32') {
  // On Windows, explicitly use cmd.exe to run the .cmd file
  command = 'cmd.exe';
  commandArgs = ['/c', forgeExecutable, ...args]; // /c tells cmd.exe to run the command and then terminate
} else {
  // On Unix-like systems, execute directly
  command = forgeExecutable;
  commandArgs = args;
}

// Spawn the electron-forge process
// 'stdio: inherit' ensures that the output from electron-forge is shown in the parent terminal
// 'env: process.env' passes all current environment variables (including GITHUB_TOKEN loaded by dotenv)
const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  env: process.env,
});

// Handle potential errors during process spawning
child.on('error', (err) => {
  console.error(`Failed to start electron-forge process: ${err.message}`);
});

// Listen for the child process to close
child.on('close', (code) => {
  if (code !== 0) {
    console.error(`electron-forge publish process exited with code ${code}`);
    // Exit the helper script with the same error code
    process.exit(code);
  } else {
    console.log('electron-forge publish process completed successfully.');
  }
});
