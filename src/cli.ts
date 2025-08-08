/**
 * Playwright MCP Server CLI argument parser
 */

interface CliOptions {
  port?: number;
  stdio?: boolean;
  host?: string;
  vision?: boolean;
  headless?: boolean;
  help?: boolean;
}

export function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {};
  
  // Show help if requested
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`Playwright MCP Server

Options:
  --port <port>        Port to listen on for HTTP transport
  --host <host>        Host to bind server to (default: localhost)
  --stdio              Force STDIO transport
  --headless           Run browser in headless mode (headed by default)
  --vision             Use screenshot mode instead of accessibility snapshots
  --help               Show this help message
`);
    process.exit(0);
  }
  
  // Parse command line arguments
  const portIndex = args.indexOf('--port');
  if (portIndex !== -1 && args[portIndex + 1]) {
    options.port = parseInt(args[portIndex + 1]);
  }
  
  const hostIndex = args.indexOf('--host');
  if (hostIndex !== -1 && args[hostIndex + 1]) {
    options.host = args[hostIndex + 1];
  }
  
  options.stdio = args.includes('--stdio');
  options.vision = args.includes('--vision');
  options.headless = !args.includes('--headed');
  
  return options;
}