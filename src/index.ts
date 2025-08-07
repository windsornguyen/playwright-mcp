#!/usr/bin/env node

/**
 * Playwright MCP Server Main Entry Point
 */

import { Server } from './server.js';
import { startStdioTransport } from './transport/stdio.js';
import { startHttpServer, startHttpTransport } from './transport/http.js';
import type { FullConfig } from './types.js';

async function main() {
  const args = process.argv.slice(2);
  
  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Playwright MCP Server

Options:
  --port <port>        Port to listen on for SSE transport
  --host <host>        Host to bind server to (default: localhost)
  --headless           Run browser in headless mode (headed by default)
  --vision             Use screenshot mode instead of accessibility snapshots
  --help               Show this help message
`);
    process.exit(0);
  }
  
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
 
  startHttpTransport(await startHttpServer({ host, port }), server);
  // Start appropriate transport
  // if (port !== undefined) {
    // HTTP mode
    // const httpServer = await startHttpServer({ host, port });
    // startHttpTransport(httpServer, server);
  // } else {
    // STDIO mode (default)
    // await startStdioTransport(server);
  }
}

// Run the server
main().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
