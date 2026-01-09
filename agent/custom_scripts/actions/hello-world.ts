// agent/custom_scripts/actions/hello-world.ts
import type { ActionConfig, ActionContext, ActionResult } from "../../types";

export const config: ActionConfig = {
  id: "hello_world",
  name: "Hello World",
  description: "Action đơn giản để test",
  icon: "👋",
  parameterSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Tên của bạn",
      },
    },
    required: ["name"],
  },
};

export async function handler(
  params: { name: string },
  context: ActionContext
): Promise<ActionResult> {
  context.log(`Hello ${params.name}!`);

  context.notify(`Chào ${params.name}! 👋`, {
    type: "success",
    priority: "normal",
  });

  return {
    success: true,
    message: `Đã chào ${params.name} thành công!`,
    data: {
      greeting: `Hello ${params.name}!`,
      timestamp: new Date().toISOString(),
    },
  };
}

