/**
 * Playwright MCP Server
 */

import { Server as McpServer } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, Tool as McpTool } from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { snapshotTools, visionTools } from './tools/search.js';
import type { FullConfig, Context, Tool } from './types.js';

export class Connection {
  readonly server: McpServer;
  readonly context: Context;

  constructor(server: McpServer, context: Context) {
    this.server = server;
    this.context = context;
  }

  async close() {
    await this.server.close();
    // Close context resources if needed
  }
}

export class Server {
  readonly config: FullConfig;
  private _connectionList: Connection[] = [];

  constructor(config: FullConfig) {
    this.config = config;
  }

  async createConnection(transport: Transport): Promise<Connection> {
    const allTools = this.config.vision ? visionTools : snapshotTools;
    const tools: Tool<any>[] = allTools.filter(tool => 
      !this.config.capabilities || 
      tool.capability === 'core' || 
      this.config.capabilities?.includes(tool.capability)
    );

    // Create a mock context for now
    const context: Context = {
      ensureTab: async () => ({ 
        page: {
          goto: async (url: string) => {},
          click: async (selector: string) => {},
          fill: async (selector: string, text: string) => {},
          screenshot: async (options?: any) => Buffer.from(''),
          waitForSelector: async (selector: string, options?: any) => {},
          goBack: async () => {},
          textContent: async (selector: string) => '',
          evaluate: async (expression: string) => {},
        },
        browserContext: {
          newPage: async () => ({
            goto: async (url: string) => {},
          }),
        },
        navigate: async (url: string) => {},
      }),
      currentTab: () => null,
      tabs: () => [],
      closeTab: async (id: string) => {},
      modalState: null,
    };

    const server = new McpServer(
      { name: 'Playwright', version: '1.0.0' },
      { capabilities: { tools: {} } }
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map(tool => ({
          name: tool.schema.name,
          description: tool.schema.description,
          inputSchema: zodToJsonSchema(tool.schema.inputSchema),
        })) as McpTool[],
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async request => {
      const tool = tools.find(t => t.schema.name === request.params.name);
      if (!tool) {
        return {
          content: [{ type: 'text', text: `Tool "${request.params.name}" not found` }],
          isError: true,
        };
      }

      try {
        const result = await tool.handle(context, request.params.arguments);
        if (result.action) {
          const actionResult = await result.action();
          if (actionResult?.content) {
            return { content: actionResult.content };
          }
        }
        return {
          content: [{ type: 'text', text: 'Tool executed successfully' }],
        };
      } catch (error) {
        return {
          content: [{ type: 'text', text: String(error) }],
          isError: true,
        };
      }
    });

    const connection = new Connection(server, context);
    this._connectionList.push(connection);
    await server.connect(transport);
    return connection;
  }

  setupExitWatchdog() {
    let isExiting = false;
    const handleExit = async () => {
      if (isExiting) return;
      isExiting = true;
      setTimeout(() => process.exit(0), 15000);
      await Promise.all(this._connectionList.map(connection => connection.close()));
      process.exit(0);
    };

    process.stdin.on('close', handleExit);
    process.on('SIGINT', handleExit);
    process.on('SIGTERM', handleExit);
  }
}