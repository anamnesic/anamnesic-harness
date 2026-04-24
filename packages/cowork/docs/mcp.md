# MCP (Model Context Protocol) Support

Kuse Cowork supports the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/), allowing the agent to use tools provided by external MCP servers alongside its built-in tools.

---

## What is MCP?

MCP is an open protocol that standardizes how AI applications connect to external data sources and tools. An MCP server exposes a set of callable **tools** (and optionally **resources** and **prompts**) that any MCP-compatible client can discover and invoke.

---

## Architecture

```
Kuse Cowork (MCP Client)
        │
        │  HTTP (SSE + JSON-RPC)
        │
        ▼
  MCP Server (e.g., GitHub, Jira, custom tool server)
        │
        ▼
  External APIs / Data Sources
```

The `MCPManager` (`src-tauri/src/mcp/client.rs`) maintains a connection pool of MCP servers. At agent startup, it:
1. Queries each connected server for its tool list.
2. Injects those tool definitions into the LLM's tool context alongside the built-in tools.
3. Routes `tool_use` calls to the appropriate server via HTTP.

---

## Configuring MCP Servers

Open the **MCP** panel (plug icon in the sidebar).

### Adding a Server

1. Click **"Add Server"**.
2. Fill in the fields:

| Field | Description |
|---|---|
| **Name** | A display name for the server |
| **Server URL** | The HTTP endpoint of the MCP server (e.g., `http://localhost:8080`) |
| **OAuth Client ID** | Optional — for OAuth-protected servers |
| **OAuth Client Secret** | Optional — for OAuth-protected servers |
| **Enabled** | Toggle to enable/disable without deleting |

3. Click **Save**.

### Connecting / Disconnecting

Each server can be individually connected or disconnected from the MCP panel. Connection status shows one of:

| Status | Meaning |
|---|---|
| `Connected` | Server is reachable and tools are available |
| `Connecting` | Handshake in progress |
| `Disconnected` | Server not connected |
| `Error` | Connection failed (error message shown) |

### Auto-Connect

Servers with **Enabled** set to `true` are automatically connected when the app starts.

---

## MCP Server Configuration — Data Model

```typescript
interface MCPServerConfig {
  id: string;              // UUID (auto-generated)
  name: string;            // Display name
  server_url: string;      // HTTP endpoint
  oauth_client_id?: string;
  oauth_client_secret?: string;
  enabled: boolean;
  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp
}
```

Configurations are persisted in the local SQLite database (`mcp_servers` table).

---

## MCP Tool Invocation

When the agent calls an MCP tool, the request flow is:

```
AgentLoop detects tool_use block with server-prefixed tool name
        │
        ▼
ToolExecutor::execute_mcp_tool()
        │
        ▼
MCPManager::execute_tool(MCPToolCall { server_id, tool_name, parameters })
        │
        ▼
HTTP POST to MCP server (JSON-RPC)
        │
        ▼
MCPToolResult { success, result, error }
        │
        ▼
Injected back into agent conversation as tool_result
```

---

## Tauri IPC Commands for MCP

| Command | Description |
|---|---|
| `list_mcp_servers` | Returns all configured MCP server configs |
| `save_mcp_server` | Create or update an MCP server config |
| `delete_mcp_server` | Remove an MCP server config |
| `connect_mcp_server` | Connect to a specific server by ID |
| `disconnect_mcp_server` | Disconnect from a specific server |
| `get_mcp_server_statuses` | Get connection status + tool list for all servers |
| `execute_mcp_tool` | Manually invoke an MCP tool (used by the agent internally) |

---

## Example: Running a Local MCP Server

Any HTTP server that implements the MCP specification can be connected. For example, using the [official MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk):

```python
# my_server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("My Tools")

@mcp.tool()
def add(a: int, b: int) -> int:
    """Add two numbers."""
    return a + b

mcp.run(transport="sse", host="localhost", port=8080)
```

Then in Kuse Cowork, add a server with URL `http://localhost:8080`. The `add` tool will appear in the agent's available tools automatically.
