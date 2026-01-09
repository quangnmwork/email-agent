// agent/types.ts

export interface ActionConfig {
  id: string;
  name: string;
  description: string;
  icon?: string;
  parameterSchema?: {
    type: "object";
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
      default?: unknown;
    }>;
    required?: string[];
  };
}

export interface ActionContext {
  /** Log message to console */
  log: (message: string, ...args: unknown[]) => void;
  
  /** Send notification to client */
  notify: (message: string, options?: NotifyOptions) => void;
  
  /** Action metadata */
  actionId: string;
  
  /** Timestamp when action started */
  startedAt: Date;
}

export interface NotifyOptions {
  type?: "info" | "success" | "warning" | "error";
  priority?: "low" | "normal" | "high";
}

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

export interface ActionModule {
  config: ActionConfig;
  handler: (params: Record<string, unknown>, context: ActionContext) => Promise<ActionResult>;
}

export interface RegisteredAction {
  config: ActionConfig;
  handler: ActionModule["handler"];
  filePath: string;
}

