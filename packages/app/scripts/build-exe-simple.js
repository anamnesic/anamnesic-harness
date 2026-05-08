#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const appDir = process.cwd();
const distDir = path.join(appDir, 'dist');
const standaloneDir = path.join(appDir, 'out', 'standalone');
const serverPath = path.join(standaloneDir, 'packages', 'app', 'server.js');

console.log('Building Windows executable for Kairos...');

// Check if standalone build exists
if (!fs.existsSync(serverPath)) {
  console.error('Error: Standalone server not found at', serverPath);
  console.error('Please run "npm run build" first.');
  process.exit(1);
}

// Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Create a Windows batch file launcher
const batchContent = `@echo off
setlocal
set "DIR=%~dp0"
set "NODE_EXE=%DIR%node.exe"
set "SERVER_JS=%DIR%standalone\\packages\\app\\server.js"

if not exist "%NODE_EXE%" (
  echo Error: node.exe not found at %NODE_EXE%
  echo Please download Node.js and place node.exe in the same folder as this batch file.
  pause
  exit /b 1
)

if not exist "%SERVER_JS%" (
  echo Error: Server not found at %SERVER_JS%
  pause
  exit /b 1
)

echo Starting Kairos server...
cd "%DIR%standalone\\packages\\app"
"%NODE_EXE%" "%SERVER_JS%"
`;

const batchPath = path.join(distDir, 'kairos.bat');
fs.writeFileSync(batchPath, batchContent);
console.log('✅ Created batch launcher:', batchPath);

// Download Node.exe for Windows
console.log('\nTo create a standalone executable:');
console.log('1. Download Node.js Windows binary (node.exe) from https://nodejs.org/dist/v22.17.0/win-x64/node.exe');
console.log('2. Place node.exe in the', distDir, 'folder');
console.log('3. Copy the entire', standaloneDir, 'folder into', distDir);
console.log('4. Run kairos.bat');
console.log('\nOr use nexe for a true single executable:');
console.log('  npm install -g nexe');
console.log('  nexe --target windows-x64-22.17.0 --input', serverPath, '--output', path.join(distDir, 'kairos.exe'));
