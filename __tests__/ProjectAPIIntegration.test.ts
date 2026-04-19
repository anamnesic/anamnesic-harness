import request from 'supertest';
import express from 'express';
import { DataSource } from 'typeorm';
import projectRoutes from '../src/routes/projectRoutes';
import { Project } from '../src/entities/Project';

const app = express();
app.use(express.json());
app.use('/projects', projectRoutes);

describe('Project API Integration', () => {
  let db: DataSource;

  beforeAll(async () => {
    db = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Project],
      synchronize: true,
    });
    await db.initialize();
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('should create a project via POST /projects', async () => {
    const response = await request(app)
      .post('/projects')
      .send({ name: 'Integration Test Project', description: 'Integration Test Description' });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
    expect(response.body.name).toBe('Integration Test Project');
  });

  it('should list projects via GET /projects', async () => {
    const response = await request(app).get('/projects');

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
  });
});