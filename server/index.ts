import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { Server as SocketIOServer } from "socket.io";
import { ImapManager } from "./imap";
import { ActionsManager } from "../agent/ActionsManager";
import { join } from "path";

const app = new Hono();

// Actions Manager setup
const actionsManager = new ActionsManager();

// Hono REST API
app.get("/", (c) => c.json({ message: "Mail Agent API" }));

app.get("/mailboxes", async (c) => {
  const imapManager = ImapManager.getInstance();
  try {
    await imapManager.connect();
    const mailboxes = await imapManager.getMailboxList();
    return c.json({ mailboxes });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

app.get("/actions", (c) => {
  const actions = actionsManager.listActions();
  return c.json({ actions });
});

const PORT = Number(process.env.PORT) || 3000;

// Start server
async function start() {
  // Load actions
  const actionsPath = join(__dirname, "../agent/custom_scripts/actions");
  await actionsManager.loadActions(actionsPath);

  // Start Hono server and get the underlying Node.js server
  const server = serve({
    fetch: app.fetch,
    port: PORT,
  });

  // Attach Socket.IO to the same server
  const io = new SocketIOServer(server, {
    cors: {
      origin: "*",
    },
  });

  // Socket.IO events
  io.on("connection", async (socket) => {
    console.log("🔌 Client connected:", socket.id);

    // Set up notify callback for this socket
    actionsManager.onNotify((actionId, message, options) => {
      socket.emit("action-notify", { actionId, message, options });
    });

    // Auto-poll function
    const fetchEmails = async () => {
      try {
        const imapManager = ImapManager.getInstance();
        await imapManager.connect();
        const emails = await imapManager.getRecentMessages("INBOX", 20);
        socket.emit("emails", { emails, timestamp: new Date() });
      } catch (error) {
        socket.emit("error", { message: String(error) });
      }
    };

    // Auto-start polling every 5 seconds
    console.log("📬 Auto-starting email polling every 5s");
    await fetchEmails(); // Fetch immediately
    const pollInterval = setInterval(fetchEmails, 5000);

    // Manual fetch
    socket.on("fetch-emails", fetchEmails);

    // Actions events
    socket.on("list-actions", () => {
      const actions = actionsManager.listActions();
      socket.emit("actions-list", { actions });
    });

    socket.on(
      "execute-action",
      async (data: { actionId: string; params?: Record<string, unknown> }) => {
        const { actionId, params = {} } = data;
        const result = await actionsManager.execute(actionId, params);
        socket.emit("action-result", { actionId, result });
      }
    );

    socket.on("disconnect", () => {
      clearInterval(pollInterval);
      console.log("📴 Client disconnected:", socket.id);
    });
  });

  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
}

start().catch(console.error);
