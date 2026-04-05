import { DataSource } from 'typeorm';
import { Project } from './entities/Project';
import { ContextEntry } from './entities/ContextEntry';
import { Decision } from './entities/Decision';
import { ApiKey } from './entities/ApiKey';
import path from 'path';
import os from 'os';
import fs from 'fs';

const ALL_ENTITIES = [Project, ContextEntry, Decision, ApiKey];

export interface DatabaseOptions {
  /** Full path to the SQLite database file. Defaults to ~/.thinkcoffee/data.sqlite */
  dbPath?: string;
  /** Enable TypeORM query logging */
  logging?: boolean;
}

let dataSource: DataSource | null = null;

function getDefaultDbPath(): string {
  const dir = path.join(os.homedir(), '.thinkcoffee');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, 'data.sqlite');
}

export async function getDatabase(options: DatabaseOptions = {}): Promise<DataSource> {
  if (dataSource?.isInitialized) {
    return dataSource;
  }

  const dbPath = options.dbPath || getDefaultDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  dataSource = new DataSource({
    type: 'sqlite',
    database: dbPath,
    synchronize: true,
    logging: options.logging ?? false,
    entities: ALL_ENTITIES,
  });

  await dataSource.initialize();
  return dataSource;
}

export async function closeDatabase(): Promise<void> {
  if (dataSource?.isInitialized) {
    await dataSource.destroy();
    dataSource = null;
  }
}
