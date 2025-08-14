const { execSync } = require('child_process');
const os = require('os');
const path = require('path');

const sourceRepo = 'Drehon/vsAPP';
const targetRepo = 'Drehon/vsAPP-public';

// Determine the correct path to the Python executable based on the OS
const pythonExecutable = os.platform() === 'win32'
  ? path.join('.venv', 'Scripts', 'python.exe')
  : path.join('.venv', 'bin', 'python');

// Create a robust path to the Python script
const scriptPath = path.join(__dirname, '..', 'transfer_releases.py');

// Construct the command with explicit paths to avoid ambiguity
const command = `"${pythonExecutable}" "${scriptPath}" ${sourceRepo} ${targetRepo}`;

try {
  console.log(`Executing: ${command}`);
  execSync(command, { stdio: 'inherit' });
  console.log('Publishing script executed successfully.');
} catch (error) {
  console.error('Failed to execute publishing script:', error);
  process.exit(1);
}
