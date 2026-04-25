import 'reflect-metadata';
import { getDatabase } from '@/src/core/database';
import type { DataSource } from 'typeorm';

let db: DataSource | null = null;

export async function getDb(): Promise<DataSource> {
    if (db && db.isInitialized) return db;
    db = await getDatabase();
    return db;
}
