/**
 * STDIO Transport for Playwright MCP Server
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Server } from '../server.js';

export async function runStdioTransport(server: Server) {
  await server.createConnection(new StdioServerTransport());
}

export async function startStdioTransport(server: Server) {
  return runStdioTransport(server);
}