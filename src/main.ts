import 'reflect-metadata';
import { getDatabase } from './core/database';

/**
 * Kairos - Main entry point
 *
 * Initializes the agent runtime and boots the configured interface.
 * Supported interfaces: api (MCP/REST), cli, dashboard (VS Code extension)
 *
 * Run modes:
 *   node dist/main.js              — agent core only
 *   node dist/interfaces/api/start-api.js   — MCP/REST server
 *   node dist/interfaces/cli/index.js       — CLI interface
 */

async function main() {
    await getDatabase();
    console.log('Kairos agent initialized.');
}

main().catch((err) => {
    console.error('Fatal error during initialization:', err);
    process.exit(1);
});
