/**
 * Playwright MCP Formatters
 * Utility functions for formatting output
 */

export function formatText(text: string): string {
  return text.trim();
}

export function formatError(error: Error): string {
  return `Error: ${error.message}`;
}

export function formatJson(data: any): string {
  return JSON.stringify(data, null, 2);
}