import { DataSource } from 'typeorm';
import { Project } from './entities/Project';
import { ContextEntry } from './entities/ContextEntry';
import { Decision } from './entities/Decision';
import { ApiKey } from './entities/ApiKey';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'database.sqlite',
  synchronize: true,
  logging: true,
  entities: [Project, ContextEntry, Decision, ApiKey],
  migrations: [],
  subscribers: [],
});