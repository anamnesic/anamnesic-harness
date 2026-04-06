# Arquitetura: Agent Guardrails & Undo System

> Documento de arquitetura para a implementação do sistema de segurança e rollback de agentes.

## 1. Visão Geral

Este documento descreve a arquitetura para a feature "Agent Guardrails & Undo System". O objetivo é introduzir mecanismos de segurança para mitigar riscos de ações destrutivas executadas por agentes, como `write_file` e `run_command`. As principais funcionalidades incluem snapshots de arquivos, rollback, modo dry-run e confirmação interativa do usuário.

A implementação será modular e se concentrará em `packages/core` para a lógica de negócio e `packages/vscode` para a interface com o usuário.

## 2. Estrutura de Pastas e Componentes

Novos serviços serão adicionados ao `packages/core/src/services` e a lógica de interação com o VS Code ficará em `packages/vscode/src/guardrails`.

```plaintext
packages/
├── core/
│   └── src/
│       ├── services/
│       │   ├── SnapshotService.ts   // (NOVO) Gerencia snapshots de arquivos
│       │   ├── GuardrailService.ts  // (NOVO) Orquestra dry-run e confirmações
│       │   └── MetricService.ts     // (NOVO) Coleta e persiste métricas
│       ├── types/
│       │   └── guardrails.ts        // (NOVO) Tipos para Snapshot, Metrics, etc.
│       └── pipeline.ts              // (MODIFICADO) Integra os novos serviços
│
└── vscode/
    └── src/
        ├── guardrails/
        │   ├── diffPreview.ts       // (NOVO) Lógica para mostrar 'vscode.diff'
        │   ├── userConfirmation.ts  // (NOVO) Lógica para popups de confirmação
        │   └── index.ts             // (NOVO) Exporta as funcionalidades de guardrails
        └── extension.ts             // (MODIFICADO) Integra os hooks de guardrails
```

## 3. Modelo de Dados e Contratos de API

### 3.1. `SnapshotService` (`packages/core/src/services/SnapshotService.ts`)

Responsável por criar e restaurar snapshots do workspace.

**Contrato (Interface):**
```typescript
// Em: packages/core/src/types/guardrails.ts
export interface SnapshotFile {
  path: string;      // Caminho relativo do arquivo no workspace
  action: 'create' | 'update' | 'delete';
  originalPath?: string; // Caminho no diretório de snapshot
}

export interface Snapshot {
  id: string;          // Geralmente o pipelineId + phaseId
  timestamp: number;
  files: SnapshotFile[];
}

// Em: packages/core/src/services/SnapshotService.ts
export class SnapshotService {
  /**
   * Cria um snapshot dos arquivos que serão modificados.
   * @param id - Identificador único para o snapshot.
   * @param filesToSnapshot - Lista de arquivos e a ação a ser executada.
   * @returns O objeto de metadados do snapshot.
   */
  async create(id: string, filesToSnapshot: { path: string; action: 'update' | 'delete' }[]): Promise<Snapshot>;

  /**
   * Restaura o workspace para o estado de um snapshot.
   * @param id - Identificador do snapshot a ser restaurado.
   */
  async rollback(id: string): Promise<void>;

  /**
   * Limpa snapshots antigos.
   */
  async cleanup(): Promise<void>;
}
```

**Armazenamento:** Os snapshots serão armazenados em `~/.thinkcoffee/snapshots/<id>/`. Um arquivo `_snapshot.json` conterá os metadados, e os arquivos originais serão copiados para o mesmo diretório.

### 3.2. `GuardrailService` (`packages/core/src/services/GuardrailService.ts`)

Orquestra as verificações de segurança. Ele atua como um intermediário entre o `PipelineService` e as ferramentas que modificam o sistema de arquivos.

**Contrato (Interface):**
```typescript
// Em: packages/core/src/services/GuardrailService.ts
export type ConfirmationMode = 'always' | 'destructive-only' | 'never';

export interface GuardrailOptions {
  dryRun: boolean;
  confirmMode: ConfirmationMode;
  onConfirm: (prompt: string) => Promise<boolean>; // Hook para UI (VS Code)
  onShowDiff: (path: string, newContent: string) => Promise<boolean>; // Hook para UI (VS Code)
}

export class GuardrailService {
  constructor(private options: GuardrailOptions) {}

  /**
   * Verifica se uma chamada de 'write_file' pode ser executada.
   * Em dry-run, retorna falso.
   * Em modo de confirmação, mostra o diff e aguarda aprovação.
   */
  async canWriteFile(path: string, content: string): Promise<boolean>;

  /**
   * Verifica se uma chamada de 'run_command' pode ser executada.
   * Em dry-run, retorna falso.
   * Em modo de confirmação, pede confirmação para comandos destrutivos.
   */
  async canRunCommand(command: string): Promise<boolean>;
}
```

