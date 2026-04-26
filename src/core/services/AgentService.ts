import { DataSource, Repository } from 'typeorm';
import { Agent, AgentState, AgentCapability } from '../entities/Agent';
import { getEventBus } from '@/src/observation/EventBus';

export interface CreateAgentInput {
  workspaceId: string;
  name: string;
  description?: string;
  capabilities: AgentCapability[];
  config?: Record<string, any>;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string;
  capabilities?: AgentCapability[];
  config?: Record<string, any>;
  state?: AgentState;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

const PREBUILT_AGENTS: Array<{
  name: string;
  description: string;
  capabilities: AgentCapability[];
  metadata: Record<string, any>;
}> = [
    {
      name: 'Inversao',
      description: 'Usa inversao antes do prompt para explorar o problema pelo angulo contrario.',
      capabilities: ['reasoning', 'learning'],
      metadata: {
        prebuilt: true,
        strategy: 'prefix',
        dedicatedPrompt: 'Inversao: antes de responder, formule o inverso do problema para revelar pontos cegos.\\n\\nPROMPT ORIGINAL:\\n{{prompt}}',
      },
    },
    {
      name: 'Seja Socratico',
      description: 'Ensina por perguntas socraticas no final da resposta para aumentar aprendizado.',
      capabilities: ['reasoning', 'learning'],
      metadata: {
        prebuilt: true,
        strategy: 'suffix',
        dedicatedPrompt: '{{prompt}}\\n\\nNo fim da resposta, seja socratico: faca perguntas guiadas para eu aprender o raciocinio.',
      },
    },
    {
      name: 'First Principles',
      description: 'Quebra o problema em partes menores usando first principles.',
      capabilities: ['reasoning', 'code-analysis'],
      metadata: {
        prebuilt: true,
        strategy: 'decomposition',
        dedicatedPrompt: 'Use first principles com base em prompt_do_problema para quebrar em partes menores e resolver em etapas.\\n\\nprompt_do_problema:\\n{{prompt_do_problema}}',
      },
    },
    {
      name: 'Responda anti-consenso',
      description: 'Entrega visao anti-consenso, direta e sem suavizacao.',
      capabilities: ['reasoning', 'code-analysis'],
      metadata: {
        prebuilt: true,
        strategy: 'truth-bias',
        dedicatedPrompt: 'Responda anti-consenso: diga a verdade nua e crua, com vies assumido e argumentos objetivos.',
      },
    },
    {
      name: 'Prompt Engineer',
      description: 'Refina prompts com contexto tecnico e objetivos claros para execucao por LLMs.',
      capabilities: ['reasoning', 'learning'],
      metadata: { prebuilt: true, role: 'prompt-engineer' },
    },
    {
      name: 'Architect',
      description: 'Define arquitetura, contratos de API e estrutura tecnica do projeto.',
      capabilities: ['reasoning', 'code-analysis'],
      metadata: { prebuilt: true, role: 'architect' },
    },
    {
      name: 'Backend Engineer',
      description: 'Implementa regras de negocio, APIs e integracoes do servidor.',
      capabilities: ['code-generation', 'code-analysis', 'execution'],
      metadata: { prebuilt: true, role: 'backend' },
    },
    {
      name: 'Frontend Engineer',
      description: 'Construi interfaces, fluxos de tela e integrações no cliente.',
      capabilities: ['code-generation', 'reasoning'],
      metadata: { prebuilt: true, role: 'frontend' },
    },
    {
      name: 'QA Engineer',
      description: 'Valida qualidade, testes e regressao funcional.',
      capabilities: ['code-analysis', 'reasoning', 'execution'],
      metadata: { prebuilt: true, role: 'qa' },
    },
  ];

export class AgentService {
  private repo: Repository<Agent>;

  constructor(private db: DataSource) {
    this.repo = db.getRepository(Agent);
  }

  async create(input: CreateAgentInput): Promise<Agent> {
    const agent = this.repo.create({
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description || null,
      capabilities: input.capabilities,
      config: input.config || null,
      state: 'idle',
      isActive: input.isActive ?? true,
      metadata: input.metadata || null,
    });
    return this.repo.save(agent);
  }

  async getById(id: string): Promise<Agent | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['tasks'],
    });
  }

  async getByName(workspaceId: string, name: string): Promise<Agent | null> {
    return this.repo.findOne({
      where: { workspaceId, name },
    });
  }

  async listByWorkspace(workspaceId: string, onlyActive: boolean = true): Promise<Agent[]> {
    return this.repo.find({
      where: onlyActive ? { workspaceId, isActive: true } : { workspaceId },
      relations: ['tasks'],
      order: { createdAt: 'DESC' },
    });
  }

  async ensurePrebuiltAgents(workspaceId: string): Promise<Agent[]> {
    const existing = await this.listByWorkspace(workspaceId, false);
    const existingNames = new Set(existing.map((agent) => agent.name.trim().toLowerCase()));

    for (const prebuilt of PREBUILT_AGENTS) {
      if (existingNames.has(prebuilt.name.trim().toLowerCase())) continue;
      await this.create({
        workspaceId,
        name: prebuilt.name,
        description: prebuilt.description,
        capabilities: prebuilt.capabilities,
        isActive: true,
        metadata: prebuilt.metadata,
      });
    }

    return this.listByWorkspace(workspaceId, false);
  }

  async update(id: string, input: UpdateAgentInput): Promise<Agent | null> {
    await this.repo.update(id, input);
    return this.getById(id);
  }

  async setState(id: string, state: AgentState): Promise<Agent | null> {
    await this.repo.update(id, {
      state,
      lastActivityAt: new Date(),
    });
    const agent = await this.getById(id);
    if (agent) {
      getEventBus().emit('agent:state', { id, state, agent });
    }
    return agent;
  }

  async incrementStats(id: string, success: boolean): Promise<void> {
    const agent = await this.getById(id);
    if (!agent) return;

    if (success) {
      await this.repo.update(id, { tasksCompleted: agent.tasksCompleted + 1 });
    } else {
      await this.repo.update(id, { tasksFailed: agent.tasksFailed + 1 });
    }

    await this.repo.update(id, { lastActivityAt: new Date() });

    const updated = await this.getById(id);
    if (updated) {
      getEventBus().emit('agent:stats', {
        id,
        tasksCompleted: updated.tasksCompleted,
        tasksFailed: updated.tasksFailed,
        agent: updated
      });
    }
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async getActiveAgents(workspaceId: string): Promise<Agent[]> {
    return this.repo.find({
      where: {
        workspaceId,
        isActive: true,
        state: 'idle', // or 'running'
      },
    });
  }

  async getStats(workspaceId: string): Promise<{
    totalAgents: number;
    activeAgents: number;
    totalTasksCompleted: number;
    totalTasksFailed: number;
  }> {
    const agents = await this.listByWorkspace(workspaceId, false);
    const activeAgents = agents.filter((a) => a.isActive).length;
    const totalTasksCompleted = agents.reduce((sum, a) => sum + a.tasksCompleted, 0);
    const totalTasksFailed = agents.reduce((sum, a) => sum + a.tasksFailed, 0);

    return {
      totalAgents: agents.length,
      activeAgents,
      totalTasksCompleted,
      totalTasksFailed,
    };
  }
}
