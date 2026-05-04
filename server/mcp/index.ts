export { mcpManager } from './client';
export type { MCPServerConfig, MCPToolDef } from './client';

import { toolRegistry } from '../tools/registry';
import { mcpManager, MCPToolDef, MCPServerConfig } from './client';
import type { ToolDefinition, ToolContext } from '../tools/types';

/**
 * Register all discovered MCP tools into our tool registry.
 * Each MCP tool gets prefixed: mcp_{serverName}_{toolName}
 */
export async function registerMCPTools(): Promise<string[]> {
  const mcpTools = await mcpManager.connectAll();
  const registered: string[] = [];

  for (const tool of mcpTools) {
    // MCP tools default to 'confirm' — user must explicitly trust the server
    const def: ToolDefinition = {
      name: tool.name,
      description: tool.description || `MCP tool: ${tool.name}`,
      permission: 'public',
      securityLevel: 'confirm',
      parameters: mcpSchemaToParams(tool.inputSchema),
      handler: async (params: Record<string, any>, ctx: ToolContext) => {
        return mcpManager.callTool(tool.name, params);
      },
    };

    toolRegistry.register(def);
    registered.push(tool.name);
  }

  return registered;
}

/**
 * Get MCP server config (for listing in UI)
 */
export function getMCPConfig(): Record<string, MCPServerConfig> {
  return mcpManager.getConfig();
}

/**
 * Update MCP server config and reconnect
 */
export async function updateMCPConfig(servers: Record<string, MCPServerConfig>): Promise<string[]> {
  mcpManager.saveConfig(servers);
  return registerMCPTools();
}

function mcpSchemaToParams(schema: Record<string, any>): Record<string, any> {
  if (!schema || !schema.properties) return {};

  const params: Record<string, any> = {};
  for (const [key, prop] of Object.entries(schema.properties) as [string, any][]) {
    params[key] = {
      type: prop.type || 'string',
      description: prop.description || '',
      required: (schema.required || []).includes(key),
    };
  }

  return params;
}
