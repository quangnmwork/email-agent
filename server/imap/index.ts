import { ImapFlow, FetchMessageObject } from "imapflow";

export class ImapManager {
  private static instance: ImapManager;
  private imap: ImapFlow;
  private isConnected: boolean = false;

  private constructor() {
    const EMAIL = process.env.EMAIL ?? "";
    const PASSWORD = process.env.EMAIL_PASSWORD ?? "";
    const HOST = process.env.IMAP_HOST ?? "";
    const PORT = process.env.IMAP_PORT ?? 993;

    console.log("📧 IMAP Config:", { EMAIL, HOST, PORT });

    this.imap = new ImapFlow({
      host: HOST,
      port: Number(PORT),
      auth: {
        user: EMAIL,
        pass: PASSWORD,
      },
      secure: true,
      logger: false, // Tắt log debug, set true nếu cần debug
    });

    // Listen for close event
    this.imap.on("close", () => {
      this.isConnected = false;
      console.log("📴 IMAP connection closed");
    });

    this.imap.on("error", (err) => {
      console.error("❌ IMAP error:", err.message);
      this.isConnected = false;
    });
  }

  public static getInstance(): ImapManager {
    if (!ImapManager.instance) {
      ImapManager.instance = new ImapManager();
    }
    return ImapManager.instance;
  }

  // ImapFlow.connect() trả về Promise - đơn giản hơn nhiều!
  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.log("✅ Already connected");
      return;
    }

    try {
      console.log("🔌 Attempting IMAP connection to", process.env.IMAP_HOST);
      await this.imap.connect();
      this.isConnected = true;
      console.log("✅ IMAP connection ready!");
    } catch (err) {
      this.isConnected = false;
      throw err;
    }
  }

  public async listMailboxes(): Promise<void> {
    await this.ensureConnection();

    const mailboxes = await this.imap.list();
    console.log("📬 Mailboxes:");
    for (const mailbox of mailboxes) {
      console.log(`  - ${mailbox.path}`);
    }
  }

  public async getMailboxStatus(mailbox: string = "INBOX"): Promise<void> {
    await this.ensureConnection();

    const status = await this.imap.status(mailbox, {
      messages: true,
      unseen: true,
      recent: true,
    });

    console.log(`📬 ${mailbox} status:`);
    console.log(`   Total messages: ${status.messages}`);
    console.log(`   Unseen: ${status.unseen}`);
    console.log(`   Recent: ${status.recent}`);
  }

  public async disconnect(): Promise<void> {
    if (this.imap && this.isConnected) {
      await this.imap.logout();
      this.isConnected = false;
      console.log("📴 Disconnected from IMAP");
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      console.log("🔄 Connecting to IMAP server...");
      await this.connect();
    }
  }
}
