import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs';
import path from 'path';

export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

export interface MCPToolDef {
  serverName: string;
  name: string;
  description?: string;
  inputSchema: Record<string, any>;
}

interface ConnectedServer {
  client: Client;
  transport: StdioClientTransport;
  config: MCPServerConfig;
}

class MCPClientManager {
  private servers: Map<string, ConnectedServer> = new Map();
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'server', 'mcp', 'config.json');
  }

  getConfig(): Record<string, MCPServerConfig> {
    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return parsed.mcpServers || {};
    } catch {
      return {};
    }
  }

  saveConfig(servers: Record<string, MCPServerConfig>): void {
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify({ mcpServers: servers }, null, 2));
  }

  async connectAll(): Promise<MCPToolDef[]> {
    const config = this.getConfig();
    const allTools: MCPToolDef[] = [];

    for (const [serverName, serverConfig] of Object.entries(config)) {
      if (!serverConfig.enabled) continue;

      try {
        const tools = await this.connectServer(serverName, serverConfig);
        allTools.push(...tools);
        console.log(`[MCP] ${serverName}: ${tools.length} tools discovered`);
      } catch (err: any) {
        console.warn(`[MCP] Failed to connect to ${serverName}: ${err.message}`);
      }
    }

    return allTools;
  }

  private async connectServer(name: string, config: MCPServerConfig): Promise<MCPToolDef[]> {
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: config.env || undefined,
    });

    const client = new Client(
      { name: 'lumiOS-mcp-client', version: '2.0' },
      { capabilities: {} },
    );

    await client.connect(transport);

    this.servers.set(name, { client, transport, config });

    const result = await client.listTools();
    return result.tools.map((tool: any) => ({
      serverName: name,
      name: `mcp_${name}_${tool.name}`,
      description: tool.description || `${tool.name} (from MCP server: ${name})`,
      inputSchema: tool.inputSchema || { type: 'object', properties: {} },
    }));
  }

  async callTool(fullName: string, args: Record<string, any>): Promise<string> {
    // Parse "mcp_filesystem_read_file" → serverName="filesystem", toolName="read_file"
    const match = fullName.match(/^mcp_(.+?)_(.+)$/);
    if (!match) throw new Error(`Invalid MCP tool name: ${fullName}`);

    const [, serverName, toolName] = match;
    const server = this.servers.get(serverName);
    if (!server) throw new Error(`MCP server "${serverName}" not connected`);

    const result = await server.client.callTool({ name: toolName, arguments: args });

    // Extract text content from MCP result
    const contents = (result as any).content || [];
    return contents
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n');
  }

  async disconnectAll(): Promise<void> {
    for (const [name, server] of this.servers) {
      try {
        await server.transport.close();
      } catch {
        // ignore close errors
      }
    }
    this.servers.clear();
  }

  async restartServer(name: string): Promise<MCPToolDef[]> {
    const server = this.servers.get(name);
    if (server) {
      try { await server.transport.close(); } catch {}
      this.servers.delete(name);
    }

    const config = this.getConfig();
    const serverConfig = config[name];
    if (!serverConfig || !serverConfig.enabled) return [];

    return this.connectServer(name, serverConfig);
  }

  getConnectedServers(): string[] {
    return Array.from(this.servers.keys());
  }
}

export const mcpManager = new MCPClientManager();
