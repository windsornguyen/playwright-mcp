/**
 * Consolidated Playwright MCP Tools
 * This file combines all essential Playwright tools while maintaining Ticketmaster structure
 */

import { z } from 'zod';
import { defineTool, type Tool, type ToolFactory } from '../types.js';

// Navigation Tools
const navigate: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',
  schema: {
    name: 'browser_navigate',
    title: 'Navigate to a URL',
    description: 'Navigate to a URL',
    inputSchema: z.object({
      url: z.string().describe('The URL to navigate to'),
    }),
    type: 'destructive',
  },
  handle: async (context, params) => {
    const tab = await context.ensureTab();
    await tab.navigate(params.url);
    return {
      code: [`await page.goto('${params.url}');`],
      captureSnapshot,
      waitForNetwork: false,
    };
  },
});

// Click Tool
const click: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',
  schema: {
    name: 'browser_click',
    title: 'Click on element',
    description: 'Click on an element',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector or text to click'),
    }),
    type: 'destructive',
  },
  handle: async (context, params) => {
    const tab = await context.ensureTab();
    await tab.page.click(params.selector);
    return {
      code: [`await page.click('${params.selector}');`],
      captureSnapshot,
      waitForNetwork: false,
    };
  },
});

// Type Tool
const type: ToolFactory = captureSnapshot => defineTool({
  capability: 'core',
  schema: {
    name: 'browser_type',
    title: 'Type text',
    description: 'Type text into an input field',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector for input field'),
      text: z.string().describe('Text to type'),
    }),
    type: 'destructive',
  },
  handle: async (context, params) => {
    const tab = await context.ensureTab();
    await tab.page.fill(params.selector, params.text);
    return {
      code: [`await page.fill('${params.selector}', '${params.text}');`],
      captureSnapshot,
      waitForNetwork: false,
    };
  },
});

// Screenshot Tool
const screenshot: ToolFactory = (captureSnapshot) => defineTool({
  capability: 'screenshot',
  schema: {
    name: 'browser_screenshot',
    title: 'Take screenshot',
    description: 'Take a screenshot of the current page',
    inputSchema: z.object({
      fullPage: z.boolean().optional().describe('Capture full page'),
    }),
    type: 'readOnly',
  },
  handle: async (context, params) => {
    const tab = await context.ensureTab();
    const screenshot = await tab.page.screenshot({
      fullPage: params.fullPage ?? false,
    });
    return {
      code: [`await page.screenshot({ fullPage: ${params.fullPage ?? false} });`],
      captureSnapshot: false,
      waitForNetwork: false,
      action: async () => ({
        content: [{
          type: 'image',
          data: screenshot.toString('base64'),
          mimeType: 'image/png',
        }],
      }),
    };
  },
});

// Wait Tool
const wait: ToolFactory = captureSnapshot => defineTool({
  capability: 'wait',
  schema: {
    name: 'browser_wait',
    title: 'Wait for selector',
    description: 'Wait for an element to appear',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector to wait for'),
      timeout: z.number().optional().describe('Timeout in milliseconds'),
    }),
    type: 'readOnly',
  },
  handle: async (context, params) => {
    const tab = await context.ensureTab();
    await tab.page.waitForSelector(params.selector, {
      timeout: params.timeout,
    });
    return {
      code: [`await page.waitForSelector('${params.selector}', { timeout: ${params.timeout ?? 30000} });`],
      captureSnapshot,
      waitForNetwork: false,
    };
  },
});

// Go Back Tool
const goBack: ToolFactory = captureSnapshot => defineTool({
  capability: 'history',
  schema: {
    name: 'browser_navigate_back',
    title: 'Go back',
    description: 'Go back to the previous page',
    inputSchema: z.object({}),
    type: 'readOnly',
  },
  handle: async context => {
    const tab = await context.ensureTab();
    await tab.page.goBack();
    return {
      code: [`await page.goBack();`],
      captureSnapshot,
      waitForNetwork: false,
    };
  },
});

// Get Text Tool
const getText: ToolFactory = (captureSnapshot) => defineTool({
  capability: 'core',
  schema: {
    name: 'browser_get_text',
    title: 'Get text content',
    description: 'Get text content of an element',
    inputSchema: z.object({
      selector: z.string().describe('CSS selector'),
    }),
    type: 'readOnly',
  },
  handle: async (context, params) => {
    const tab = await context.ensureTab();
    const text = await tab.page.textContent(params.selector);
    return {
      code: [`await page.textContent('${params.selector}');`],
      captureSnapshot: false,
      waitForNetwork: false,
      action: async () => ({
        content: [{
          type: 'text',
          text: text || '',
        }],
      }),
    };
  },
});

// Tab Management
const newTab: ToolFactory = captureSnapshot => defineTool({
  capability: 'tabs',
  schema: {
    name: 'browser_new_tab',
    title: 'Open new tab',
    description: 'Open a new browser tab',
    inputSchema: z.object({
      url: z.string().optional().describe('URL to navigate to in new tab'),
    }),
    type: 'destructive',
  },
  handle: async (context, params) => {
    const tab = await context.ensureTab();
    const newPage = await tab.browserContext.newPage();
    if (params.url) {
      await newPage.goto(params.url);
    }
    return {
      code: [
        `const newPage = await context.newPage();`,
        params.url ? `await newPage.goto('${params.url}');` : '',
      ].filter(Boolean),
      captureSnapshot,
      waitForNetwork: false,
    };
  },
});

// Close Tab
const closeTab: ToolFactory = (captureSnapshot) => defineTool({
  capability: 'tabs',
  schema: {
    name: 'browser_close_tab',
    title: 'Close tab',
    description: 'Close a browser tab',
    inputSchema: z.object({
      tabId: z.string().describe('Tab ID to close'),
    }),
    type: 'destructive',
  },
  handle: async (context, params) => {
    await context.closeTab(params.tabId);
    return {
      code: [`await page.close();`],
      captureSnapshot: false,
      waitForNetwork: false,
    };
  },
});

// Console evaluation
const evaluate: ToolFactory = (captureSnapshot) => defineTool({
  capability: 'console',
  schema: {
    name: 'browser_evaluate',
    title: 'Evaluate JavaScript',
    description: 'Execute JavaScript in the browser context',
    inputSchema: z.object({
      expression: z.string().describe('JavaScript expression to evaluate'),
    }),
    type: 'destructive',
  },
  handle: async (context, params) => {
    const tab = await context.ensureTab();
    const result = await tab.page.evaluate(params.expression);
    return {
      code: [`await page.evaluate('${params.expression}');`],
      captureSnapshot: false,
      waitForNetwork: false,
      action: async () => ({
        content: [{
          type: 'text',
          text: JSON.stringify(result, null, 2),
        }],
      }),
    };
  },
});

// Export tool collections
export const snapshotTools: Tool<any>[] = [
  navigate(true),
  click(true),
  type(true),
  screenshot(true),
  wait(true),
  goBack(true),
  getText(true),
  newTab(true),
  closeTab(true),
  evaluate(true),
];

export const visionTools: Tool<any>[] = [
  navigate(false),
  screenshot(false),
  wait(false),
  goBack(false),
  getText(false),
  newTab(false),
  closeTab(false),
  evaluate(false),
];

// Default export for compatibility
export default snapshotTools;