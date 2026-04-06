# CODE REVIEW FINAL — ThinkCoffee
**Versão:** V4  
**Revisor:** Code Reviewer Agent  
**Data:** 2025  
**Escopo:** Revisão completa — padrões, segurança, performance, tipagem, erros

---

## Sumário Executivo

O projeto ThinkCoffee demonstra maturidade arquitetural razoável para uma extensão VS Code com pipeline multi-agente. Os mecanismos de segurança base (path traversal, command validation, SafetyNet) estão implementados. Contudo, existem vulnerabilidades críticas, inconsistências de tipagem, gargalos de performance e padrões de código que devem ser corrigidos antes de qualquer deploy em ambiente de produção ou distribuição pública.

| Categoria | Criticidade | Ocorrências |
|---|---|---|
| Segurança | CRITICA | 6 |
| Performance | ALTA | 5 |
| Tipagem | ALTA | 8 |
| Tratamento de Erros | MEDIA | 7 |
| Padrões de Código | MEDIA | 9 |
| Consistência | BAIXA | 6 |

**Total: 41 issues identificados.**

---

## 1. SEGURANÇA — Issues Críticos

### SEC-01 — Path traversal no AgentService.ts incompleto (CRITICO)

**Arquivo:** `packages/vscode/src/agents/AgentService.ts` — `handleToolCall()`, case `write_file` e `read_file`

**Problema:** A verificação de path traversal usa `abs.startsWith(workspace)`, que é vulnerável a ataques como `workspace/../outside`. O workspace pode terminar com separador de path ou não, e `startsWith` não garante que a fronteira seja um separador real.

```typescript
// ATUAL — VULNERAVEL
const abs = path.resolve(workspace, input.path);
if (!abs.startsWith(workspace)) return 'Error: Path traversal denied';
```

**O problema concreto:** Se `workspace = /home/user/proj`, então `abs = /home/user/proj-other/secret` também passa, pois `/home/user/proj-other/...`.startsWith(`/home/user/proj`) é `true` em alguns casos dependendo do separador.

**Correção:** Usar a função `safePath` que já existe em `packages/core/src/utils/safe-path.ts` — ela já foi implementada corretamente com validação de separador. O AgentService ignora essa utility e reimplementa a lógica de forma insegura.

```typescript
// CORRETO — usar a utility existente
import { safePath } from '@thinkcoffee/core';

case 'write_file': {
  try {
    const abs = safePath(workspace, input.path); // lança se houver traversal
    // ... resto da lógica
  } catch (e: any) {
    return `Error: ${e.message}`;
  }
}
```

---

### SEC-02 — CORS sem restrição de origem no servidor HTTP (CRITICO)

**Arquivo:** `packages/mcp-server/src/server.ts`, linha ~12

**Problema:** O middleware CORS está configurado para aceitar qualquer origem (`*`), sem autenticação.

```typescript
// ATUAL — aceita qualquer origem
app.use('*', cors());
```

O servidor expõe endpoints de leitura e escrita de chat history, backup/restore e execução de sync. Qualquer página web maliciosa na rede local pode enviar requisições para `localhost:<porta>` e ler/escrever dados do usuário (SSRF + Cross-Origin data access).

**Correção:**

```typescript
// CORRETO — restringir origem e adicionar autenticação básica
app.use('*', cors({
  origin: ['vscode-webview://*', 'http://localhost:*'],
  allowMethods: ['GET', 'POST', 'DELETE'],
}));

// Middleware de autenticação por token
app.use('/api/*', async (c, next) => {
  const token = c.req.header('X-ThinkCoffee-Token');
  if (token !== process.env.THINKCOFFEE_API_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
});
```

---

### SEC-03 — Restore de backup aceita path arbitrário sem validação (CRITICO)

**Arquivo:** `packages/mcp-server/src/server.ts` — endpoint `POST /api/chat/backups/restore`  
**Arquivo:** `packages/core/src/services/ChatHistoryService.ts` — método `restoreFromBackup()`

**Problema:** O endpoint aceita `backupPath` diretamente do corpo da requisição e passa para `fs.readFileSync(backupPath)` sem nenhuma validação de path. Um usuário pode passar `backupPath: "/etc/passwd"` ou `backupPath: "C:\\Windows\\System32\\config\\SAM"`.

```typescript
// ATUAL — aceita path arbitrário do request body
const body = await c.req.json<{ backupPath?: string; ... }>();
result = await chatHistoryService.restoreFromBackup(body.backupPath);

// No ChatHistoryService:
async restoreFromBackup(backupPath: string): Promise<RecoveryResult> {
  const content = fs.readFileSync(backupPath, 'utf-8'); // path sem validação!
```

**Correção:**

```typescript
// Validar que o backupPath está dentro do diretório de backups permitido
async restoreFromBackup(backupPath: string): Promise<RecoveryResult> {
  const normalizedPath = path.normalize(path.resolve(backupPath));
  const allowedDir = path.normalize(this.backupDir);
  
  if (!normalizedPath.startsWith(allowedDir + path.sep) && 
      normalizedPath !== allowedDir) {
    return { 
      success: false, 
      messagesRestored: 0, 
      error: 'Acesso negado: caminho fora do diretório de backups' 
    };
  }
  // ... resto da lógica
}
```

