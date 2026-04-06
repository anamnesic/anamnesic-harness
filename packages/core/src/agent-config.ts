import fs from 'fs';
import path from 'path';
import os from 'os';
import type { AgentRole } from './pipeline';

// ─── Types ───────────────────────────────────────────────────

/**
 * Quality presets — um modo por multiplicador de custo Copilot:
 *
 * - free-tier (0x):           Totalmente gratuito. GPT-4.1, GPT-4o, GPT-5 mini, Raptor mini.
 * - budget-tier (0.25x):      Quase gratis. Grok Code Fast 1.
 * - lite-tier (0.33x):        Fast/Mini models. Haiku, Gemini Flash, GPT-5.4 mini.
 * - standard-tier (1x):       Tier padrao. Sonnet, Gemini Pro, GPT-5.x.
 * - premium-tier (3x):        Premium. Claude Opus.
 * - ultra-tier (30x):         Ultra. Claude Opus 4.6 fast mode.
 */
export type QualityPreset = 'free-tier' | 'budget-tier' | 'lite-tier' | 'standard-tier' | 'premium-tier' | 'ultra-tier';

export const QUALITY_PRESETS: Record<QualityPreset, {
  label: string;
  subtitle: string;
  description: string;
  costRange: { min: CostMultiplier; max: CostMultiplier };
  models: Record<AgentRole, string>;
  ranking: string[]; // Modelos do tier em ordem de preferencia (melhor → pior)
}> = {
  // ─── TIER 0x: FREE (Copilot Free / Included) ─────────────────────────────
  'free-tier': {
    label: 'Café Solúvel',
    subtitle: 'Gratuito (0x)',
    description: 'Zero custo. So modelos inclusos no plano gratuito. Ideal pra hotfix rapido, POC descartavel, ou quando o budget ja era. Nenhuma credencial de API necessaria!',
    costRange: { min: 0, max: 0 },
    models: {
      'product-manager': 'gpt-4.1',          // Melhor raciocinio no tier free
      'architect': 'gpt-4o',                 // Bom raciocinio geral
      'organizer': 'gpt-4.1',                // Organiza projeto
      'git': 'gpt-4.1',                      // Git operations
      'dead-code': 'gpt-4.1',                // Dead code analysis
      'troubleshooter': 'gpt-4.1',           // Fix problems
      'backend': 'gpt-5-mini',               // Mini capaz pra code
      'frontend': 'gpt-4.1',                 // Geral
      'devops': 'gpt-5-mini',                // Mini capaz
      'qa': 'raptor-mini',                   // Review rapido
      'code-review': 'gpt-5-mini',            // Review alternativo
    },
    ranking: [
      'gpt-4o',             // Forte raciocinio
      'gpt-4.1',            // Solido
      'gpt-5-mini',         // Mini capaz
      'raptor-mini',        // Alternativo
    ],
  },
  // ─── TIER 0.25x: BUDGET (Grok Code Fast) ──────────────────────────────────
  'budget-tier': {
    label: 'Pingado',
    subtitle: 'Budget (0.25x)',
    description: 'Custo minimo absoluto. So Grok Code Fast 1. Bom pra iteracoes rapidas, drafts, hotfixes quando free nao basta.',
    costRange: { min: 0.25, max: 0.25 },
    models: {
      'product-manager': 'grok-code-fast-1',     // 0.25x
      'architect': 'grok-code-fast-1',           // 0.25x
      'organizer': 'grok-code-fast-1',           // 0.25x
      'git': 'grok-code-fast-1',                 // 0.25x
      'dead-code': 'grok-code-fast-1',           // 0.25x
      'troubleshooter': 'grok-code-fast-1',      // 0.25x
      'backend': 'grok-code-fast-1',             // 0.25x
      'frontend': 'grok-code-fast-1',            // 0.25x
      'devops': 'grok-code-fast-1',              // 0.25x
      'qa': 'grok-code-fast-1',                  // 0.25x
      'code-review': 'grok-code-fast-1',         // 0.25x
    },
    ranking: [
      'grok-code-fast-1',      // 0.25x — unico modelo neste tier
    ],
  },
  // ─── TIER 0.33x: LITE (Fast/Mini models) ────────────────────────────────
  'lite-tier': {
    label: 'Cafe com Leite',
    subtitle: 'Leve (0.33x)',
    description: 'Fast/mini models. Claude Haiku, Gemini Flash, GPT-5.4 mini. Analise rapida, drafts, iteracoes com mais opcoes que o budget.',
    costRange: { min: 0.33, max: 0.33 },
    models: {
      'product-manager': 'gpt-5.4-mini',         // 0.33x — melhor raciocinio mini
      'architect': 'gemini-3-flash',             // 0.33x — contexto rapido
      'organizer': 'gemini-3-flash',             // 0.33x — organize rapido
      'git': 'gpt-5.4-mini',                    // 0.33x — git rapido
      'dead-code': 'gpt-5.4-mini',               // 0.33x — analise rapida
      'troubleshooter': 'claude-haiku-4.5',      // 0.33x — fix rapido
      'backend': 'gpt-5.1-codex-mini',           // 0.33x — code rapido
      'frontend': 'gpt-5.1-codex-mini',          // 0.33x — UI rapida
      'devops': 'gpt-5.4-mini',                  // 0.33x — ops rapido
      'qa': 'claude-haiku-4.5',                  // 0.33x — testes rapidos
      'code-review': 'gemini-3-flash',           // 0.33x — review rapido
    },
    ranking: [
      'gpt-5.4-mini',          // 0.33x — melhor raciocinio lite
      'gemini-3-flash',        // 0.33x — respostas rapidas
      'claude-haiku-4.5',      // 0.33x — analise rapida
      'gpt-5.1-codex-mini',    // 0.33x — code mini
    ],
  },
  // ─── TIER 1x: STANDARD (Baseline models) ───────────────────────────────
  'standard-tier': {
    label: 'Café Coado',
    subtitle: 'Padrão (1x)',
    description: 'Tier baseline. Equilibrio custo/qualidade. Ideal pra desenvolvimento normal, features, refactors. PM usa Sonnet 4.6. Dia a dia em producao.',
    costRange: { min: 1, max: 1 },
    models: {
      'product-manager': 'claude-sonnet-4.6',    // 1x — melhor PM standard
      'architect': 'gemini-2.5-pro',             // 1x — contexto longo, design
      'organizer': 'claude-sonnet-4.6',          // 1x — organiza estrutura
      'git': 'claude-sonnet-4.6',                // 1x — git operations
      'dead-code': 'claude-sonnet-4.6',          // 1x — dead code analysis
      'troubleshooter': 'claude-sonnet-4.6',     // 1x — diagnostica e corrige
      'backend': 'gpt-5.4',                      // 1x — code solido
      'frontend': 'gpt-5.2-codex',               // 1x — UI code
      'devops': 'claude-sonnet-4.6',             // 1x — operacoes equilibradas
      'qa': 'gpt-5.2',                           // 1x — testes solidos
      'code-review': 'gpt-5.1-codex',            // 1x — review solido
    },
    ranking: [
      'claude-sonnet-4.6',      // 1x — melhor raciocinio standard
      'gemini-2.5-pro',         // 1x — contexto longo
      'gemini-3-pro',           // 1x — raciocinio pro
      'gpt-5.4',                // 1x — muito capaz code
      'gpt-5.3-codex',          // 1x — code premium
      'gpt-5.2-codex',          // 1x — code solido
      'gpt-5.2',                // 1x — geral
      'gpt-5.1-codex',          // 1x — code basico
      'gpt-5.1-codex-max',      // 1x — code maximo
      'claude-sonnet-4.5',      // 1x — sonnet anterior
      'claude-sonnet-4',        // 1x — sonnet basico
    ],
  },
  // ─── TIER 3x: PREMIUM (Opus models) ───────────────────────────────────
  'premium-tier': {
    label: 'Espresso Duplo',
    subtitle: 'Premium (3x)',
    description: 'Quando tem que ficar bom. Modelos Opus. Arquitetura de sistema, migrations criticas, features complexas. PM toma Opus 4.6 e cobra resultado.',
    costRange: { min: 3, max: 3 },
    models: {
      'product-manager': 'claude-opus-4.6',      // 3x — melhor raciocinio
      'architect': 'claude-opus-4.6',            // 3x — melhor pra arquitetura
      'organizer': 'claude-opus-4.6',            // 3x — reestrutura com precisao
      'git': 'claude-opus-4.6',                  // 3x — git profundo
      'dead-code': 'claude-opus-4.6',            // 3x — deep analysis
      'troubleshooter': 'claude-opus-4.6',       // 3x — resolve tudo
      'backend': 'claude-opus-4.5',              // 3x — code premium
      'frontend': 'claude-opus-4.6',             // 3x — raciocinio profundo UI
      'devops': 'claude-opus-4.6',               // 3x — infra critica
      'qa': 'claude-opus-4.6',                   // 3x — testa exaustivamente
      'code-review': 'claude-opus-4.6',          // 3x — revisao com lupa
    },
    ranking: [
      'claude-opus-4.6',      // 3x — topo absoluto
      'claude-opus-4.5',      // 3x — raciocinio profundo
      'gpt-5.4',              // 3x — muito capaz
      'gemini-3.1-pro',       // 3x — contexto maximo
    ],
  },
  // ─── TIER 30x: ULTRA (Opus 4.6 fast mode) ──────────────────────────────
  'ultra-tier': {
    label: 'Ristretto',
    subtitle: 'Ultra (30x)',
    description: 'Nivel maximo absoluto. So Claude Opus 4.6 fast mode. Lancamento de produto, critical deadlines, decisions that matter.',
    costRange: { min: 30, max: 30 },
    models: {
      'product-manager': 'claude-opus-4.6-fast',    // 30x — top absoluto
      'architect': 'claude-opus-4.6-fast',          // 30x — arquitetura maximo
      'organizer': 'claude-opus-4.6-fast',          // 30x — estrutura perfeita
      'git': 'claude-opus-4.6-fast',                // 30x — git perfeito
      'dead-code': 'claude-opus-4.6-fast',          // 30x — analise completa
      'troubleshooter': 'claude-opus-4.6-fast',     // 30x — resolve qualquer coisa
      'backend': 'claude-opus-4.6-fast',            // 30x — backend perfeito
      'frontend': 'claude-opus-4.6-fast',           // 30x — UI perfeita
      'devops': 'claude-opus-4.6-fast',             // 30x — infra perfeita
      'qa': 'claude-opus-4.6-fast',                 // 30x — testes perfeitos
      'code-review': 'claude-opus-4.6-fast',        // 30x — revisao perfeita
    },
    ranking: [
      'claude-opus-4.6-fast',  // 30x — nivel maximo
    ],
  },
};