### 3.3. `MetricService` (`packages/core/src/services/MetricService.ts`)

Coleta dados de execução do pipeline.

**Contrato (Interface):**
```typescript
// Em: packages/core/src/types/guardrails.ts
export interface PipelineMetric {
  taskId: string;
  agent: string;
  startedAt: number;
  completedAt: number;
  durationMs: number;
  toolCalls: number;
  filesModified: number;
  errors: number;
}

// Em: packages/core/src/services/MetricService.ts
export class MetricService {
  /**
   * Inicia o rastreamento de uma nova tarefa.
   */
  startTask(taskId: string, agent: string): void;

  /**
   * Finaliza o rastreamento de uma tarefa e persiste a métrica.
   */
  endTask(taskId: string, data: Partial<Omit<PipelineMetric, 'taskId' | 'agent'>>): Promise<void>;

  /**
   * Obtém as métricas de um pipeline.
   */
  getMetrics(pipelineId: string): Promise<PipelineMetric[]>;
}
```
**Armazenamento:** As métricas serão salvas em `~/.thinkcoffee/metrics/<pipelineId>.json`.

## 4. Fluxo de Execução (Exemplo: `write_file`)

1.  **`PipelineService`**: Antes de executar a fase, cria uma instância do `SnapshotService`.
2.  **Agente**: Chama a ferramenta `write_file(path, content)`.
3.  **Tool Executor**: Em vez de escrever diretamente, chama `GuardrailService.canWriteFile(path, content)`.
4.  **`GuardrailService`**:
    *   Se `dryRun` for `true`, loga a intenção e retorna `false`.
    *   Se o arquivo existe, chama o hook `onShowDiff`.
5.  **`vscode/guardrails/diffPreview`**: O hook `onShowDiff` é implementado aqui. Ele usa `vscode.diff` para mostrar a comparação e um `window.showInformationMessage` com botões "Aceitar" / "Rejeitar". A escolha do usuário é retornada.
6.  **`GuardrailService`**: Se o hook retornar `true`, o serviço prossegue.
7.  **`SnapshotService`**: Antes de escrever, o `Tool Executor` chama `SnapshotService.create()` para salvar o estado original do arquivo.
8.  **`fs.writeFile`**: A ferramenta finalmente escreve o arquivo no disco.
9.  **`MetricService`**: Ao final da tarefa, o `PipelineService` chama `MetricService.endTask()` para registrar a conclusão, o número de arquivos modificados, etc.

## 5. Plano de Implementação

A implementação seguirá a prioridade definida pelo @pm:

1.  **Sprint 1: Fundações**
    *   **@qa**: Configurar Vitest em `packages/core` e criar os primeiros testes para os serviços existentes (REQ-07).
    *   **@backend**: Implementar `SnapshotService` e o comando de `rollback` (REQ-02, REQ-03). Integrar no `PipelineService` e `cli`.

2.  **Sprint 2: Interação e Prevenção**
    *   **@backend**: Implementar a lógica de `dryRun` no `GuardrailService` e `PipelineService` (REQ-01).
    *   **@frontend**: Implementar os hooks de UI em `packages/vscode/src/guardrails` para confirmação de comandos e diff preview (REQ-04, REQ-05).

3.  **Sprint 3: Observabilidade**
    *   **@backend**: Implementar `MetricService` (REQ-06).
    *   **@frontend**: Integrar a exibição das métricas no chat do VS Code.

Este plano estabelece uma base sólida de segurança antes de adicionar as funcionalidades de interface, garantindo que o sistema seja robusto em cada etapa.

## 6. Próximos Passos

*   **@qa**: Iniciar a tarefa de configuração dos testes (REQ-07).
*   **@backend**: Iniciar a implementação do `SnapshotService` (REQ-02).
*   **@frontend**: Criar mockups ou protótipos para a UI de confirmação e diff.
