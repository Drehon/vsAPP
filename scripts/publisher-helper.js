const { spawnSync } = require('child_process'); // Changed to spawnSync
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Ensure this is at the very top

// --- RECURSION GUARD (Lock File Method) ---
// To prevent an infinite loop (make -> postMake -> publish -> make),
// we create a lock file. If this script is run while the lock file
// exists, it means it's a recursive call, and we should exit.
const lockFilePath = path.join(process.cwd(), '.publish.lock');

if (fs.existsSync(lockFilePath)) {
  console.log('DEBUG: Lock file found. Exiting to prevent recursive loop.');
  process.exit(0); // Exit successfully to not fail the build.
}

try {
  // Create the lock file to signal the script is running.
  fs.writeFileSync(lockFilePath, `locked at: ${new Date().toISOString()}`);
  console.log('DEBUG: Lock file created.');

  // The original script logic continues here.
  console.log('DEBUG: GITHUB_TOKEN from .env:', process.env.GITHUB_TOKEN ? 'Loaded' : 'NOT Loaded');

  const forgeExecutable = path.join(process.cwd(), 'node_modules', '.bin', 'electron-forge.cmd');
  console.log('DEBUG: Resolved electron-forge executable path:', forgeExecutable);

  const env = { ...process.env };

  // Call publish synchronously to prevent file locking errors.
  // The --skip-package flag is still used to avoid re-running the 'make' step.
  const result = spawnSync(`"${forgeExecutable}"`, ['publish', '--skip-package'], {
    stdio: 'inherit',
    env: env,
    shell: true
  });

  // Check the exit code from the synchronous process.
  if (result.status !== 0) {
    console.error(`electron-forge publish process exited with code ${result.status}`);
    process.exit(result.status);
  } else {
    console.log('electron-forge publish process completed successfully.');
  }

} finally {
  // This 'finally' block ensures the lock file is removed even if errors occur.
  if (fs.existsSync(lockFilePath)) {
    fs.unlinkSync(lockFilePath);
    console.log('DEBUG: Lock file cleaned up.');
  }
}