export interface AgentModelConfig {
  /** 'auto' = PM (Opus) decides mode + models, 'manual' = user picks, or a quality preset */
  mode: 'auto' | 'manual' | QualityPreset;
  /** Model family per agent role */
  models: Record<AgentRole, string>;
  /** System prompt overrides per agent (optional) */
  promptOverrides?: Partial<Record<AgentRole, string>>;
}

/**
 * Copilot cost multipliers (planos pagos):
 * - 0    = free / included (nao conta no consumo)
 * - 0.25 = lite models (Grok Code Fast 1)
 * - 0.33 = fast/mini models (Haiku, Gemini 3 Flash, GPT-5.4 mini, etc)
 * - 1    = standard tier (Sonnet, Gemini Pro, GPT-5.x, etc)
 * - 3    = premium tier (Opus 4.5, Opus 4.6)
 * - 30   = ultra premium (Opus 4.6 fast mode)
 */
export type CostMultiplier = 0 | 0.25 | 0.33 | 1 | 3 | 30;

/**
 * Model families grouped by Copilot cost multiplier tier:
 * 
 * TIER 0x (Café Solúvel):      Free / Included in Copilot Free
 * TIER 0.25x-0.33x (Café com Leite): Light / Mini models
 * TIER 1x (Café Coado):        Standard / Baseline models
 * TIER 3x (Espresso Duplo):    Premium / Opus models
 * TIER 30x (Lungo Premium):    Ultra Premium / Opus Fast mode
 */
