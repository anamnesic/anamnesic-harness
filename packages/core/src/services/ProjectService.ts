import { DataSource } from 'typeorm';
import { Project } from '../entities/Project';
import { CreateProjectInput, UpdateProjectInput } from '../validation/schemas';

export class ProjectService {
  private repo;

  constructor(private db: DataSource) {
    this.repo = db.getRepository(Project);
  }

  async list() {
    return this.repo.find({
      relations: ['contextEntries', 'decisions'],
      order: { createdAt: 'DESC' },
    });
  }

  async get(id: string) {
    return this.repo.findOne({
      where: { id },
      relations: ['contextEntries', 'decisions'],
    });
  }

  async findByName(name: string) {
    return this.repo.findOne({
      where: { name },
      relations: ['contextEntries', 'decisions'],
    });
  }

  async create(input: CreateProjectInput) {
    const project = this.repo.create(input);
    return this.repo.save(project);
  }

  async update(id: string, input: UpdateProjectInput) {
    const project = await this.get(id);
    if (!project) throw new Error(`Project not found: ${id}`);
    Object.assign(project, input);
    return this.repo.save(project);
  }

  async delete(id: string) {
    const project = await this.get(id);
    if (!project) throw new Error(`Project not found: ${id}`);
    await this.repo.remove(project);
    return true;
  }
}
