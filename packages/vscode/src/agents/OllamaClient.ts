import { loadOllamaConfig, type OllamaConfig } from '@thinkcoffee/core';
import * as http from 'http';
import * as https from 'https';

// ─── Types ───────────────────────────────────────────────────

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: OllamaToolCall[];
}

export interface OllamaToolCall {
  function: { name: string; arguments: Record<string, any> };
}

interface OllamaToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

interface OllamaChatResponse {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

interface OllamaStreamChunk {
  model: string;
  message?: { role: string; content: string };
  done: boolean;
}

export interface OllamaChatResult {
  text: string;
  toolCalls: OllamaToolCall[];
}

/**
 * Wrapper around Ollama's /api/chat endpoint.
 * Supports both streaming text and non-streaming tool calling.
 */
export class OllamaClient {
  private _config: OllamaConfig;

  constructor(config?: OllamaConfig) {
    this._config = config ?? loadOllamaConfig();
  }

  get isEnabled(): boolean { return this._config.enabled; }
  get model(): string { return this._config.model; }
  get family(): string { return `ollama/${this._config.model}`; }

  /** Reload config from disk */
  reload(): void { this._config = loadOllamaConfig(); }

  /**
   * Non-streaming chat with tool support.
   * Returns the full response with text and tool calls.
   */
  async chatWithTools(
    messages: OllamaChatMessage[],
    tools?: OllamaToolDef[],
    signal?: AbortSignal,
  ): Promise<OllamaChatResult> {
    const url = new URL('/api/chat', this._config.endpoint);
    const payload: Record<string, any> = {
      model: this._config.model,
      messages,
      stream: false,
    };
    if (tools?.length) payload.tools = tools;

    const body = JSON.stringify(payload);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const raw = await new Promise<string>((resolve, reject) => {
      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 11434),
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
          timeout: 120_000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => {
            const text = Buffer.concat(chunks).toString('utf-8');
            if (res.statusCode !== 200) reject(new Error(`Ollama ${res.statusCode}: ${text}`));
            else resolve(text);
          });
          res.on('error', reject);
        },
      );
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Ollama request timeout (120s)')); });
      signal?.addEventListener('abort', () => req.destroy(new Error('Ollama request aborted')));
      req.write(body);
      req.end();
    });

    const resp: OllamaChatResponse = JSON.parse(raw);
    return {
      text: resp.message?.content ?? '',
      toolCalls: resp.message?.tool_calls ?? [],
    };
  }

  /**
   * Streaming text-only chat (no tool support).
   */
  async *chat(
    messages: OllamaChatMessage[],
    signal?: AbortSignal,
  ): AsyncGenerator<string, void, undefined> {
    const url = new URL('/api/chat', this._config.endpoint);
    const body = JSON.stringify({
      model: this._config.model,
      messages,
      stream: true,
    });

    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = lib.request(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 11434),
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        resolve,
      );
      req.on('error', reject);
      signal?.addEventListener('abort', () => req.destroy(new Error('Ollama request aborted')));
      req.write(body);
      req.end();
    });

    if (response.statusCode !== 200) {
      const chunks: Buffer[] = [];
      for await (const chunk of response) chunks.push(chunk as Buffer);
      throw new Error(`Ollama ${response.statusCode}: ${Buffer.concat(chunks).toString('utf-8')}`);
    }

    let buffer = '';
    for await (const raw of response) {
      if (signal?.aborted) break;
      buffer += (raw as Buffer).toString('utf-8');
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const chunk: OllamaStreamChunk = JSON.parse(line);
          if (chunk.message?.content) yield chunk.message.content;
          if (chunk.done) return;
        } catch { /* skip malformed */ }
      }
    }
  }

  /**
   * Check connectivity: GET /api/tags
   */
  async listModels(): Promise<string[]> {
    const url = new URL('/api/tags', this._config.endpoint);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    return new Promise((resolve, reject) => {
      const req = lib.get(
        {
          hostname: url.hostname,
          port: url.port || (isHttps ? 443 : 11434),
          path: url.pathname,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', c => chunks.push(c));
          res.on('end', () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
              resolve((body.models ?? []).map((m: any) => m.name as string));
            } catch (e) {
              reject(new Error(`Ollama response parse error: ${(e as Error).message}`));
            }
          });
          res.on('error', reject);
        },
      );
      req.on('error', reject);
    });
  }
}

/** Singleton instance, lazily initialized */
let _instance: OllamaClient | null = null;

export function getOllamaClient(): OllamaClient {
  if (!_instance) _instance = new OllamaClient();
  return _instance;
}

export function reloadOllamaClient(): void {
  if (_instance) _instance.reload();
  else _instance = new OllamaClient();
}

/**
 * Convert VS Code LanguageModelChatTool[] to Ollama tool format.
 */
export function toOllamaTools(tools: { name: string; description: string; inputSchema: any }[]): any[] {
  return tools.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
    },
  }));
}
