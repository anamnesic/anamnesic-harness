import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SessionService } from '../../core/services/SessionService';
import { getDatabase } from '../../core/database';
import { Session } from '../../core/entities/Session';

const sessionService = new SessionService();

export function registerSessionEndpoints(server: McpServer) {
  // Create a new session
  server.tool(
    'session_create',
    'Create a new chat session',
    {
      model: z.string().optional().describe('Model to use for this session'),
    },
    async ({ model }) => {
      const session = await sessionService.createSession(model);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: session.id,
              title: session.title,
              autoTitle: session.autoTitle,
              messageCount: session.messageCount,
              model: session.model,
            }),
          },
        ],
      };
    }
  );

  // Add a message to a session
  server.tool(
    'session_add_message',
    'Add a message to a session',
    {
      sessionId: z.string().describe('Session ID'),
      role: z.enum(['user', 'assistant', 'system']).describe('Message role'),
      content: z.string().describe('Message content'),
      tokenCount: z.number().optional().describe('Token count (auto-calculated if not provided)'),
      model: z.string().optional().describe('Model used for this message'),
    },
    async ({ sessionId, role, content, tokenCount, model }) => {
      const message = await sessionService.addMessage(
        sessionId,
        role,
        content,
        { tokenCount, model }
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: message.id,
              role: message.role,
              tokenCount: message.tokenCount,
              createdAt: message.createdAt,
            }),
          },
        ],
      };
    }
  );

  // Get session details
  server.tool(
    'session_get',
    'Get session details',
    {
      sessionId: z.string().describe('Session ID'),
    },
    async ({ sessionId }) => {
      const session = await sessionService.getSession(sessionId);
      if (!session) {
        return {
          content: [{ type: 'text' as const, text: 'Session not found' }],
        };
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              id: session.id,
              title: session.title,
              autoTitle: session.autoTitle,
              messageCount: session.messageCount,
              totalTokens: session.totalTokens,
              contextWindowSize: session.contextWindowSize,
              maxContextWindow: session.maxContextWindow,
              model: session.model,
              createdAt: session.createdAt,
              updatedAt: session.updatedAt,
            }),
          },
        ],
      };
    }
  );

  // List sessions
  server.tool(
    'session_list',
    'List all active sessions',
    {
      limit: z.number().optional().describe('Max number of sessions to return'),
    },
    async ({ limit }) => {
      const sessions = await sessionService.listSessions(limit);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              sessions.map((s) => ({
                id: s.id,
                title: s.title || s.autoTitle,
                messageCount: s.messageCount,
                model: s.model,
                updatedAt: s.updatedAt,
              }))
            ),
          },
        ],
      };
    }
  );

  // Get context window usage
  server.tool(
    'session_context_usage',
    'Get context window usage for a session',
    {
      sessionId: z.string().describe('Session ID'),
    },
    async ({ sessionId }) => {
      const usage = sessionService.getContextUsage(sessionId);
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(usage),
          },
        ],
      };
    }
  );

  // Search similar messages in session
  server.tool(
    'session_search_messages',
    'Search for similar messages in a session using embeddings',
    {
      sessionId: z.string().describe('Session ID'),
      query: z.string().describe('Search query'),
      limit: z.number().optional().describe('Max number of results'),
    },
    async ({ sessionId, query, limit }) => {
      const results = await sessionService.searchSimilarMessages(
        sessionId,
        query,
        limit
      );
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(results),
          },
        ],
      };
    }
  );

  // Archive a session
  server.tool(
    'session_archive',
    'Archive a session',
    {
      sessionId: z.string().describe('Session ID'),
    },
    async ({ sessionId }) => {
      await sessionService.archiveSession(sessionId);
      return {
        content: [
          { type: 'text' as const, text: 'Session archived successfully' },
        ],
      };
    }
  );

  // Delete a session
  server.tool(
    'session_delete',
    'Delete a session and all its data',
    {
      sessionId: z.string().describe('Session ID'),
    },
    async ({ sessionId }) => {
      await sessionService.deleteSession(sessionId);
      return {
        content: [
          { type: 'text' as const, text: 'Session deleted successfully' },
        ],
      };
    }
  );
}
