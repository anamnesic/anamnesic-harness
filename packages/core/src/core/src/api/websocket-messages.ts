export interface WebSocketMessage {
  type: string
  payload: unknown
  timestamp: number
  sessionId?: string
  requestId?: string
}

export interface SessionSyncMessage {
  type: "session_sync"
  payload: {
    sessions: SessionSummary[]
    currentSessionId?: string
  }
  timestamp: number
}

export interface SessionSummary {
  id: string
  title: string
  messageCount: number
  updatedAt: number
}

export interface AgentSyncMessage {
  type: "agent_sync"
  payload: {
    agents: AgentSummary[]
    currentAgentId: string
  }
  timestamp: number
}

export interface AgentSummary {
  id: string
  name: string
  model: string
  description?: string
}

export interface ToolSyncMessage {
  type: "tool_sync"
  payload: {
    tools: ToolSummary[]
  }
  timestamp: number
}

export interface ToolSummary {
  name: string
  description: string
  category: string
}

export interface ChatMessage {
  type: "chat"
  payload: {
    sessionId: string
    message: string
    stream?: boolean
  }
  timestamp: number
  requestId: string
}

export interface TokenStreamMessage {
  type: "token"
  payload: {
    token: string
    done: boolean
  }
  timestamp: number
  sessionId: string
  requestId: string
}

export interface ToolCallMessage {
  type: "tool_call"
  payload: {
    toolName: string
    args: Record<string, unknown>
    status: "started" | "completed" | "failed"
    result?: unknown
  }
  timestamp: number
  sessionId: string
}

export interface ErrorMessage {
  type: "error"
  payload: {
    code: string
    message: string
    recoverable: boolean
  }
  timestamp: number
  requestId?: string
}

export interface PresenceMessage {
  type: "presence"
  payload: {
    userId: string
    status: "online" | "away" | "offline"
    currentSessionId?: string
  }
  timestamp: number
}

export interface HealthCheckMessage {
  type: "health_check"
  payload: {
    status: "ok" | "degraded" | "error"
    version: string
  }
  timestamp: number
}

export function createMessage(
  type: string,
  payload: unknown,
  sessionId?: string,
  requestId?: string,
): WebSocketMessage {
  return {
    type,
    payload,
    timestamp: Date.now(),
    sessionId,
    requestId,
  }
}