/** Model families available via VS Code Language Model API (Copilot) - grouped by multiplier */
export const AVAILABLE_MODELS = [
  // ═════════════════════════════════════════════════════════════════════════
  // TIER 0x (Free / Included in Copilot Free) — Multiplier: 0
  // ═════════════════════════════════════════════════════════════════════════
  { family: 'gpt-4.1', label: 'GPT-4.1', tier: 'free', vendor: 'copilot', cost: 0 as CostMultiplier },
  { family: 'gpt-4o', label: 'GPT-4o', tier: 'free', vendor: 'copilot', cost: 0 as CostMultiplier },
  { family: 'gpt-5-mini', label: 'GPT-5 mini', tier: 'free', vendor: 'copilot', cost: 0 as CostMultiplier },
  { family: 'raptor-mini', label: 'Raptor mini (Preview)', tier: 'free', vendor: 'copilot', cost: 0 as CostMultiplier },
  { family: 'goldeneye', label: 'Goldeneye', tier: 'free', vendor: 'copilot', cost: 0 as CostMultiplier },

  // ═════════════════════════════════════════════════════════════════════════
  // TIER 0.25x (Lite) — Grok Code Fast
  // ═════════════════════════════════════════════════════════════════════════
  { family: 'grok-code-fast-1', label: 'Grok Code Fast 1', tier: 'lite', vendor: 'copilot', cost: 0.25 as CostMultiplier },

  // ═════════════════════════════════════════════════════════════════════════
  // TIER 0.33x (Lite) — Fast/Mini Models
  // ═════════════════════════════════════════════════════════════════════════
  { family: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', tier: 'lite', vendor: 'copilot', cost: 0.33 as CostMultiplier },
  { family: 'gemini-3-flash', label: 'Gemini 3 Flash (Preview)', tier: 'lite', vendor: 'copilot', cost: 0.33 as CostMultiplier },
  { family: 'gpt-5.4-mini', label: 'GPT-5.4 mini', tier: 'lite', vendor: 'copilot', cost: 0.33 as CostMultiplier },
  { family: 'gpt-5.1-codex-mini', label: 'GPT-5.1-Codex-Mini', tier: 'lite', vendor: 'copilot', cost: 0.33 as CostMultiplier },

  // ═════════════════════════════════════════════════════════════════════════
  // TIER 1x (Standard) — Baseline Models
  // ═════════════════════════════════════════════════════════════════════════
  { family: 'claude-sonnet-4', label: 'Claude Sonnet 4', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },
  { family: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },
  { family: 'claude-sonnet-4.6', label: 'Claude Sonnet 4.6', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },
  { family: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },
  { family: 'gemini-3-pro', label: 'Gemini 3 Pro', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },
  { family: 'gemini-3.1-pro', label: 'Gemini 3.1 Pro (Preview)', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },
  { family: 'gpt-5.1', label: 'GPT-5.1', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },
  { family: 'gpt-5.1-codex', label: 'GPT-5.1-Codex', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },
  { family: 'gpt-5.1-codex-max', label: 'GPT-5.1-Codex-Max', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },
  { family: 'gpt-5.2', label: 'GPT-5.2', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },
  { family: 'gpt-5.2-codex', label: 'GPT-5.2-Codex', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },
  { family: 'gpt-5.3-codex', label: 'GPT-5.3-Codex', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },
  { family: 'gpt-5.4', label: 'GPT-5.4', tier: 'standard', vendor: 'copilot', cost: 1 as CostMultiplier },

  // ═════════════════════════════════════════════════════════════════════════
  // TIER 3x (Premium) — Opus Models
  // ═════════════════════════════════════════════════════════════════════════
  { family: 'claude-opus-4.5', label: 'Claude Opus 4.5', tier: 'premium', vendor: 'copilot', cost: 3 as CostMultiplier },
  { family: 'claude-opus-4.6', label: 'Claude Opus 4.6', tier: 'premium', vendor: 'copilot', cost: 3 as CostMultiplier },

  // ═════════════════════════════════════════════════════════════════════════
  // TIER 30x (Ultra Premium) — Opus Fast Mode
  // ═════════════════════════════════════════════════════════════════════════
  { family: 'claude-opus-4.6-fast', label: 'Claude Opus 4.6 (fast mode) (preview)', tier: 'ultra-premium', vendor: 'copilot', cost: 30 as CostMultiplier },
] as const;

export type ModelFamily = typeof AVAILABLE_MODELS[number]['family'];

/** Legacy preset aliases — map old names to new tier names */
const LEGACY_PRESET_MAP: Record<string, QualityPreset> = {
  'cafe-soluvel': 'free-tier',
  'coado-com-carinho': 'standard-tier',
  'espresso-duplo': 'premium-tier',
  'ultra-premium-tier': 'ultra-tier',
};

/** Resolve legacy preset name to current tier name */
export function resolvePreset(mode: string): QualityPreset | string {
  return LEGACY_PRESET_MAP[mode] ?? mode;
}

// ─── Config file management ──────────────────────────────────

function getConfigPath(): string {
  return path.join(os.homedir(), '.thinkcoffee', 'agent-config.json');
}

/** Load agent model configuration (creates default if missing) */
export function loadAgentConfig(): AgentModelConfig {
  const configPath = getConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as AgentModelConfig;
    }
  } catch (err) {
    console.error(`[ThinkCoffee] Failed to load agent config: ${(err as Error).message}`);
  }
  // Return default — cafe-soluvel (gratuito, zero credenciais necessarias) para nao gastar sem querer
  return applyQualityPreset('free-tier');
}

