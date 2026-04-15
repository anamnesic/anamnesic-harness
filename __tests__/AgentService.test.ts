import { DataSource } from 'typeorm';
import { AgentService } from '../src/services/AgentService';
import { Agent } from '../src/entities/Agent';

describe('AgentService', () => {
  let db: DataSource;
  let service: AgentService;

  beforeAll(async () => {
    db = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [Agent],
      synchronize: true,
    });
    await db.initialize();
    service = new AgentService(db);
  });

  afterAll(async () => {
    await db.destroy();
  });

  it('should register a new agent', async () => {
    const agent = await service.register({ name: 'Test Agent', role: 'qa' });
    expect(agent.id).toBeDefined();
    expect(agent.name).toBe('Test Agent');
  });

  it('should list all agents', async () => {
    await service.register({ name: 'Another Agent', role: 'backend' });
    const agents = await service.list();
    expect(agents.length).toBeGreaterThan(0);
  });

  it('should handle errors during agent registration', async () => {
    await expect(service.register({ name: '', role: '' })).rejects.toThrow('Invalid agent data');
  });

  it('should execute tasks in parallel', async () => {
    const tasks = [
      service.executeTask('task1'),
      service.executeTask('task2'),
    ];
    const results = await Promise.all(tasks);
    expect(results).toHaveLength(2);
  });
});