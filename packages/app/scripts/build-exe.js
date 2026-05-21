#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..');
const distDir = path.join(appDir, 'dist');
const standaloneDir = path.join(appDir, 'out', 'standalone');

console.log('Building Windows executable for Kairos...');

// Run Next.js production build
console.log('\nRunning Next.js production build...');
try {
  const cleanEnv = { ...process.env };
  delete cleanEnv.INIT_CWD;
  delete cleanEnv.PNPM_WORKSPACE_PATH;
  delete cleanEnv.npm_config_local_prefix;

  execSync('npx next build --webpack', {
    cwd: appDir,
    env: cleanEnv,
    stdio: 'inherit'
  });
} catch (err) {
  console.error('Next.js build failed:', err.message);
  process.exit(1);
}

// Check if standalone build exists
if (!fs.existsSync(standaloneDir)) {
  console.error('Error: Standalone build not found at', standaloneDir);
  console.error('Please run "npm run build" first.');
  process.exit(1);
}

// Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Create a launcher script that works with pkg
const launcherScript = path.join(standaloneDir, 'launcher.js');
const serverPath = path.join(standaloneDir, 'packages', 'app', 'server.js');

// Verify server.js exists
if (!fs.existsSync(serverPath)) {
  console.error('Error: Server file not found at', serverPath);
  process.exit(1);
}

// Write launcher script
fs.writeFileSync(launcherScript, `#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Resolve paths relative to executable
const exeDir = path.dirname(process.execPath);
const standaloneDir = path.join(exeDir);
const serverPath = path.join(standaloneDir, 'packages', 'app', 'server.js');

console.log('Starting Kairos server...');
console.log('Server path:', serverPath);

// Check if server exists
if (!fs.existsSync(serverPath)) {
  console.error('Error: Server not found at', serverPath);
  process.exit(1);
}

// Set environment
const env = {
  ...process.env,
  NODE_ENV: 'production',
  PORT: process.env.PORT || '3000'
};

const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: env,
  cwd: path.join(standaloneDir, 'packages', 'app')
});

server.on('close', (code) => {
  console.log('Server exited with code ' + code);
  process.exit(code);
});

server.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
`);

// Create package.json for pkg in standalone directory
const pkgPackageJson = {
  name: 'kairos',
  version: '1.0.0',
  description: 'Kairos AI App',
  main: 'launcher.js',
  bin: 'launcher.js',
  pkg: {
    scripts: 'launcher.js',
    assets: ['**/*'],
    targets: ['node18-win-x64']
  }
};

fs.writeFileSync(
  path.join(standaloneDir, 'package.json'),
  JSON.stringify(pkgPackageJson, null, 2)
);

// Install pkg if not present
try {
  execSync('pkg --version', { stdio: 'ignore' });
  console.log('pkg is already installed');
} catch {
  console.log('Installing pkg...');
  execSync('npm install -g pkg', { stdio: 'inherit' });
}

// Run pkg
console.log('\nRunning pkg to create executable...');
try {
  const outputExe = path.join(distDir, 'kairos.exe');
  execSync(
    `pkg "${standaloneDir}" --targets node18-win-x64 --output "${outputExe}"`,
    { stdio: 'inherit' }
  );
  console.log('\n✅ Executable built successfully!');
  console.log('Output:', outputExe);
  console.log('\nTo run: Double-click kairos.exe or run from command line');
} catch (err) {
  console.error('Failed to build executable:', err.message);
  process.exit(1);
}
