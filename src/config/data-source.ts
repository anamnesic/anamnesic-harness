import { DataSource } from 'typeorm';
import { Project } from '../core/entities/Project';

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: 'database.sqlite',
  synchronize: true,
  logging: false,
  entities: [Project],
  migrations: [],
  subscribers: [],
});
