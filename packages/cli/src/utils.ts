import { getDatabase, ProjectService, ContextService, DecisionService } from '@thinkcoffee/core';
import type { DataSource } from 'typeorm';

let _db: DataSource | null = null;

async function db() {
  if (!_db) _db = await getDatabase();
  return _db;
}

export async function getServices() {
  const dataSource = await db();
  return {
    projects: new ProjectService(dataSource),
    contexts: new ContextService(dataSource),
    decisions: new DecisionService(dataSource),
  };
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}
