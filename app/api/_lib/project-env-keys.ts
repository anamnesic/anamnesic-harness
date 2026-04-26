import { getDb } from '@/app/api/_lib/db';

export const PROVIDER_ENV_MAP = {
    claude: 'ANTHROPIC_API_KEY',
    chatgpt: 'OPENAI_API_KEY',
    gemini: 'GEMINI_API_KEY',
} as const;

export type ApiProvider = keyof typeof PROVIDER_ENV_MAP;

export interface ProviderKeyStatus {
    provider: ApiProvider;
    envVar: string;
    isConfigured: boolean;
    maskedValue: string | null;
}

interface ProjectLike {
    id: string;
    metadata?: Record<string, unknown> | null;
}

function isApiProvider(value: string): value is ApiProvider {
    return value === 'claude' || value === 'chatgpt' || value === 'gemini';
}

function unquote(value: string): string {
    const trimmed = value.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}

function maskValue(value: string): string {
    if (!value) {
        return '********';
    }
    if (value.length <= 8) {
        return `${value.slice(0, 1)}******${value.slice(-1)}`;
    }
    return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function parseEnvValue(raw: string, key: string): string | null {
    const lines = raw.split(/\r?\n/);
    const matcher = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*(.*)$`);
    for (const line of lines) {
        const match = line.match(matcher);
        if (!match) {
            continue;
        }
        return unquote(match[1] ?? '');
    }
    return null;
}

function formatEnvValue(value: string): string {
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}"`;
}

function upsertEnvValue(raw: string, key: string, value: string): string {
    const normalizedRaw = raw ?? '';
    const newline = normalizedRaw.includes('\r\n') ? '\r\n' : '\n';
    const lines = normalizedRaw.length ? normalizedRaw.split(/\r?\n/) : [];
    const matcher = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`);
    const nextLine = `${key}=${formatEnvValue(value)}`;

    let replaced = false;
    const nextLines = lines.map((line) => {
        if (!replaced && matcher.test(line)) {
            replaced = true;
            return nextLine;
        }
        return line;
    });

    if (!replaced) {
        if (nextLines.length > 0 && nextLines[nextLines.length - 1].trim() !== '') {
            nextLines.push('');
        }
        nextLines.push(nextLine);
    }

    return nextLines.join(newline);
}

function removeEnvValue(raw: string, key: string): string {
    const normalizedRaw = raw ?? '';
    const newline = normalizedRaw.includes('\r\n') ? '\r\n' : '\n';
    const lines = normalizedRaw.length ? normalizedRaw.split(/\r?\n/) : [];
    const matcher = new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`);

    return lines.filter((line) => !matcher.test(line)).join(newline);
}

async function getProject(projectId: string): Promise<ProjectLike> {
    const db = await getDb();
    const { Project } = await import('@/src/core/entities/Project');
    const projectRepo = db.getRepository(Project);
    const project = await projectRepo.findOne({ where: { id: projectId } });

    if (!project) {
        throw new Error('Projeto nao encontrado');
    }

    return project as unknown as ProjectLike;
}

export async function resolveProjectEnvFile(projectId: string): Promise<{ repoPath: string; envFilePath: string }> {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const project = await getProject(projectId);
    const localPath = typeof project.metadata?.localPath === 'string'
        ? project.metadata.localPath.trim()
        : '';

    if (!localPath) {
        throw new Error('O repositorio selecionado nao possui caminho local configurado');
    }

    let stat;
    try {
        stat = await fs.stat(localPath);
    } catch {
        throw new Error('Caminho local do repositorio nao existe no sistema de arquivos');
    }

    if (!stat.isDirectory()) {
        throw new Error('Caminho local do repositorio nao e uma pasta valida');
    }

    return {
        repoPath: localPath,
        envFilePath: path.join(localPath, '.env'),
    };
}

export async function readProviderKeyStatuses(projectId: string): Promise<{ repoPath: string; envFilePath: string; keys: ProviderKeyStatus[] }> {
    const fs = await import('node:fs/promises');
    const { repoPath, envFilePath } = await resolveProjectEnvFile(projectId);

    let envRaw = '';
    try {
        envRaw = await fs.readFile(envFilePath, 'utf8');
    } catch {
        envRaw = '';
    }

    const keys: ProviderKeyStatus[] = (Object.keys(PROVIDER_ENV_MAP) as ApiProvider[]).map((provider) => {
        const envVar = PROVIDER_ENV_MAP[provider];
        const value = parseEnvValue(envRaw, envVar);
        return {
            provider,
            envVar,
            isConfigured: Boolean(value),
            maskedValue: value ? maskValue(value) : null,
        };
    });

    return { repoPath, envFilePath, keys };
}

export async function setProviderKey(projectId: string, provider: string, value: string): Promise<ProviderKeyStatus> {
    if (!isApiProvider(provider)) {
        throw new Error('Provider invalido. Use: claude, chatgpt ou gemini');
    }

    const normalizedValue = value.trim();
    if (!normalizedValue) {
        throw new Error('Valor da chave e obrigatorio');
    }

    const fs = await import('node:fs/promises');
    const { envFilePath } = await resolveProjectEnvFile(projectId);
    const envVar = PROVIDER_ENV_MAP[provider];

    let envRaw = '';
    try {
        envRaw = await fs.readFile(envFilePath, 'utf8');
    } catch {
        envRaw = '';
    }

    const nextRaw = upsertEnvValue(envRaw, envVar, normalizedValue);
    await fs.writeFile(envFilePath, nextRaw, 'utf8');

    return {
        provider,
        envVar,
        isConfigured: true,
        maskedValue: maskValue(normalizedValue),
    };
}

export async function removeProviderKey(projectId: string, provider: string): Promise<ProviderKeyStatus> {
    if (!isApiProvider(provider)) {
        throw new Error('Provider invalido. Use: claude, chatgpt ou gemini');
    }

    const fs = await import('node:fs/promises');
    const { envFilePath } = await resolveProjectEnvFile(projectId);
    const envVar = PROVIDER_ENV_MAP[provider];

    let envRaw = '';
    try {
        envRaw = await fs.readFile(envFilePath, 'utf8');
    } catch {
        envRaw = '';
    }

    const nextRaw = removeEnvValue(envRaw, envVar);
    await fs.writeFile(envFilePath, nextRaw, 'utf8');

    return {
        provider,
        envVar,
        isConfigured: false,
        maskedValue: null,
    };
}