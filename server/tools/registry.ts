import { ToolDefinition, ToolPermission, SecurityLevel, ToolContext } from './types';
import { ToolPolicy } from '../personality/types';

export type EffectiveSecurity = { level: SecurityLevel; reason: string };

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(filterPermission?: ToolPermission): ToolDefinition[] {
    const all = Array.from(this.tools.values());
    if (!filterPermission) return all;
    return all.filter(t => t.permission === filterPermission || t.permission === 'public');
  }

  getToolDeclarations(): Array<{
    type: 'function';
    function: { name: string; description: string; parameters: Record<string, any> };
  }> {
    return this.list().map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      },
    }));
  }

  /** Resolve effective security level for a tool given a personality's policy */
  resolveSecurity(toolName: string, policy?: ToolPolicy): EffectiveSecurity {
    const tool = this.get(toolName);
    const builtIn: SecurityLevel = tool?.securityLevel || 'confirm';

    if (!policy) return { level: builtIn, reason: 'tool default' };

    // 1. forbiddenTools overrides everything
    if (policy.forbiddenTools?.includes(toolName)) {
      return { level: 'forbidden', reason: 'personality forbiddenTools list' };
    }

    // 2. Explicit per-tool security override
    if (policy.securityOverrides?.[toolName]) {
      return { level: policy.securityOverrides[toolName], reason: 'personality security override' };
    }

    // 3. Legacy requireConfirmation promotes to confirm
    if (policy.requireConfirmation.includes(toolName) && builtIn === 'safe') {
      return { level: 'confirm', reason: 'personality requireConfirmation list' };
    }

    // 4. allowedTools check — if '*' all allowed, otherwise specific list
    if (policy.allowedTools[0] !== '*') {
      if (!policy.allowedTools.includes(toolName)) {
        return { level: 'forbidden', reason: 'not in allowedTools list' };
      }
    }

    return { level: builtIn, reason: 'tool default' };
  }

  async execute(name: string, args: Record<string, any>, context?: ToolContext): Promise<string> {
    const tool = this.get(name);
    if (!tool) throw new Error(`Tool "${name}" not found in registry`);

    // Resolve effective security level
    const policy = (context as any)?.toolPolicy as ToolPolicy | undefined;
    const effective = this.resolveSecurity(name, policy);

    if (effective.level === 'forbidden') {
      throw new Error(`Tool "${name}" is forbidden: ${effective.reason}.`);
    }

    if (effective.level === 'confirm') {
      if (context?.requestConfirmation) {
        const allowed = await context.requestConfirmation(name, args);
        if (!allowed) {
          return `Tool "${name}" execution was declined by the user.`;
        }
      }
      console.log(`[Tool] Executing confirmation-level tool: ${name}`);
    }

    return tool.handler(args, context);
  }
}

export const toolRegistry = new ToolRegistry();
