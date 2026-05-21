const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appDir = path.join(__dirname, '..');
const apiDir = path.join(appDir, 'app', 'api');
const backupDir = path.join(appDir, 'api-backup');

let renamed = false;

try {
  if (fs.existsSync(apiDir)) {
    console.log('Temporarily backing up API routes...');
    fs.renameSync(apiDir, backupDir);
    renamed = true;
  }

  console.log('Running static export build...');
  execSync('cross-env CAPACITOR_BUILD=true next build', {
    cwd: appDir,
    stdio: 'inherit',
  });

  console.log('Syncing Capacitor assets...');
  execSync('npx cap sync', {
    cwd: appDir,
    stdio: 'inherit',
  });

} catch (error) {
  console.error('Build failed:', error);
  process.exitCode = 1;
} finally {
  if (renamed && fs.existsSync(backupDir)) {
    console.log('Restoring API routes...');
    fs.renameSync(backupDir, apiDir);
  }
}
