import { tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import z from "zod";

export const customServer = createSdkMcpServer({
  name: "email",
  version: "1.0.0",
  tools: [
    tool(
      "search_inbox",
      "Search emails in the inbox using Gmail query syntax",
      {
        gmailQuery: z.string(),
      },
      async (args) => {}
    ),
  ],
});
