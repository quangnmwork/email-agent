// agent/ActionsManager.ts
import { readdir } from "fs/promises";
import { join, resolve } from "path";
import type {
  ActionConfig,
  ActionContext,
  ActionResult,
  ActionModule,
  RegisteredAction,
  NotifyOptions,
} from "./types";

export class ActionsManager {
  private actions: Map<string, RegisteredAction> = new Map();
  private notifyCallback?: (
    actionId: string,
    message: string,
    options?: NotifyOptions
  ) => void;

  constructor() {}

  /**
   * Set callback for notifications (e.g., Socket.IO emit)
   */
  public onNotify(
    callback: (
      actionId: string,
      message: string,
      options?: NotifyOptions
    ) => void
  ) {
    this.notifyCallback = callback;
  }

  /**
   * Load all actions from a directory
   */
  public async loadActions(directory: string): Promise<void> {
    const absolutePath = resolve(directory);
    console.log(`📂 Loading actions from: ${absolutePath}`);

    try {
      const files = await readdir(absolutePath);
      const tsFiles = files.filter(
        (f) => f.endsWith(".ts") && !f.endsWith(".d.ts")
      );

      for (const file of tsFiles) {
        const filePath = join(absolutePath, file);
        await this.loadAction(filePath);
      }

      console.log(`✅ Loaded ${this.actions.size} actions`);
    } catch (err) {
      console.error(`❌ Failed to load actions:`, err);
      throw err;
    }
  }

  /**
   * Load a single action from file
   */
  private async loadAction(filePath: string): Promise<void> {
    try {
      const module = (await import(filePath)) as ActionModule;

      if (!module.config || !module.handler) {
        console.warn(`⚠️ Skipping ${filePath}: missing config or handler`);
        return;
      }

      const { config, handler } = module;

      if (this.actions.has(config.id)) {
        console.warn(
          `⚠️ Action "${config.id}" already registered, overwriting`
        );
      }

      this.actions.set(config.id, {
        config,
        handler,
        filePath,
      });

      console.log(`  ✓ ${config.icon || "📌"} ${config.name} (${config.id})`);
    } catch (err) {
      console.error(`❌ Failed to load action from ${filePath}:`, err);
    }
  }

  /**
   * Execute an action by ID
   */
  public async execute(
    actionId: string,
    params: Record<string, unknown> = {}
  ): Promise<ActionResult> {
    const action = this.actions.get(actionId);

    if (!action) {
      return {
        success: false,
        error: `Action "${actionId}" not found`,
      };
    }

    // Validate required params
    const validationError = this.validateParams(action.config, params);
    if (validationError) {
      return {
        success: false,
        error: validationError,
      };
    }

    // Create context
    const context: ActionContext = {
      actionId,
      startedAt: new Date(),
      log: (message: string, ...args: unknown[]) => {
        console.log(`[${actionId}]`, message, ...args);
      },
      notify: (message: string, options?: NotifyOptions) => {
        if (this.notifyCallback) {
          this.notifyCallback(actionId, message, options);
        }
      },
    };

    try {
      console.log(`▶️ Executing action: ${actionId}`);
      const result = await action.handler(params, context);
      console.log(`✅ Action completed: ${actionId}`);
      return result;
    } catch (err) {
      console.error(`❌ Action failed: ${actionId}`, err);
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Validate params against schema
   */
  private validateParams(
    config: ActionConfig,
    params: Record<string, unknown>
  ): string | null {
    const schema = config.parameterSchema;
    if (!schema) return null;

    const required = schema.required || [];
    for (const field of required) {
      if (
        !(field in params) ||
        params[field] === undefined ||
        params[field] === ""
      ) {
        return `Missing required parameter: ${field}`;
      }
    }

    // Type validation
    for (const [key, value] of Object.entries(params)) {
      const propSchema = schema.properties?.[key];
      if (propSchema) {
        const expectedType = propSchema.type;
        const actualType = typeof value;

        if (expectedType === "string" && actualType !== "string") {
          return `Parameter "${key}" must be a string`;
        }
        if (expectedType === "number" && actualType !== "number") {
          return `Parameter "${key}" must be a number`;
        }
        if (expectedType === "boolean" && actualType !== "boolean") {
          return `Parameter "${key}" must be a boolean`;
        }
      }
    }

    return null;
  }

  /**
   * Get all registered actions
   */
  public listActions(): ActionConfig[] {
    return Array.from(this.actions.values()).map((a) => a.config);
  }

  /**
   * Get action by ID
   */
  public getAction(actionId: string): RegisteredAction | undefined {
    return this.actions.get(actionId);
  }

  /**
   * Check if action exists
   */
  public hasAction(actionId: string): boolean {
    return this.actions.has(actionId);
  }
}
