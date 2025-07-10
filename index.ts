import { createConnection as createPlaywrightConnection } from "./src/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "http";
import { randomUUID } from "crypto";

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options: { port?: number } = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" && i + 1 < args.length) {
      options.port = parseInt(args[i + 1], 10);
      i++;
    }
  }
  return options;
}

// Session storage for concurrent connections
const streamableSessions = new Map<string, { transport: StreamableHTTPServerTransport; connection: any }>();
const sseSessions = new Map<string, { transport: SSEServerTransport; connection: any }>();

// Create connection instance
async function createConnection() {
  return await createPlaywrightConnection();
}

// Handle SSE transport
async function handleSSE(req: any, res: any) {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  
  if (req.method === "GET") {
    // New SSE connection
    const sessionId = randomUUID();
    const connection = await createConnection();
    const transport = new SSEServerTransport(url.pathname, res);
    
    sseSessions.set(sessionId, { transport, connection });
    
    transport.onerror = (error) => {
      console.error("SSE transport error:", error);
      sseSessions.delete(sessionId);
    };
    
    transport.onclose = () => {
      sseSessions.delete(sessionId);
    };
    
    await connection.server.connect(transport);
  } else if (req.method === "POST") {
    // Handle SSE POST requests
    const sessionId = req.headers["x-session-id"] as string;
    const session = sseSessions.get(sessionId);
    
    if (!session) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Session not found");
      return;
    }
    
    let body = "";
    req.on("data", (chunk: any) => {
      body += chunk.toString();
    });
    
    req.on("end", async () => {
      try {
        const message = JSON.parse(body);
        // Forward to transport
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON" }));
      }
    });
  }
}

// Handle Streamable HTTP transport
async function handleStreamable(req: any, res: any) {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  
  if (sessionId) {
    // Use existing session
    const session = streamableSessions.get(sessionId);
    if (session) {
      await session.transport.handleRequest(req, res);
      return;
    }
  }
  
  // Create new session for initialization
  const connection = await createConnection();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      streamableSessions.set(sessionId, {
        transport,
        connection,
      });
    },
  });
  
  await connection.server.connect(transport);
  await transport.handleRequest(req, res);
}

// Start HTTP server
function startHttpServer(port: number) {
  const httpServer = createServer();
  
  httpServer.on("request", async (req, res) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, mcp-session-id");
    
    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }
    
    if (url.pathname === "/sse" || url.pathname.startsWith("/sse/")) {
      await handleSSE(req, res);
    } else if (url.pathname === "/mcp") {
      await handleStreamable(req, res);
    } else if (url.pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy" }));
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  });
  
  httpServer.listen(port, () => {
    const url = `http://localhost:${port}`;
    const message = [
      `Listening on ${url}`,
      "Put this in your client config:",
      JSON.stringify({
        mcpServers: {
          playwright: {
            url: `${url}/sse`,
          },
        },
      }, undefined, 2),
      "If your client supports streamable HTTP, you can use the /mcp endpoint instead.",
    ].join("\n");
    
    console.log(message);
  });
  
  return httpServer;
}

// Main execution
async function main() {
  const options = parseArgs();
  const port = options.port || 8000;
  
  if (port) {
    // HTTP server mode
    startHttpServer(port);
  } else {
    // Stdio mode (fallback)
    const connection = await createConnection();
    const { StdioServerTransport } = await import("@modelcontextprotocol/sdk/server/stdio.js");
    const transport = new StdioServerTransport();
    await connection.server.connect(transport);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down...");
  process.exit(0);
});

// Export for library usage
export { createPlaywrightConnection as createConnection };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Error starting server:", error);
    process.exit(1);
  });
}