#!/usr/bin/env node

/**
 * Playwright MCP Server CLI
 */

import { Server } from './server.js';
import { startStdioTransport } from './transport/stdio.js';
import { startHttpServer, startHttpTransport } from './transport/http.js';
import type { FullConfig } from './types.js';

async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const portIndex = args.indexOf('--port');
  const port = portIndex !== -1 ? parseInt(args[portIndex + 1]) : undefined;
  
  const hostIndex = args.indexOf('--host');
  const host = hostIndex !== -1 ? args[hostIndex + 1] : undefined;
  
  const visionMode = args.includes('--vision');
  const headless = !args.includes('--headed');
  
  // Create configuration
  const config: FullConfig = {
    browser: {
      browser: 'chromium',
      headless,
    },
    vision: visionMode,
    server: port ? { port } : undefined,
  };
  
  // Create server
  const server = new Server(config);
  server.setupExitWatchdog();
  
  // Start appropriate transport
  if (port !== undefined) {
    // HTTP mode
    const httpServer = await startHttpServer({ host, port });
    startHttpTransport(httpServer, server);
  } else {
    // STDIO mode (default)
    await startStdioTransport(server);
  }
}

// Run the CLI
main().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});