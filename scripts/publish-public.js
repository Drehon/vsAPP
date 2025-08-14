const { execSync } = require('child_process');
const os = require('os');

const sourceRepo = 'Drehon/vsAPP';
const targetRepo = 'Drehon/vsAPP-public';

let command;

if (os.platform() === 'win32') {
  command = `.venv\\Scripts\\activate && python transfer_releases.py ${sourceRepo} ${targetRepo}`;
} else {
  command = `source .venv/bin/activate && python transfer_releases.py ${sourceRepo} ${targetRepo}`;
}

try {
  console.log(`Executing: ${command}`);
  execSync(command, { stdio: 'inherit' });
  console.log('Publishing script executed successfully.');
} catch (error) {
  console.error('Failed to execute publishing script:', error);
  process.exit(1);
}