---

### SEC-04 — Tipagem fraca em `ApiKeyService.listByProject` permite vazamento (ALTA)

**Arquivo:** `packages/core/src/services/ApiKeyService.ts`, método `listByProject()`

**Problema:** O método retorna objetos `ApiKey` completos incluindo o campo `keyHash`. Embora seja um hash (SHA-256), expor hashes de chaves API permite ataques de dicionário offline se o algoritmo de geração for previsível.

```typescript
// ATUAL — retorna keyHash nos resultados
async listByProject(projectId: string) {
  return this.repo.find({ ... }); // retorna keyHash!
}
```

**Correção:** Criar uma view type sem campos sensíveis e usar `.select()` ou um DTO.

```typescript
// Tipo de retorno seguro para listagem
export type ApiKeySafe = Omit<ApiKey, 'keyHash'>;

async listByProject(projectId: string): Promise<ApiKeySafe[]> {
  const keys = await this.repo.find({
    where: { project: { id: projectId } },
    select: ['id', 'name', 'lastUsed', 'isActive', 'createdAt', 'revokedAt'],
    order: { createdAt: 'DESC' },
  });
  return keys;
}
```

---

### SEC-05 — `synchronize: true` no TypeORM em produção (ALTA)

**Arquivo:** `packages/core/src/database.ts`, linha ~68

**Problema:** `synchronize: true` no TypeORM faz alterações automáticas de schema no banco a cada inicialização. Em produção isso pode causar perda de dados se uma entidade for modificada (colunas removidas ou renomeadas).

```typescript
dataSource = new DataSource({
  type: 'sqlite',
  synchronize: true, // PERIGOSO em producao
  ...
});
```

**Correção:** Usar migrations para ambientes que não sejam desenvolvimento.

```typescript
const isDev = process.env.NODE_ENV === 'development' || 
              process.env.THINKCOFFEE_DB_PATH === ':memory:';

dataSource = new DataSource({
  type: 'sqlite',
  synchronize: isDev,
  migrationsRun: !isDev,
  migrations: isDev ? [] : ['./migrations/*.js'],
  ...
});
```

---

### SEC-06 — Injeção de HTML no webview de erro (MEDIA)

**Arquivo:** `packages/vscode/src/extension.ts`, função `activate()`, bloco catch, linha ~77

**Problema:** A mensagem de erro `errMsg` é inserida no HTML do webview após `replace` de `<` e `>`, mas sem sanitizar aspas simples, duplas ou outros caracteres HTML. Se o `errMsg` vier de uma exception com conteúdo controlável, pode haver XSS no webview.

