/**
 * settings.ts — Application-wide settings with env-var overrides.
 */

export interface KairosSettings {
    env: 'development' | 'production' | 'test';
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    apiPort: number;
    dbPath: string;
    dataDir: string;
    maxAgentConcurrency: number;
    requestTimeoutMs: number;
}

function getSettings(): KairosSettings {
    return {
        env: (process.env.NODE_ENV as KairosSettings['env']) ?? 'development',
        logLevel: (process.env.LOG_LEVEL as KairosSettings['logLevel']) ?? 'info',
        apiPort: Number(process.env.KAIROS_API_PORT ?? 3000),
        dbPath: process.env.KAIROS_DB_PATH ?? 'kairos.sqlite',
        dataDir: process.env.KAIROS_DATA_DIR ?? 'data',
        maxAgentConcurrency: Number(process.env.KAIROS_MAX_CONCURRENCY ?? 4),
        requestTimeoutMs: Number(process.env.KAIROS_REQUEST_TIMEOUT_MS ?? 30_000),
    };
}

export const settings: KairosSettings = getSettings();
