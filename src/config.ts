/**
 * Playwright MCP Server Configuration
 */

import type { FullConfig, ToolCapability } from './types.js';

export function parseConfig(options: any = {}): FullConfig {
  return {
    browser: {
      browser: options.browser || 'chromium',
      headless: options.headless !== false,
      proxy: options.proxy,
      cdp: options.cdp,
      context: options.context || 'isolated',
      launchOptions: options.launchOptions,
    },
    vision: options.vision || false,
    capabilities: options.capabilities,
    server: options.server,
  };
}

export function validateConfig(config: FullConfig): void {
  const validBrowsers = ['chromium', 'firefox', 'webkit'];
  if (!validBrowsers.includes(config.browser.browser)) {
    throw new Error(`Invalid browser: ${config.browser.browser}`);
  }
  
  const validContexts = ['isolated', 'persistent', 'cdp', 'remote'];
  if (config.browser.context && !validContexts.includes(config.browser.context)) {
    throw new Error(`Invalid context: ${config.browser.context}`);
  }
}