```typescript
// ATUAL — sanitizacao incompleta
view.webview.html = `...
<code>${errMsg.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code>
...`;
```

**Correção:** Sanitizar todos os caracteres que têm significado em HTML.

```typescript
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
// Uso:
`<code>${escapeHtml(errMsg)}</code>`
```

---

## 2. PERFORMANCE — Issues Altos

### PERF-01 — `findByWorkspace` carrega todas as entidades do banco (ALTA)

**Arquivo:** `packages/core/src/services/ProjectService.ts`, método `findByWorkspace()`

**Problema:** Para encontrar o projeto associado ao workspace atual, o método carrega TODOS os projetos com todas as `contextEntries` e `decisions`, e filtra em memória. Em projetos com muito contexto, isso é um carregamento massivo desnecessário.

```typescript
// ATUAL — carrega TUDO para filtrar em memoria
async findByWorkspace(workspacePath: string) {
  const all = await this.list(); // carrega contextEntries + decisions de TODOS
  return all.find(p => { ... });
}
```

**Correção:** Indexar o campo workspace no metadata ou usar SQL direto.

```typescript
// Opcao 1: Query SQL direta (mais eficiente)
async findByWorkspace(workspacePath: string): Promise<Project | null> {
  const normalized = this._normalizePath(workspacePath);
  // SQLite suporta JSON functions — mas simple-json é string
  // Mais simples: buscar sem relations e depois filtrar
  const all = await this.repo.find({
    select: ['id', 'metadata', 'name', 'description', 'status', 'createdAt'],
    // Sem relations — muito mais rapido
  });
  const found = all.find(p => {
    if (!p.metadata) return false;
    const ws = (p.metadata as any).workspace;
    return ws && this._normalizePath(ws) === normalized;
  });
  if (!found) return null;
  // Buscar com relations apenas o projeto encontrado
  return this.get(found.id);
}
```

---

### PERF-02 — Polling de pipeline a cada 3 segundos independente de estado (ALTA)

**Arquivo:** `packages/vscode/src/chat/ChatViewProvider.ts`, método `resolveWebviewView()`

**Problema:** Um `setInterval` de 3000ms envia o estado do pipeline para o webview constantemente, mesmo quando nenhum agente está rodando. Em workspaces com muitos pipelines, essa serialização repetida gera trabalho de CPU desnecessário.

```typescript
// ATUAL — polling incondicional a cada 3s
this._pipelineRefreshTimer = setInterval(() => this._sendPipelineState(), 3000);
```

**Correção:** Aumentar o intervalo quando não há agentes ativos ou usar event-driven apenas.

```typescript
// Polling adaptativo
this._pipelineRefreshTimer = setInterval(() => {
  const hasRunning = this._agentService?.getRunning().length ?? 0;
  if (hasRunning > 0) {
    this._sendPipelineState();
  }
}, 3000);
```

---

### PERF-03 — Backup em série no `createFullBackup` (MEDIA)

**Arquivo:** `packages/core/src/services/ChatHistoryService.ts`, método `createFullBackup()`

**Problema:** O backup de todos os históricos é feito em sequência com `for...of` + `await`. Para projetos com alto volume de histórico, isso bloqueia desnecessariamente.

```typescript
// ATUAL — em serie
for (const history of histories) {
  const backup = await this.createBackup(history.id); // await sequencial
}
```

**Correção:**

```typescript
// Em paralelo com limite de concorrencia
async createFullBackup(): Promise<BackupInfo[]> {
  const histories = await this.repo.find();
  const results = await Promise.allSettled(
    histories.map(h => this.createBackup(h.id))
  );
  return results
    .filter((r): r is PromiseFulfilledResult<BackupInfo> => 
      r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value);
}
```

---

### PERF-04 — `listHistories` sem índice nas colunas filtradas (MEDIA)

**Arquivo:** `packages/core/src/entities/ChatHistory.ts` (não lido mas inferido do service)  
**Arquivo:** `packages/core/src/services/ChatHistoryService.ts`

**Problema:** Os filtros em `listHistories` usam `projectId`, `pipelineId`, `channel` e `workspace`, mas as entidades TypeORM provavelmente não têm `@Index()` nessas colunas. Em SQLite com muitos registros, isso resulta em full table scans.

**Correção:** Adicionar índices nas entidades:

```typescript
@Entity()
@Index(['projectId'])
@Index(['pipelineId'])
@Index(['channel'])
export class ChatHistory {
  // ...
  @Column({ nullable: true })
  @Index()
  projectId: string;
  
  @Column({ nullable: true })
  @Index()
  pipelineId: string;
  
  @Column()
  @Index()
  channel: string;
}
```

---

### PERF-05 — `AgentService.handleToolCall` — `search_code` sem limite eficiente (MEDIA)

**Arquivo:** `packages/vscode/src/agents/AgentService.ts`, case `search_code`

**Problema:** O `search_code` no AgentService usa `vscode.workspace.findFiles(glob, '**/node_modules/**', 50)` e depois lê cada arquivo com `fs.readFileSync` de forma síncrona em loop. Para workspaces grandes, 50 arquivos * leitura síncrona trava o event loop.

```typescript
// ATUAL — leitura sincrona em loop
for (const uri of results) {
  const content = fs.readFileSync(uri.fsPath, 'utf-8'); // sincrono em loop
```

**Correção:** Usar `fs.promises.readFile` com `Promise.all` com concorrência limitada, ou a implementação já existente em `core/tools/file-tools.ts` que já está mais bem implementada.

```typescript
// Usar a implementacao centralizada de core
import { searchCode } from '@thinkcoffee/core';
```

---

## 3. TIPAGEM — Issues Altos

### TYP-01 — Repositórios sem tipagem genérica explícita (ALTA)

**Arquivo:** `packages/core/src/services/ProjectService.ts`, `ContextService.ts`, `ApiKeyService.ts`

**Problema:** Os repositórios são declarados com `private repo;` sem tipo explícito. O TypeScript infere o tipo em tempo de construção, mas perde o tipo se o construtor for refatorado.

```typescript
// ATUAL — sem tipagem
export class ProjectService {
  private repo; // tipo inferido implicitamente
  
  constructor(private db: DataSource) {
    this.repo = db.getRepository(Project);
  }
}
```

**Correção:**

```typescript
import { Repository } from 'typeorm';

export class ProjectService {
  private repo: Repository<Project>;
  
  constructor(private db: DataSource) {
    this.repo = db.getRepository(Project);
  }
}
```

---

### TYP-02 — `where` dinâmico tipado como `any` no ContextService (ALTA)

**Arquivo:** `packages/core/src/services/ContextService.ts`, método `listByProject()`

```typescript
// ATUAL — any
const where: any = { project: { id: projectId } };
```

**Correção:**

```typescript
import { FindOptionsWhere } from 'typeorm';

const where: FindOptionsWhere<ContextEntry> = { 
  project: { id: projectId } 
};
if (category) where.category = category as ContextEntry['category'];
```

---

### TYP-03 — `Project.metadata` tipado como `Record<string, any>` (ALTA)

**Arquivo:** `packages/core/src/entities/Project.ts`

**Problema:** O campo `metadata` é `Record<string, any>`, forçando casts em todo lugar que o campo é acessado: `(p.metadata as any).workspace`.

**Correção:** Criar um tipo estruturado para metadata:

```typescript
// types/project-metadata.ts
export interface ProjectMetadata {
  workspace?: string;
  [key: string]: unknown;
}

// Project.ts
@Column({ type: 'simple-json', nullable: true })
metadata: ProjectMetadata | null;

// ProjectService.ts — sem cast
const ws = p.metadata?.workspace;
```

---

### TYP-04 — `AgentContext.previousOutputs` usa `string` para output de agente (MEDIA)

**Arquivo:** `packages/vscode/src/agents/AgentService.ts`

**Problema:** O campo `previousOutputs` dentro de `AgentContext` é `{ agent: AgentRole; output: string }[]`. O `output` está sendo truncado em `.substring(0, 3000)` em `buildSystemPrompt` sem informar ao modelo que foi truncado explicitamente no tipo.

**Correção:** Adicionar metadado de truncagem:

```typescript
interface AgentOutput {
  agent: AgentRole;
  output: string;
  truncated: boolean;
  totalLength: number;
}

interface AgentContext {
  // ...
  previousOutputs: AgentOutput[];
}
```

---

### TYP-05 — `AutoSyncService.options` sem ser `Readonly` (MEDIA)

**Arquivo:** `packages/core/src/services/AutoSyncService.ts`

**Problema:** `this.options` é um objeto mutável, permitindo que subclasses ou código externo modifique os callbacks acidentalmente.

**Correção:**

```typescript
private readonly options: Readonly<Required<AutoSyncOptions>>;
```

---

### TYP-06 — Enum de status como `string` sem enumeração (MEDIA)

**Arquivo:** `packages/core/src/entities/Project.ts`

**Problema:** `status: string` no campo `Project.status` permite qualquer string. O schema Zod define `z.enum(['active', 'archived', 'inactive'])`, mas a entidade não o reforça no TypeScript.

**Correção:**

```typescript
export type ProjectStatus = 'active' | 'archived' | 'inactive';

@Column({ default: 'active' })
status: ProjectStatus;
```

---

### TYP-07 — `validateCommand` em `command-validator.ts` ignora parâmetro `workspaceRoot` que a assinatura aceita (ALTA)

**Arquivo:** `packages/core/src/guardrails/command-validator.ts`  
**Arquivo:** `packages/vscode/src/utils/SafetyNetIntegration.ts`

**Problema:** `SafetyNetIntegration` chama `validateCommand(command, this._workspaceRoot)` passando dois argumentos. Porém a assinatura de `validateCommand` em `command-validator.ts` só aceita um parâmetro: `export function validateCommand(command: string)`. O segundo argumento é silenciosamente ignorado. Isso é um bug de contrato: a intenção era validar o comando relativo ao workspace (ex: impedir `rm -rf` fora do diretório), mas isso não acontece.

**Correção:** Corrigir a assinatura e usar o parâmetro:

```typescript
export function validateCommand(
  command: string, 
  workspaceRoot?: string
): CommandValidationResult {
  // Existing logic...
  
  // Adicional: se workspaceRoot fornecido, validar paths no comando
  if (workspaceRoot) {
    // Detectar paths absolutos que saem do workspace
    const absPathMatch = command.match(/(?:^|\s)(\/[^\s]+)/g);
    if (absPathMatch) {
      for (const match of absPathMatch) {
        const p = match.trim();
        if (!p.startsWith(workspaceRoot) && !p.startsWith('/tmp')) {
          return {
            allowed: false,
            requiresConfirmation: false,
            reason: `Command references path outside workspace: ${p}`,
            riskLevel: 'blocked',
          };
        }
      }
    }
  }
  // ...
}
```

---

### TYP-08 — `ApiKey.lastUsed` tipado como `string` mas recebe `Date` em `validate()` (ALTA)

**Arquivo:** `packages/core/src/entities/ApiKey.ts` e `packages/core/src/services/ApiKeyService.ts`

**Problema:** A entidade declara `lastUsed: string` (varchar), mas o serviço atribui `new Date().toISOString()` (string ISO). Inconsistência: `revokedAt` é `Date | null` (datetime). O TypeORM salva corretamente, mas o tipo em memória fica inconsistente entre `string` e `Date` dependendo de quando foi carregado.

```typescript
// Entidade: lastUsed é string
@Column('varchar', { length: 100, nullable: true })
lastUsed: string;

// Service: atribui string ISO — OK, mas semanticamente inconsistente com revokedAt: Date
stored.lastUsed = new Date().toISOString();
```

**Correção:** Padronizar ambos como `Date | null`:

```typescript
@Column('datetime', { nullable: true })
lastUsed: Date | null;

// Service:
stored.lastUsed = new Date();
```

---

## 4. TRATAMENTO DE ERROS — Issues

### ERR-01 — `activate()` captura erro mas registra webview sem `retainContextWhenHidden` (MEDIA)

**Arquivo:** `packages/vscode/src/extension.ts`, bloco catch em `activate()`

**Problema:** O webview de erro registrado no catch não define `webviewOptions`. Isso pode causar o webview ser destruído e recriado ao mudar de aba, mostrando flash visual.

**Correção:**

```typescript
context.subscriptions.push(
  vscode.window.registerWebviewViewProvider('thinkcoffee.chat', { ... }, {
    webviewOptions: { retainContextWhenHidden: true }
  })
);
```

---

### ERR-02 — `getPipelinesDir` engole erros silenciosamente (MEDIA)

**Arquivo:** `packages/core/src/pipeline.ts`, função `getPipelinesDir()`

**Problema:** O `try/catch` loga o erro com `console.error` mas retorna o path mesmo sem ter criado o diretório. As operações subsequentes (`fs.writeFileSync`) vão falhar com erros menos descritivos.

```typescript
function getPipelinesDir(projectId: string): string {
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (err) {
    console.error(`...`); // loga mas nao relança
  }
  return dir; // retorna dir mesmo que criacao tenha falhado
}
```

**Correção:** Relançar o erro ou retornar `null` e tratar no chamador.

```typescript
function getPipelinesDir(projectId: string): string {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true }); // lança se falhar
  }
  return dir;
}
```

---

### ERR-03 — `safetyNetIntegration.runCleanup` com `.catch(console.error)` perde stack trace (BAIXA)

**Arquivo:** `packages/vscode/src/extension.ts`, linha que chama `runCleanup()`

```typescript
// ATUAL
safetyNetIntegration.runCleanup(activePipelines).catch(console.error);
```

**Correção:**

```typescript
safetyNetIntegration.runCleanup(activePipelines).catch((err: Error) => {
  console.error('[ThinkCoffee] Safety Net cleanup failed:', err.message, err.stack);
});
```

---

### ERR-04 — `listHistories` não trata erro de query do TypeORM (MEDIA)

**Arquivo:** `packages/core/src/services/ChatHistoryService.ts`, método `listHistories()`

**Problema:** `query.getMany()` pode lançar exceções TypeORM (conexão perdida, schema desatualizado), mas não há try/catch no método. O chamador (API HTTP) também não tem tratamento de erro adequado para exceções de banco.

**Correção:**

```typescript
async listHistories(filter: HistoryFilter = {}): Promise<ChatHistory[]> {
  try {
    // ... build query
    return await query.getMany();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ChatHistoryService] listHistories error:', msg);
    throw new Error(`Failed to list histories: ${msg}`);
  }
}
```

---

### ERR-05 — Endpoint `POST /api/chat/history/:id/message` não valida existência do histórico antes de appender (MEDIA)

**Arquivo:** `packages/mcp-server/src/server.ts`

**Problema:** O endpoint recebe um `id` de histórico e extrai channel/pipelineId manualmente via string manipulation (`id.replace('history-pipeline-', '')`). Se o `id` não seguir o formato esperado, o channel será extraído incorretamente e a mensagem será appendada em um histórico errado (criado silenciosamente).

**Correção:** Verificar se o histórico existe antes de appender, ou usar canal explícito no body:

```typescript
app.post('/api/chat/history/:id/message', async (c) => {
  const id = c.req.param('id');
  const existing = await chatHistoryService!.getHistoryById(id);
  if (!existing) {
    return c.json({ error: `History not found: ${id}` }, 404);
  }
  // usar existing.channel e existing.pipelineId em vez de parsear o id
  const history = await chatHistoryService!.appendMessage(
    existing.channel, 
    fullMessage, 
    existing.pipelineId
  );
  return c.json({ data: history });
});
```

---

### ERR-06 — `importFromJsonl` ignora erros de parse de linha sem contador (BAIXA)

**Arquivo:** `packages/core/src/services/ChatHistoryService.ts`, método `importFromJsonl()`

```typescript
// ATUAL — loga erro mas nao informa quantas linhas falharam
try {
  messages.push(JSON.parse(line) as ChatMessage);
} catch (err) {
  console.error(`[ChatHistoryService] Erro ao parsear linha JSONL:`, err);
}
```

**Correção:** Retornar metadado de linhas com erro no `RecoveryResult`:

```typescript
export interface RecoveryResult {
  success: boolean;
  messagesRestored: number;
  linesSkipped?: number; // novo campo
  error?: string;
}
```

---

### ERR-07 — `discoverModels().catch(() => {})` silencia falhas críticas (BAIXA)

**Arquivo:** `packages/vscode/src/extension.ts`, função `_activate()`

```typescript
discoverModels().catch(() => {}); // engole tudo
```

Se a descoberta de modelos falhar por motivo crítico (Ollama mal configurado, Copilot indisponível), o usuário não recebe nenhum feedback.

**Correção:**

```typescript
discoverModels().catch((err: Error) => {
  console.warn('[ThinkCoffee] Model discovery failed (non-critical):', err.message);
  // Nao falhar a ativacao, mas logar adequadamente
});
```

---

## 5. PADRÕES DE CÓDIGO — Issues

### PAD-01 — Prompts de sistema hardcoded no AgentService (ALTA)

**Arquivo:** `packages/vscode/src/agents/AgentService.ts`

**Problema:** As funções `buildSystemPrompt`, `buildPMAutoAssignPrompt`, `buildPMPlanPhasesPrompt` e `buildPMSelectModePrompt` contêm centenas de linhas de strings literais de prompt dentro do arquivo do serviço. Isso viola o princípio de single responsibility e impossibilita testes unitários dos prompts sem instanciar o AgentService.

**Correção sugerida:** Extrair para `packages/vscode/src/agents/prompts/` como módulo separado:

```
agents/
  prompts/
    system-prompt.ts     (buildSystemPrompt)
    pm-prompts.ts        (buildPMAutoAssignPrompt, buildPMPlanPhasesPrompt, buildPMSelectModePrompt)
  AgentService.ts        (apenas orquestração)
```

---

### PAD-02 — `extension.ts` com 500+ linhas — God File (ALTA)

**Arquivo:** `packages/vscode/src/extension.ts`

**Problema:** O arquivo `extension.ts` registra 20+ comandos, inicializa 7 serviços, gerencia estado global (5 variáveis module-level), implementa lógica de árvore de diretórios (`tree()`) inline, e ainda serve como ponto de entrada. Viola SRP categoricamente.

**Refatoração sugerida:**

```
extension.ts            (máx 100 linhas — apenas activate/deactivate)
commands/
  context-commands.ts   (addContext, addFileAsContext, addSelectionAsContext, addStructureAsContext)
  pipeline-commands.ts  (createPipeline, approvePhase, rejectPhase)
  project-commands.ts   (createProject, exportContext, syncContext)
  safety-commands.ts    (toggleDryRun, rollback, listSnapshots)
services/
  workspace-initializer.ts  (lógica de auto-bind de workspace)
```

---

### PAD-03 — `getNextCronRun` implementação de cron manual frágil (MEDIA)

**Arquivo:** `packages/core/src/services/AutoSyncService.ts`

**Problema:** A função implementa parsing de cron expression manualmente, suportando apenas 3 padrões. Expressões como `0 9 * * 1-5` (dias da semana), `0 0 1 * *` (primeiro do mês), ou `*/5 8-18 * * *` (a cada 5min entre 8h e 18h) são silenciosamente ignoradas com fallback de "1 hora". O usuário não recebe aviso de que o cron expression não foi reconhecido.

**Correção:** Usar biblioteca `cron-parser` ou `node-cron`, ou documentar explicitamente as limitações e adicionar validação com mensagem de erro.

```typescript
// Adicionar validacao:
private validateCronExpression(cronExpression: string): boolean {
  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  // validar ranges...
  return true;
}
```

---

### PAD-04 — `ChatViewProvider` com 1500+ linhas — God Class (ALTA)

**Arquivo:** `packages/vscode/src/chat/ChatViewProvider.ts`

**Problema:** A classe implementa: renderização HTML, processamento de comandos de chat, gerenciamento de pipelines, serialização de estado, integração com AgentService, lógica de GitHub e Terminal. Mais de 1500 linhas em um único arquivo com múltiplas responsabilidades.

**Refatoração sugerida:**

```
chat/
  ChatViewProvider.ts        (max 200 linhas — apenas webview + routing)
  ChatCommandProcessor.ts    (handleMessage, handleGitHub, handleTerminal, handleFiles)
  PipelineStateSerializer.ts (serializePipeline, sendState, sendPipelineState)
  ChatHtmlRenderer.ts        (getHtml e toda a string de HTML/CSS/JS)
```

---

### PAD-05 — Uso de `console.error/log` em código de extensão VS Code (MEDIA)

**Problema:** Em extensões VS Code, `console.error` e `console.log` escrevem no output mas não são visíveis para o usuário de forma estruturada. O projeto usa `console.error` em ~40 locais sem um logger centralizado.

**Correção:** Criar um logger que use o Output Channel do VS Code:

```typescript
// packages/vscode/src/utils/logger.ts
export class Logger {
  private static channel = vscode.window.createOutputChannel('ThinkCoffee');
  
  static log(msg: string) { this.channel.appendLine(`[INFO] ${msg}`); }
  static warn(msg: string) { this.channel.appendLine(`[WARN] ${msg}`); }
  static error(msg: string, err?: Error) { 
    this.channel.appendLine(`[ERROR] ${msg}${err ? `: ${err.stack}` : ''}`);
  }
}
```

---

### PAD-06 — Variáveis module-level mutáveis no `extension.ts` (MEDIA)

**Arquivo:** `packages/vscode/src/extension.ts`

**Problema:** O estado da extensão é mantido em 5 variáveis `let` no escopo do módulo (`projectService`, `contextService`, `agentService`, `safetyNetIntegration`, `activeProject`). Isso dificulta testes e cria acoplamento implícito.

**Correção:** Encapsular em uma classe `ExtensionState` ou `ExtensionContext` que seja passada explicitamente para os comandos.

---

### PAD-07 — String literals de agentRole duplicadas em múltiplos arquivos (BAIXA)

**Problema:** A lista de `agentRoles` e o mapeamento `shortMap` são duplicados em `ChatViewProvider.ts`. O tipo `AgentRole` já está definido em `pipeline.ts` com `AGENT_META`. No entanto, `ChatViewProvider` redeclara os arrays e maps localmente.

**Correção:** Importar `Object.keys(AGENT_META) as AgentRole[]` diretamente.

---

### PAD-08 — `no-op` commands registrados em extension.ts (BAIXA)

**Arquivo:** `packages/vscode/src/extension.ts`

```typescript
// Comandos no-op registrados mas sem implementação
vscode.commands.registerCommand('thinkcoffee.openContextFile', async () => {});
vscode.commands.registerCommand('thinkcoffee.viewContext', async () => {});
```

Comandos registrados no `package.json` e no código sem implementação confundem os usuários e indicam features incompletas.

**Correção:** Remover do `package.json` e do código, ou implementar, ou marcar como `// TODO:` com issue tracking.

---

### PAD-09 — Importação de caminho absoluto interno violando encapsulamento de pacote (ALTA)

**Arquivo:** `packages/vscode/src/utils/SafetyNetIntegration.ts`

**Problema:** O arquivo importa diretamente do path interno do pacote `core`:

```typescript
import { SnapshotService } from '@thinkcoffee/core/src/services/SnapshotService';
import { ActionLogService } from '@thinkcoffee/core/src/services/ActionLogService';
import { validateCommand } from '@thinkcoffee/core/src/guardrails/command-validator';
import type { ActionLogEntry, ... } from '@thinkcoffee/core/src/types/safety-net';
```

Isso quebra o contrato do pacote: as importações devem passar pelo `index.ts` do pacote. Mudanças internas em `core` quebrarão `vscode` mesmo que o contrato público não mude.

**Correção:** Exportar esses símbolos no `index.ts` do core e importar via `@thinkcoffee/core`:

```typescript
// packages/core/src/index.ts — adicionar exports
export { SnapshotService } from './services/SnapshotService';
export { ActionLogService } from './services/ActionLogService';
export { validateCommand } from './guardrails/command-validator';
export type { ActionLogEntry, FileAffected, CommandRiskLevel, UserDecision } from './types/safety-net';
```

---

## 6. CONSISTÊNCIA — Issues

### CON-01 — Hash de API key com SHA-256 simples sem salt (MEDIA)

**Arquivo:** `packages/core/src/utils/crypto.ts`

**Problema:** `hashApiKey` usa `sha256(plainKey)` sem salt. Embora o `plainKey` seja gerado com `crypto.randomBytes(32)` (alto entropia), a ausência de salt é uma inconsistência de design para um `ApiKeyService` que deve ser considerado seguro.

**Recomendação:** Adicionar HMAC com secret para o hash:

```typescript
static hashApiKey(apiKey: string): string {
  const secret = process.env.THINKCOFFEE_KEY_SECRET || 'default-insecure-secret';
  return crypto.createHmac('sha256', secret).update(apiKey).digest('hex');
}
```

**Nota:** `THINKCOFFEE_KEY_SECRET` deve ser configurado em produção. Sem isso, o hash com HMAC ainda é melhor que SHA-256 puro.

---

### CON-02 — Datas como `string` ISO vs `Date` inconsistente entre entidades (MEDIA)

**Problema:** Inconsistência no uso de tipos de data:
- `ApiKey.lastUsed`: `string` (varchar)
- `ApiKey.revokedAt`: `Date | null` (datetime) 
- `Pipeline.createdAt`: `string` (ISO gerado manualmente)
- `Project.createdAt`: `Date` (TypeORM `@CreateDateColumn`)
- `ChatHistory.lastBackup`: `string` (ISO)

**Correção:** Padronizar. Para entidades TypeORM, usar sempre `Date` com decorators apropriados. Para tipos de interface simples, usar `string` ISO 8601.

---

### CON-03 — `autoBackupInterval` com tipo `NodeJS.Timeout | null` mas `stopAutoBackup` não tem guarda de nulidade completa (BAIXA)

**Arquivo:** `packages/core/src/services/ChatHistoryService.ts`

```typescript
// stopAutoBackup tem guarda
stopAutoBackup(): void {
  if (this.autoBackupInterval) { // correto
    clearInterval(this.autoBackupInterval);
    this.autoBackupInterval = null;
  }
}
```

Porém em `startAutoBackup` o interval anterior é cancelado, mas se `createFullBackup()` lançar durante o intervalo, o próximo ciclo ainda roda. Adicionar um flag `_isBackupRunning` para evitar execuções concorrentes.

---

### CON-04 — Backend MCP usa `Hono` mas server principal usa outro servidor (BAIXA)

**Arquivo:** `packages/mcp-server/src/server.ts` e `packages/mcp-server/src/index.ts`

O servidor HTTP usa `Hono`, mas o servidor MCP principal provavelmente usa `@modelcontextprotocol/sdk`. Verificar se há conflito de porta ou se são servidores distintos em processos distintos. Documentar isso explicitamente no README do pacote.

---

### CON-05 — `safetynet.autoCleanup` vs `safetynet.retentionDays` — config lida em locais diferentes (BAIXA)

**Arquivo:** `packages/vscode/src/extension.ts` (lê `autoCleanup`)  
**Arquivo:** `packages/vscode/src/utils/SafetyNetIntegration.ts` (não lê `retentionDays`)

A configuração `thinkcoffee.safetynet.retentionDays` está declarada no `package.json` mas nenhum código lê esse valor — o `SnapshotService` usa um valor hardcoded. O `autoCleanup` é lido, mas `retentionDays` e `maxSizeMB` são configurações declaradas mas não consumidas.

**Correção:** Ler e passar as configurações para o `SnapshotService`:

```typescript
const retentionDays = vscode.workspace.getConfiguration('thinkcoffee.safetynet')
  .get<number>('retentionDays', 7);
const maxSizeMB = vscode.workspace.getConfiguration('thinkcoffee.safetynet')
  .get<number>('maxSizeMB', 100);
safetyNetIntegration.runCleanup(activePipelines, { retentionDays, maxSizeMB });
```

---

### CON-06 — `thinkcoffee.refreshProjects` declarado em `package.json` mas não registrado no código (BAIXA)

**Arquivo:** `packages/vscode/package.json` e `packages/vscode/src/extension.ts`

O comando `thinkcoffee.refreshProjects` está em `contributes.commands` do `package.json` mas não aparece em nenhum `registerCommand` no código TypeScript. Isso faz o VS Code mostrar o comando no Command Palette porém nada acontece ao clicar (erro silencioso).

---

## 7. Resumo de Prioridades de Correção

### Correções Imediatas (antes de qualquer release)

| ID | Arquivo | Ação |
|---|---|---|
| SEC-01 | `AgentService.ts` | Substituir verificação de path pela `safePath()` do core |
| SEC-02 | `server.ts` | Restringir CORS e adicionar autenticação por token |
| SEC-03 | `ChatHistoryService.ts` + `server.ts` | Validar `backupPath` dentro do diretório permitido |
| TYP-07 | `command-validator.ts` + `SafetyNetIntegration.ts` | Corrigir assinatura de `validateCommand` para aceitar e usar `workspaceRoot` |
| PAD-09 | `SafetyNetIntegration.ts` | Mover imports de paths internos para o barrel `index.ts` do core |

### Correções de Alta Prioridade (próximo sprint)

| ID | Arquivo | Ação |
|---|---|---|
| SEC-04 | `ApiKeyService.ts` | Remover `keyHash` dos resultados de listagem |
| SEC-05 | `database.ts` | Desabilitar `synchronize: true` em produção |
| PERF-01 | `ProjectService.ts` | Otimizar `findByWorkspace` para não carregar todas as relations |
| PERF-02 | `ChatViewProvider.ts` | Tornar polling adaptativo ao estado dos agentes |
| TYP-01/02/03 | Serviços TypeORM | Adicionar tipagem explícita aos repositórios e campos |
| PAD-02 | `extension.ts` | Extrair comandos para módulos separados |
| PAD-04 | `ChatViewProvider.ts` | Extrair responsabilidades para classes menores |
| ERR-04/05 | `ChatHistoryService.ts` + `server.ts` | Adicionar try/catch e validações nos endpoints |

### Melhorias de Médio Prazo (backlog)

| ID | Ação |
|---|---|
| PERF-03 | Paralelizar `createFullBackup` |
| PERF-04 | Adicionar índices nas entidades de ChatHistory |
| PAD-01 | Extrair prompts de sistema para módulo separado |
| PAD-05 | Implementar logger centralizado com Output Channel |
| CON-01 | Adicionar HMAC ao hash de API keys |
| CON-02 | Padronizar tipos de data entre entidades |
| CON-05/06 | Implementar configurações declaradas mas não consumidas |

---

## 8. Métricas de Cobertura de Testes

Com base na estrutura de `__tests__` encontrada, os seguintes componentes críticos **não possuem testes**:

- `SafetyNetIntegration.ts` — sem testes
- `ChatViewProvider.ts` — sem testes
- `AgentService.ts` — sem testes (o maior e mais complexo arquivo do projeto)
- `pipeline.ts` — sem testes para lógica de estado do pipeline
- `command-validator.ts` — possui `__tests__` na estrutura, verificar cobertura de todos os padrões blocked/destructive
- `safe-path.ts` — possui `__tests__`, aparentemente coberto

**Recomendação:** Priorizar testes unitários para `pipeline.ts` (lógica de estado) e `command-validator.ts` (segurança crítica) antes de qualquer release.

---

*Relatório gerado pelo agente Code Reviewer — ThinkCoffee Pipeline*