/** Save agent model configuration */
export function saveAgentConfig(config: AgentModelConfig): void {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/** Get model family for a specific agent — respects active preset, falls back to free-tier */
export function getModelForAgent(role: AgentRole, config?: AgentModelConfig): string {
  const cfg = config || loadAgentConfig();
  if (cfg.models[role]) return cfg.models[role];

  // Resolve legacy preset names
  const resolved = resolvePreset(cfg.mode) as QualityPreset;
  if (isQualityPreset(resolved)) {
    const presetModel = QUALITY_PRESETS[resolved]?.models[role];
    if (presetModel) return presetModel;
  }
  // Final fallback: free-tier (never spend money by accident)
  return QUALITY_PRESETS['free-tier'].models[role];
}

/** Update a single agent's model */
export function setAgentModel(role: AgentRole, modelFamily: string): AgentModelConfig {
  const config = loadAgentConfig();
  config.models[role] = modelFamily;
  saveAgentConfig(config);
  return config;
}

/** PM auto-assigns models based on task complexity */
export interface PMModelAssignment {
  role: AgentRole;
  model: string;
  reason: string;
}

/** Apply a quality preset — updates config and saves (resolves legacy names) */
export function applyQualityPreset(preset: QualityPreset | string): AgentModelConfig {
  const resolved = resolvePreset(preset) as QualityPreset;
  const presetData = QUALITY_PRESETS[resolved];
  if (!presetData) throw new Error(`Preset desconhecido: ${preset}`);

  const config: AgentModelConfig = {
    mode: resolved,
    models: { ...presetData.models },
  };
  saveAgentConfig(config);
  return config;
}

/** Check if mode is a quality preset (supports legacy names) */
export function isQualityPreset(mode: string): mode is QualityPreset {
  const resolved = resolvePreset(mode);
  return resolved in QUALITY_PRESETS;
}

// ─── Cost Tier Helpers ───────────────────────────────────────

/** Get cost multiplier for a model family */
export function getModelCost(family: string): CostMultiplier {
  const model = AVAILABLE_MODELS.find(m => m.family === family);
  return (model?.cost ?? 0) as CostMultiplier;
}

/** Get models within a cost range */
export function getModelsByCostRange(min: number, max: number): typeof AVAILABLE_MODELS[number][] {
  return [...AVAILABLE_MODELS.filter(m => m.cost >= min && m.cost <= max)];
}

/** Get the ranking list for a preset (fallback order for model swaps) */
export function getPresetRanking(preset: QualityPreset): string[] {
  return QUALITY_PRESETS[preset]?.ranking ?? [];
}

/** Get the PM model for a given preset */
export function getPMModelForPreset(preset: QualityPreset | string): string {
  const resolved = resolvePreset(preset) as QualityPreset;
  return QUALITY_PRESETS[resolved]?.models['product-manager'] ?? QUALITY_PRESETS['free-tier'].models['product-manager'];
}

// ─── Model Failure History ───────────────────────────────────

/** A record of a model failing/being rejected for a role */
export interface ModelFailureEntry {
  model: string;
  role: string;
  taskTitle: string;
  feedback: string;
  timestamp: string;
}

/** Full failure history keyed by model family */
export interface ModelFailureHistory {
  /** model family -> array of failures */
  failures: Record<string, ModelFailureEntry[]>;
}

function getFailureHistoryPath(): string {
  return path.join(os.homedir(), '.thinkcoffee', 'model-failures.json');
}

/** Load model failure history */
export function loadModelFailures(): ModelFailureHistory {
  const p = getFailureHistoryPath();
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    }
  } catch { /* ignore */ }
  return { failures: {} };
}

