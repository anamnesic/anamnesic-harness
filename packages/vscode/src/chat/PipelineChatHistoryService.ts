import { ChatService } from '@thinkcoffee/core';
import type { ChatMessage } from '@thinkcoffee/core';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * PipelineChatHistoryService
 * Gerencia o histórico de chat para cada pipeline
 * Oferece persistência, recuperação e sincronização
 */
export class PipelineChatHistoryService {
  private _chats = new Map<string, ChatService>();
  private _historyDir: string;

  constructor() {
    this._historyDir = path.join(os.homedir(), '.thinkcoffee', 'pipeline-chat');
    if (!fs.existsSync(this._historyDir)) {
      fs.mkdirSync(this._historyDir, { recursive: true });
    }
  }

  /**
   * Obtém ou cria um ChatService para um pipeline específico
   */
  getChatForPipeline(pipelineId: string): ChatService {
    if (this._chats.has(pipelineId)) {
      return this._chats.get(pipelineId)!;
    }

    const chat = new ChatService(`pipeline-${pipelineId}`);
    this._chats.set(pipelineId, chat);
    return chat;
  }

  /**
   * Salva o histórico de um pipeline em um arquivo de backup
   */
  backupPipelineHistory(pipelineId: string): string {
    const chat = this.getChatForPipeline(pipelineId);
    const history = chat.getHistory();
    
    const backupFile = path.join(
      this._historyDir,
      `backup_${pipelineId}_${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`
    );

    const content = history
      .map(m => JSON.stringify(m))
      .join('\n');

    fs.writeFileSync(backupFile, content, 'utf-8');
    return backupFile;
  }

  /**
   * Restaura histórico de um arquivo de backup
   */
  restorePipelineHistory(pipelineId: string, backupFile: string): void {
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Arquivo de backup não encontrado: ${backupFile}`);
    }

    const chat = this.getChatForPipeline(pipelineId);
    const content = fs.readFileSync(backupFile, 'utf-8').trim();
    
    if (!content) return;

    const messages: ChatMessage[] = [];
    content.split('\n').forEach((line, i) => {
      if (!line.trim()) return;
      try {
        messages.push(JSON.parse(line) as ChatMessage);
      } catch (err) {
        console.error(`Erro ao restaurar linha ${i + 1}: ${err}`);
      }
    });

    // Limpar e restaurar
    chat.clear();
    messages.forEach(m => {
      // Recriar mensagem sem usar send (que geraria novo id e timestamp)
      const filePath = chat.getFilePath();
      fs.appendFileSync(filePath, JSON.stringify(m) + '\n', 'utf-8');
    });
  }

  /**
   * Lista todos os backups disponíveis para um pipeline
   */
  listBackups(pipelineId: string): Array<{ file: string; path: string; timestamp: string }> {
    const files = fs.readdirSync(this._historyDir);
    const pattern = new RegExp(`^backup_${pipelineId}_`);
    
    return files
      .filter(f => pattern.test(f))
      .map(f => ({
        file: f,
        path: path.join(this._historyDir, f),
        timestamp: f.match(/_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1] || 'unknown',
      }))
      .sort((a, b) => b.file.localeCompare(a.file));
  }

  /**
   * Deleta backups antigos (mais de `daysOld` dias)
   */
  cleanupOldBackups(daysOld: number = 30): number {
    const files = fs.readdirSync(this._historyDir);
    const cutoff = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let deleted = 0;

    files.forEach(f => {
      const fullPath = path.join(this._historyDir, f);
      const stat = fs.statSync(fullPath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(fullPath);
        deleted++;
      }
    });

    return deleted;
  }

  /**
   * Exporta histórico de um pipeline em diferentes formatos
   */
  exportHistory(
    pipelineId: string,
    format: 'json' | 'jsonl' | 'markdown' | 'csv' = 'json'
  ): string {
    const chat = this.getChatForPipeline(pipelineId);
    const history = chat.getHistory();

    let content: string;

    switch (format) {
      case 'jsonl':
        content = history.map(m => JSON.stringify(m)).join('\n');
        break;

      case 'markdown':
        const mdLines = history.map(m => {
          const time = new Date(m.timestamp).toLocaleString('pt-BR');
          return [
            `### ${m.senderLabel || m.sender} (${m.type})`,
            `*${time}*`,
            '',
            m.content,
          ].join('\n');
        });
        content = mdLines.join('\n\n---\n\n');
        break;

      case 'csv':
        // CSV headers
        const headers = ['timestamp', 'sender', 'senderLabel', 'type', 'content'];
        const rows = history.map(m => [
          `"${m.timestamp}"`,
          `"${m.sender}"`,
          `"${m.senderLabel || ''}"`,
          `"${m.type}"`,
          `"${m.content.replace(/"/g, '""')}"`,
        ]);
        content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        break;

      default: // json
        content = JSON.stringify(history, null, 2);
    }

    return content;
  }

  /**
   * Sincroniza histórico entre múltiplos chats (merge com deduplicação por ID)
   */
  syncHistories(pipelineId: string, otherHistories: ChatMessage[][]): ChatMessage[] {
    const chat = this.getChatForPipeline(pipelineId);
    const current = chat.getHistory();
    
    const merged = new Map<string, ChatMessage>();
    
    // Adicionar mensagens atuais
    current.forEach(m => merged.set(m.id, m));
    
    // Mesclar com histsórias de outros chats
    otherHistories.forEach(history => {
      history.forEach(m => {
        if (!merged.has(m.id)) {
          merged.set(m.id, m);
        }
      });
    });

    // Ordenar por timestamp
    const synced = Array.from(merged.values()).sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return synced;
  }

  /**
   * Obter estatísticas de histórico
   */
  getHistoryStats(pipelineId: string) {
    const chat = this.getChatForPipeline(pipelineId);
    const history = chat.getHistory();

    const stats = {
      totalMessages: history.length,
      totalCharacters: history.reduce((sum, m) => sum + m.content.length, 0),
      messagesByType: {} as Record<string, number>,
      messagesBySender: {} as Record<string, number>,
      dateRange: history.length > 0 ? {
        oldest: history[0].timestamp,
        newest: history[history.length - 1].timestamp,
      } : null,
    };

    history.forEach(m => {
      stats.messagesByType[m.type] = (stats.messagesByType[m.type] || 0) + 1;
      stats.messagesBySender[m.sender] = (stats.messagesBySender[m.sender] || 0) + 1;
    });

    return stats;
  }

  /**
   * Cleanup: remover um pipeline do cache
   */
  removePipelineChat(pipelineId: string): void {
    this._chats.delete(pipelineId);
  }

  /**
   * Obter diretório raiz de histórico
   */
  getHistoryDirectory(): string {
    return this._historyDir;
  }
}

// Instância singleton
let instance: PipelineChatHistoryService | null = null;

export function getPipelineChatHistoryService(): PipelineChatHistoryService {
  if (!instance) {
    instance = new PipelineChatHistoryService();
  }
  return instance;
}
