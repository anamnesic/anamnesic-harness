import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

export interface SessionMessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tokenCount: number;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
  metadata?: Record<string, any>;
}

export interface SessionRecord {
  id: string;
  title: string | null;
  autoTitle: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  totalTokens: number;
  contextWindowSize: number | null;
  maxContextWindow: number | null;
  model: string | null;
  isArchived: boolean;
  lancedbTable: string | null;
}

function getSessionsDir(): string {
  const dir = path.join(os.homedir(), '.kairos', 'sessions');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getSessionDir(sessionId: string): string {
  const dir = path.join(getSessionsDir(), sessionId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getMessagesFile(sessionId: string): string {
  return path.join(getSessionDir(sessionId), 'messages.jsonl');
}

function getSessionFile(sessionId: string): string {
  return path.join(getSessionDir(sessionId), 'session.json');
}

export class SessionStore {
  appendMessage(
    sessionId: string,
    message: Omit<SessionMessageRecord, 'id' | 'sessionId' | 'timestamp'>
  ): SessionMessageRecord {
    const record: SessionMessageRecord = {
      ...message,
      id: crypto.randomUUID(),
      sessionId,
      timestamp: new Date().toISOString(),
    };

    const filePath = getMessagesFile(sessionId);
    fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf-8');
    return record;
  }

  getMessages(sessionId: string, limit?: number): SessionMessageRecord[] {
    const filePath = getMessagesFile(sessionId);
    if (!fs.existsSync(filePath)) return [];

    const raw = fs.readFileSync(filePath, 'utf-8').trim();
    if (!raw) return [];

    const lines = raw.split('\n');
    const messages: SessionMessageRecord[] = [];

    for (const [i, line] of lines.entries()) {
      if (!line.trim()) continue;
      try {
        messages.push(JSON.parse(line) as SessionMessageRecord);
      } catch (err) {
        console.error(
          `[SessionStore] Parse error line ${i + 1}: ${(err as Error).message}`
        );
      }
    }

    return limit ? messages.slice(-limit) : messages;
  }

  saveSessionMetadata(session: SessionRecord): void {
    const filePath = getSessionFile(session.id);
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf-8');
  }

  getSessionMetadata(sessionId: string): SessionRecord | null {
    const filePath = getSessionFile(sessionId);
    if (!fs.existsSync(filePath)) return null;

    try {
      return JSON.parse(
        fs.readFileSync(filePath, 'utf-8')
      ) as SessionRecord;
    } catch {
      return null;
    }
  }

  listSessions(): string[] {
    const dir = getSessionsDir();
    return fs.readdirSync(dir).filter((f) => {
      const sessionFile = path.join(dir, f, 'session.json');
      return fs.existsSync(sessionFile);
    });
  }

  deleteSession(sessionId: string): void {
    const dir = getSessionDir(sessionId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
}