/** Record a model failure/rejection */
export function recordModelFailure(
  model: string,
  role: string,
  taskTitle: string,
  feedback: string,
): void {
  const history = loadModelFailures();
  if (!history.failures[model]) history.failures[model] = [];

  history.failures[model].push({
    model,
    role,
    taskTitle,
    feedback: feedback.substring(0, 500),
    timestamp: new Date().toISOString(),
  });

  // Keep at most 50 entries per model to avoid unbounded growth
  if (history.failures[model].length > 50) {
    history.failures[model] = history.failures[model].slice(-50);
  }

  const filePath = getFailureHistoryPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(history, null, 2), 'utf-8');
}

/** Get failure count per model, optionally filtered by role */
export function getModelFailureCounts(role?: string): Record<string, number> {
  const history = loadModelFailures();
  const counts: Record<string, number> = {};
  for (const [model, entries] of Object.entries(history.failures)) {
    const filtered = role ? entries.filter(e => e.role === role) : entries;
    if (filtered.length > 0) {
      counts[model] = filtered.length;
    }
  }
  return counts;
}

// ─── Ollama Configuration ────────────────────────────────────

export interface OllamaConfig {
  /** Whether Ollama is enabled as provider */
  enabled: boolean;
  /** Ollama API endpoint (default: http://localhost:11434) */
  endpoint: string;
  /** Model to use for all agents when Ollama is enabled (e.g. llama3, codellama, mistral) */
  model: string;
}

const DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
  enabled: false,
  endpoint: 'http://localhost:11434',
  model: 'llama3',
};

function getOllamaConfigPath(): string {
  return path.join(os.homedir(), '.thinkcoffee', 'ollama-config.json');
}

/** Load Ollama configuration */
export function loadOllamaConfig(): OllamaConfig {
  const p = getOllamaConfigPath();
  try {
    if (fs.existsSync(p)) {
      const raw = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return { ...DEFAULT_OLLAMA_CONFIG, ...raw };
    }
  } catch { /* ignore */ }
  return { ...DEFAULT_OLLAMA_CONFIG };
}

/** Save Ollama configuration */
export function saveOllamaConfig(config: OllamaConfig): void {
  const p = getOllamaConfigPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(p, JSON.stringify(config, null, 2), 'utf-8');
}
