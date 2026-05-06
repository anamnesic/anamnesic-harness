/**
 * Logger - Simple singleton console logger for Kairos services.
 */
export class Logger {
    private static instance: Logger;
    private readonly prefix: string;

    private constructor(prefix = 'Kairos') {
        this.prefix = prefix;
    }

    static getInstance(prefix?: string): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(prefix);
        }
        return Logger.instance;
    }

    info(message: string, ...args: unknown[]): void {
        console.log(`[INFO][${this.prefix}] ${message}`, ...args);
    }

    warn(message: string, ...args: unknown[]): void {
        console.warn(`[WARN][${this.prefix}] ${message}`, ...args);
    }

    error(message: string, ...args: unknown[]): void {
        console.error(`[ERROR][${this.prefix}] ${message}`, ...args);
    }

    debug(message: string, ...args: unknown[]): void {
        if (process.env.LOG_LEVEL === 'debug') {
            console.debug(`[DEBUG][${this.prefix}] ${message}`, ...args);
        }
    }
}
