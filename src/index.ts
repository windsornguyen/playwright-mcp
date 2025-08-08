#!/usr/bin/env node

/**
 * Main entry point for the Playwright MCP Server
 * 
 * Transport selection logic:
 * 1. --stdio flag forces STDIO transport
 * 2. --port flag or PORT env var triggers HTTP transport
 * 3. Default: STDIO for local development
 */

import { loadConfig } from './config.js';
import { parseArgs } from './cli.js';
import { Server } from './server.js';
import { runStdioTransport, startHttpTransport } from './transport/index.js';
import { startHttpServer } from './transport/http.js';
import type { FullConfig } from './types.js';

async function main() {
    try {
        const config = loadConfig();
        const cliOptions = parseArgs();
        
        // Determine transport mode
        const shouldUseHttp = cliOptions.port || (process.env.PORT && !cliOptions.stdio);
        const port = cliOptions.port || config.port;
        
        // Create configuration with CLI options
        const fullConfig: FullConfig = {
            browser: {
                browser: 'chromium',
                headless: cliOptions.headless !== false,
                context: 'isolated',
            },
            vision: cliOptions.vision || false,
            port,
        };
        
        // Create server
        const server = new Server(fullConfig);
        server.setupExitWatchdog();
        
        if (shouldUseHttp) {
            // HTTP transport for production/cloud deployment
            const httpServer = await startHttpServer({ host: cliOptions.host, port });
            startHttpTransport(httpServer, server);
        } else {
            // STDIO transport for local development
            await runStdioTransport(server);
        }
    } catch (error) {
        console.error("Fatal error running Playwright server:", error);
        process.exit(1);
    }
}

// Run the server
main();
