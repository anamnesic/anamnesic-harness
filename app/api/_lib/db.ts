import type { DataSource } from 'typeorm';

let db: DataSource | null = null;

export async function getDb(): Promise<DataSource> {
    if (db && db.isInitialized) return db;
    // Dynamic import defers the TypeORM entity module graph (which has circular
    // entity references) to runtime, avoiding ESM TDZ errors at bundle time.
    await import('reflect-metadata');
    const { getDatabase } = await import('@/src/core/database');
    db = await getDatabase();
    return db;
}
