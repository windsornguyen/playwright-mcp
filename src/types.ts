import type { ImageContent, TextContent } from '@modelcontextprotocol/sdk/types.js';
import type { z } from 'zod';
import type * as playwright from 'playwright';

export type ToolCapability = 
  | 'core' 
  | 'history'
  | 'console'
  | 'dialogs'
  | 'files'
  | 'keyboard'
  | 'network'
  | 'pdf'
  | 'screenshot'
  | 'tabs'
  | 'testing'
  | 'vision'
  | 'wait';

export type ToolSchema<Input extends InputType> = {
  name: string;
  title: string;
  description: string;
  inputSchema: Input;
  type: 'readOnly' | 'destructive';
};

type InputType = z.Schema;

export type FileUploadModalState = {
  type: 'fileChooser';
  description: string;
  fileChooser: playwright.FileChooser;
};

export type DialogModalState = {
  type: 'dialog';
  description: string;
  dialog: playwright.Dialog;
};

export type ModalState = FileUploadModalState | DialogModalState;

export type ToolActionResult = { content?: (ImageContent | TextContent)[] } | undefined | void;

export type ToolResult = {
  code: string[];
  action?: () => Promise<ToolActionResult>;
  captureSnapshot: boolean;
  waitForNetwork: boolean;
  resultOverride?: ToolActionResult;
};

export type Tool<Input extends InputType = InputType> = {
  capability: ToolCapability;
  schema: ToolSchema<Input>;
  clearsModalState?: ModalState['type'];
  handle: (context: any, params: z.output<Input>) => Promise<ToolResult>;
};

export type ToolFactory = (snapshot: boolean) => Tool<any>;

export function defineTool<Input extends InputType>(tool: Tool<Input>): Tool<Input> {
  return tool;
}

export interface BrowserConfig {
  browser: 'chromium' | 'firefox' | 'webkit';
  headless?: boolean;
  proxy?: string;
  cdp?: string;
  context?: 'isolated' | 'persistent' | 'cdp' | 'remote';
  launchOptions?: any;
}

export interface FullConfig {
  browser: BrowserConfig;
  server?: {
    port?: number;
  };
  vision?: boolean;
  capabilities?: ToolCapability[];
}

export interface Context {
  ensureTab(): Promise<any>;
  currentTab(): any;
  tabs(): any[];
  closeTab(id: string): Promise<void>;
  modalState: ModalState | null;
}