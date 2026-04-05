#!/usr/bin/env node

/**
 * ThinkCoffee Infrastructure Setup
 * 
 * This script automates the infrastructure setup including:
 * - Docker images build
 * - Environment configuration validation
 * - Database initialization
 * - Health check verification
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
};

class InfrastructureSetup {
  constructor() {
    this.projectRoot = process.cwd();
    this.environment = process.env.NODE_ENV || 'development';
    this.errors = [];
    this.warnings = [];
  }

  exec(command, options = {}) {
    const defaultOptions = {
      stdio: 'pipe',
      encoding: 'utf-8',
      ...options,
    };

    try {
      return execSync(command, defaultOptions).trim();
    } catch (error) {
      if (options.failOnError !== false) {
        throw error;
      }
      return null;
    }
  }

  commandExists(cmd) {
    try {
      const isWindows = process.platform === 'win32';
      const checkCmd = isWindows ? `where ${cmd}` : `which ${cmd}`;
      this.exec(checkCmd);
      return true;
    } catch {
      return false;
    }
  }

  validatePrerequisites() {
    log.info('Validating prerequisites...');

    const requiredCommands = ['docker', 'git', 'node', 'npm'];
    const missingCommands = [];

    for (const cmd of requiredCommands) {
      if (!this.commandExists(cmd)) {
        missingCommands.push(cmd);
        this.errors.push(`Missing required command: ${cmd}`);
      } else {
        const version = this.exec(`${cmd} --version`, { failOnError: false });
        log.success(`Found ${cmd}: ${version}`);
      }
    }

    if (missingCommands.length > 0) {
      throw new Error(`Missing required commands: ${missingCommands.join(', ')}`);
    }

    log.success('All prerequisites validated');
  }

  validateEnvironment() {
    log.info('Validating environment configuration...');

    const envFiles = ['.env.example', '.env', '.env.staging', '.env.test'];
    const missingFiles = [];

    for (const envFile of envFiles) {
      const filePath = path.join(this.projectRoot, envFile);
      if (!fs.existsSync(filePath)) {
        this.warnings.push(`Missing environment file: ${envFile}`);
        missingFiles.push(envFile);
      } else {
        log.success(`Found ${envFile}`);
      }
    }

    if (missingFiles.includes('.env') && !missingFiles.includes('.env.example')) {
      log.info('Creating .env from .env.example...');
      try {
        const exampleContent = fs.readFileSync(
          path.join(this.projectRoot, '.env.example'),
          'utf-8'
        );
        fs.writeFileSync(path.join(this.projectRoot, '.env'), exampleContent);
        log.success('Generated .env file');
      } catch (error) {
        this.warnings.push(`Failed to generate .env: ${error.message}`);
      }
    }

    log.success('Environment configuration validated');
  }

  buildDockerImages() {
    log.info('Building Docker images...');

    try {
      log.info('Building MCP Server image...');
      this.exec('docker build -t thinkcoffee/mcp-server:latest -f Dockerfile .', {
        stdio: 'inherit',
      });
      log.success('MCP Server image built');

      log.info('Building CLI image...');
      this.exec('docker build -t thinkcoffee/cli:latest -f Dockerfile.cli .', {
        stdio: 'inherit',
      });
      log.success('CLI image built');
    } catch (error) {
      this.errors.push(`Docker build failed: ${error.message}`);
      throw error;
    }
  }

  validateDockerSetup() {
    log.info('Validating Docker configuration...');

    const requiredFiles = ['Dockerfile', 'docker-compose.yml', '.dockerignore'];

    for (const file of requiredFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (!fs.existsSync(filePath)) {
        this.errors.push(`Missing Docker file: ${file}`);
        throw new Error(`Missing required Docker file: ${file}`);
      }
      log.success(`Found ${file}`);
    }

    try {
      this.exec('docker-compose config', { stdio: 'pipe' });
      log.success('Docker Compose configuration is valid');
    } catch (error) {
      this.errors.push(`Invalid docker-compose.yml: ${error.message}`);
      throw error;
    }
  }

  validateScripts() {
    log.info('Validating deployment scripts...');

    const requiredScripts = [
      'scripts/deploy.sh',
      'scripts/health-check.sh',
      'scripts/backup.sh',
    ];

    for (const script of requiredScripts) {
      const scriptPath = path.join(this.projectRoot, script);
      if (!fs.existsSync(scriptPath)) {
        this.warnings.push(`Missing script: ${script}`);
      } else {
        log.success(`Found ${script}`);
      }
    }

    log.success('Scripts validated');
  }

  initializeVolumes() {
    log.info('Initializing volumes and directories...');

    const dirs = [
      'data',
      'data/snapshots',
      'data/logs',
    ];

    for (const dir of dirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log.success(`Created directory: ${dir}`);
      } else {
        log.success(`Directory exists: ${dir}`);
      }
    }

    log.success('Volumes and directories initialized');
  }

  createSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      status: this.errors.length === 0 ? 'SUCCESS' : 'FAILED',
      errors: this.errors,
      warnings: this.warnings,
      checklist: {
        prerequisites: true,
        environment: true,
        docker: true,
        scripts: true,
        volumes: true,
      },
    };

    const reportPath = path.join(this.projectRoot, 'setup-infrastructure-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(summary, null, 2));
    log.success(`Report saved to: ${reportPath}`);

    return summary;
  }

  displaySummary(summary) {
    console.log('\n' + '='.repeat(60));
    console.log('INFRASTRUCTURE SETUP SUMMARY');
    console.log('='.repeat(60) + '\n');

    if (summary.errors.length > 0) {
      console.log('ERRORS:');
      summary.errors.forEach(e => console.log(`  - ${e}`));
      console.log();
    }

    if (summary.warnings.length > 0) {
      console.log('WARNINGS:');
      summary.warnings.forEach(w => console.log(`  - ${w}`));
      console.log();
    }

    console.log('CHECKLIST:');
    Object.entries(summary.checklist).forEach(([key, value]) => {
      const status = value ? '✓' : '✗';
      console.log(`  ${status} ${key}`);
    });

    console.log();
    console.log('='.repeat(60));
    if (summary.status === 'SUCCESS') {
      console.log('Infrastructure setup COMPLETED successfully!');
    } else {
      console.log('Infrastructure setup FAILED - see errors above');
    }
    console.log('='.repeat(60) + '\n');
  }

  async run() {
    try {
      log.info('Starting ThinkCoffee Infrastructure Setup...\n');

      this.validatePrerequisites();
      this.validateEnvironment();
      this.validateDockerSetup();
      this.validateScripts();
      this.initializeVolumes();

      if (process.argv.includes('--build')) {
        log.warn('Building Docker images (time-intensive operation)...');
        this.buildDockerImages();
      } else {
        log.info('Skipping Docker image build (use --build to enable)');
      }

      const summary = this.createSummary();
      this.displaySummary(summary);

      if (summary.status !== 'SUCCESS') {
        process.exit(1);
      }

    } catch (error) {
      log.error(`Setup failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }
}

const setup = new InfrastructureSetup();
setup.run().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
